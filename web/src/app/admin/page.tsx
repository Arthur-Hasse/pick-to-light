import prisma from '@/lib/prisma'
import Link from 'next/link'
import { parseProductMeta } from '@/lib/productHelper'
import { getOrSeedLocations } from '@/lib/locationHelper'

export default async function AdminDashboard() {
  let usersCount = 1
  let products: any[] = []
  let orders: any[] = []
  let locations: any[] = []

  try {
    usersCount = await prisma.user.count({ where: { role: 'OPERATOR' } })
    products = await prisma.product.findMany({
      include: { location: true }
    })
    orders = await prisma.order.findMany({
      include: { items: true }
    })
  } catch (err) {
    console.error('Erro ao buscar dados do AdminDashboard no Prisma:', err)
  }

  locations = await getOrSeedLocations()

  const pendingOrders = orders.filter((o: any) => o.status === 'PENDING').length
  const inProgressOrders = orders.filter((o: any) => o.status === 'IN_PROGRESS').length
  const completedOrders = orders.filter((o: any) => o.status === 'COMPLETED').length

  // Build grid map for the rack (Shelves 1..5, Boxes 1..4)
  const rackMap: Record<string, any> = {}
  locations.forEach((loc: any) => {
    rackMap[`${loc.shelf}-${loc.box}`] = loc
  })

  return (
    <div className="space-y-8">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Painel de Supervisão
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitoramento em tempo real do armazém, ordens de separação e estante Pick to Light.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/admin/orders/new" 
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            <span>+ Nova Ordem de Serviço</span>
          </Link>
          <Link 
            href="/admin/products" 
            className="bg-[#181D2D] hover:bg-[#20273D] text-slate-200 border border-[#2B354F] font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
          >
            Gerenciar Peças
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#12141F] border border-[#20273A] p-5 rounded-2xl relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operadores Ativos</div>
          <div className="text-3xl font-black text-white mt-2">{usersCount}</div>
          <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1 font-mono">
            <span>● 100% disponíveis</span>
          </div>
        </div>

        <div className="bg-[#12141F] border border-[#20273A] p-5 rounded-2xl relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Peças Cadastradas</div>
          <div className="text-3xl font-black text-cyan-400 mt-2">{products.length}</div>
          <div className="text-xs text-slate-400 mt-2 font-mono">
            Posições: {locations.filter((l: any) => (l.products?.length || 0) > 0).length} / {locations.length}
          </div>
        </div>

        <div className="bg-[#12141F] border border-[#20273A] p-5 rounded-2xl relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">O.S. em Andamento</div>
          <div className="text-3xl font-black text-amber-400 mt-2">{inProgressOrders + pendingOrders}</div>
          <div className="text-xs text-slate-400 mt-2 font-mono">
            {pendingOrders} pendentes · {inProgressOrders} ativas
          </div>
        </div>

        <div className="bg-[#12141F] border border-[#20273A] p-5 rounded-2xl relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">O.S. Concluídas</div>
          <div className="text-3xl font-black text-emerald-400 mt-2">{completedOrders}</div>
          <div className="text-xs text-emerald-400/80 mt-2 font-mono">
            Histórico finalizado
          </div>
        </div>
      </div>

      {/* Visual Rack Preview (Matriz da Estante Pick to Light) */}
      <div className="bg-[#12141F] border border-[#20273A] rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 mb-5 border-b border-[#20273A] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Estante Física Pick-to-Light (Seção A)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Grade espacial com 5 prateleiras e 4 caixas organizadoras por nível.
            </p>
          </div>

          {/* Legenda */}
          <div className="flex items-center flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-slate-400">Em Estoque</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="text-slate-400">Estoque Baixo (&le; 5)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
              <span className="text-slate-400">Caixa Vazia</span>
            </div>
          </div>
        </div>

        {/* Rack Matrix Grid */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(shelfNum => (
            <div key={shelfNum} className="flex items-center gap-3">
              <div className="w-16 text-right font-mono text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                Nível {shelfNum}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                {[1, 2, 3, 4].map(boxNum => {
                  const loc = rackMap[`${shelfNum}-${boxNum}`]
                  const product = loc?.products[0]
                  const meta = product ? parseProductMeta(product.description) : null
                  const isLow = meta ? meta.stock <= 5 : false

                  return (
                    <div 
                      key={boxNum}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between min-h-[90px] ${
                        product
                          ? isLow
                            ? 'bg-[#211F18] border-amber-500/50 hover:border-amber-400'
                            : 'bg-[#181D2D] border-[#29334D] hover:border-blue-500/60'
                          : 'bg-[#10121C] border-[#1C2030] border-dashed opacity-60 hover:opacity-100 hover:border-cyan-500/50 transition-all group'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-slate-400 uppercase font-semibold">
                          A-{shelfNum}-{boxNum}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${
                          product
                            ? isLow ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]' : 'bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.8)]'
                            : 'bg-slate-700'
                        }`} />
                      </div>

                      <div className="my-1">
                        <div className="font-bold text-sm text-white truncate">
                          {product ? product.name : <span className="text-slate-600 font-normal">Livre</span>}
                        </div>
                        {meta && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {meta.stock} un · {meta.weightGrams}g
                          </div>
                        )}
                      </div>

                      {product ? (
                        <div className="text-[10px] text-slate-500 truncate">
                          {meta?.type || 'Peça'}
                        </div>
                      ) : (
                        <Link 
                          href={loc ? `/admin/products?locationId=${loc.id}` : '/admin/products'}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1 transition-colors group-hover:underline"
                          title={`Cadastrar peça na posição Estante ${loc?.section || 'A'} - Nível ${shelfNum} - Caixa ${boxNum}`}
                        >
                          <span>+ Cadastrar</span>
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders List */}
      <div className="bg-[#12141F] border border-[#20273A] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#20273A]">
          <h2 className="text-lg font-bold text-white">Ordens Recentes</h2>
          <Link href="/admin/orders" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
            Ver Todas as Ordens &rarr;
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Nenhuma ordem de serviço cadastrada até o momento.
          </div>
        ) : (
          <div className="divide-y divide-[#1F263A]">
            {orders.slice(0, 5).map(order => (
              <div key={order.id} className="py-3.5 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-300 mr-2">
                    #{order.id.slice(-5).toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-400">
                    {order.items.length} itens · Criado em {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-mono uppercase ${
                    order.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    order.status === 'IN_PROGRESS' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                    'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {order.status === 'COMPLETED' ? 'Concluída' : order.status === 'IN_PROGRESS' ? 'Em Coleta' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
