import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Populando o banco de dados com dados iniciais...')

  // Criar Admin
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrador',
      username: 'admin',
      password: '123', // Senha mock
      role: 'ADMIN',
    },
  })

  // Criar Operador
  const operator = await prisma.user.upsert({
    where: { username: 'operador1' },
    update: {},
    create: {
      name: 'João Operador',
      username: 'operador1',
      password: '123',
      role: 'OPERATOR',
    },
  })

  // Criar Posições Físicas (Ex: Estante A, 5 prateleiras, 4 posições cada)
  const locations = []
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
        }
      })
      locations.push(loc)
    }
  }

  // Criar Alguns Produtos
  const product1 = await prisma.product.create({
    data: {
      name: 'Parafuso M8',
      description: 'Caixa de parafusos M8x20mm',
      locationId: locations[0].id // A-1-1
    }
  })

  const product2 = await prisma.product.create({
    data: {
      name: 'Porca M8',
      description: 'Caixa de porcas sextavadas M8',
      locationId: locations[1].id // A-1-2
    }
  })

  console.log('Banco de dados populado com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
