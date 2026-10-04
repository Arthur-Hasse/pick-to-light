import prisma from '@/lib/prisma'
import Link from 'next/link'

export default async function AdminOrdersPage() {
  let orders: any[] = []

  try {
    orders = await prisma.order.findMany({
      include: {
        operator: true,
        items: {
          include: {
            product: {
              include: { location: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  } catch (err) {
    console.error('Erro ao buscar ordens no Prisma:', err)
  }

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
            Ordens de Serviço (O.S.)
          </h1>
          <p className="text-slate-400 text-sm">
            Acompanhe o status das ordens atribuídas aos operadores e o progresso da separação.
          </p>
        </div>

        <Link 
          href="/admin/orders/new" 
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <span>+ Criar Nova Ordem</span>
        </Link>
      </div>

      <div className="bg-[#12141F] border border-[#20273A] rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#20273A]">
            <thead className="bg-[#161926]">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Identificador / Data</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Operador Atribuído</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Progresso da Coleta</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D2233] bg-[#12141F]">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">
                    Nenhuma ordem de serviço cadastrada até o momento.
                  </td>
                </tr>
              ) : (
                orders.map(order => {
                  const total = order.items.length
                  const picked = order.items.filter(i => i.picked).length
                  const percent = total > 0 ? Math.round((picked / total) * 100) : 0

                  return (
                    <tr key={order.id} className="hover:bg-[#181D2D]/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-white font-mono">
                          #{order.id.slice(-6).toUpperCase()}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {new Date(order.createdAt).toLocaleDateString()} às {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                        <div className="font-semibold text-white">
                          {order.operator?.name || 'Não atribuído'}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          @{order.operator?.username}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-[#1A1F30] h-2.5 rounded-full overflow-hidden border border-[#2B354F]">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                order.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-cyan-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-slate-300">
                            {picked}/{total} ({percent}%)
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-mono uppercase ${
                          order.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 
                          order.status === 'IN_PROGRESS' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 
                          'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            order.status === 'COMPLETED' ? 'bg-emerald-400' :
                            order.status === 'IN_PROGRESS' ? 'bg-cyan-400 animate-pulse' :
                            'bg-amber-400'
                          }`} />
                          {order.status === 'COMPLETED' ? 'Concluída' : order.status === 'IN_PROGRESS' ? 'Em Coleta' : 'Pendente'}
                        </span>
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
  )
}
