'use client'

import { useState } from 'react'
import { createOrder } from '@/actions/orders'
import { useRouter } from 'next/navigation'

type Product = { 
  id: string
  name: string
  location: { section: string, shelf: string, box: string } | null 
}
type User = { id: string, name: string, username: string }

export default function OrderForm({ products, operators }: { products: Product[], operators: User[] }) {
  const router = useRouter()
  const [operatorId, setOperatorId] = useState('')
  const [items, setItems] = useState<{ productId: string, quantity: number }[]>([
    { productId: '', quantity: 1 }
  ])
  const [loading, setLoading] = useState(false)

  const addItem = () => setItems([...items, { productId: '', quantity: 1 }])
  
  const removeItem = (index: number) => {
    if (items.length <= 1) return
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const validItems = items.filter(i => i.productId !== '' && i.quantity > 0)
    if (validItems.length === 0) {
      alert('Selecione pelo menos um produto válido.')
      setLoading(false)
      return
    }
    
    const res = await createOrder({ operatorId, items: validItems })
    if (res.success) {
      router.push('/admin/orders')
    } else {
      alert(res.error || 'Erro ao gerar ordem')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#12141F] border border-[#20273A] p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
          Operador Responsável pela Coleta *
        </label>
        <select 
          required
          value={operatorId}
          onChange={e => setOperatorId(e.target.value)}
          className="w-full bg-[#181D2D] border border-[#2A334B] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 font-medium text-sm"
        >
          <option value="">Selecione o operador designado...</option>
          {operators.map(op => (
            <option key={op.id} value={op.id} className="bg-[#181D2D] text-white">
              {op.name} (@{op.username})
            </option>
          ))}
        </select>
      </div>

      <div className="pt-4 border-t border-[#20273A]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Itens da Ordem de Serviço</h3>
            <p className="text-xs text-slate-400">Adicione as peças que deverão ser retiradas da estante</p>
          </div>
          <button 
            type="button" 
            onClick={addItem}
            className="text-xs bg-[#1A1F30] hover:bg-[#23293D] text-cyan-400 border border-cyan-500/30 py-1.5 px-3 rounded-lg font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>+ Adicionar Item</span>
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-[#181D2D] p-3.5 rounded-xl border border-[#2A334B]">
              <div className="flex-1">
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 sm:hidden">Peça</label>
                <select 
                  required
                  value={item.productId}
                  onChange={e => updateItem(index, 'productId', e.target.value)}
                  className="w-full bg-[#12141F] border border-[#2B354F] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Selecione a peça...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} className="bg-[#12141F] text-white">
                      {p.name} {p.location ? `— Caixa ${p.location.section}-${p.location.shelf}-${p.location.box}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-28 flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 sm:hidden">Qtd</label>
                  <input 
                    type="number" 
                    min="1"
                    required
                    value={item.quantity}
                    onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full bg-[#12141F] border border-[#2B354F] text-white px-3 py-2 rounded-lg text-sm text-center font-mono focus:outline-none focus:border-cyan-500"
                    placeholder="Qtd"
                  />
                </div>

                {items.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeItem(index)}
                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Remover Item"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-[#20273A]">
        <button 
          type="submit" 
          disabled={loading || !operatorId}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
        >
          {loading ? 'Transmitindo Ordem...' : 'Emitir Ordem para o Operador'}
        </button>
      </div>
    </form>
  )
}
