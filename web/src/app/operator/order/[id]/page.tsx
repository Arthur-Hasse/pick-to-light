import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ActiveOrderTerminal from './ActiveOrderTerminal'

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

  // Fetch all rack locations to render the 5x4 visual rack
  const allLocations = await prisma.location.findMany({
    orderBy: [
      { section: 'asc' },
      { shelf: 'asc' },
      { box: 'asc' }
    ]
  })

  return (
    <ActiveOrderTerminal 
      order={order} 
      allLocations={allLocations} 
    />
  )
}
