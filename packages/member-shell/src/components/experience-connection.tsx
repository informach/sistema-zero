'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { SceneButton } from './exploration-stage'

export function ExperienceConnection({
  source,
  target,
  alternative,
  enabled,
  motivo,
  onConnect,
}: {
  source: string
  target: string
  alternative: string
  enabled: boolean
  /**
   * ⚠️⚠️ Fechado NÃO é escondido (lote 1 do Raio-X, 16/09/2026). Seis fios nasciam ESCONDIDOS
   * até a primeira descoberta, enquanto a instrução e a pista 3 já mandavam ligá-los: a criança
   * procurava um controle que não existia na tela. Com `motivo`, o fio aparece desde a abertura,
   * as duas pontas ficam desligadas e a ajuda diz o que abre o fio — a mesma régua da `Medida`
   * fechada da `hitbox`. O motivo também é o `aria-describedby` do destino, então quem usa leitor
   * de tela ouve por que o botão não responde.
   */
  motivo?: string
  onConnect: (enabled: boolean) => void
}) {
  const fechado = Boolean(motivo)
  const id = useId()
  const container = useRef<HTMLDivElement>(null)
  const destination = useRef<HTMLButtonElement>(null)
  const [selected, setSelected] = useState(false)
  const [wire, setWire] = useState<{
    pointer: number
    x: number
    y: number
    startX: number
    startY: number
  } | null>(null)
  const inside = (x: number, y: number) => {
    const b = destination.current?.getBoundingClientRect()
    return !!b && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom
  }
  const [compatible, setCompatible] = useState(false)
  const cancel = () => {
    setWire(null)
    setSelected(false)
    setCompatible(false)
  }
  /**
   * ⚠️ O fio pode FECHAR com a origem escolhida: o fio fica montado o tempo todo, e "Recomeçar"
   * volta o mundo para antes da descoberta que o abria. Sem desmarcar aqui, quando ele reabria a
   * ajuda dizia "Agora toque em Tela do jogo para ligar" sem a criança ter tocado em nada.
   */
  useEffect(() => {
    if (fechado) {
      setWire(null)
      setSelected(false)
      setCompatible(false)
    }
  }, [fechado])
  const ajuda = `${id}-help`
  return (
    <div
      ref={container}
      className="relative flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3"
      onKeyDown={(e) => {
        if (e.key === 'Escape') cancel()
      }}
    >
      {/* ⚠️⚠️ As DUAS pontas fechadas são `fechado`, e não `disabled` (review do lote 1): o
          `disabled` tirava o fio do Tab, e quem navega por teclado nunca ouvia o motivo. As duas
          pontas também levam a ajuda no `aria-describedby`, e nenhuma responde a gesto. */}
      <SceneButton
        aria-pressed={selected}
        aria-describedby={ajuda}
        className="touch-none"
        fechado={fechado}
        onClick={(e) => {
          if (e.detail === 0) setSelected((v) => !v)
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          const bounds = container.current?.getBoundingClientRect()
          const start = e.currentTarget.getBoundingClientRect()
          if (!bounds) return
          e.currentTarget.setPointerCapture(e.pointerId)
          setSelected(true)
          setWire({
            pointer: e.pointerId,
            startX: start.left + start.width / 2 - bounds.left,
            startY: start.top + start.height / 2 - bounds.top,
            x: e.clientX - bounds.left,
            y: e.clientY - bounds.top,
          })
        }}
        onPointerMove={(e) => {
          if (!wire || wire.pointer !== e.pointerId) return
          const bounds = container.current?.getBoundingClientRect()
          if (!bounds) return
          setWire({ ...wire, x: e.clientX - bounds.left, y: e.clientY - bounds.top })
          setCompatible(inside(e.clientX, e.clientY))
        }}
        onPointerUp={(e) => {
          if (wire?.pointer !== e.pointerId) return
          if (inside(e.clientX, e.clientY)) {
            onConnect(true)
            setSelected(false)
          }
          setWire(null)
          setCompatible(false)
        }}
        onPointerCancel={cancel}
        onLostPointerCapture={() => {
          setWire(null)
          setCompatible(false)
        }}
      >
        ◉ {source}
      </SceneButton>
      <svg
        width="44"
        height="24"
        viewBox="0 0 44 24"
        aria-hidden="true"
        className={enabled ? 'text-primary' : 'text-muted-foreground/50'}
      >
        <path
          d="M0 12H44"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={enabled ? undefined : '4 5'}
        />
        <circle cx="40" cy="12" r="4" fill="currentColor" />
      </svg>
      <button
        ref={destination}
        type="button"
        aria-describedby={ajuda}
        aria-disabled={fechado || undefined}
        onClick={() => {
          if (!fechado && selected) {
            onConnect(true)
            cancel()
          }
        }}
        // ⚠️ `disabled:` visível (lote 2 do Raio-X): com a cena trancada pelo palpite, o `fieldset`
        // desliga este `<button>` cru, e sem estilo ele parecia ATIVO e não respondia.
        className={`min-h-14 rounded-xl border-2 border-dashed px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${fechado ? 'cursor-not-allowed border-muted-foreground/50 bg-transparent text-muted-foreground' : compatible ? 'border-primary bg-primary/20 ring-4 ring-primary/15' : selected ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}
      >
        ◎ {target}
        {compatible && <span className="ml-2">Solte aqui</span>}
      </button>
      {enabled && <SceneButton onClick={() => onConnect(false)}>{alternative}</SceneButton>}
      {wire && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
        >
          <path
            d={`M${wire.startX} ${wire.startY} C${wire.startX + 50} ${wire.startY},${wire.x - 50} ${wire.y},${wire.x} ${wire.y}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-primary"
          />
          {/* ⚠️ O vazado vem por UTILITÁRIA. `fill="var(…)"` não funciona: navegador nenhum
              resolve custom property em atributo de apresentação do SVG, e a bolinha do fio
              saía preta em vez de vazada. */}
          <circle
            cx={wire.x}
            cy={wire.y}
            r="9"
            stroke="currentColor"
            strokeWidth="3"
            className="fill-background text-primary"
          />
        </svg>
      )}
      {/* ⚠️ 14px sempre (lote 2): é o texto que diz COMO ligar, e em 12px ele era a letra menor da
          tela. ⚠️⚠️ As frases dizem os NOMES das pontas, e não "a origem" e "o destino" (jargão), e o
          ligado vira "Ligado: A → B": "Desenhar está ligado a Tela do jogo" deixava o nome da peça
          solto na frase e sem a crase. */}
      <p id={ajuda} className="basis-full text-sm text-muted-foreground">
        {motivo
          ? motivo
          : selected
            ? `Agora toque em ${target} para ligar.`
            : enabled
              ? `Ligado: ${source} → ${target}`
              : `Puxe o fio até ${target}. Ou toque em ${source} e depois em ${target}.`}
      </p>
    </div>
  )
}
