'use client'

import { type SceneAction, type SceneState, TIMED_BRIDGE } from '@sistemazero/core/learning/scene'
import { FAROL_LAYOUT, farolSvgUrl } from '@sistemazero/studio/arte'
import { SceneButton } from './exploration-stage'
import { SceneCanvas, Texto } from './scene-canvas'
import { AvisoDoFarol, PalavraDoBloco, RegraDoJogo } from './scene-farol'

/**
 * Os lugares do jogo do Poder "A ponte apressada", os MESMOS do projeto que a criança monta
 * (`docs/aulas-interativas-tecnico/qa/ponte-projeto.ts`, `LAGUINHO_2D`, `SINO_2D`, `PONTE_2D`,
 * `ALAVANCA_2D` e `NA_PEDRA_2D`): o laguinho no gramado de baixo, a pedra do sino na água, a ponte
 * da margem da direita até a pedra e a alavanca na areia, ao lado da entrada.
 */
export const LAGUINHO_DA_CENA = { x: 96, y: 258, w: 128, h: 80 } as const
export const SINO_DA_CENA = { x: 108, y: 256, w: 64, h: 64 } as const
export const PONTE_DA_CENA = { x: 128, y: 282, w: 96, h: 48 } as const
export const ALAVANCA_DA_CENA = { x: 260, y: 292, w: 32, h: 32 } as const
const NA_PEDRA = { x: 96, y: 240 } as const
/** As frases do aviso do jogo da Ponte (as do projeto, `PONTE_AVISO`). */
export const AVISOS_DA_PONTE = {
  inicio: 'Puxe a alavanca e atravesse a ponte antes que ela suba.',
  baixou: 'A ponte baixou! Atravesse antes que ela suba.',
  subiu: 'A ponte subiu. Puxe a alavanca de novo.',
  atravessou: 'Você atravessou e tocou o sino!',
  levantada: 'A ponte está levantada. Puxe a alavanca primeiro.',
} as const

type Ponte = SceneState['bridge']

/** Onde o personagem fica: no começo, ao lado da alavanca, na entrada da ponte ou na pedra. */
function lugarDoPersonagem(at: Ponte['at']) {
  if (at === 'lever') return { x: 282, y: 262 }
  if (at === 'bridge') return { x: 200, y: 258 }
  if (at === 'stone') return NA_PEDRA
  return { x: FAROL_LAYOUT.personagem.x, y: FAROL_LAYOUT.personagem.y }
}

export function avisoDaPonte(b: Ponte) {
  if (b.at === 'stone') return AVISOS_DA_PONTE.atravessou
  if (b.at === 'bridge' && !b.ponteAberta) return AVISOS_DA_PONTE.levantada
  if (b.ponteAberta) return AVISOS_DA_PONTE.baixou
  if (b.rises > 0) return AVISOS_DA_PONTE.subiu
  return AVISOS_DA_PONTE.inicio
}

/** Quantos segundos o "depois de" que vai rodar primeiro já contou (0 com o relógio parado). */
export function segundosContados(b: Ponte) {
  return b.timers.length ? TIMED_BRIDGE.seconds - Math.min(...b.timers) : 0
}

const sim = (v: boolean) => (v ? 'verdadeiro' : 'falso')

/**
 * O palco é o JOGO: a praia do Farol, o laguinho, a pedra do sino, a ponte, a alavanca, o
 * personagem e o aviso. O relógio do "depois de" acende uma marquinha por segundo, até 4.
 */
export function TimedBridgeStage({ state }: { state: SceneState }) {
  const b = state.bridge
  const hero = FAROL_LAYOUT.personagem
  const lugar = lugarDoPersonagem(b.at)
  const aviso = avisoDaPonte(b)
  const contados = segundosContados(b)
  const tocando = b.at === 'stone'
  return (
    <SceneCanvas
      view={FAROL_LAYOUT.palco}
      mundo="farol"
      titulo="A ponte apressada"
      descricao={`ponteAberta é ${sim(b.ponteAberta)}: a ponte está ${b.ponteAberta ? 'baixada' : 'levantada'}. O relógio do "depois de" ${b.timers.length ? `contou ${contados} de ${TIMED_BRIDGE.seconds} segundos` : 'está parado'}. O aviso do jogo diz: ${aviso}`}
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
        href={farolSvgUrl('laguinho')}
        x={LAGUINHO_DA_CENA.x}
        y={LAGUINHO_DA_CENA.y}
        width={LAGUINHO_DA_CENA.w}
        height={LAGUINHO_DA_CENA.h}
      />
      <image
        data-sino={tocando ? 'tocando' : 'quieto'}
        href={farolSvgUrl(tocando ? 'pedra-do-sino-tocando' : 'pedra-do-sino')}
        x={SINO_DA_CENA.x}
        y={SINO_DA_CENA.y}
        width={SINO_DA_CENA.w}
        height={SINO_DA_CENA.h}
      />
      <image
        data-ponte={b.ponteAberta ? 'baixada' : 'levantada'}
        href={farolSvgUrl(b.ponteAberta ? 'ponte-baixada' : 'ponte-levantada')}
        x={PONTE_DA_CENA.x}
        y={PONTE_DA_CENA.y}
        width={PONTE_DA_CENA.w}
        height={PONTE_DA_CENA.h}
      />
      <image
        data-alavanca={b.ponteAberta ? 'baixo' : 'cima'}
        href={farolSvgUrl(b.ponteAberta ? 'alavanca-baixo' : 'alavanca-cima')}
        x={ALAVANCA_DA_CENA.x}
        y={ALAVANCA_DA_CENA.y}
        width={ALAVANCA_DA_CENA.w}
        height={ALAVANCA_DA_CENA.h}
      />
      <g
        className="sz-scene-anda"
        data-personagem={b.at}
        style={{ transform: `translate(${lugar.x}px, ${lugar.y}px)` }}
      >
        <image href={farolSvgUrl('aventureiro')} width={hero.w} height={hero.h} />
      </g>
      <AvisoDoFarol texto={aviso} />
      {/* O relógio do "depois de": uma marquinha acesa por segundo contado. */}
      <g data-relogio={b.timers.length ? contados : 'parado'}>
        {/* Um fundo claro: sobre o gramado escuro, o texto e as marquinhas sumiam. */}
        <rect x="6" y="41" width="164" height="24" rx="12" fill="#fff8e1" opacity="0.92" />
        <Texto
          x="12"
          y="53"
          tamanho={14}
          fill="#143d35"
          fontWeight="700"
          dominantBaseline="central"
        >
          Relógio:
        </Texto>
        {Array.from({ length: TIMED_BRIDGE.seconds }, (_, i) => (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: as marquinhas são posições fixas.
            key={i}
            data-marca={i < contados ? 'acesa' : 'apagada'}
            cx={88 + i * 22}
            cy="53"
            r="8"
            fill={i < contados ? '#f4b400' : '#fff8e1'}
            stroke="#143d35"
            strokeDasharray={i < contados ? undefined : '3 2'}
          />
        ))}
      </g>
    </SceneCanvas>
  )
}

