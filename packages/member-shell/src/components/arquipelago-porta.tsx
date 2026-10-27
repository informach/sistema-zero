'use client'

import type { PublicoJogo } from '@sistemazero/arquipelago-contracts'
import type { ReactNode } from 'react'

/**
 * A porta do Arquipélago Vagalume: o que aparece antes de o jogo montar (abrindo, ainda não
 * abriu, deu erro) e por cima dele quando uma ferramenta está abrindo ou falhou.
 *
 * Um visual só, de propósito, nas duas comunidades: a noite do arquipélago (o mesmo azul de
 * fundo do jogo), com a ilha e o farol, para a espera já parecer o jogo. O que muda por público
 * é a voz e o Zappy (só no Kids: o vagalume é o mascote de lá), e os botões, que usam a classe
 * de ação de cada app (`sz-btn-gradient`), então vestem a paleta escolhida.
 */

export type EstadoDaPorta = 'carregando' | 'indisponivel' | 'erro'

const TEXTOS: Record<
  EstadoDaPorta,
  { titulo: string; kids: string; adulto: string; zappy: 'happy' | 'sleeping' | 'thinking' }
> = {
  carregando: {
    titulo: 'Abrindo o Arquipélago',
    kids: 'O Zappy está acendendo o caminho até a sua ilha.',
    adulto: 'Preparando a sua ilha.',
    zappy: 'happy',
  },
  indisponivel: {
    titulo: 'O Arquipélago ainda não abriu por aqui',
    kids: 'Ele está abrindo aos poucos. Quando chegar a sua vez, ele aparece no menu.',
    adulto: 'Ele está abrindo aos poucos. Quando chegar a sua vez, ele aparece no menu.',
    zappy: 'sleeping',
  },
  erro: {
    titulo: 'Não consegui abrir o Arquipélago agora',
    kids: 'Pode ser a internet. Tente de novo daqui a pouco.',
    adulto: 'Pode ser a conexão. Tente de novo daqui a pouco.',
    zappy: 'thinking',
  },
}

const NOME_DA_FERRAMENTA = { pinta: 'o Pinta', molda: 'o Molda', estudio: 'o Estúdio' } as const
export type FerramentaDaPorta = keyof typeof NOME_DA_FERRAMENTA

/** Classe do botão secundário sobre a noite (as duas peles têm só a ação clara aqui). */
const BOTAO_NA_NOITE =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/35 px-5 font-bold text-sm text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
const BOTAO_DE_ACAO = 'sz-btn-gradient h-11 gap-2 px-6 text-sm'

const ANIMACOES = `
@keyframes arqp-facho { from { transform: rotate(-24deg) } 50% { transform: rotate(24deg) } to { transform: rotate(-24deg) } }
@keyframes arqp-pisca { 0%, 100% { opacity: .35 } 50% { opacity: 1 } }
@keyframes arqp-onda { from { transform: translateX(0) } to { transform: translateX(-280px) } }
@keyframes arqp-barra { from { transform: translateX(-100%) } to { transform: translateX(250%) } }
@keyframes arqp-flutua { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
.arqp-facho { transform-box: fill-box; transform-origin: 50% 100%; animation: arqp-facho 7s ease-in-out infinite }
.arqp-estrela { animation: arqp-pisca 3.4s ease-in-out infinite }
.arqp-onda { animation: arqp-onda 9s linear infinite }
.arqp-barra { animation: arqp-barra 1.6s ease-in-out infinite }
.arqp-flutua { animation: arqp-flutua 3s ease-in-out infinite }
@media (prefers-reduced-motion: reduce) {
  .arqp-facho, .arqp-estrela, .arqp-onda, .arqp-barra, .arqp-flutua { animation: none }
}
`

