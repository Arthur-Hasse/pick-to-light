import prisma from '@/lib/prisma'
import Link from 'next/link'
import OrderForm from './OrderForm'

export default async function NewOrderPage() {
  let products: any[] = []
  let operators: any[] = []

  try {
    products = await prisma.product.findMany({
      include: { location: true },
      orderBy: { name: 'asc' }
    })

    operators = await prisma.user.findMany({
      where: { role: 'OPERATOR' },
      orderBy: { name: 'asc' }
    })
  } catch (err) {
    console.error('Erro ao buscar produtos/operadores:', err)
  }

  if (operators.length === 0) {
    operators = [{ id: 'operator-seed-id', name: 'João Operador (Bancada PTL)', username: 'operador1' }]
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/orders" className="text-slate-400 hover:text-slate-200 text-sm">
            &larr; Voltar para Ordens
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Nova Ordem de Serviço
          </h1>
          <p className="text-slate-400 text-sm">
            Selecione o operador responsável e as peças que devem ser separadas na estante.
          </p>
        </div>
      </div>

      <OrderForm products={products} operators={operators} />
    </div>
  )
}
