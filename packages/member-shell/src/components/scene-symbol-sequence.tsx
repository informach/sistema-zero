'use client'

import {
  type SceneAction,
  type SceneState,
  SEQUENCE_SYMBOLS,
  type SequenceSymbol,
} from '@sistemazero/core/learning/scene'
import { FAROL_LAYOUT, farolSvgUrl } from '@sistemazero/studio/arte'
import { SceneButton } from './exploration-stage'
import { SceneCanvas, Texto } from './scene-canvas'
import { AvisoDoFarol, PalavraDoBloco, RegraDoJogo } from './scene-farol'

/**
 * Os lugares do jogo do Poder "O baú dos símbolos", os MESMOS do projeto que a criança monta
 * (`docs/aulas-interativas-tecnico/qa/simbolos-projeto.ts`, `PEDRAS_2D`, `PLACA_2D` e `BAU_2D`):
 * as três pedras numa fileira no gramado de baixo, a placa da ordem embaixo da lua e o baú na
 * areia, no fim da fileira.
 */
export const PEDRAS_DA_CENA: Record<
  SequenceSymbol,
  { x: number; y: number; w: number; h: number }
> = {
  sol: { x: 20, y: 250, w: 48, h: 48 },
  lua: { x: 100, y: 250, w: 48, h: 48 },
  estrela: { x: 180, y: 250, w: 48, h: 48 },
}
export const PLACA_DA_CENA = { x: 92, y: 304, w: 64, h: 48 } as const
export const BAU_DA_CENA = { x: 262, y: 254, w: 48, h: 48 } as const
/** As frases do aviso do jogo dos símbolos (as do projeto, `SIMBOLOS_AVISO`). */
export const AVISOS_DOS_SIMBOLOS = {
  inicio: 'Toque os símbolos na ordem da placa para abrir o baú.',
  sol: 'O sol acendeu! Agora a lua.',
  lua: 'A lua acendeu! Agora a estrela.',
  abriu: 'Na ordem certa! O baú abriu.',
  errou: 'Fora da ordem. Comece de novo pelo sol.',
} as const

type Sequencia = SceneState['sequence']

/** Onde o personagem fica: no começo, ou em cima da pedra em que encostou por último. */
function lugarDoPersonagem(at: Sequencia['at']) {
  if (at === null) return { x: FAROL_LAYOUT.personagem.x, y: FAROL_LAYOUT.personagem.y }
  const p = PEDRAS_DA_CENA[at]
  return { x: p.x - 8, y: p.y - 40 }
}

/** O aviso que o jogo mostraria (só contando, o jogo não erra: o aviso é o do começo). */
export function avisoDosSimbolos(q: Sequencia) {
  if (q.chest === 'open') return AVISOS_DOS_SIMBOLOS.abriu
  if (q.mode === 'count' || q.at === null) return AVISOS_DOS_SIMBOLOS.inicio
  if (q.lit.length === 0) return AVISOS_DOS_SIMBOLOS.errou
  if (q.at === 'lua' && q.passo === 2) return AVISOS_DOS_SIMBOLOS.lua
  return AVISOS_DOS_SIMBOLOS.sol
}

const FALADO: Record<SequenceSymbol, string> = { sol: 'o sol', lua: 'a lua', estrela: 'a estrela' }

/**
 * O palco é o JOGO: a praia do Farol, a placa da ordem, as três pedras (acesas ou apagadas), o
 * baú, o personagem e o aviso. O número que o baú consulta (passo, ou a contagem) fica à vista.
 */
export function SymbolSequenceStage({ state }: { state: SceneState }) {
  const q = state.sequence
  const hero = FAROL_LAYOUT.personagem
  const lugar = lugarDoPersonagem(q.at)
  const aviso = avisoDosSimbolos(q)
  const naOrdem = q.mode === 'order'
  const numero = naOrdem ? `passo: ${q.passo}` : `contados: ${q.lit.length} de 3`
  const acesos = q.lit.length ? q.lit.map((s) => FALADO[s]).join(', ') : 'nenhum símbolo'
  return (
    <SceneCanvas
      view={FAROL_LAYOUT.palco}
      mundo="farol"
      titulo="A ordem dos símbolos"
      descricao={`${naOrdem ? `passo é ${q.passo}` : `${q.lit.length} de 3 símbolos contados`}. Aceso: ${acesos}. O baú está ${q.chest === 'open' ? 'aberto' : 'fechado'}. O aviso do jogo diz: ${aviso}`}
    >
      <image
        data-fundo="farol"
        href={farolSvgUrl('praia-tropical')}
        width={FAROL_LAYOUT.palco.w}
        height={FAROL_LAYOUT.palco.h}
      />
      <image
        href={farolSvgUrl('farol-listrado-apagado')}
        x={FAROL_LAYOUT.farol.x}
        y={FAROL_LAYOUT.farol.y}
        width={FAROL_LAYOUT.farol.w}
        height={FAROL_LAYOUT.farol.h}
      />
      <image
        href={farolSvgUrl('placa-da-ordem')}
        x={PLACA_DA_CENA.x}
        y={PLACA_DA_CENA.y}
        width={PLACA_DA_CENA.w}
        height={PLACA_DA_CENA.h}
      />
      {SEQUENCE_SYMBOLS.map((s) => {
        const p = PEDRAS_DA_CENA[s]
        const aceso = q.lit.includes(s)
        return (
          <image
            key={s}
            data-pedra={s}
            data-aceso={aceso ? 'sim' : 'nao'}
            href={farolSvgUrl(aceso ? `pedra-${s}-acesa` : `pedra-${s}`)}
            x={p.x}
            y={p.y}
            width={p.w}
            height={p.h}
          />
        )
      })}
      <image
        data-bau={q.chest === 'open' ? 'aberto' : 'fechado'}
        href={farolSvgUrl(q.chest === 'open' ? 'bau-aberto' : 'bau-fechado')}
        x={BAU_DA_CENA.x}
        y={BAU_DA_CENA.y}
        width={BAU_DA_CENA.w}
        height={BAU_DA_CENA.h}
      />
      <g
        className="sz-scene-anda"
        data-personagem={q.at ?? 'comeco'}
        style={{ transform: `translate(${lugar.x}px, ${lugar.y}px)` }}
      >
        <image href={farolSvgUrl('aventureiro')} width={hero.w} height={hero.h} />
      </g>
      <AvisoDoFarol texto={aviso} />
      {/* O número que o baú consulta, num fundo claro (sobre o gramado escuro, o texto sumia). */}
      <g data-numero={naOrdem ? q.passo : q.lit.length}>
        <rect x="6" y="41" width="132" height="24" rx="12" fill="#fff8e1" opacity="0.92" />
        <Texto
          x="14"
          y="53"
          tamanho={14}
          fill="#143d35"
          fontWeight="700"
          dominantBaseline="central"
        >
          {numero}
        </Texto>
      </g>
    </SceneCanvas>
  )
}

