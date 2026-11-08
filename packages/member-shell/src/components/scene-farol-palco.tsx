'use client'
/**
 * ⭐⭐ Os palcos do Farol na moldura nova (08/11/2026): a TELA DO JOGO como a criança monta no Estúdio.
 *
 * `PalcoDoAndar` (os quadros e a beirada): a praia inteira (480 × 360), o farol e a chave nos lugares
 * do jogo (`FAROL_LAYOUT`), o personagem na altura dele (y 141) começando em x 21 (o mesmo começo do
 * motor, `lighthouseWalkOrigin`), as pegadas recentes e, no Devagar, a tela que pisca a cada quadro.
 * Na beirada, a faixa "fora da tela", a cerca na beirada com o limite ligado e o 👀 do jogo conferindo.
 *
 * `PalcoFarolLivre` (a memória e a porta): o mapa em que o personagem anda LIVRE em 4 direções; a
 * chave no chão, o farol que acende, o veleiro que chega e o balão da porta (`BalaoDaCena`, com a
 * largura medida pelo texto para nada vazar).
 */
import { LIGHTHOUSE_WALK } from '@sistemazero/core/learning/scene'
import { FAROL_LAYOUT, farolSvgUrl } from '@sistemazero/studio/arte'
import { useId, useLayoutEffect, useRef, useState } from 'react'
import { SceneCanvas } from './scene-canvas'
import { useDiscovery } from './scene-discovery-frame'
import { AVISOS_DO_FAROL, AvisoDoFarol } from './scene-farol'

/** A largura da faixa "fora da tela" à direita do palco da beirada. */
export const FORA_DA_TELA = 96

export function PalcoDoAndar({
  fora = false,
  piscar = false,
}: {
  fora?: boolean
  piscar?: boolean
}) {
  const { state } = useDiscovery()
  const w = state.walk
  const L = FAROL_LAYOUT
  const id = useId()
  const largura = L.palco.w + (fora ? FORA_DA_TELA : 0)
  const y = L.personagem.y
  const marcas: number[] = []
  // Só as pegadas RECENTES, cada vez mais apagadas: o rastro todo virava uma corda no chão.
  if (w.speed > 0)
    for (
      let x = LIGHTHOUSE_WALK.startFarol + w.speed;
      x <= w.x && marcas.length < 400;
      x += w.speed
    )
      marcas.push(x)
  marcas.splice(0, Math.max(0, marcas.length - 12))
  const alcance = w.frame > 0 ? (w.reach?.at(-1) ?? w.x) : w.x
  const conferiu = fora && w.keepInside && alcance !== w.x
  return (
    <SceneCanvas
      view={{ x: 0, y: 0, w: largura, h: L.palco.h }}
      mundo="farol"
      titulo="A tela do jogo do Farol"
      descricao={`Quadro ${w.frame}. A seta está ${
        w.arrow ? 'apertada' : 'solta'
      }.${fora ? ` O limite está ${w.keepInside ? 'ligado' : 'desligado'}.` : ''}`}
    >
      <defs>
        <pattern
          id={`${id}-fora`}
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="12" height="12" fill="#e9dccb" />
          <rect width="6" height="12" fill="#d8c7b1" />
        </pattern>
      </defs>
      <image
        data-fundo="farol"
        href={farolSvgUrl('praia-tropical')}
        width={L.palco.w}
        height={L.palco.h}
      />
      <image
        href={farolSvgUrl('farol-listrado-apagado')}
        x={L.farol.x}
        y={L.farol.y}
        width={L.farol.w}
        height={L.farol.h}
      />
      <image
        href={farolSvgUrl('chave-dourada')}
        x={L.chave.x}
        y={L.chave.y}
        width={L.chave.w}
        height={L.chave.h}
      />
      {fora ? (
        <g>
          <rect
            x={L.palco.w}
            y="0"
            width={FORA_DA_TELA}
            height={L.palco.h}
            fill={`url(#${id}-fora)`}
          />
          <text
            x={L.palco.w + FORA_DA_TELA / 2}
            y="60"
            textAnchor="middle"
            fontSize="15"
            fontWeight="800"
            fill="#5a3a12"
          >
            fora
          </text>
          <text
            x={L.palco.w + FORA_DA_TELA / 2}
            y="78"
            textAnchor="middle"
            fontSize="15"
            fontWeight="800"
            fill="#5a3a12"
          >
            da tela
          </text>
        </g>
      ) : null}
      <g aria-hidden>
        {marcas.map((m, i) => (
          <ellipse
            key={m}
            cx={m + 32}
            cy={y + 62 + (i % 2 ? 3 : 0)}
            rx="3"
            ry="1.6"
            fill="#5a3a12"
            opacity={0.15 + (0.6 * (i + 1)) / marcas.length}
          />
        ))}
      </g>
      <image href={farolSvgUrl('aventureiro')} x={w.x} y={y} width="64" height="64" />
      {fora ? (
        <g>
          <line
            x1={L.palco.w}
            x2={L.palco.w}
            y1="0"
            y2={L.palco.h}
            stroke="#0a2a7a"
            strokeWidth="4"
          />
          {w.keepInside
            ? Array.from({ length: 9 }, (_, i) => (
                <rect
                  // biome-ignore lint/suspicious/noArrayIndexKey: os postes da cerca são fixos.
                  key={i}
                  x={L.palco.w - 7}
                  y={20 + i * 38}
                  width="12"
                  height="26"
                  rx="3"
                  fill="#8a5a2b"
                  stroke="#5a3a12"
                />
              ))
            : null}
          {conferiu ? (
            <text
              key={w.frame}
              className="sz-discovery-olho"
              x={L.palco.w - 26}
              y={y - 8}
              fontSize="26"
            >
              👀
            </text>
          ) : null}
        </g>
      ) : null}
      <AvisoDoFarol texto={AVISOS_DO_FAROL.inicio} />
      {piscar ? (
        <rect
          key={w.frame}
          className="sz-discovery-flash"
          width={largura}
          height={L.palco.h}
          fill="#ffffff"
        />
      ) : null}
    </SceneCanvas>
  )
}

