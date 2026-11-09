'use client'

import type { SceneActivity } from '@sistemazero/core/learning/scene'
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react'
/**
 * As peças que as telas livres do Faísca dividem (Ilha do Farol e os quatro Poderes, 08/11/2026,
 * proposta "Experiências do Faísca" aprovada), em cima da moldura (`Frame`, `Modulo`, `Cruzeta`,
 * `useAndarLivre`…): o andar livre no mapa do Farol (com chão: a água não deixa passar), o "chegou
 * perto" de cada coisa do jogo (a borda de subida, como o encontro do jogo), a peça que encaixa na
 * pergunta, a peça que se troca, o caderninho de várias linhas e a pergunta grande embaixo da cena.
 */
import { Cruzeta, type Direcao, Modulo, type useAndarLivre } from './scene-discovery-frame'
import { useMovimentoContinuo } from './scene-movement'

/** O mapa do Farol (480 × 360) com o personagem 64 × 64, abaixo da faixa do aviso. */
export const LIMITES_DO_MAPA = { x0: 0, x1: 416, y0: 40, y1: 292 } as const
export const pe = (p: { x: number; y: number }) => ({ x: p.x + 32, y: p.y + 44 })
export const centro = (r: { x: number; y: number; w: number; h?: number }) => ({
  x: r.x + r.w / 2,
  y: r.y + (r.h ?? r.w) / 2,
})
export const distancia = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)

/**
 * Os cartões de pergunta que a atividade cobra: as metas do caso (`setup.goals`), ou todas as da
 * tela quando o caso não escolhe.
 */
export function cartoesDaAtividade<C extends { id: string }>(
  cartoes: readonly C[],
  activity: Pick<SceneActivity, 'setup'>,
): C[] {
  const metas = activity.setup?.goals
  return metas?.length ? cartoes.filter((c) => metas.includes(c.id)) : [...cartoes]
}

/** O personagem olha para o lado em que anda. */
export function useOlhar(segurando: ReadonlySet<Direcao>) {
  const [esquerda, setEsquerda] = useState(false)
  useEffect(() => {
    if (segurando.has('esquerda') && !segurando.has('direita')) setEsquerda(true)
    else if (segurando.has('direita') && !segurando.has('esquerda')) setEsquerda(false)
  }, [segurando])
  return esquerda
}

/**
 * Qual coisa do jogo está perto do pé do personagem (a mais perto, dentro do raio), ou null.
 * `aoChegar` roda UMA vez a cada chegada (a borda de subida), como o encontro do jogo.
 */
export function useChegada<K extends string>(
  pos: { x: number; y: number },
  alvos: Record<K, { x: number; y: number }>,
  raio: number,
  aoChegar: (k: K) => void,
  aoSair?: (k: K) => void,
) {
  const p = pe(pos)
  let perto: K | null = null
  let melhor = raio
  for (const k of Object.keys(alvos) as K[]) {
    const d = distancia(p, alvos[k])
    if (d < melhor) {
      melhor = d
      perto = k
    }
  }
  const antes = useRef<K | null>(null)
  const fns = useRef({ aoChegar, aoSair })
  fns.current = { aoChegar, aoSair }
  useEffect(() => {
    const a = antes.current
    if (perto === a) return
    antes.current = perto
    if (a) fns.current.aoSair?.(a)
    if (perto) fns.current.aoChegar(perto)
  }, [perto])
  return perto
}

/** O módulo Andar com as quatro setas (e as setas e o WASD do teclado). */
export function ModuloAndar({
  raiz,
  andar,
  mao,
}: {
  raiz: RefObject<HTMLDivElement | null>
  andar: Pick<ReturnType<typeof useAndarLivre>, 'segurando' | 'segurar' | 'soltar'>
  mao: boolean
}) {
  return (
    <Modulo
      titulo="Andar"
      icone="🎮"
      dica={
        <>
          Segure as setas.
          <span className="sz-discovery-so-teclado"> No teclado: setas ou W A S D</span>
        </>
      }
    >
      <Cruzeta
        raiz={raiz}
        segurando={andar.segurando}
        segurar={andar.segurar}
        soltar={andar.soltar}
        mao={mao}
      />
    </Modulo>
  )
}

/**
 * A peça que encaixa num lugar da regra (o molde do toque do Cadê): tocar encaixa e tira. O texto
 * da peça é a palavra da ideia, nunca o nome do bloco.
 */
export function Encaixe({
  rotulo,
  antes,
  depois,
  peca,
  encaixada,
  vazio = 'encaixe aqui',
  estado,
  pulsar,
  onClick,
  aria,
}: {
  rotulo: string
  /** O texto antes do lugar da peça ("A porta"). */
  antes?: ReactNode
  /** O texto depois do lugar da peça ("está trancada?"). */
  depois?: ReactNode
  peca: ReactNode
  encaixada: boolean
  vazio?: string
  estado: string
  pulsar?: boolean
  onClick: () => void
  aria: string
}) {
  return (
    <button
      type="button"
      className="sz-discovery-encaixe sz-discovery-livre-encaixe"
      aria-pressed={encaixada}
      aria-label={aria}
      data-pulsar={pulsar}
      onClick={onClick}
    >
      <span className="sz-discovery-encaixe-rotulo">{rotulo}</span>
      <span className="sz-discovery-encaixe-linha">
        {antes ? <span className="sz-discovery-livre-frase">{antes}</span> : null}
        <span className="sz-discovery-slot">
          {encaixada ? <span className="sz-discovery-peca">{peca}</span> : vazio}
        </span>
        {depois ? <span className="sz-discovery-livre-frase">{depois}</span> : null}
        {encaixada ? null : (
          <span className="sz-discovery-peca-solta">
            <span className="sz-discovery-peca">{peca}</span>
          </span>
        )}
      </span>
      <span className="sz-discovery-encaixe-estado">{estado}</span>
    </button>
  )
}

