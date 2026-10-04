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
    await prisma.product.create({
      data: {
        name,
        description: formattedDescription,
        locationId
      }
    })
    
    revalidatePath('/admin/products')
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    return { error: 'Erro ao cadastrar produto' }
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