/**
 * A bancada: a regra do jogo (como a criança monta), o lugar do "depois de" e os gestos.
 * ⚠️ Os rótulos ("Puxar a alavanca", "Esperar 1 segundo", "Encostar na ponte", "Dentro da
 * alavanca", "No começo do jogo", "Recomeçar a partida") são os que os pedidos e as pistas citam.
 */
export function TimedBridgeControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const b = state.bridge
  const naAlavanca = b.place === 'lever'
  const depoisDe = (nivel: 1 | 2) => [
    {
      id: `depois-${nivel}`,
      bloco: 'programa' as const,
      nivel,
      texto: (
        <>
          <PalavraDoBloco>depois de</PalavraDoBloco> {TIMED_BRIDGE.seconds} segundos
        </>
      ),
    },
    {
      id: `subir-${nivel}`,
      bloco: 'jogo' as const,
      nivel: 2 as const,
      texto: 'subir a ponte e guardar ponteAberta = falso',
    },
  ]
  // A marca vem da TENTATIVA: só com o personagem na entrada da ponte (ou já do outro lado).
  const ramo = (valor: boolean) =>
    b.at !== 'bridge' && b.at !== 'stone'
      ? undefined
      : (b.at === 'stone') === valor
        ? 'escolhido'
        : 'ignorado'
  return (
    <div className="space-y-3">
      <RegraDoJogo
        titulo="A regra da ponte"
        passos={[
          ...(naAlavanca
            ? []
            : [
                { id: 'comeco', bloco: 'evento' as const, texto: 'Ao começar o jogo' },
                ...depoisDe(1),
              ]),
          {
            id: 'alavanca',
            bloco: 'evento',
            texto: 'Quando o personagem começar a encostar na alavanca',
          },
          {
            id: 'baixar',
            bloco: 'jogo',
            nivel: 1,
            texto: 'baixar a ponte e guardar ponteAberta = verdadeiro',
          },
          ...(naAlavanca ? depoisDe(1) : []),
          {
            id: 'ponte',
            bloco: 'evento',
            texto: 'Quando o personagem começar a encostar na ponte',
          },
          {
            id: 'se',
            bloco: 'programa',
            nivel: 1,
            texto: (
              <>
                <PalavraDoBloco>se</PalavraDoBloco> ponteAberta
              </>
            ),
          },
          {
            id: 'entao',
            bloco: 'jogo',
            nivel: 2,
            estado: ramo(true),
            texto: (
              <>
                <PalavraDoBloco>então</PalavraDoBloco> atravessar e tocar o sino
              </>
            ),
          },
          {
            id: 'senao',
            bloco: 'programa',
            nivel: 2,
            estado: ramo(false),
            texto: (
              <>
                <PalavraDoBloco>senão</PalavraDoBloco> avisar que a ponte está levantada
              </>
            ),
          },
        ]}
      />
      <p className="text-sm font-semibold" data-ponte-aberta={sim(b.ponteAberta)}>
        ponteAberta agora: <strong>{sim(b.ponteAberta)}</strong>
      </p>
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="mb-1 text-sm font-bold">Onde fica o "depois de 4 segundos"</legend>
        <SceneButton
          tom={naAlavanca ? 'gesto' : 'ferramenta'}
          aria-pressed={naAlavanca}
          onClick={() => dispatch({ type: 'timer-place', place: 'lever' })}
        >
          Dentro da alavanca
        </SceneButton>
        <SceneButton
          tom={!naAlavanca ? 'gesto' : 'ferramenta'}
          aria-pressed={!naAlavanca}
          onClick={() => dispatch({ type: 'timer-place', place: 'start' })}
        >
          No começo do jogo
        </SceneButton>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <SceneButton fechado={b.at === 'stone'} onClick={() => dispatch({ type: 'pull-lever' })}>
          Puxar a alavanca
        </SceneButton>
        <SceneButton tom="gesto" onClick={() => dispatch({ type: 'wait-second' })}>
          Esperar 1 segundo
        </SceneButton>
        <SceneButton fechado={b.at === 'stone'} onClick={() => dispatch({ type: 'touch-bridge' })}>
          Encostar na ponte
        </SceneButton>
        <SceneButton onClick={() => dispatch({ type: 'restart-bridge' })}>
          Recomeçar a partida
        </SceneButton>
      </div>
    </div>
  )
}
