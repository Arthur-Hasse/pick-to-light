import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function OperatorDashboard() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value

  // Buscar pedidos atribuídos a este operador
  const activeOrders = await prisma.order.findMany({
    where: { 
      operatorId: userId || '',
      status: { not: 'COMPLETED' }
    },
    include: {
      items: {
        include: {
          product: {
            include: { location: true }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  const completedOrders = await prisma.order.findMany({
    where: { 
      operatorId: userId || '',
      status: 'COMPLETED' 
    },
    include: { items: true },
    orderBy: { updatedAt: 'desc' },
    take: 3
  })

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Minhas Ordens de Serviço
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Selecione uma ordem para abrir a bancada guiada com luzes Pick to Light e validação.
          </p>
        </div>

        {/* Workflows explanation badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#181D2D] border border-cyan-500/30 text-cyan-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Modo 1: Botão Pick-to-Light
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#181D2D] border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Modo 2: Balança de Dupla Verificação
          </span>
        </div>
      </div>

      {/* Active Orders List */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <span>Ordens Pendentes para Separação</span>
          <span className="px-2 py-0.5 rounded-full bg-[#1A1F30] text-cyan-400 font-mono text-xs border border-[#2B354F]">
            {activeOrders.length}
          </span>
        </h2>

        {activeOrders.length === 0 ? (
          <div className="bg-[#12141F] border border-[#20273A] p-12 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl">
              ✓
            </div>
            <h3 className="text-lg font-bold text-white">Nenhum pedido pendente no momento</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Todas as ordens atribuídas a você foram concluídas. Aguarde novas tarefas enviadas pela supervisão.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeOrders.map(order => {
              const pendingCount = order.items.filter(i => !i.picked).length
              const totalCount = order.items.length
              const isStarted = order.status === 'IN_PROGRESS'

              return (
                <div 
                  key={order.id} 
                  className="bg-[#12141F] border border-[#20273A] hover:border-cyan-500/50 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="font-mono text-xs text-slate-400 uppercase">Ordem de Serviço</span>
                        <h3 className="font-black text-xl text-white font-mono group-hover:text-cyan-400 transition-colors">
                          #{order.id.slice(-6).toUpperCase()}
                        </h3>
                      </div>
                      
                      <span className={`px-2.5 py-1 text-xs font-semibold font-mono rounded-full uppercase ${
                        isStarted 
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {isStarted ? 'Em Coleta' : 'Aguardando'}
                      </span>
                    </div>

                    {/* Progress details */}
                    <div className="space-y-2 mb-6 bg-[#181D2D] p-3.5 rounded-xl border border-[#232B3F] text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Total de Peças:</span>
                        <strong className="font-mono text-white">{totalCount} posições</strong>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Restantes para Coletar:</span>
                        <strong className="font-mono text-amber-400">{pendingCount} itens</strong>
                      </div>
                      
                      {/* Mini visual progress bar */}
                      <div className="w-full bg-[#10121C] h-2 rounded-full overflow-hidden mt-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all"
                          style={{ width: `${Math.round(((totalCount - pendingCount) / totalCount) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Preview of items */}
                    <div className="text-xs text-slate-400 mb-6 space-y-1">
                      <span className="font-semibold text-slate-300 block mb-1">Itens inclusos:</span>
                      {order.items.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center justify-between text-slate-400">
                          <span className="truncate max-w-[180px]">{item.product.name}</span>
                          <span className="font-mono text-slate-500">
                            {item.quantity} un · {item.product.location ? `${item.product.location.section}-${item.product.location.shelf}-${item.product.location.box}` : ''}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="text-[11px] text-slate-500 italic">
                          + {order.items.length - 3} outros itens...
                        </div>
                      )}
                    </div>
                  </div>

                  <Link 
                    href={`/operator/order/${order.id}`}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all text-sm"
                  >
                    <span>{isStarted ? 'CONTINUAR COLETA GUIADA' : 'INICIAR PICK TO LIGHT'}</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Completed Orders History */}
      {completedOrders.length > 0 && (
        <div className="pt-6 border-t border-[#20273A]">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Ordens Concluídas Recentemente
          </h2>
          <div className="bg-[#12141F] border border-[#20273A] rounded-2xl divide-y divide-[#1D2233] overflow-hidden">
            {completedOrders.map(order => (
              <div key={order.id} className="p-4 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="font-mono font-bold text-white">#{order.id.slice(-6).toUpperCase()}</span>
                  <span className="text-slate-400">{order.items.length} itens coletados</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono">
                    Concluída em {new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-emerald-400 font-semibold uppercase">✓ Finalizada</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
