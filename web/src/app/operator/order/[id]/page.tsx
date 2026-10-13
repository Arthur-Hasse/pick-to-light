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

  // 1. Ao abrir o terminal de coleta, pausa outras ordens ativas para não haver conflito de LEDs
  try {
    await prisma.order.updateMany({
      where: {
        status: 'IN_PROGRESS',
        id: { not: id }
      },
      data: { status: 'PENDING' }
    })

    // 2. Define esta ordem aberta como IN_PROGRESS
    if (order.status !== 'COMPLETED') {
      await prisma.order.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          updatedAt: new Date()
        }
      })
      order.status = 'IN_PROGRESS'
    }
  } catch (err) {
    console.error('Erro ao atualizar status da ordem para IN_PROGRESS:', err)
  }

  // 3. Garante que as 20 posições da estante estejam inicializadas
  const allLocations = await getOrSeedLocations()

  return (
    <ActiveOrderTerminal 
      order={order} 
      allLocations={allLocations} 
    />
  )
}
