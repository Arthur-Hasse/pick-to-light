'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { pickItem, resetOrder } from '@/actions/orders'
import { parseProductMeta } from '@/lib/productHelper'

type LocationType = {
  id: string
  section: string
  shelf: string
  box: string
}

type ProductType = {
  id: string
  name: string
  description: string | null
  location: LocationType | null
}

type OrderItemType = {
  id: string
  productId: string
  quantity: number
  picked: boolean
  product: ProductType
}

type OrderType = {
  id: string
  status: string
  items: OrderItemType[]
  operator?: { name: string } | null
}

export type OperationMode = 'PICK_TO_LIGHT' | 'SCALE_VERIFICATION' | 'HYBRID'

export default function ActiveOrderTerminal({
  order,
  allLocations,
}: {
  order: OrderType
  allLocations: LocationType[]
}) {
  const router = useRouter()
  // Mode selection: Pick to Light (Arthur) vs Balança (Edilson) vs Híbrido
  const [mode, setMode] = useState<OperationMode>('PICK_TO_LIGHT')
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  
  // ESP32 Wi-Fi Hardware Integration (3 LEDs + 3 Botões)
  const [espIp, setEspIp] = useState<string>('')
  const [espConnected, setEspConnected] = useState<boolean>(false)
  const [espTesting, setEspTesting] = useState<boolean>(false)
  const [espActiveBox, setEspActiveBox] = useState<number | null>(null)
  const [espMessage, setEspMessage] = useState<string>('')

  // Scale verification modal state (for Edilson's mode)
  const [activeScaleItem, setActiveScaleItem] = useState<OrderItemType | null>(null)
  const [measuredWeight, setMeasuredWeight] = useState<string>('')
  const [scaleFeedback, setScaleFeedback] = useState<{ valid: boolean; message: string } | null>(null)

  // Map locations for the shelf matrix (Shelves 1..5, Boxes 1..4)
  const locationMap: Record<string, LocationType> = {}
  allLocations.forEach(loc => {
    locationMap[`${loc.shelf}-${loc.box}`] = loc
  })

  // Map order items by location: shelf-box -> item
  const orderItemsByLocation: Record<string, OrderItemType> = {}
  order.items.forEach(item => {
    if (item.product.location) {
      const key = `${item.product.location.shelf}-${item.product.location.box}`
      orderItemsByLocation[key] = item
    }
  })

  const totalItems = order.items.length
  const pickedCount = order.items.filter(i => i.picked).length
  const pendingCount = totalItems - pickedCount
  const isCompleted = pickedCount === totalItems && totalItems > 0

  // Carrega IP salvo do ESP32 no localStorage
  useEffect(() => {
    const savedIp = localStorage.getItem('ptl_esp32_ip')
    if (savedIp) {
      setEspIp(savedIp)
      checkEspStatus(savedIp)
    }
  }, [])

  // Função para testar conexão com o ESP32
  const checkEspStatus = async (ipToUse: string) => {
    const cleanIp = ipToUse.replace(/^https?:\/\//, '').replace(/\/$/, '').trim()
    if (!cleanIp) {
      setEspMessage('Insira o IP do ESP32')
      return
    }
    setEspTesting(true)
    setEspMessage('Testando conexão...')
    try {
      const res = await fetch(`http://${cleanIp}/status`, { 
        signal: AbortSignal.timeout(3000),
        mode: 'cors'
      })
      if (res.ok) {
        setEspConnected(true)
        localStorage.setItem('ptl_esp32_ip', cleanIp)
        setEspMessage(`Conectado ao ESP32 (${cleanIp})`)
      } else {
        setEspConnected(false)
        setEspMessage('ESP32 não respondeu.')
      }
    } catch {
      setEspConnected(false)
      setEspMessage('Falha ao conectar. Verifique se o ESP32 está na mesma rede.')
    } finally {
      setEspTesting(false)
    }
  }

  // Aciona LED no ESP32
  const triggerEspLed = async (box: number) => {
    const cleanIp = espIp.replace(/^https?:\/\//, '').replace(/\/$/, '').trim()
    if (!cleanIp) return
    try {
      await fetch(`http://${cleanIp}/led?box=${box}`, { mode: 'cors' })
      setEspActiveBox(box)
    } catch (e) {
      console.warn('Erro ao acender LED no ESP32:', e)
    }
  }

  // Apaga todos os LEDs no ESP32
  const clearEspLeds = async () => {
    const cleanIp = espIp.replace(/^https?:\/\//, '').replace(/\/$/, '').trim()
    if (!cleanIp) return
    try {
      await fetch(`http://${cleanIp}/clear`, { mode: 'cors' })
      setEspActiveBox(null)
    } catch (e) {
      console.warn('Erro ao apagar LEDs no ESP32:', e)
    }
  }

  // Sincronização automática do próximo item pendente com o LED do ESP32
  const pendingItems = order.items.filter(i => !i.picked)
  const nextItem = pendingItems[0]

  useEffect(() => {
    if (!espConnected || !espIp) return

    if (nextItem?.product?.location) {
      const box = parseInt(nextItem.product.location.box, 10)
      if (box >= 1 && box <= 3) {
        triggerEspLed(box)
      } else {
        clearEspLeds()
      }
    } else {
      clearEspLeds()
    }
  }, [nextItem?.id, espConnected, espIp, pendingItems.length])

  // Action for Mode 1 (Arthur): Physical/Virtual Button press on Pick to Light rack
  const handleButtonPressPick = async (item: OrderItemType) => {
    if (item.picked) return
    setLoadingItemId(item.id)
    const res = await pickItem(item.id)
    if (res?.success) {
      router.refresh()
    }
    setLoadingItemId(null)
  }

  // Monitora o botão físico pressionado no ESP32
  useEffect(() => {
    if (!espConnected || !espIp) return

    const cleanIp = espIp.replace(/^https?:\/\//, '').replace(/\/$/, '').trim()
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`http://${cleanIp}/status`, { 
          signal: AbortSignal.timeout(1500),
          mode: 'cors' 
        })
        if (res.ok) {
          const data = await res.json()
          if (data.lastButtonPressed && data.lastButtonPressed >= 1 && data.lastButtonPressed <= 3) {
            const pressedBox = data.lastButtonPressed.toString()
            const itemToPick = order.items.find(
              i => !i.picked && i.product.location?.box === pressedBox
            )
            if (itemToPick) {
              setEspActiveBox(null)
              handleButtonPressPick(itemToPick)
            }
          }
        }
      } catch {
        // Silencioso em caso de timeout
      }
    }, 800)

    return () => clearInterval(timer)
  }, [espConnected, espIp, order.items])

  // Open scale modal for Mode 2 (Edilson)
  const handleOpenScaleModal = (item: OrderItemType) => {
    if (item.picked) return
    const meta = parseProductMeta(item.product.description)
    const expected = item.quantity * meta.weightGrams
    setActiveScaleItem(item)
    setMeasuredWeight(expected.toFixed(1))
    setScaleFeedback({
      valid: true,
      message: `Peso esperado detectado: ${expected.toFixed(1)}g (Tolerância: ±2.0g)`
    })
  }

  // Validate weight on the scale
  const handleWeightChange = (valStr: string) => {
    setMeasuredWeight(valStr)
    if (!activeScaleItem) return

    const val = parseFloat(valStr.replace(',', '.'))
    if (isNaN(val)) {
      setScaleFeedback({ valid: false, message: 'Digite um valor numérico válido.' })
      return
    }

    const meta = parseProductMeta(activeScaleItem.product.description)
    const expected = activeScaleItem.quantity * meta.weightGrams
    const tolerance = Math.max(2.0, expected * 0.05) // ±2g ou 5%

    if (Math.abs(val - expected) <= tolerance) {
      setScaleFeedback({
        valid: true,
        message: `✓ Peso validado com sucesso! (${val}g está dentro da tolerância de ~${expected}g)`
      })
    } else {
      setScaleFeedback({
        valid: false,
        message: `⚠️ Divergência de peso! Esperado ~${expected}g, Balança leu: ${val}g. Verifique a quantidade de peças.`
      })
    }
  }

  // Confirm scale pick
  const handleConfirmScalePick = async () => {
    if (!activeScaleItem || !scaleFeedback?.valid) return
    setLoadingItemId(activeScaleItem.id)
    const res = await pickItem(activeScaleItem.id)
    if (res?.success) {
      router.refresh()
    }
    setActiveScaleItem(null)
    setLoadingItemId(null)
  }

  // Reset order for re-demonstrations
  const handleResetOrder = async () => {
    if (!confirm('Deseja reiniciar a coleta deste pedido para testar novamente?')) return
    setResetting(true)
    const res = await resetOrder(order.id)
    if (res?.success) {
      router.refresh()
    }
    setResetting(false)
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#20273A]">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/operator" className="text-slate-400 hover:text-slate-200 text-xs font-mono">
              &larr; Voltar para Ordens
            </Link>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
              Coleta: O.S. #{order.id.slice(-6).toUpperCase()}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase ${
              isCompleted 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            }`}>
              {isCompleted ? 'Concluída' : `${pickedCount}/${totalItems} Coletados`}
            </span>
          </div>
        </div>

        {/* WORKFLOW MODE SELECTOR (The key feature meeting both requirements!) */}
        <div className="bg-[#12141F] border border-[#2B354F] p-1.5 rounded-2xl flex items-center gap-1 self-start md:self-auto shadow-lg">
          <button
            type="button"
            onClick={() => setMode('PICK_TO_LIGHT')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'PICK_TO_LIGHT'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse"></span>
            <span>Modo Pick-to-Light (Arthur)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('SCALE_VERIFICATION')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'SCALE_VERIFICATION'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
            <span>Modo Balança de Precisão (Edilson)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('HYBRID')}
            className={`hidden lg:flex px-3 py-2 rounded-xl text-xs font-bold transition-all items-center gap-1.5 cursor-pointer ${
              mode === 'HYBRID'
                ? 'bg-[#252E45] text-white border border-slate-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Híbrido</span>
          </button>
        </div>
      </div>

      {/* Mode Description Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-colors ${
        mode === 'PICK_TO_LIGHT'
          ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
          : mode === 'SCALE_VERIFICATION'
          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
          : 'bg-[#181D2D] border-[#2A334B] text-slate-300'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-xl">
            {mode === 'PICK_TO_LIGHT' ? '🔘' : mode === 'SCALE_VERIFICATION' ? '⚖️' : '⚡'}
          </span>
          <div>
            <strong className="font-bold block text-sm">
              {mode === 'PICK_TO_LIGHT' && 'Modo Pick-to-Light Ativo: Confirmação por Botão na Gaveta'}
              {mode === 'SCALE_VERIFICATION' && 'Modo Balança Ativo: Dupla Verificação de Peso das Peças'}
              {mode === 'HYBRID' && 'Modo Híbrido: Pick-to-Light + Conferência de Balança'}
            </strong>
            <span className="opacity-80">
              {mode === 'PICK_TO_LIGHT' && 'Os LEDs luminosos da estante acendem nas caixas certas. Pressione o botão físico/virtual do módulo da gaveta para registrar a retirada (sem pesagem).'}
              {mode === 'SCALE_VERIFICATION' && 'A validação é feita pesando as peças na balança de precisão com tolerância de erro (peso unitário × quantidade lida).'}
              {mode === 'HYBRID' && 'Você pode usar a confirmação rápida pelo botão Pick-to-Light ou a verificação detalhada com pesagem.'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetOrder}
          disabled={resetting}
          className="shrink-0 ml-4 px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1E2436] border border-[#2B354F] text-slate-300 font-mono text-[11px] transition-all cursor-pointer"
        >
          {resetting ? 'Reiniciando...' : '↺ Reiniciar Teste'}
        </button>
      </div>

      {/* ESP32 Wi-Fi Hardware Integration Control Bar */}
      <div className="bg-[#12141F] border border-[#20273A] rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${espConnected ? 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-rose-500'}`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-white">
                  ESP32 Pick to Light (Wi-Fi)
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                  espConnected 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {espConnected ? 'Conectado (Online)' : 'Desconectado'}
                </span>
                {espActiveBox && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    💡 LED Caixa {espActiveBox} Aceso
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {espMessage || 'Insira o IP exibido no Monitor Serial do Arduino e clique em Conectar'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <input
                type="text"
                value={espIp}
                onChange={(e) => setEspIp(e.target.value)}
                placeholder="Ex: 192.168.1.50"
                className="bg-[#181D2D] border border-[#2A334B] text-white px-3 py-1.5 rounded-xl font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-40"
              />
            </div>

            <button
              type="button"
              onClick={() => checkEspStatus(espIp)}
              disabled={espTesting || !espIp}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {espTesting ? 'Conectando...' : 'Conectar'}
            </button>

            {espConnected && (
              <div className="flex items-center gap-1.5 border-l border-[#263147] pl-2 ml-1">
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Testar:</span>
                <button
                  type="button"
                  onClick={() => triggerEspLed(1)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                    espActiveBox === 1
                      ? 'bg-cyan-500 text-black font-bold border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                      : 'bg-[#181D2D] border-[#29324B] text-slate-300 hover:border-cyan-500'
                  }`}
                >
                  LED 1
                </button>
                <button
                  type="button"
                  onClick={() => triggerEspLed(2)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                    espActiveBox === 2
                      ? 'bg-cyan-500 text-black font-bold border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                      : 'bg-[#181D2D] border-[#29324B] text-slate-300 hover:border-cyan-500'
                  }`}
                >
                  LED 2
                </button>
                <button
                  type="button"
                  onClick={() => triggerEspLed(3)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                    espActiveBox === 3
                      ? 'bg-cyan-500 text-black font-bold border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                      : 'bg-[#181D2D] border-[#29324B] text-slate-300 hover:border-cyan-500'
                  }`}
                >
                  LED 3
                </button>
                <button
                  type="button"
                  onClick={clearEspLeds}
                  className="px-2 py-1 rounded-lg text-[11px] font-mono bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 transition-all cursor-pointer"
                  title="Apagar todos os LEDs"
                >
                  Apagar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Rack (Left/Top) + Item Action List (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* VIRTUAL PICK-TO-LIGHT RACK (Estante Física Guiada por LED) */}
        <div className="lg:col-span-8 bg-[#12141F] border border-[#20273A] rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#20273A]">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-led-green"></span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Estante Física Pick to Light (Seção A)
              </h2>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-400">LEDs Ativos na O.S.:</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                {pendingCount} gavetas
              </span>
            </div>
          </div>

          {/* Matrix Levels 1 to 5 */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(shelfNum => (
              <div key={shelfNum} className="flex items-center gap-3">
                <div className="w-16 text-right font-mono text-xs font-bold text-slate-400 shrink-0">
                  Nível {shelfNum}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                  {[1, 2, 3, 4].map(boxNum => {
                    const slotKey = `${shelfNum}-${boxNum}`
                    const loc = locationMap[slotKey]
                    const orderItem = orderItemsByLocation[slotKey]
                    const isPending = orderItem && !orderItem.picked
                    const isPicked = orderItem && orderItem.picked
                    const meta = orderItem ? parseProductMeta(orderItem.product.description) : null

                    return (
                      <div
                        key={boxNum}
                        className={`relative rounded-xl p-3 border transition-all flex flex-col justify-between min-h-[120px] ${
                          isPending
                            ? 'bg-[#152336] border-emerald-400 animate-border-green shadow-lg shadow-emerald-500/20'
                            : isPicked
                            ? 'bg-[#101F18] border-emerald-800/60 opacity-80'
                            : 'bg-[#10121C] border-[#1C2030] opacity-40'
                        }`}
                      >
                        {/* Box Header: Position and LED Beacon */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold uppercase text-slate-300">
                            A-{shelfNum}-{boxNum}
                          </span>

                          {/* Pick to Light LED Lamp Indicator */}
                          {isPending && (
                            <span 
                              className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-led-green shadow-[0_0_12px_rgba(16,185,129,1)]"
                              title="LED Pick-to-Light Aceso: Retire o item desta gaveta"
                            />
                          )}
                          {isPicked && (
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" title="Item coletado" />
                          )}
                          {!orderItem && (
                            <span className="w-2 h-2 rounded-full bg-slate-800" />
                          )}
                        </div>

                        {/* Box Content / Quantity Display */}
                        <div className="my-1.5">
                          {orderItem ? (
                            <>
                              <div className={`font-bold text-xs truncate ${isPending ? 'text-white' : 'text-slate-400'}`}>
                                {orderItem.product.name}
                              </div>

                              {/* 7-Segment style quantity display on the box */}
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {meta?.weightGrams}g/un
                                </span>
                                <div className={`px-2 py-0.5 rounded font-mono font-black text-sm tracking-wider shadow-inner ${
                                  isPending 
                                    ? 'bg-black text-emerald-400 border border-emerald-500/50' 
                                    : 'bg-[#141C18] text-emerald-700'
                                }`}>
                                  QTD: {orderItem.quantity}
                                </div>
                              </div>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-700 italic">Posição neutra</span>
                          )}
                        </div>

                        {/* Interactive Rack Button Action */}
                        <div>
                          {isPending && (
                            <>
                              {mode === 'PICK_TO_LIGHT' && (
                                <button
                                  type="button"
                                  disabled={loadingItemId === orderItem.id}
                                  onClick={() => handleButtonPressPick(orderItem)}
                                  className="w-full mt-1 py-1.5 px-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-[11px] rounded-lg shadow-md uppercase tracking-wider active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                  {loadingItemId === orderItem.id ? (
                                    <span>...</span>
                                  ) : (
                                    <>
                                      <span>🔘 Confirmar</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {mode === 'SCALE_VERIFICATION' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenScaleModal(orderItem)}
                                  className="w-full mt-1 py-1.5 px-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-[11px] rounded-lg shadow-md uppercase tracking-wider active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <span>⚖️ Pesar Peças</span>
                                </button>
                              )}

                              {mode === 'HYBRID' && (
                                <div className="grid grid-cols-2 gap-1 mt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleButtonPressPick(orderItem)}
                                    className="py-1 px-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] rounded uppercase transition-all"
                                    title="Confirmar por botão"
                                  >
                                    🔘 Botão
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenScaleModal(orderItem)}
                                    className="py-1 px-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] rounded uppercase transition-all"
                                    title="Conferir na balança"
                                  >
                                    ⚖️ Pesar
                                  </button>
                                </div>
                              )}
                            </>
                          )}

                          {isPicked && (
                            <div className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
                              <span>✓ Coleta concluída</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 mt-4 border-t border-[#20273A] text-xs text-slate-500 flex items-center justify-between">
            <span>Matriz Pick-to-Light com sinalização LED ativa</span>
            <span className="font-mono">Estante: Bloco A-01</span>
          </div>
        </div>

        {/* ITEMS SEPARATION CHECKLIST (Painel de Acompanhamento e Ação) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#12141F] border border-[#20273A] rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-3 flex items-center justify-between">
              <span>Lista de Separação</span>
              <span className="text-xs font-mono text-cyan-400 font-normal">
                {pendingCount} restantes
              </span>
            </h2>

            <div className="divide-y divide-[#20273A] space-y-3">
              {order.items.map(item => {
                const meta = parseProductMeta(item.product.description)
                const expectedWeight = item.quantity * meta.weightGrams

                return (
                  <div 
                    key={item.id} 
                    className={`pt-3 first:pt-0 rounded-xl transition-all ${
                      item.picked ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${item.picked ? 'bg-emerald-600' : 'bg-emerald-400 animate-pulse'}`} />
                          <h3 className={`font-bold text-sm ${item.picked ? 'line-through text-slate-400' : 'text-white'}`}>
                            {item.product.name}
                          </h3>
                        </div>

                        <div className="text-xs text-slate-400 mt-0.5 font-mono">
                          {item.product.location ? (
                            <span className="text-cyan-400 font-bold">
                              Gaveta {item.product.location.section}-{item.product.location.shelf}-{item.product.location.box}
                            </span>
                          ) : 'Sem posição'}
                          <span className="mx-1.5">·</span>
                          <span>{meta.weightGrams}g un.</span>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">Qtd</span>
                        <span className={`text-xl font-black font-mono ${item.picked ? 'text-slate-500' : 'text-cyan-400'}`}>
                          {item.quantity}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons on the checklist */}
                    {!item.picked ? (
                      <div className="mt-3 flex gap-2">
                        {(mode === 'PICK_TO_LIGHT' || mode === 'HYBRID') && (
                          <button
                            type="button"
                            disabled={loadingItemId === item.id}
                            onClick={() => handleButtonPressPick(item)}
                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-black font-black text-xs rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <span>🔘 Pressionar Botão</span>
                          </button>
                        )}

                        {(mode === 'SCALE_VERIFICATION' || mode === 'HYBRID') && (
                          <button
                            type="button"
                            onClick={() => handleOpenScaleModal(item)}
                            className="flex-1 py-2 px-3 bg-[#1C253B] hover:bg-[#263352] text-cyan-300 border border-cyan-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <span>⚖️ Validar Balança</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs font-mono text-emerald-400 flex items-center gap-1">
                        <span>✓ Retirado com sucesso</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Completion Box */}
            {isCompleted && (
              <div className="mt-6 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-center space-y-2">
                <div className="text-2xl">🎉</div>
                <h3 className="font-bold text-emerald-300 text-sm">Ordem Concluída!</h3>
                <p className="text-xs text-slate-300">
                  Todas as peças foram separadas e validadas com sucesso.
                </p>
                <div className="pt-2">
                  <Link 
                    href="/operator" 
                    className="inline-block w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow transition-all"
                  >
                    Voltar para Lista de Ordens
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SCALE SIMULATION MODAL (Edilson's Double Verification Requirement) */}
      {activeScaleItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-[#12141F] border border-[#2B354F] rounded-2xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#20273A]">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚖️</span>
                <h3 className="text-lg font-bold text-white">Balança de Precisão</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveScaleItem(null)}
                className="text-slate-400 hover:text-white p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Target details */}
            <div className="bg-[#181D2D] p-3.5 rounded-xl border border-[#263148] space-y-1 mb-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Peça a Separar:</span>
                <strong className="text-white font-bold">{activeScaleItem.product.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Quantidade Solicitada:</span>
                <strong className="text-cyan-400 font-mono">{activeScaleItem.quantity} unidades</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Peso Unitário Cadastrado:</span>
                <strong className="text-slate-300 font-mono">
                  {parseProductMeta(activeScaleItem.product.description).weightGrams} g
                </strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#232C42]">
                <span className="text-slate-300 font-semibold">Peso Total Esperado:</span>
                <strong className="text-emerald-400 font-mono font-bold text-sm">
                  {(activeScaleItem.quantity * parseProductMeta(activeScaleItem.product.description).weightGrams).toFixed(1)} g
                </strong>
              </div>
            </div>

            {/* Simulated Digital Scale LCD Display */}
            <div className="mb-4">
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                Display da Balança (Leitura em Tempo Real)
              </label>

              <div className="bg-[#0A0D14] border-2 border-[#1E2738] rounded-xl p-4 flex flex-col items-center justify-center shadow-inner">
                <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mb-1">
                  DIGITAL PRECISION SCALE · 0.01g
                </span>
                <div className="text-4xl sm:text-5xl font-mono font-black text-emerald-400 tracking-wider">
                  {measuredWeight || '0.0'} <span className="text-xl text-emerald-600 font-normal">g</span>
                </div>
              </div>
            </div>

            {/* Simulation Shortcuts */}
            <div className="mb-4 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 block">
                Simulador de Pesagem (Testes de Hardware):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const expected = (activeScaleItem.quantity * parseProductMeta(activeScaleItem.product.description).weightGrams).toFixed(1)
                    handleWeightChange(expected)
                  }}
                  className="px-3 py-2 bg-[#1A253A] hover:bg-[#202F4D] border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-semibold transition-all text-center"
                >
                  ✓ Colocar Peso Correto
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const expected = activeScaleItem.quantity * parseProductMeta(activeScaleItem.product.description).weightGrams
                    const wrong = (expected + 15).toFixed(1)
                    handleWeightChange(wrong)
                  }}
                  className="px-3 py-2 bg-[#2A1E24] hover:bg-[#38242D] border border-rose-500/40 text-rose-300 rounded-lg text-xs font-semibold transition-all text-center"
                >
                  ✕ Simular Peso Incorreto (+15g)
                </button>
              </div>

              {/* Free numeric input */}
              <div className="mt-2">
                <input
                  type="text"
                  value={measuredWeight}
                  onChange={e => handleWeightChange(e.target.value)}
                  className="w-full bg-[#181D2D] border border-[#2B354F] text-white px-3 py-2 rounded-lg text-sm font-mono text-center focus:outline-none focus:border-cyan-500"
                  placeholder="Digitar peso lido na balança..."
                />
              </div>
            </div>

            {/* Validation Feedback */}
            {scaleFeedback && (
              <div className={`p-3 rounded-xl border text-xs mb-4 ${
                scaleFeedback.valid 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}>
                {scaleFeedback.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveScaleItem(null)}
                className="flex-1 py-2.5 px-4 bg-[#181D2D] hover:bg-[#20273D] text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={!scaleFeedback?.valid || loadingItemId !== null}
                onClick={handleConfirmScalePick}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/20 active:scale-98 transition-all"
              >
                {loadingItemId ? 'Confirmando...' : 'Liberar Retirada'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