/**
 * A peça da regra que se TROCA ("e" × "ou", "pelo menos" × "exatamente"): a frase da regra inteira,
 * com a peça no meio; tocar na peça troca pela outra. Uma peça só na frase, nada repetido.
 */
export function Troca<V extends string>({
  rotulo,
  antes,
  depois,
  opcoes,
  valor,
  onChange,
  pulsar,
}: {
  rotulo: string
  antes?: ReactNode
  depois?: ReactNode
  opcoes: readonly { v: V; peca: ReactNode; aria: string }[]
  valor: V
  onChange: (v: V) => void
  /** A peça que a fala do Zappy pede agora: a regra pulsa enquanto ela não está no lugar. */
  pulsar?: V | null
}) {
  const i = Math.max(
    0,
    opcoes.findIndex((o) => o.v === valor),
  )
  const atual = opcoes[i]!
  const proxima = opcoes[(i + 1) % opcoes.length]!
  return (
    <button
      type="button"
      className="sz-discovery-encaixe sz-discovery-livre-encaixe sz-discovery-livre-troca"
      aria-label={`${rotulo}: ${atual.aria}. Toque para trocar por: ${proxima.aria}.`}
      data-pulsar={pulsar != null && pulsar !== valor}
      onClick={() => onChange(proxima.v)}
    >
      <span className="sz-discovery-encaixe-linha">
        {antes ? <span className="sz-discovery-livre-frase">{antes}</span> : null}
        <span key={atual.v} className="sz-discovery-peca sz-discovery-livre-peca-trocavel">
          {atual.peca}
          <span className="sz-discovery-livre-troca-seta" aria-hidden>
            ⇄
          </span>
        </span>
        {depois ? <span className="sz-discovery-livre-frase">{depois}</span> : null}
      </span>
      <span className="sz-discovery-encaixe-estado">Toque na peça para trocar.</span>
    </button>
  )
}

/** O caderninho do jogo com várias linhas (o que o jogo guarda, sem o nome da variável). */
export function CaderninhoDe({
  linhas,
}: {
  linhas: readonly { pergunta: string; resposta: string; sim?: boolean }[]
}) {
  return (
    <div className="sz-discovery-caderno sz-discovery-livre-caderno">
      <span className="sz-discovery-caderno-titulo">Caderninho do jogo</span>
      {linhas.map((l) => (
        <span key={l.pergunta} className="sz-discovery-livre-caderno-linha">
          <span className="sz-discovery-caderno-linha">{l.pergunta}</span>
          <strong key={l.resposta} className="sz-discovery-caderno-resposta" data-sim={l.sim}>
            {l.resposta}
          </strong>
        </span>
      ))}
    </div>
  )
}

/** A pergunta grande embaixo da cena (o palpite), com as respostas como botões grandes. */
export function PerguntaGrande({
  texto,
  opcoes,
}: {
  texto: string
  opcoes: readonly { rotulo: ReactNode; onClick: () => void; escolhida?: boolean }[]
}) {
  return (
    <div className="sz-discovery-palpite-grande" role="group" aria-label={texto}>
      <strong>{texto}</strong>
      <span>
        {opcoes.map((o, i) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: as respostas são fixas.
            key={i}
            type="button"
            aria-pressed={o.escolhida}
            onClick={o.onClick}
          >
            {o.rotulo}
          </button>
        ))}
      </span>
    </div>
  )
}

/** Repete um gesto enquanto a tecla está segura (o passo do 3D, de meio em meio). */
export function useRepetir(ms = 160) {
  const t = useRef<ReturnType<typeof setInterval> | null>(null)
  const parar = () => {
    if (t.current) clearInterval(t.current)
    t.current = null
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: `parar` só lê a ref; a limpeza é a da desmontagem.
  useEffect(() => parar, [])
  return {
    segurar: (fn: () => void) => {
      parar()
      fn()
      t.current = setInterval(fn, ms)
    },
    /** Troca o que se repete sem dar o passo de agora (soltou uma seta e outra continua segura). */
    continuar: (fn: () => void) => {
      parar()
      t.current = setInterval(fn, ms)
    },
    parar,
  }
}

/**
 * O andar livre com chão de verdade: `pode(p)` diz se o personagem pode estar ali (a água do
 * laguinho não, por exemplo). Cada eixo é conferido sozinho, então ele desliza encostado na borda
 * em vez de travar. `ir(p)` põe o personagem num lugar (atravessou a ponte, por exemplo).
 */
export function useMapaLivre({
  inicio,
  pode = () => true,
  velocidade = 150,
}: {
  inicio: { x: number; y: number }
  pode?: (p: { x: number; y: number }) => boolean
  velocidade?: number
}) {
  const L = LIMITES_DO_MAPA
  const [pos, setPos] = useState(inicio)
  const movimento = useMovimentoContinuo(({ x: vx, y: vy, segundos }) => {
    setPos((p) => {
      const nx = Math.max(L.x0, Math.min(L.x1, p.x + vx * velocidade * segundos))
      const ny = Math.max(L.y0, Math.min(L.y1, p.y + vy * velocidade * segundos))
      const x = pode({ x: nx, y: p.y }) ? nx : p.x
      const y = pode({ x, y: ny }) ? ny : p.y
      return x === p.x && y === p.y ? p : { x, y }
    })
  })
  const esquerda = useOlhar(movimento.segurando)
  const ir = (p: { x: number; y: number }) => {
    movimento.parar()
    setPos(p)
  }
  return { ...movimento, pos, esquerda, voltar: () => ir(inicio), ir }
}