/** Onde o personagem pode andar no mapa livre: a tela inteira, abaixo da faixa do aviso. */
export const LIMITES_DO_MAPA = { x0: 0, x1: 416, y0: 40, y1: 292 } as const
export const INICIO_NO_MAPA = {
  x: FAROL_LAYOUT.personagem.x,
  y: FAROL_LAYOUT.personagem.y,
} as const
export const CENTRO_DA_CHAVE = {
  x: FAROL_LAYOUT.chave.x + FAROL_LAYOUT.chave.w / 2,
  y: FAROL_LAYOUT.chave.y + FAROL_LAYOUT.chave.h / 2,
} as const
export const CENTRO_DA_PORTA = {
  x: FAROL_LAYOUT.personagemNaPorta.x + 32,
  y: FAROL_LAYOUT.personagemNaPorta.y + 40,
} as const
/** O "pé" do personagem: o ponto que encosta nas coisas. */
export const peDoPersonagem = (p: { x: number; y: number }) => ({ x: p.x + 32, y: p.y + 40 })
export const distancia = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)
/** Encostar é generoso: a criança não precisa parar exatamente em cima. */
export const ENCOSTA = 46

export type BalaoDaPorta = { texto: string; tom: 'pergunta' | 'sim' | 'nao' }

export function PalcoFarolLivre({
  pos,
  andando,
  olhaEsquerda,
  chaveNoChao,
  carregaChave,
  aceso,
  aviso,
  mostrarPorta,
  balao,
}: {
  balao?: BalaoDaPorta | null
  pos: { x: number; y: number }
  andando: boolean
  olhaEsquerda: boolean
  chaveNoChao: boolean
  carregaChave: boolean
  aceso: boolean
  aviso: string
  mostrarPorta: boolean
}) {
  const L = FAROL_LAYOUT
  return (
    <SceneCanvas
      view={L.palco}
      mundo="farol"
      titulo="O mapa do Farol"
      descricao={`O personagem anda livre pelo mapa. A chave está ${
        chaveNoChao ? 'no chão' : carregaChave ? 'com o personagem' : 'fora do chão'
      }. O aviso do jogo diz: ${aviso}`}
    >
      <image
        data-fundo="farol"
        href={farolSvgUrl('praia-tropical')}
        width={L.palco.w}
        height={L.palco.h}
      />
      <image
        href={farolSvgUrl(aceso ? 'farol-listrado-aceso' : 'farol-listrado-apagado')}
        x={L.farol.x}
        y={L.farol.y}
        width={L.farol.w}
        height={L.farol.h}
      />
      {mostrarPorta ? (
        <g className="sz-discovery-alvo-porta">
          <ellipse
            cx={CENTRO_DA_PORTA.x}
            cy={CENTRO_DA_PORTA.y + 18}
            rx={ENCOSTA - 4}
            ry={(ENCOSTA - 4) / 2.4}
            fill="rgba(255,210,94,.35)"
            stroke="#ffd25e"
            strokeWidth="3"
          />
          <ellipse
            cx={CENTRO_DA_PORTA.x}
            cy={CENTRO_DA_PORTA.y + 18}
            rx={ENCOSTA + 6}
            ry={(ENCOSTA + 6) / 2.4}
            fill="none"
            stroke="#ffd25e"
            strokeWidth="2"
            opacity=".6"
          />
        </g>
      ) : null}
      <g
        className="sz-scene-anda"
        style={{ transform: `translate(${aceso ? L.chegadaBarcoX - L.barco.x : 0}px, 0px)` }}
      >
        <image
          href={farolSvgUrl('veleiro')}
          x={L.barco.x}
          y={L.barco.y}
          width={L.barco.w}
          height={L.barco.h}
        />
      </g>
      {chaveNoChao ? (
        <image
          className="sz-discovery-chave-brilha"
          href={farolSvgUrl('chave-dourada')}
          x={L.chave.x}
          y={L.chave.y}
          width={L.chave.w}
          height={L.chave.h}
        />
      ) : null}
      <g transform={`translate(${pos.x} ${pos.y})`}>
        <g className={andando ? 'sz-discovery-passo' : undefined}>
          <g transform={olhaEsquerda ? 'translate(64 0) scale(-1 1)' : undefined}>
            <image href={farolSvgUrl('aventureiro')} width={64} height={64} />
          </g>
          {carregaChave ? (
            <image href={farolSvgUrl('chave-dourada')} x={22} y={-16} width={22} height={22} />
          ) : null}
        </g>
      </g>
      {balao ? (
        <BalaoDaCena
          key={balao.texto}
          texto={balao.texto}
          tom={balao.tom}
          ponta={{ x: L.personagemNaPorta.x + 26, y: L.personagemNaPorta.y + 4 }}
        />
      ) : null}
      <AvisoDoFarol texto={aviso} />
    </SceneCanvas>
  )
}

