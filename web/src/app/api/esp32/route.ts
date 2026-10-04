import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { pickItem } from '@/actions/orders'

// Armazenamento em memória do estado atual do Pick to Light
// (Caixas ativas no momento que o ESP32 pode consultar)
let activeBoxState: { [key: number]: boolean } = {
  1: false,
  2: false,
  3: false,
}
let lastButtonPressed: number | null = null
let currentOrderId: string | null = null

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  // Se o ESP32 consultar o status do que deve estar aceso
  if (action === 'poll') {
    return NextResponse.json({
      activeBoxes: activeBoxState,
      box1: !!activeBoxState[1],
      box2: !!activeBoxState[2],
      box3: !!activeBoxState[3],
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      }
    })
  }

  return NextResponse.json({
    activeBoxState,
    lastButtonPressed,
    currentOrderId,
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

    // 1. Comando vindo do painel web para acender LED no ESP32
    if (action === 'set_led') {
      const boxNum = parseInt(box, 10)
      if (boxNum >= 1 && boxNum <= 3) {
        // Desliga os outros e liga o desejado
        activeBoxState = { 1: false, 2: false, 3: false }
        activeBoxState[boxNum] = true
        currentOrderId = orderId || null
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

      // Se temos o item da ordem vinculado, podemos dar baixa automática
      if (orderItemId) {
        await pickItem(orderItemId)
      } else if (currentOrderId) {
        // Tentar encontrar o item da ordem atual que corresponde a essa caixa
        try {
          const item = await prisma.orderItem.findFirst({
            where: {
              orderId: currentOrderId,
              picked: false,
              product: {
                location: {
                  box: pressedBox.toString()
                }
              }
            }
          })
          if (item) {
            await pickItem(item.id)
          }
        } catch (e) {
          console.error('Erro ao dar baixa via botão físico:', e)
        }
      }

      return NextResponse.json({ success: true, pressedBox })
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
