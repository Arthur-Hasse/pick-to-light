'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createOrder(data: { operatorId: string, items: { productId: string, quantity: number }[] }) {
  if (!data.operatorId || data.items.length === 0) {
    return { error: 'Selecione o operador e pelo menos um produto' }
  }

  try {
    const order = await prisma.order.create({
      data: {
        operatorId: data.operatorId,
        status: 'PENDING',
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            picked: false
          }))
        }
      }
    })
    
    revalidatePath('/admin/orders')
    revalidatePath('/admin')
    revalidatePath('/operator')
    return { success: true, orderId: order.id }
  } catch (error) {
    return { error: 'Erro ao criar ordem de serviço' }
  }
}

export async function pickItem(orderItemId: string) {
  try {
    const item = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: { include: { items: true } } }
    })

    if (!item) return { error: 'Item não encontrado' }

    await prisma.orderItem.update({
      where: { id: orderItemId },
      data: { picked: true }
    })

    // Busca a ordem fresca do banco para conferir se todos os itens estão concluídos
    const freshOrder = await prisma.order.findUnique({
      where: { id: item.orderId },
      include: { items: true }
    })

    const allItems = freshOrder?.items || []
    const allPicked = allItems.length > 0 && allItems.every(i => i.picked)

    if (allPicked) {
      await prisma.order.update({
        where: { id: item.orderId },
        data: { 
          status: 'COMPLETED',
          updatedAt: new Date()
        }
      })
    } else {
      await prisma.order.update({
        where: { id: item.orderId },
        data: { 
          status: 'IN_PROGRESS',
          updatedAt: new Date()
        }
      })
    }

    revalidatePath(`/operator/order/${item.orderId}`)
    revalidatePath('/operator')
    revalidatePath('/admin/orders')
    revalidatePath('/admin')
    return { success: true, allPicked }
  } catch (error) {
    return { error: 'Erro ao confirmar retirada' }
  }
}

export async function resetOrder(orderId: string) {
  try {
    await prisma.orderItem.updateMany({
      where: { orderId },
      data: { picked: false }
    })
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PENDING', updatedAt: new Date() }
    })

    revalidatePath(`/operator/order/${orderId}`)
    revalidatePath('/operator')
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    return { error: 'Erro ao reiniciar ordem' }
  }
}
