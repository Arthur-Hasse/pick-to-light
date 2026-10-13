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
let buttonPressCount: number = 0
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
      // 1. Tenta buscar a ordem atualmente visualizada pelo operador
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

        // Se a ordem foi concluída ou não tem itens pendentes, limpa currentOrderId
        if (!activeOrder || activeOrder.status === 'COMPLETED' || activeOrder.items.length === 0) {
          activeOrder = null
          currentOrderId = null
        }
      }

      // 2. Se não encontrou por currentOrderId, busca APENAS ordens que o operador já INICIOU (IN_PROGRESS)!
      // NUNCA acende LEDs para ordens PENDING (criadas pelo admin mas ainda não abertas pelo operador)
      if (!activeOrder) {
        activeOrder = await prisma.order.findFirst({
          where: { status: 'IN_PROGRESS' },
          include: {
            items: {
              where: { picked: false },
              include: { product: { include: { location: true } } },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { updatedAt: 'desc' } // Ordem mais recente aberta/iniciada
        })
      }

      // 3. Descobre qual é a caixa do próximo item não coletado da ordem ativa
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

    // Se encontramos uma caixa ativa para a ordem em andamento
    if (targetBox > 0) {
      activeBoxState = { 1: targetBox === 1, 2: targetBox === 2, 3: targetBox === 3 }
    } else {
      // Se não há nenhuma ordem em andamento, garante que TODOS OS LEDS FIQUEM APAGADOS!
      activeBoxState = { 1: false, 2: false, 3: false }
    }

    return NextResponse.json({
      activeBox: targetBox,
      box1: targetBox === 1,
      box2: targetBox === 2,
      box3: targetBox === 3,
      espOnline: true
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      }
    })
  }

  // Consulta vinda da interface web para saber o status geral e do pedido aberto
  const isEspOnline = (Date.now() - lastEspHeartbeat) < 10000
  let currentActiveBox = 0
  if (activeBoxState[1]) currentActiveBox = 1
  else if (activeBoxState[2]) currentActiveBox = 2
  else if (activeBoxState[3]) currentActiveBox = 3

  const orderIdParam = searchParams.get('orderId') || currentOrderId
  let orderData = null

  if (orderIdParam) {
    try {
      const dbOrder = await prisma.order.findUnique({
        where: { id: orderIdParam },
        select: {
          id: true,
          status: true,
          items: {
            select: { id: true, picked: true },
            orderBy: { createdAt: 'asc' }
          }
        }
      })
      if (dbOrder) {
        const allItemsPicked = dbOrder.items.length > 0 && dbOrder.items.every(i => i.picked)
        orderData = {
          orderId: dbOrder.id,
          status: dbOrder.status,
          isCompleted: dbOrder.status === 'COMPLETED' || allItemsPicked,
          items: dbOrder.items.map(i => ({ id: i.id, picked: i.picked }))
        }
      }
    } catch (e) {
      console.error('Erro ao buscar status da ordem no GET /api/esp32:', e)
    }
  }

  return NextResponse.json({
    activeBoxState,
    activeBox: currentActiveBox,
    lastButtonPressed,
    buttonPressCount,
    currentOrderId,
    espOnline: isEspOnline,
    order: orderData
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
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
      if (orderId) {
        try {
          const ord = await prisma.order.findUnique({ where: { id: orderId } })
          if (ord && ord.status !== 'COMPLETED') {
            await prisma.order.updateMany({
              where: { status: 'IN_PROGRESS', id: { not: orderId } },
              data: { status: 'PENDING' }
            })
            if (ord.status !== 'IN_PROGRESS') {
              await prisma.order.update({
                where: { id: orderId },
                data: { status: 'IN_PROGRESS', updatedAt: new Date() }
              })
            }
          }
        } catch (e) {
          console.error('Erro ao ativar ordem no set_active_order:', e)
        }
      }
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
      buttonPressCount++
      activeBoxState[pressedBox] = false // Desliga o LED após o clique
      lastEspHeartbeat = Date.now()

      let pickedItem = null
      let nextActiveBox = 0

      try {
        if (orderItemId) {
          await pickItem(orderItemId)
        } else {
          // Busca a ordem ativa: prioriza currentOrderId, senão a ordem IN_PROGRESS mais recente
          const orderToUse = currentOrderId
            ? await prisma.order.findUnique({
                where: { id: currentOrderId },
                include: {
                  items: {
                    where: { picked: false },
                    include: { product: { include: { location: true } } },
                    orderBy: { createdAt: 'asc' }
                  }
                }
              })
            : await prisma.order.findFirst({
                where: { status: 'IN_PROGRESS' }, // APENAS IN_PROGRESS!
                include: {
                  items: {
                    where: { picked: false },
                    include: { product: { include: { location: true } } },
                    orderBy: { createdAt: 'asc' }
                  }
                },
                orderBy: { updatedAt: 'desc' }
              })

          if (orderToUse) {
            const item = orderToUse.items.find(
              i => i.product?.location?.box === pressedBox.toString()
            )
            if (item) {
              await pickItem(item.id)
              pickedItem = item

              // Imediatamente determina a PRÓXIMA caixa da fila para responder na mesma requisição
              const remaining = orderToUse.items.filter(i => i.id !== item.id)
              if (remaining.length > 0 && remaining[0].product?.location?.box) {
                const nBox = parseInt(remaining[0].product.location.box, 10)
                if (nBox >= 1 && nBox <= 3) {
                  nextActiveBox = nBox
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Erro ao dar baixa via botão físico:', e)
      }

      // Atualiza o estado da memória com a próxima caixa
      activeBoxState = {
        1: nextActiveBox === 1,
        2: nextActiveBox === 2,
        3: nextActiveBox === 3
      }

      return NextResponse.json({
        success: true,
        pressedBox,
        activeBox: nextActiveBox, // Responde imediatamente com o próximo LED!
        box1: nextActiveBox === 1,
        box2: nextActiveBox === 2,
        box3: nextActiveBox === 3,
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
