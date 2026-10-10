import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { pickItem } from '@/actions/orders'

// Armazenamento em memória do estado atual do Pick to Light
let activeBoxState: { [key: number]: boolean } = {
  1: false,
  2: false,
  3: false,
}
let lastButtonPressed: number | null = null
let currentOrderId: string | null = null
let lastEspHeartbeat: number = 0

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  // Se o ESP32 estiver consultando a nuvem (Heartbeat + saber qual LED acender)
  if (action === 'poll') {
    lastEspHeartbeat = Date.now()
    let targetBox = 0

    try {
      // 1. Tenta buscar o próximo item da ordem aberta no terminal
      let activeOrder = null
      if (currentOrderId) {
        activeOrder = await prisma.order.findUnique({
          where: { id: currentOrderId },
          include: {
            items: {
              where: { picked: false },
              include: { product: { include: { location: true } } },
              orderBy: { createdAt: 'asc' }
            }
          }
        })
      }

      // 2. Se não encontrou por currentOrderId, busca a primeira ordem em andamento
      if (!activeOrder || activeOrder.items.length === 0) {
        activeOrder = await prisma.order.findFirst({
          where: { status: { in: ['IN_PROGRESS', 'PENDING'] } },
          include: {
            items: {
              where: { picked: false },
              include: { product: { include: { location: true } } },
              orderBy: { createdAt: 'asc' }
            }
          }
        })
      }

      // 3. Descobre qual é a caixa do próximo item
      if (activeOrder && activeOrder.items.length > 0) {
        const nextItem = activeOrder.items[0]
        if (nextItem.product?.location?.box) {
          const boxNum = parseInt(nextItem.product.location.box, 10)
          if (boxNum >= 1 && boxNum <= 3) {
            targetBox = boxNum
          }
        }
      }
    } catch (e) {
      console.error('Erro ao consultar banco no poll do ESP32:', e)
    }

    // Se o banco apontou uma caixa, atualiza o estado
    if (targetBox > 0) {
      activeBoxState = { 1: targetBox === 1, 2: targetBox === 2, 3: targetBox === 3 }
    } else {
      // Caso contrário, respeita comandos manuais se existirem
      if (activeBoxState[1]) targetBox = 1
      else if (activeBoxState[2]) targetBox = 2
      else if (activeBoxState[3]) targetBox = 3
    }

    return NextResponse.json({
      activeBox: targetBox,
      box1: targetBox === 1,
      box2: targetBox === 2,
      box3: targetBox === 3,
      espOnline: true
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      }
    })
  }

  // Consulta vinda da interface web para saber o status geral
  const isEspOnline = (Date.now() - lastEspHeartbeat) < 6000
  let currentActiveBox = 0
  if (activeBoxState[1]) currentActiveBox = 1
  else if (activeBoxState[2]) currentActiveBox = 2
  else if (activeBoxState[3]) currentActiveBox = 3

  return NextResponse.json({
    activeBoxState,
    activeBox: currentActiveBox,
    lastButtonPressed,
    currentOrderId,
    espOnline: isEspOnline
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    }
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, box, orderId, orderItemId } = body

    // 0. Painel web notifica qual ordem está aberta na tela do operador
    if (action === 'set_active_order') {
      currentOrderId = orderId || null
      return NextResponse.json({ success: true, currentOrderId })
    }

    // 1. Comando vindo do painel web para acender LED manual
    if (action === 'set_led') {
      const boxNum = parseInt(box, 10)
      if (boxNum >= 1 && boxNum <= 3) {
        activeBoxState = { 1: false, 2: false, 3: false }
        activeBoxState[boxNum] = true
        if (orderId) currentOrderId = orderId
      }
      return NextResponse.json({ success: true, activeBoxState })
    }

    // 2. Comando vindo do painel web para apagar todos os LEDs
    if (action === 'clear_leds') {
      activeBoxState = { 1: false, 2: false, 3: false }
      return NextResponse.json({ success: true, activeBoxState })
    }

    // 3. Notificação vinda do ESP32 quando o operador aperta o botão físico
    if (action === 'button_pressed') {
      const pressedBox = parseInt(box, 10)
      lastButtonPressed = pressedBox
      activeBoxState[pressedBox] = false // Desliga o LED após o clique
      lastEspHeartbeat = Date.now()

      let pickedItem = null

      try {
        if (orderItemId) {
          await pickItem(orderItemId)
        } else {
          // Busca o item não coletado daquela caixa na ordem ativa
          const orderToUse = currentOrderId
            ? await prisma.order.findUnique({
                where: { id: currentOrderId },
                include: {
                  items: {
                    where: { picked: false },
                    include: { product: { include: { location: true } } }
                  }
                }
              })
            : await prisma.order.findFirst({
                where: { status: { in: ['IN_PROGRESS', 'PENDING'] } },
                include: {
                  items: {
                    where: { picked: false },
                    include: { product: { include: { location: true } } }
                  }
                }
              })

          if (orderToUse) {
            const item = orderToUse.items.find(
              i => i.product?.location?.box === pressedBox.toString()
            )
            if (item) {
              await pickItem(item.id)
              pickedItem = item
            }
          }
        }
      } catch (e) {
        console.error('Erro ao dar baixa via botão físico:', e)
      }

      return NextResponse.json({
        success: true,
        pressedBox,
        pickedItemId: pickedItem?.id || null
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        }
      })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
