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

  // Garante que as 20 posições da estante estejam inicializadas
  const allLocations = await getOrSeedLocations()

  return (
    <ActiveOrderTerminal 
      order={order} 
      allLocations={allLocations} 
    />
  )
}

