'use client'

import {
  COIN_COUNTER,
  type CoinIndex,
  type SceneAction,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import { FAROL_LAYOUT, farolSvgUrl } from '@sistemazero/studio/arte'
import { SceneButton } from './exploration-stage'
import { Chave } from './scene-bench'
import { SceneCanvas, Texto } from './scene-canvas'
import { AvisoDoFarol, RegraDoJogo } from './scene-farol'

/**
 * Os lugares do jogo do Poder "Moedas no caminho", os MESMOS do projeto que a criança monta
 * (`docs/aulas-interativas-tecnico/qa/moedas-projeto.ts`, `MOEDAS_2D` e `BAU_2D`): cinco moedas na
 * linha do personagem até a ponte e a sexta no gramado de cima; o baú no gramado de baixo.
 */
export const MOEDAS_DA_CENA = [
  { x: 95, y: 166 },
  { x: 150, y: 166 },
  { x: 205, y: 166 },
  { x: 260, y: 166 },
  { x: 332, y: 166 },
  { x: 100, y: 62 },
] as const
const BAU = { x: 28, y: 270, w: 48 } as const
const MOEDA_LADO = 24
/** As frases do aviso do jogo das Moedas (as do projeto). */
export const AVISOS_DAS_MOEDAS = {
  inicio: 'Junte moedas para o baú. Leve a chave ao farol.',
  abriu: 'O baú abriu! Você juntou moedas suficientes.',
  falta: 'O baú pede pelo menos 5 moedas.',
  faltaIgual: 'O baú pede exatamente 5 moedas.',
} as const

/** Onde o personagem fica: em cima de uma moeda, ao lado do baú, ou de volta à areia. */
function lugarDoPersonagem(at: SceneState['coins']['at']) {
  const hero = FAROL_LAYOUT.personagem
  if (at === 'chest') return { x: BAU.x + 6, y: BAU.y - 40 }
  if (at === null) return { x: hero.x, y: hero.y }
  const m = MOEDAS_DA_CENA[at]!
  return { x: m.x - 20, y: m.y - 25 }
}

function avisoDoJogo(c: SceneState['coins']) {
  if (c.at !== 'chest') return AVISOS_DAS_MOEDAS.inicio
  if (c.chest === 'open') return AVISOS_DAS_MOEDAS.abriu
  return c.rule === 'equals' ? AVISOS_DAS_MOEDAS.faltaIgual : AVISOS_DAS_MOEDAS.falta
}

/**
 * O palco é o JOGO: a praia do Farol, as moedas, o baú, o personagem, o aviso e o placar com o ícone
 * (como o "Mostrar placar Moedas:" do projeto). A soma de agora aparece ao lado do placar como
 * "antes → +1 → agora", e some quando a partida recomeça.
 */
export function CoinCounterStage({ state }: { state: SceneState }) {
  const c = state.coins
  const hero = FAROL_LAYOUT.personagem
  const lugar = lugarDoPersonagem(c.at)
  const aviso = avisoDoJogo(c)
  const noCaminho = c.present.filter(Boolean).length
  return (
    <SceneCanvas
      view={FAROL_LAYOUT.palco}
      mundo="farol"
      titulo="O contador de moedas"
      descricao={`${noCaminho} moedas no caminho. moedas guarda ${c.moedas}. O baú está ${c.chest === 'open' ? 'aberto' : 'fechado'}. O aviso do jogo diz: ${aviso}`}
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
      {MOEDAS_DA_CENA.map((m, i) => (
        <g
          key={`${m.x}-${m.y}`}
          className="sz-scene-anda"
          data-moeda={i + 1}
          data-no-caminho={c.present[i] ? 'sim' : 'nao'}
          style={{
            opacity: c.present[i] ? 1 : 0,
            transform: c.present[i] ? 'translate(0px, 0px)' : 'translate(0px, -14px)',
          }}
        >
          <image
            href={farolSvgUrl('moeda')}
            x={m.x}
            y={m.y}
            width={MOEDA_LADO}
            height={MOEDA_LADO}
          />
        </g>
      ))}
      <image
        data-bau={c.chest}
        href={farolSvgUrl(c.chest === 'open' ? 'bau-aberto' : 'bau-fechado')}
        x={BAU.x}
        y={BAU.y}
        width={BAU.w}
        height={BAU.w}
      />
      <g
        className="sz-scene-anda"
        data-personagem={
          c.at === null ? 'afastado' : c.at === 'chest' ? 'bau' : `moeda-${c.at + 1}`
        }
        style={{ transform: `translate(${lugar.x}px, ${lugar.y}px)` }}
      >
        <image href={farolSvgUrl('aventureiro')} width={hero.w} height={hero.h} />
      </g>
      <AvisoDoFarol texto={aviso} />
      <image href={farolSvgUrl('moeda')} x={10} y={42} width={22} height={22} />
      <Texto
        x="38"
        y="53"
        tamanho={20}
        fill="#ffffff"
        fontWeight="700"
        dominantBaseline="central"
        data-sem-halo=""
      >
        {`Moedas: ${c.moedas}`}
      </Texto>
      {c.last && (
        <g data-soma="">
          <rect x="150" y="42" width="112" height="22" rx="11" fill="#fff8e1" stroke="#d98c1a" />
          <Texto
            x="206"
            y="53"
            tamanho={14}
            fill="#7a4a0a"
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="central"
            data-sem-halo=""
          >
            {`${c.last.before} → +1 → ${c.last.after}`}
          </Texto>
        </g>
      )}
    </SceneCanvas>
  )
}

/**
 * A bancada: a regra da coleta e a do baú (como a criança monta), as duas chaves e os gestos.
 * ⚠️ Os rótulos ("Encostar na moeda", "Afastar", "Encostar no baú", "A moeda some", "Pelo menos 5",
 * "Igual a 5", "Recomeçar a partida") são os que os pedidos e as pistas do catálogo citam.
 */
export function CoinCounterControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const c = state.coins
  return (
    <div className="space-y-3">
      <RegraDoJogo
        titulo="A regra da coleta"
        passos={[
          {
            id: 'evento',
            bloco: 'evento',
            texto: 'Quando o personagem começar a encostar em algum do grupo, chamando de moeda',
          },
          {
            id: 'tirar',
            bloco: 'jogo',
            nivel: 1,
            texto: 'Tirar o sprite moeda do grupo',
            estado: c.disappear ? undefined : 'fora',
          },
          { id: 'somar', bloco: 'programa', nivel: 1, texto: 'Somar 1 em variável moedas' },
        ]}
      />
      <RegraDoJogo
        titulo="A regra do baú"
        passos={[
          { id: 'evento', bloco: 'evento', texto: 'Quando o personagem começar a encostar no baú' },
          {
            id: 'se',
            bloco: 'programa',
            nivel: 1,
            texto: `Se moedas ${c.rule === 'at-least' ? '≥' : '='} ${COIN_COUNTER.goal}: abrir o baú; senão: avisar`,
          },
        ]}
      />
      <Chave
        label="A moeda some"
        ligado={c.disappear}
        ligadoTexto="ligado"
        desligadoTexto="desligado"
        onToggle={(enabled) => dispatch({ type: 'coin-disappears', enabled })}
      />
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="mb-1 text-sm font-bold">A regra do baú</legend>
        <SceneButton
          tom={c.rule === 'at-least' ? 'gesto' : 'ferramenta'}
          aria-pressed={c.rule === 'at-least'}
          onClick={() => dispatch({ type: 'chest-rule', rule: 'at-least' })}
        >
          Pelo menos 5
        </SceneButton>
        <SceneButton
          tom={c.rule === 'equals' ? 'gesto' : 'ferramenta'}
          aria-pressed={c.rule === 'equals'}
          onClick={() => dispatch({ type: 'chest-rule', rule: 'equals' })}
        >
          Igual a 5
        </SceneButton>
      </fieldset>
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="mb-1 text-sm font-bold">Encostar na moeda</legend>
        {MOEDAS_DA_CENA.map((m, i) => (
          <SceneButton
            key={`${m.x}-${m.y}`}
            tom={c.at === i ? 'gesto' : 'ferramenta'}
            aria-label={`Encostar na moeda ${i + 1}`}
            data-ja-saiu={c.present[i] ? undefined : ''}
            onClick={() => dispatch({ type: 'touch-coin', coin: i as CoinIndex })}
          >
            {i + 1}
          </SceneButton>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <SceneButton fechado={c.at === null} onClick={() => dispatch({ type: 'leave-coin' })}>
          Afastar
        </SceneButton>
        <SceneButton tom="gesto" onClick={() => dispatch({ type: 'try-chest' })}>
          Encostar no baú
        </SceneButton>
        <SceneButton onClick={() => dispatch({ type: 'restart-coins' })}>
          Recomeçar a partida
        </SceneButton>
      </div>
    </div>
  )
}
