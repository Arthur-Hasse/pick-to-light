import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { logout } from '@/actions/auth'
import Link from 'next/link'
import prisma from '@/lib/prisma'

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const role = cookieStore.get('userRole')?.value
  const userId = cookieStore.get('userId')?.value

  if (role !== 'OPERATOR') {
    redirect('/')
  }

  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null

  return (
    <div className="min-h-screen bg-[#0B0D14] flex flex-col text-slate-100">
      {/* Operator Industrial Header */}
      <header className="bg-[#12141F] border-b border-[#20273A] sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/operator" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center font-black text-black text-sm shadow-md">
                PTL
              </div>
              <div>
                <span className="font-extrabold text-base sm:text-lg tracking-wider text-white">MULTILOG</span>
                <span className="ml-2 text-xs font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Terminal Operador
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#181D2D] border border-[#263147] text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300 font-mono">
                {user ? user.name : 'Operador'}
              </span>
            </div>

            <form action={logout}>
              <button 
                type="submit" 
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-[#1A1F30] hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 border border-[#2B354F] transition-all cursor-pointer"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full">
        {children}
      </main>
    </div>
  )
}
