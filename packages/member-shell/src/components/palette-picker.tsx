'use client'

import { PALETTE_LABELS, PALETTES, type Palette } from '@sistemazero/core/palette'
import { Check } from 'lucide-react'
import { useCallback, useId, useRef, useState } from 'react'
import { apiSend } from '../lib/api'
import { cn } from '../lib/cn'

/**
 * As caixinhas de cor do perfil.
 *
 * ⭐ O componente não tem UM hexadecimal, e não precisa: cada caixinha carrega
 * `data-sz-palette` e lê `--sz-action` de dentro dela. Custom property herda, e um seletor de
 * atributo puro pinta a subárvore — então a amostra é a cor DE VERDADE que a folha gerada
 * produz, sem espelho manual para divergir quando entra uma cor nova.
 *
 * ⚠️ Mora no `member-shell`, não no `@sistemazero/ui`: aquele pacote não tem dep de framework
 * nem CSS próprio de componente, e este aqui fala com o BFF e carrega o contrato do `x-sz-viewer`.
 */

/** ~1,2 s entre idas ao servidor. Com o agrupamento abaixo, o teto de 60/min fica com folga. */
const PISO_ENTRE_ENVIOS_MS = 1200

function paintPalette(palette: Palette | null) {
  // A única mutação legítima do `<html>` pelo cliente: é o que faz a troca ser instantânea sem
  // recarregar. O valor é sempre um id do catálogo, nunca texto solto.
  const root = document.documentElement
  if (palette) root.dataset.szPalette = palette
  else root.removeAttribute('data-sz-palette')
}

export function PalettePicker({
  viewerId,
  initial,
  readOnly = false,
  className,
}: {
  /** O perfil dono da escolha — vira o `x-sz-viewer`, que o BFF confere. */
  viewerId: string
  /** Vem do SERVIDOR (o mesmo cookie que o layout leu). Sem GET na montagem. */
  initial: Palette | null
  /** Impersonação somente-leitura: mostra o estado, não deixa salvar. */
  readOnly?: boolean
  className?: string
}) {
  const grupo = useId()
  const [escolhida, setEscolhida] = useState<Palette | null>(initial)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  /** A última cor que o SERVIDOR confirmou — para onde a tela volta quando a rede falha. */
  const confirmada = useRef<Palette | null>(initial)
  /** O que a pessoa quer AGORA. Cliques durante um envio só atualizam isto. */
  const desejada = useRef<Palette | null>(initial)
  const emVoo = useRef(false)
  const ultimoEnvio = useRef(0)

  const enviar = useCallback(async () => {
    if (emVoo.current) return
    // Agrupar em vez de enfileirar: A→B→A termina em zero ou um pedido, não em três.
    if (desejada.current === confirmada.current) return
    const espera = PISO_ENTRE_ENVIOS_MS - (Date.now() - ultimoEnvio.current)
    if (espera > 0) {
      setTimeout(() => void enviar(), espera)
      return
    }
    emVoo.current = true
    setSalvando(true)
    const alvo = desejada.current
    try {
      await apiSend(
        '/api/members/preferences',
        'PUT',
        { palette: alvo },
        { 'x-sz-viewer': viewerId },
      )
      confirmada.current = alvo
      setErro(null)
    } catch (e) {
      // ⚠️ Volta para a última cor CONFIRMADA, nunca para a cor da casa: uma falha de rede não
      // pode apagar da tela a cor que a pessoa já tinha.
      desejada.current = confirmada.current
      setEscolhida(confirmada.current)
      paintPalette(confirmada.current)
      setErro(
        (e as { code?: string })?.code === 'VIEWER_CHANGED'
          ? 'O perfil mudou. Abra a página novamente.'
          : 'Não consegui guardar a sua cor agora.',
      )
    } finally {
      ultimoEnvio.current = Date.now()
      emVoo.current = false
      setSalvando(false)
      if (desejada.current !== confirmada.current) void enviar()
    }
  }, [viewerId])

  const escolher = (palette: Palette) => {
    if (readOnly) return
    setEscolhida(palette)
    desejada.current = palette
    paintPalette(palette)
    void enviar()
  }

  return (
    <fieldset className={cn('min-w-0', className)} disabled={readOnly}>
      <legend className="font-semibold text-sm">Cor do seu perfil</legend>
      <p className="mt-1 text-muted-foreground text-sm">
        Escolha uma cor e a plataforma inteira muda com ela.
      </p>
      <div role="radiogroup" aria-labelledby={grupo} className="mt-3 flex flex-wrap gap-3">
        <span id={grupo} className="sr-only">
          Cor do seu perfil
        </span>
        {PALETTES.map((palette) => {
          const ativa = escolhida === palette
          return (
            <label
              key={palette}
              data-sz-palette={palette}
              className={cn(
                'relative grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-full border-2 transition',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-offset-2',
                ativa ? 'border-foreground' : 'border-transparent hover:border-border',
                readOnly && 'cursor-not-allowed opacity-60',
              )}
            >
              {/* Radios NATIVOS: setas, Home/End, `aria-checked` e o foco vêm da plataforma. */}
              <input
                type="radio"
                name="sz-palette"
                value={palette}
                checked={ativa}
                onChange={() => escolher(palette)}
                className="sr-only"
              />
              <span
                aria-hidden
                className="grid size-8 place-items-center rounded-full"
                style={{ background: 'var(--sz-action)' }}
              >
                {/* Marca NÃO-cromática: a seleção não pode depender só de cor. */}
                {ativa ? (
                  <Check className="size-4" style={{ color: 'var(--sz-on-action)' }} />
                ) : null}
              </span>
              {/* O nome acessível é o rótulo em português, NUNCA o hexadecimal. */}
              <span className="sr-only">{PALETTE_LABELS[palette]}</span>
            </label>
          )
        })}
      </div>
      <p role="status" className="mt-2 min-h-5 text-muted-foreground text-sm">
        {readOnly
          ? 'Sessão de suporte: a cor não pode ser alterada aqui.'
          : salvando
            ? 'Guardando…'
            : escolhida
              ? `Cor escolhida: ${PALETTE_LABELS[escolhida]}.`
              : ''}
      </p>
      {erro ? (
        <p role="alert" className="mt-1 text-destructive text-sm">
          {erro}{' '}
          <button type="button" onClick={() => void enviar()} className="min-h-11 underline">
            Tentar de novo
          </button>
        </p>
      ) : null}
    </fieldset>
  )
}
