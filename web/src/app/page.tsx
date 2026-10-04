'use client'

import { login } from '@/actions/auth'
import { useState } from 'react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setPreset = (u: string, p: string) => {
    setUsername(u)
    setPassword(p)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)

    const res = await login(formData)
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0D14] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background industrial grid pattern */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#3B82F6 1px, transparent 1px), radial-gradient(#10B981 1px, #0B0D14 1px)',
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 20px 20px',
        }}
      />

      <div className="max-w-md w-full bg-[#12141F] border border-[#23293D] rounded-2xl shadow-2xl p-8 relative z-10">
        {/* Header with LED Indicator */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1A1F30] border border-[#2B354F] text-cyan-400 mb-4 shadow-inner">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">Sistema Conectado</span>
          </div>
          
          <h1 className="text-3xl font-extrabold text-white tracking-tight">MULTILOG</h1>
          <p className="text-sm font-medium text-slate-400 mt-1">Pick to Light & Gestão de Estoque</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 font-medium text-center">
              ⚠️ {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Usuário / Matrícula
            </label>
            <div className="relative">
              <input 
                type="text" 
                name="username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
                className="w-full bg-[#181D2D] border border-[#2A334B] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono text-sm placeholder-slate-500 transition-all"
                placeholder="Ex: admin ou operador1"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Senha de Acesso
            </label>
            <input 
              type="password" 
              name="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              className="w-full bg-[#181D2D] border border-[#2A334B] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono text-sm placeholder-slate-500 transition-all"
              placeholder="Digite sua senha"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Autenticando...
              </span>
            ) : (
              <>
                <span>ACESSAR SISTEMA</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Quick Credentials / Profiles */}
        <div className="mt-8 pt-6 border-t border-[#20273A]">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
            Acesso Rápido de Demonstração
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPreset('admin', '123')}
              className="px-3 py-2.5 rounded-lg bg-[#181D2D] hover:bg-[#20263C] border border-[#29324B] text-xs text-left transition-colors flex flex-col"
            >
              <span className="font-bold text-blue-400">Supervisor</span>
              <span className="text-[11px] text-slate-400 font-mono">admin / 123</span>
            </button>
            <button
              type="button"
              onClick={() => setPreset('operador1', '123')}
              className="px-3 py-2.5 rounded-lg bg-[#181D2D] hover:bg-[#20263C] border border-[#29324B] text-xs text-left transition-colors flex flex-col"
            >
              <span className="font-bold text-emerald-400">Operador</span>
              <span className="text-[11px] text-slate-400 font-mono">operador1 / 123</span>
            </button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <span className="text-[11px] text-slate-500">
            PI 3 · Pick-to-Light & Verificação Industrial
          </span>
        </div>
      </div>
    </div>
  )
}