/**
 * O balão de fala da cena, desenhado como nos jogos: a largura vem do TEXTO medido (nada vaza), a
 * ponta aponta para quem fala, sombra de relevo e a letra do Kids. Fica sempre dentro da tela.
 */
export function BalaoDaCena({
  texto,
  tom,
  ponta,
}: {
  texto: string
  tom: BalaoDaPorta['tom']
  ponta: { x: number; y: number }
}) {
  const medida = useRef<SVGTextElement>(null)
  const [largura, setLargura] = useState(texto.length * 8 + 32)
  useLayoutEffect(() => {
    const t = medida.current
    if (t && typeof t.getComputedTextLength === 'function')
      setLargura(Math.ceil(t.getComputedTextLength()) + 32)
  }, [])
  const altura = 36
  const cores =
    tom === 'sim'
      ? { fundo: '#e9fbf1', linha: '#0b7a54', tinta: '#0a4f37', icone: '✅' }
      : tom === 'nao'
        ? { fundo: '#fff0f0', linha: '#c0392b', tinta: '#7a1f17', icone: '🔒' }
        : { fundo: '#ffffff', linha: '#0a2a7a', tinta: '#18213a', icone: '🚪' }
  const total = largura + 22
  const x = Math.max(8, Math.min(472 - total, ponta.x - total + 34))
  const y = Math.max(42, ponta.y - altura - 18)
  const pontaX = Math.min(Math.max(ponta.x, x + 18), x + total - 18)
  return (
    <g
      className="sz-discovery-balao"
      style={{ fontFamily: "'Baloo 2', var(--font-baloo), sans-serif" }}
    >
      <rect x={x + 2} y={y + 4} width={total} height={altura} rx="18" fill="rgba(10,18,48,.22)" />
      <path
        d={`M ${pontaX - 10} ${y + altura - 1} L ${pontaX} ${ponta.y} L ${pontaX + 6} ${y + altura - 1} Z`}
        fill={cores.fundo}
        stroke={cores.linha}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect
        x={x}
        y={y}
        width={total}
        height={altura}
        rx="18"
        fill={cores.fundo}
        stroke={cores.linha}
        strokeWidth="2.5"
      />
      <rect x={pontaX - 9} y={y + altura - 4} width="14" height="5" fill={cores.fundo} />
      <text x={x + 12} y={y + altura / 2 + 1} dominantBaseline="central" fontSize="15">
        {cores.icone}
      </text>
      <text
        ref={medida}
        x={x + 34}
        y={y + altura / 2 + 1}
        dominantBaseline="central"
        fontSize="15"
        fontWeight="800"
        fill={cores.tinta}
      >
        {texto}
      </text>
    </g>
  )
}
