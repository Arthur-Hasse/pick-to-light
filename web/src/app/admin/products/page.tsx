import prisma from '@/lib/prisma'
import Link from 'next/link'
import { parseProductMeta } from '@/lib/productHelper'
import { DeleteProductButton, ClearAllProductsButton } from './ProductDeleteButtons'
import ProductForm from './ProductForm'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string }>
}) {
  const { locationId } = await searchParams

  const products = await prisma.product.findMany({
    include: { location: true },
    orderBy: { name: 'asc' }
  })

  const locations = await prisma.location.findMany({
    include: { products: true },
    orderBy: [
      { section: 'asc' },
      { shelf: 'asc' },
      { box: 'asc' }
    ]
  })

  const preselectedLocation = locationId ? locations.find(l => l.id === locationId) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-slate-400 hover:text-slate-200 text-sm">
              &larr; Voltar ao Painel
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Gerenciamento de Peças & Estoque
          </h1>
          <p className="text-slate-400 text-sm">
            Cadastre peças com posicionamento na estante Pick to Light e especificações de peso para a balança.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulário de Cadastro */}
        <div className="bg-[#12141F] border border-[#20273A] p-6 rounded-2xl shadow-xl h-fit">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20273A]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <h2 className="text-lg font-bold text-white">Nova Peça</h2>
            </div>
          </div>

          {/* Notificação de Posição Pré-selecionada da Estante */}
          {preselectedLocation && (
            <div className="mb-4 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-xs text-cyan-200 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
                <span>
                  Posição selecionada da estante:{' '}
                  <strong className="text-white font-mono">
                    {preselectedLocation.section}-{preselectedLocation.shelf}-{preselectedLocation.box}
                  </strong>{' '}
                  (Nível {preselectedLocation.shelf} · Caixa {preselectedLocation.box})
                </span>
              </div>
              <Link 
                href="/admin/products"
                className="text-slate-400 hover:text-white text-[11px] underline ml-2 shrink-0"
              >
                Limpar
              </Link>
            </div>
          )}

          <ProductForm 
            locations={locations} 
            preselectedLocationId={locationId} 
          />
        </div>

        {/* Lista de Peças */}
        <div className="lg:col-span-2 bg-[#12141F] border border-[#20273A] rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#20273A] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Peças Cadastradas</h2>
              <p className="text-xs text-slate-400">Total de {products.length} itens no estoque</p>
            </div>

            {/* Botão de Limpar Estoque Geral */}
            <ClearAllProductsButton total={products.length} />
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-[#20273A]">
              <thead className="bg-[#161926]">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Peça / Tipo</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Posição (LED)</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Peso Unit.</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Estoque</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D2233] bg-[#12141F]">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                      Nenhuma peça cadastrada. Cadastre uma nova peça ao lado.
                    </td>
                  </tr>
                ) : (
                  products.map(product => {
                    const meta = parseProductMeta(product.description)
                    const isLow = meta.stock <= 5
                    const locLabel = product.location 
                      ? `${product.location.section}-${product.location.shelf}-${product.location.box}` 
                      : undefined

                    return (
                      <tr key={product.id} className="hover:bg-[#181D2D]/60 transition-colors">
                        <td className="px-5 py-4">
                          <div className="text-sm font-bold text-white">{product.name}</div>
                          <div className="text-xs text-slate-400">{meta.type} · {meta.dimensions}</div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {product.location ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1A2234] border border-[#2D3B59] rounded-lg font-mono text-xs text-cyan-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                              {locLabel}
                            </span>
                          ) : (
                            <span className="text-xs text-rose-400">Sem local</span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap font-mono text-sm text-slate-300">
                          {meta.weightGrams} g
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                            isLow 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isLow ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                            {meta.stock} un
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          {/* Lixeira para excluir o item */}
                          <DeleteProductButton 
                            productId={product.id} 
                            productName={product.name} 
                            locationLabel={locLabel} 
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
