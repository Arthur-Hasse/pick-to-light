'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createProduct } from '@/actions/products'

type LocationWithProducts = {
  id: string
  section: string
  shelf: string
  box: string
  products: { id: string; name: string }[]
}

export default function ProductForm({
  locations,
  preselectedLocationId,
}: {
  locations: LocationWithProducts[]
  preselectedLocationId?: string
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState(preselectedLocationId || '')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    const res = await createProduct(formData)

    if (res?.error) {
      setError(res.error)
      setLoading(false)
    } else {
      setSuccess('Peça cadastrada com sucesso no estoque e na estante!')
      formRef.current?.reset()
      setSelectedLocation('')
      router.refresh()
      setLoading(false)
      setTimeout(() => setSuccess(null), 4000)
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 font-medium">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 font-medium flex items-center gap-1.5 animate-pulse">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
          Nome da Peça *
        </label>
        <input 
          type="text" 
          name="name" 
          required 
          className="w-full bg-[#181D2D] border border-[#2A334B] text-white px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-cyan-500 font-medium"
          placeholder="Ex: Parafuso Sextavado M8"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Tipo / Categoria
          </label>
          <input 
            type="text" 
            name="type" 
            defaultValue="Fixador"
            className="w-full bg-[#181D2D] border border-[#2A334B] text-white px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-cyan-500"
            placeholder="Ex: Parafuso"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Dimensões
          </label>
          <input 
            type="text" 
            name="dimensions" 
            defaultValue="M8x20mm"
            className="w-full bg-[#181D2D] border border-[#2A334B] text-white px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-cyan-500"
            placeholder="Ex: 20mm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Peso Unitário (g)
          </label>
          <input 
            type="number" 
            step="0.1"
            min="0.1"
            name="weightGrams" 
            defaultValue="15.0"
            required
            className="w-full bg-[#181D2D] border border-[#2A334B] text-white px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-cyan-500 font-mono"
            placeholder="15.0"
          />
          <span className="text-[10px] text-slate-500 mt-0.5 block">Usado na balança</span>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Estoque Inicial
          </label>
          <input 
            type="number" 
            min="0"
            name="stock" 
            defaultValue="50"
            required
            className="w-full bg-[#181D2D] border border-[#2A334B] text-white px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-cyan-500 font-mono"
            placeholder="50"
          />
          <span className="text-[10px] text-slate-500 mt-0.5 block">Qtd em unidades</span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
          Posição na Estante (Pick-to-Light) *
        </label>
        <select 
          name="locationId" 
          required
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="w-full bg-[#181D2D] border border-[#2A334B] text-white px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-cyan-500 font-mono"
        >
          <option value="">Selecione uma caixa...</option>
          {(locations && locations.length > 0 ? locations : Array.from({ length: 20 }, (_, idx) => {
            const shelf = (Math.floor(idx / 4) + 1).toString()
            const box = ((idx % 4) + 1).toString()
            return {
              id: `loc-A-${shelf}-${box}`,
              section: 'A',
              shelf,
              box,
              products: []
            }
          })).map(loc => {
            const isOccupied = (loc.products?.length || 0) > 0
            const isCurrent = loc.id === preselectedLocationId
            const productName = isOccupied ? loc.products[0]?.name : ''
            return (
              <option key={loc.id} value={loc.id} className="bg-[#181D2D] text-white">
                {isCurrent ? '★ [SELECIONADA] ' : ''}Estante {loc.section} &gt; Nível {loc.shelf} &gt; Caixa {loc.box} {isOccupied ? `(Ocupado: ${productName})` : '(Livre)'}
              </option>
            )
          })}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
          Descrição Adicional
        </label>
        <textarea 
          name="description" 
          rows={2}
          className="w-full bg-[#181D2D] border border-[#2A334B] text-white px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-cyan-500 placeholder-slate-600"
          placeholder="Detalhes técnicos ou fornecedor"
        />
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer text-sm disabled:opacity-50"
      >
        {loading ? 'Cadastrando Peça...' : 'Salvar Peça no Estoque'}
      </button>
    </form>
  )
}
