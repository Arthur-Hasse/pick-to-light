'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { formatProductMeta } from '@/lib/productHelper'

export async function createProduct(formData: FormData) {
  const name = formData.get('name') as string
  const rawDescription = formData.get('description') as string
  const locationId = formData.get('locationId') as string
  const weightInput = formData.get('weightGrams') as string
  const stockInput = formData.get('stock') as string
  const typeInput = formData.get('type') as string
  const dimensionsInput = formData.get('dimensions') as string

  if (!name || !locationId) {
    return { error: 'Nome e Posição são obrigatórios' }
  }

  const weightGrams = weightInput ? parseFloat(weightInput.replace(',', '.')) : 15.0
  const stock = stockInput ? parseInt(stockInput, 10) : 50
  const type = typeInput || 'Peça'
  const dimensions = dimensionsInput || 'Padrão'

  const formattedDescription = formatProductMeta({
    description: rawDescription,
    weightGrams,
    stock,
    type,
    dimensions,
  })

  try {
    let finalLocationId = locationId

    // Garante que a posição física existe no banco mesmo em deploys sem seed
    if (locationId) {
      let existingLoc = null
      try {
        existingLoc = await prisma.location.findUnique({ where: { id: locationId } })
      } catch (e) {
        console.warn('Busca de localização:', e)
      }

      if (!existingLoc) {
        const match = locationId.match(/loc-([A-Z])-(\d+)-(\d+)/)
        const section = match ? match[1] : 'A'
        const shelf = match ? match[2] : '1'
        const box = match ? match[3] : '1'

        const upserted = await prisma.location.upsert({
          where: {
            section_shelf_box: { section, shelf, box }
          },
          update: {},
          create: { section, shelf, box }
        })
        finalLocationId = upserted.id
      }
    }

    await prisma.product.create({
      data: {
        name,
        description: formattedDescription,
        locationId: finalLocationId
      }
    })
    
    revalidatePath('/admin/products')
    revalidatePath('/admin')
    return { success: true }
  } catch (error: any) {
    console.error('Erro ao cadastrar produto:', error)
    return { error: 'Erro ao cadastrar produto: ' + (error?.message || 'Falha no banco') }
  }
}

export async function deleteProduct(productId: string) {
  try {
    // Delete any order items referencing this product first
    await prisma.orderItem.deleteMany({
      where: { productId }
    })

    // Delete the product itself
    await prisma.product.delete({
      where: { id: productId }
    })

    revalidatePath('/admin/products')
    revalidatePath('/admin')
    revalidatePath('/operator')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir peça:', error)
    return { error: 'Falha ao excluir peça do estoque' }
  }
}

export async function clearAllProducts() {
  try {
    // Delete all order items first to satisfy foreign key constraints
    await prisma.orderItem.deleteMany({})

    // Delete all products
    await prisma.product.deleteMany({})

    revalidatePath('/admin/products')
    revalidatePath('/admin')
    revalidatePath('/operator')
    return { success: true }
  } catch (error) {
    console.error('Erro ao limpar estoque:', error)
    return { error: 'Falha ao limpar estoque' }
  }
}
