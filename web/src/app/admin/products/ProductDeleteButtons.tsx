'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProduct, clearAllProducts } from '@/actions/products'

export function DeleteProductButton({ 
  productId, 
  productName, 
  locationLabel 
}: { 
  productId: string
  productName: string
  locationLabel?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    const locText = locationLabel ? ` (Gaveta ${locationLabel})` : ''
    const msg = `Deseja realmente excluir a peça "${productName}"${locText}?\nA posição na estante será liberada.`
    
    if (!confirm(msg)) {
      return
    }

    setLoading(true)
    const res = await deleteProduct(productId)
    if (!res.success && res.error) {
      alert(res.error)
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer disabled:opacity-50"
      title={`Excluir ${productName}`}
    >
      {loading ? (
        <span className="text-[10px] font-mono text-rose-400">...</span>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )}
    </button>
  )
}

export function ClearAllProductsButton({ total }: { total: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClear = async () => {
    if (total === 0) return
    const msg = `ATENÇÃO: Deseja realmente excluir TODAS as ${total} peças cadastradas e liberar todas as gavetas da estante?\nEsta ação apagará os itens e não poderá ser desfeita.`
    
    if (!confirm(msg)) {
      return
    }

    setLoading(true)
    const res = await clearAllProducts()
    if (!res.success && res.error) {
      alert(res.error)
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={handleClear}
      disabled={loading || total === 0}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      title="Limpar todas as peças do estoque"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      <span>{loading ? 'Limpando...' : 'Limpar Todo o Estoque'}</span>
    </button>
  )
}
