import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ActiveOrderTerminal from './ActiveOrderTerminal'
import { getOrSeedLocations } from '@/lib/locationHelper'

export default async function ActiveOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      operator: true,
      items: {
        include: {
          product: {
            include: { location: true }
          }
        }
      }
    }
  })

  if (!order) {
    redirect('/operator')
  }

  // 1. Verifica se todos os itens já foram concluídos
  const allPicked = order.items.length > 0 && order.items.every(i => i.picked)

  try {
    if (allPicked) {
      // Se todos os itens já foram coletados, garante o status COMPLETED
      if (order.status !== 'COMPLETED') {
        await prisma.order.update({
          where: { id },
          data: { status: 'COMPLETED', updatedAt: new Date() }
        })
        order.status = 'COMPLETED'
      }
    } else {
      // Se ainda há itens pendentes, pausa outras ordens
      await prisma.order.updateMany({
        where: {
          status: 'IN_PROGRESS',
          id: { not: id }
        },
        data: { status: 'PENDING' }
      })

      // E marca esta ordem aberta como IN_PROGRESS
      if (order.status !== 'IN_PROGRESS') {
        await prisma.order.update({
          where: { id },
          data: {
            status: 'IN_PROGRESS',
            updatedAt: new Date()
          }
        })
        order.status = 'IN_PROGRESS'
      }
    }
  } catch (err) {
    console.error('Erro ao gerenciar status da ordem no ActiveOrderPage:', err)
  }

  // 2. Garante que as 20 posições da estante estejam inicializadas
  const allLocations = await getOrSeedLocations()

  return (
    <ActiveOrderTerminal 
      order={order} 
      allLocations={allLocations} 
    />
  )
}
