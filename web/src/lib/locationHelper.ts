import prisma from '@/lib/prisma'

export async function getOrSeedLocations() {
  try {
    let locations = await prisma.location.findMany({
      include: {
        products: {
          orderBy: { updatedAt: 'desc' }
        }
      },
      orderBy: [
        { section: 'asc' },
        { shelf: 'asc' },
        { box: 'asc' }
      ]
    })

    // Se o banco estiver vazio (ex: deploy novo na Vercel), auto-gera as 20 caixas da estante
    if (locations.length === 0) {
      console.log('Populando automaticamente as 20 posições da estante Pick to Light...')
      const createdLocs = []
      for (let shelf = 1; shelf <= 5; shelf++) {
        for (let box = 1; box <= 4; box++) {
          const loc = await prisma.location.upsert({
            where: {
              section_shelf_box: {
                section: 'A',
                shelf: shelf.toString(),
                box: box.toString(),
              }
            },
            update: {},
            create: {
              section: 'A',
              shelf: shelf.toString(),
              box: box.toString(),
            },
            include: { products: true }
          })
          createdLocs.push(loc)
        }
      }
      return createdLocs
    }

    return locations
  } catch (err) {
    console.warn('Fallback: gerando posições virtuais da matriz Pick to Light:', err)
    // Fallback virtual para que o dropdown NUNCA fique vazio
    const fallbackList = []
    for (let shelf = 1; shelf <= 5; shelf++) {
      for (let box = 1; box <= 4; box++) {
        fallbackList.push({
          id: `loc-A-${shelf}-${box}`,
          section: 'A',
          shelf: shelf.toString(),
          box: box.toString(),
          products: [],
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    }
    return fallbackList
  }
}