const ESTRELAS: Array<[number, number, number, number]> = [
  [8, 12, 1.4, 0],
  [18, 30, 1, 1.2],
  [27, 9, 1.8, 0.6],
  [39, 22, 1.1, 2.1],
  [52, 7, 1.5, 1.6],
  [61, 26, 1, 0.3],
  [72, 13, 1.7, 2.6],
  [83, 28, 1.2, 1],
  [91, 10, 1.4, 1.9],
  [96, 33, 1, 0.8],
  [12, 41, 1, 2.3],
  [88, 44, 1.1, 1.4],
]

/** A ilha com o farol e o mar à noite (SVG, sem arquivo para baixar). */
function Paisagem() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_100%,#24407a_0%,#16244f_38%,#0e1430_72%)]" />
      {ESTRELAS.map(([x, y, r, atraso]) => (
        <span
          key={`${x}-${y}`}
          className="arqp-estrela absolute rounded-full bg-white"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: r * 2,
            height: r * 2,
            animationDelay: `${atraso}s`,
          }}
        />
      ))}
      <svg
        className="absolute bottom-0 left-1/2 h-[46%] min-h-56 w-[min(140%,1100px)] -translate-x-1/2"
        viewBox="0 0 1100 420"
        preserveAspectRatio="xMidYMax meet"
        // O mar e o facho passam da caixa: o mar vai de ponta a ponta da tela (a moldura corta).
        overflow="visible"
      >
        <defs>
          <linearGradient id="arqp-luz" x1="0" y1="0" x2="0" y2="1">
            {/* Forte junto da lâmpada (embaixo) e sumindo no céu: o facho nunca briga com o texto. */}
            <stop offset="0" stopColor="#ffd56b" stopOpacity="0" />
            <stop offset="1" stopColor="#ffd56b" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id="arqp-brilho">
            <stop offset="0" stopColor="#fff3c4" stopOpacity="0.95" />
            <stop offset="0.4" stopColor="#ffcf4a" stopOpacity="0.45" />
            <stop offset="1" stopColor="#ffcf4a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="arqp-mar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#173d6e" />
            <stop offset="1" stopColor="#0b1f3d" />
          </linearGradient>
        </defs>
        {/* O facho varre o céu devagar; com menos movimento, fica parado. */}
        <g transform="translate(560 118)">
          <g className="arqp-facho">
            <polygon points="0,0 -120,-170 120,-170" fill="url(#arqp-luz)" />
          </g>
        </g>
        <rect x="-3000" y="300" width="7100" height="400" fill="url(#arqp-mar)" />
        <g className="arqp-onda" opacity="0.35">
          {Array.from({ length: 52 }, (_, i) => (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: ondas fixas, sem reordenar
              key={i}
              d={`M${(i - 22) * 140} 330 q 35 -8 70 0 t 70 0`}
              stroke="#8fc7ff"
              strokeWidth="2"
              fill="none"
            />
          ))}
        </g>
        {/* A ilha central */}
        <ellipse cx="560" cy="312" rx="250" ry="34" fill="#e9d59b" />
        <ellipse cx="560" cy="300" rx="205" ry="28" fill="#4f9a55" />
        <ellipse cx="470" cy="292" rx="40" ry="16" fill="#3f8448" />
        <ellipse cx="660" cy="294" rx="48" ry="17" fill="#3f8448" />
        {/* A casinha ao lado do farol */}
        <rect x="610" y="248" width="62" height="40" rx="3" fill="#f5e9cf" />
        <polygon points="602,252 641,222 680,252" fill="#d9534f" />
        <rect x="634" y="262" width="14" height="26" rx="2" fill="#7a4b2a" />
        <rect x="617" y="258" width="11" height="10" rx="1.5" fill="#ffd56b" />
        {/* O farol */}
        <polygon points="540,292 580,292 572,140 548,140" fill="#f4f1ea" />
        <polygon points="543,252 577,252 575,222 545,222" fill="#d9534f" />
        <polygon points="546,196 574,196 573,170 547,170" fill="#d9534f" />
        <rect x="544" y="128" width="32" height="14" rx="2" fill="#2b3c66" />
        <rect x="548" y="110" width="24" height="20" rx="3" fill="#ffe28a" />
        <polygon points="544,112 576,112 560,94" fill="#2b3c66" />
        <circle cx="560" cy="118" r="46" fill="url(#arqp-brilho)" />
      </svg>
    </div>
  )
}

