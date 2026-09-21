'use client'

import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'

/**
 * Um lugar da moldura que NUNCA encolhe no meio da atividade, e que já nasce do tamanho do aviso que
 * ainda vai aparecer nele.
 *
 * ⭐⭐ Consertos do review da onda B do lote 5 do Raio-X (T2, 16/09/2026). Três coisas entravam e saíam
 * do fluxo ACIMA da bancada no instante do gesto: o "trocar" do palpite (some no primeiro gesto), o
 * "✓ Descoberta N de M" com o "Você achou…" (entram quando a meta cai e saem no gesto seguinte) e a
 * frase da situação (uma linha, duas, uma). A bancada subia e descia embaixo do dedo: na `pixel-vector`,
 * arrastando "Aproximar" de 1 a 8, o deslizante foi a 726, 702, 798, 702 e 746 px, e com o mouse o arrasto
 * PAROU no 3; na `hold-vs-press` a 390 px a tecla desceu 36 px e a segurada caiu no `fieldset`.
 *
 * Duas regras, e só elas:
 * - **a altura só cresce**: o lugar guarda a maior altura que o conteúdo já teve nesta largura (sair o
 *   aviso, ou a frase voltar a uma linha, deixa o espaço vazio em vez de puxar a bancada para cima);
 * - **o `molde` reserva o que vai aparecer**: ele é desenhado invisível, medido e TIRADO na mesma
 *   passada de layout (antes de a tela pintar), e a altura dele entra na conta. Assim o primeiro aviso
 *   não empurra nada.
 *
 * ⚠️⚠️ O molde NÃO fica no documento, e é de propósito: o "Seu palpite: … Ao testar: …"
 * é a resposta do palpite, e escondido com `invisible` ele seguiria no DOM (a busca por texto dos testes
 * o acharia, e qualquer leitura que ignore o CSS também). Medir e tirar deixa só o número.
 *
 * ⚠️ Mudou a LARGURA (girou o celular, abriu o menu), a conta recomeça: a altura de antes era de outra
 * quebra de linha. ⚠️ O conteúdo mora num `div` de dentro, e é ELE que o `ResizeObserver` olha: a altura
 * mínima vai no de fora, então pô-la nunca muda o que está sendo observado (sem laço de observação).
 * ⚠️ Sem `ResizeObserver` (happy-dom, navegador antigo), o lugar é só um `div`: nada quebra.
 */
export function LugarReservado({
  children,
  molde = null,
  chave = '',
  marca,
  className = '',
}: {
  children: ReactNode
  /** O que ainda pode aparecer aqui, na forma exata em que vai aparecer. `null` = só não encolher. */
  molde?: ReactNode
  /** Muda quando o molde muda (o texto do próximo aviso): é o que pede uma medida nova. */
  chave?: string
  /** `data-lugar-reservado`: o contrato dos testes. */
  marca?: string
  className?: string
}) {
  const fora = useRef<HTMLDivElement>(null)
  const dentro = useRef<HTMLDivElement>(null)
  const forma = useRef<HTMLDivElement>(null)
  const maior = useRef(0)
  const largura = useRef(-1)
  const [remedir, setRemedir] = useState(0)
  const [medindo, setMedindo] = useState(false)
  const temMolde = molde !== null && molde !== false

  useLayoutEffect(() => {
    const alvo = dentro.current
    if (!alvo || typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver((entradas) => {
      const caixa = entradas[0]?.contentRect
      if (!caixa) return
      if (caixa.width !== largura.current) {
        const primeira = largura.current < 0
        largura.current = caixa.width
        if (!primeira) {
          maior.current = 0
          if (fora.current) fora.current.style.minHeight = ''
          setRemedir((v) => v + 1)
        }
      }
      crescer(fora.current, maior, caixa.height)
    })
    observador.observe(alvo)
    return () => observador.disconnect()
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: mede de novo quando o molde ou a largura mudam
  useLayoutEffect(() => {
    if (temMolde) setMedindo(true)
  }, [chave, remedir, temMolde])

  useLayoutEffect(() => {
    if (!medindo) return
    if (forma.current) crescer(fora.current, maior, forma.current.getBoundingClientRect().height)
    setMedindo(false)
  })

  return (
    <div ref={fora} data-lugar-reservado={marca} className={`relative ${className}`}>
      <div ref={dentro}>{children}</div>
      {medindo && temMolde ? (
        <div
          ref={forma}
          aria-hidden
          className="pointer-events-none invisible absolute inset-x-0 top-0"
        >
          {molde}
        </div>
      ) : null}
    </div>
  )
}

/** A altura mínima só SOBE: guarda a maior altura já vista e a põe no lugar de fora. */
function crescer(fora: HTMLDivElement | null, maior: { current: number }, altura: number) {
  if (!fora || altura <= maior.current) return
  maior.current = altura
  fora.style.minHeight = `${altura}px`
}