/**
 * A bancada: a regra do jogo (como a criança monta), o jeito de o baú decidir e os gestos.
 * ⚠️ Os rótulos ("Tocar o sol", "Tocar a lua", "Tocar a estrela", "Na ordem", "Só contando",
 * "Recomeçar a partida") são os que os pedidos e as pistas citam.
 */
export function SymbolSequenceControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const q = state.sequence
  const naOrdem = q.mode === 'order'
  const regra = naOrdem
    ? [
        { id: 'sol', bloco: 'evento' as const, texto: 'Quando o personagem encostar no sol' },
        {
          id: 'sol-passo',
          bloco: 'jogo' as const,
          nivel: 1 as const,
          texto: 'passo = 1 e o sol acende',
        },
        { id: 'lua', bloco: 'evento' as const, texto: 'Quando o personagem encostar na lua' },
        {
          id: 'lua-se',
          bloco: 'programa' as const,
          nivel: 1 as const,
          texto: (
            <>
              <PalavraDoBloco>se</PalavraDoBloco> passo = 1
            </>
          ),
        },
        {
          id: 'lua-entao',
          bloco: 'jogo' as const,
          nivel: 2 as const,
          texto: 'passo = 2 e a lua acende',
        },
        {
          id: 'lua-senao',
          bloco: 'programa' as const,
          nivel: 2 as const,
          texto: (
            <>
              <PalavraDoBloco>senão</PalavraDoBloco> passo = 0 e tudo apaga
            </>
          ),
        },
        {
          id: 'estrela',
          bloco: 'evento' as const,
          texto: 'Quando o personagem encostar na estrela',
        },
        {
          id: 'estrela-se',
          bloco: 'programa' as const,
          nivel: 1 as const,
          texto: (
            <>
              <PalavraDoBloco>se</PalavraDoBloco> passo = 2
            </>
          ),
        },
        { id: 'estrela-entao', bloco: 'jogo' as const, nivel: 2 as const, texto: 'o baú abre' },
        {
          id: 'estrela-senao',
          bloco: 'programa' as const,
          nivel: 2 as const,
          texto: (
            <>
              <PalavraDoBloco>senão</PalavraDoBloco> passo = 0 e tudo apaga
            </>
          ),
        },
      ]
    : [
        {
          id: 'qualquer',
          bloco: 'evento' as const,
          texto: 'Quando o personagem encostar num símbolo novo',
        },
        { id: 'soma', bloco: 'jogo' as const, nivel: 1 as const, texto: 'contados = contados + 1' },
        {
          id: 'tres',
          bloco: 'programa' as const,
          nivel: 1 as const,
          texto: (
            <>
              <PalavraDoBloco>se</PalavraDoBloco> contados = 3
            </>
          ),
        },
        { id: 'abre', bloco: 'jogo' as const, nivel: 2 as const, texto: 'o baú abre' },
      ]
  return (
    <div className="space-y-3">
      <RegraDoJogo titulo="A regra do baú" passos={regra} />
      <p className="text-sm font-semibold" data-numero-da-regra={naOrdem ? q.passo : q.lit.length}>
        {naOrdem ? 'passo agora: ' : 'contados agora: '}
        <strong>{naOrdem ? q.passo : `${q.lit.length} de 3`}</strong>
      </p>
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="mb-1 text-sm font-bold">Como o baú decide</legend>
        <SceneButton
          tom={naOrdem ? 'gesto' : 'ferramenta'}
          aria-pressed={naOrdem}
          onClick={() => dispatch({ type: 'sequence-mode', mode: 'order' })}
        >
          Na ordem
        </SceneButton>
        <SceneButton
          tom={!naOrdem ? 'gesto' : 'ferramenta'}
          aria-pressed={!naOrdem}
          onClick={() => dispatch({ type: 'sequence-mode', mode: 'count' })}
        >
          Só contando
        </SceneButton>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        {SEQUENCE_SYMBOLS.map((s) => (
          <SceneButton
            key={s}
            fechado={q.chest === 'open'}
            onClick={() => dispatch({ type: 'touch-symbol', symbol: s })}
          >
            {`Tocar ${FALADO[s]}`}
          </SceneButton>
        ))}
        <SceneButton onClick={() => dispatch({ type: 'restart-symbols' })}>
          Recomeçar a partida
        </SceneButton>
      </div>
    </div>
  )
}