function Zappy({ expressao }: { expressao: 'happy' | 'sleeping' | 'thinking' }) {
  return (
    <img
      src={`/zappy/${expressao}.webp`}
      alt=""
      width={112}
      height={112}
      className="arqp-flutua mx-auto size-24 drop-shadow-[0_0_24px_rgba(255,214,107,0.45)] sm:size-28"
    />
  )
}

function Cartao({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto flex w-full max-w-md flex-col items-center gap-4 text-center text-white">
      {children}
    </div>
  )
}

/** A porta inteira (antes de o jogo montar). */
export function PortaDoArquipelago({
  estado,
  publico,
  voltarPara,
}: {
  estado: EstadoDaPorta
  publico: PublicoJogo
  voltarPara: string
}) {
  const texto = TEXTOS[estado]
  return (
    <div className="absolute inset-0 grid place-items-center overflow-y-auto px-[max(16px,env(safe-area-inset-left))] pt-10 pb-[32vh]">
      <style>{ANIMACOES}</style>
      <Paisagem />
      <Cartao>
        {publico === 'kids' ? <Zappy expressao={texto.zappy} /> : null}
        <p className="font-bold text-[0.7rem] text-white/70 uppercase tracking-[0.14em]">
          Arquipélago Vagalume
        </p>
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
          <h1 className="sz-display text-balance text-3xl text-white sm:text-4xl">
            {texto.titulo}
          </h1>
          <p className="max-w-sm text-pretty text-base text-white/80">
            {publico === 'kids' ? texto.kids : texto.adulto}
          </p>
        </div>
        {estado === 'carregando' ? (
          <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-white/15">
            <span className="arqp-barra block h-full w-1/3 rounded-full bg-[#ffd56b]" />
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {estado === 'erro' ? (
              <button
                type="button"
                className={BOTAO_DE_ACAO}
                onClick={() => window.location.reload()}
              >
                Tentar de novo
              </button>
            ) : null}
            <a href={voltarPara} className={estado === 'erro' ? BOTAO_NA_NOITE : BOTAO_DE_ACAO}>
              Voltar
            </a>
          </div>
        )}
      </Cartao>
    </div>
  )
}

/** Por cima do jogo: a ferramenta está abrindo ou não abriu. */
export function AvisoDaFerramenta({
  ferramenta,
  falhou,
  onVoltar,
}: {
  ferramenta: FerramentaDaPorta
  falhou: boolean
  /** Só com `falhou`: devolve a criança ao jogo (e encerra o pedido da ferramenta). */
  onVoltar?: () => void
}) {
  const nome = NOME_DA_FERRAMENTA[ferramenta]
  return (
    <div
      role={falhou ? 'alert' : 'status'}
      aria-live="polite"
      className="absolute inset-0 z-50 grid place-items-center bg-[#0e1430]/80 px-4 backdrop-blur-sm"
    >
      <style>{ANIMACOES}</style>
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border border-white/15 bg-[#16244f] px-6 py-7 text-center text-white shadow-2xl">
        <p className="sz-display text-balance text-2xl text-white">
          {falhou ? `Não consegui abrir ${nome} agora` : `Abrindo ${nome}`}
        </p>
        {falhou ? (
          <>
            <p className="text-sm text-white/80">O jogo ficou pausado. Volte e tente de novo.</p>
            <button type="button" className={BOTAO_DE_ACAO} onClick={onVoltar}>
              Voltar ao jogo
            </button>
          </>
        ) : (
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/15">
            <span className="arqp-barra block h-full w-1/3 rounded-full bg-[#ffd56b]" />
          </div>
        )}
      </div>
    </div>
  )
}
