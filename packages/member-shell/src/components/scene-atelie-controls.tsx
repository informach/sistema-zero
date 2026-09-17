'use client'

import type { SceneAction, SceneCast, SceneId, SceneState } from '@sistemazero/core/learning/scene'
import {
  castText,
  mirrorAxes,
  mirrorModeFor,
  onionFireLength,
  quantos,
  SCENE_LIMITS,
  SHEET_CROP_WIDTHS,
} from '@sistemazero/core/learning/scene'
import { useRef } from 'react'
import { SceneButton } from './exploration-stage'
import { useCasaDeDedo } from './scene-atelie-stages'
import { Chave, Escolha, Medida, type MetasDaBancada, metaAberta } from './scene-bench'

/**
 * A BANCADA do ateliê de O Jogo do Meu Jeito (lote 5 do Raio-X, 16/09/2026, G4): `frames`,
 * `onion-skin`, `symmetry`, `pixel-vector`, `sheet-vs-sprite`, `fill-stroke` e `shading`.
 *
 * ⭐⭐ O nome de cada controle é o do BOTÃO do Pinta: Prévia, Velocidade (em quadros por segundo),
 * Fantasma, Espelho lado a lado, Preenchimento, Contorno e Sem cor. A cena é a ponte para a
 * ferramenta, e a criança que lia "Ligar a troca", "miolo" e "linha do eixo" ia procurar no Pinta um
 * botão que não existe.
 *
 * ⚠️ As chaves dizem o ESTADO ("Prévia: tocando"), e as escolhas não têm `aria-pressed` (a régua
 * do `scene-bench`). O que só abre depois de uma descoberta fica na tela, FECHADO, com o motivo.
 * ⚠️ Os motivos leem as metas da atividade (`goals`) e, quando a missão não cobra aquela meta, o que
 * o motor já viu: no "Agora é sua vez" as metas vêm todas abertas, e nada fica esperando.
 */
export function AtelieSceneControls({
  scene,
  state,
  dispatch,
  cast,
  goals,
  tocando,
  onRunning,
}: {
  scene: SceneId
  state: SceneState
  dispatch: (action: SceneAction) => void
  cast?: SceneCast
  goals: MetasDaBancada
  /** O relógio do player está andando? Sem ele, vale o estado da prévia no motor. */
  tocando?: boolean
  onRunning: (ligado: boolean) => void
}) {
  const nome = (texto: string) => castText(texto, cast)
  const viu = metaAberta(goals, state)
  switch (scene) {
    case 'frames': {
      /**
       * ⚠️⚠️ A Prévia é o RELÓGIO desta cena (o ▶ "Tempo" e o "Um passo" saíram dela, em
       * `botoesDoMundo`): eram dois interruptores para uma coisa só, e o ▶ com a prévia parada não
       * mudava nada. ⚠️ A chave diz "tocando" só com o relógio do player andando de verdade: uma aba
       * escondida ou um vídeo da aula pausam o relógio, e a chave não pode dizer que o fogo pulsa.
       */
      const tocandoDeVerdade = state.animation.playing && (tocando ?? true)
      return (
        <div className="w-full space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* ⚠️⚠️ Com a prévia TOCANDO, a escolha fica fechada e SEM destaque, com o motivo (consertos do
                review da onda B do lote 5, B1): o destaque pulava entre "Quadro 1" e "Quadro 2" no ritmo
                da prévia, um segundo pisca-pisca logo abaixo do fogo. Fechado não é escondido. */}
            <Escolha
              label={nome('Quadro na prévia')}
              valor={tocandoDeVerdade ? 0 : state.animation.frame}
              opcoes={[
                { id: 1, label: 'Quadro 1', fechado: tocandoDeVerdade },
                { id: 2, label: 'Quadro 2', fechado: tocandoDeVerdade },
              ]}
              nota={tocandoDeVerdade ? 'Pare a prévia para escolher um quadro.' : undefined}
              onChange={(index) => dispatch({ type: 'frame', index })}
            />
            <div className="rounded-2xl border border-border p-4">
              <Chave
                label={nome('Prévia')}
                ligado={tocandoDeVerdade}
                ligadoTexto="tocando"
                desligadoTexto="parada"
                onToggle={(ligar) => {
                  // O motor só recebe o gesto quando o estado da prévia muda de verdade.
                  if (ligar !== state.animation.playing) dispatch({ type: 'play', on: ligar })
                  onRunning(ligar)
                }}
              />
            </div>
          </div>
          {/* ⚠️ Os valores do Pinta (o 🐢→🐇 dele vai de 2 a 24; a aula anima a 8). */}
          <Escolha
            label={nome('Velocidade, em quadros por segundo')}
            valor={state.animation.rate}
            opcoes={[2, 4, 8, 12].map((v) => ({ id: v, label: String(v) }))}
            onChange={(perSecond) => dispatch({ type: 'rate', perSecond })}
          />
        </div>
      )
    }
    case 'onion-skin':
      return (
        <div className="w-full space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Escolha
              label={nome('Quadro à vista')}
              valor={state.animation.frame}
              opcoes={[
                { id: 1, label: 'Quadro 1' },
                { id: 2, label: 'Quadro 2' },
              ]}
              onChange={(index) => dispatch({ type: 'frame', index })}
            />
            <div className="rounded-2xl border border-border p-4">
              <Chave
                label={nome('Fantasma')}
                ligado={state.animation.onion}
                ligadoTexto="ligado"
                desligadoTexto="desligado"
                onToggle={(on) => dispatch({ type: 'onion', on })}
              />
            </div>
          </div>
          {/* ⚠️⚠️ Uma variável por vez: o fogo 2 é do quadro 2, então no quadro 1 ele fica fechado COM O
              MOTIVO. O motor recebe o tamanho quando o gesto termina (regra da `Medida`), senão
              arrastar passava pelo "um pouco maior" e fechava a meta no caminho. */}
          <Medida
            label={nome('tamanho do fogo 2')}
            value={state.animation.shift}
            min={SCENE_LIMITS.shift.min}
            max={SCENE_LIMITS.shift.max}
            step={4}
            texto={(v) => quantos(onionFireLength(v), 'quadradinho', 'quadradinhos')}
            tom="text-scene-b-ink"
            disabled={state.animation.frame !== 2}
            nota={
              state.animation.frame !== 2 ? 'Vá para o quadro 2 para mudar o fogo dele.' : undefined
            }
            onChange={(offset) => dispatch({ type: 'shift', offset })}
          />
        </div>
      )
    case 'symmetry': {
      const espelhos = mirrorAxes(state.mirror.on, state.mirror.axis)
      // ⚠️ O espelho de cima e de baixo abre DEPOIS do lado a lado: é o caso novo, que a criança
      // prevê com o que acabou de ver. ⚠️ Nunca fechado LIGADO: um caso que o liga precisa poder
      // desligar.
      const cimaEBaixoAberto = viu('two-sides') || espelhos.y
      return (
        <div className="w-full space-y-3">
          {/* ⚠️⚠️ DUAS chaves independentes, como no Pinta (consertos do review da onda B do lote 5): a
              escolha de três ("Desligado / Lado a lado / Cima e baixo") não deixava tentar o "E se os
              dois espelhos estivessem ligados?". Os nomes são os dos botões do Pinta. ⚠️ Uma embaixo da
              outra: lado a lado, "Espelho de cima e de baixo: desligado" passava da caixa na coluna de
              600 px (visto na banca). */}
          <div className="grid gap-3">
            <div className="rounded-2xl border border-border p-4">
              <Chave
                label={nome('Espelho lado a lado')}
                ligado={espelhos.x}
                ligadoTexto="ligado"
                desligadoTexto="desligado"
                onToggle={(x) =>
                  dispatch({ type: 'mirror-mode', mode: mirrorModeFor(x, espelhos.y) })
                }
              />
            </div>
            <div className="rounded-2xl border border-border p-4">
              <Chave
                label={nome('Espelho de cima e de baixo')}
                ligado={espelhos.y}
                ligadoTexto="ligado"
                desligadoTexto="desligado"
                disabled={!cimaEBaixoAberto}
                nota={
                  cimaEBaixoAberto
                    ? undefined
                    : 'Abre depois que você pintar a asa com o Espelho lado a lado.'
                }
                onToggle={(y) =>
                  dispatch({ type: 'mirror-mode', mode: mirrorModeFor(espelhos.x, y) })
                }
              />
            </div>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* ⚠️ Um azul cheio por vez: o traço que as metas pedem é a asa. */}
              <SceneButton tom="gesto" onClick={() => dispatch({ type: 'trace', piece: 'asa' })}>
                Pintar a asa
              </SceneButton>
              <SceneButton onClick={() => dispatch({ type: 'trace', piece: 'ponta' })}>
                Pintar a ponta
              </SceneButton>
              <SceneButton onClick={() => dispatch({ type: 'trace', piece: 'cabine' })}>
                Pintar a cabine
              </SceneButton>
              <SceneButton tom="discreta" onClick={() => dispatch({ type: 'clear-paper' })}>
                Apagar o papel
              </SceneButton>
            </div>
            <ConviteDoToque />
          </div>
        </div>
      )
    }
    case 'pixel-vector':
      return (
        /* ⚠️⚠️ UMA lupa para as duas pedras (lote 5): a escolha "Qual pedra olhar" saiu. O `kind`
           vai como está no motor, que não o usa mais. */
        <Medida
          label={nome('Aproximar')}
          value={state.pixels.zoom}
          min={SCENE_LIMITS.zoom.min}
          max={SCENE_LIMITS.zoom.max}
          texto={(v) => quantos(v, 'vez', 'vezes')}
          tom="text-scene-a"
          onChange={(zoom) => dispatch({ type: 'inspect', kind: state.pixels.kind, zoom })}
        />
      )
    case 'sheet-vs-sprite': {
      const nave = viu('crop-whole')
      const doTamanhoDeUmQuadro = state.sheet.loaded && state.sheet.width === 32
      return (
        <div className="w-full space-y-3">
          {/* ⚠️ Sem largura em destaque com o jogo VAZIO (consertos do review da onda B do lote 5, A4). */}
          <Escolha
            label={nome('Largura do recorte (a altura fica 32)')}
            valor={state.sheet.loaded ? state.sheet.width : 0}
            opcoes={SHEET_CROP_WIDTHS.map((w) => ({ id: w as number, label: String(w) }))}
            onChange={(width) => dispatch({ type: 'crop', width })}
          />
          <Escolha
            label={nome('Quadro do recorte')}
            valor={doTamanhoDeUmQuadro ? state.sheet.cell : 1}
            opcoes={[
              { id: 1, label: 'Quadro 1', fechado: !doTamanhoDeUmQuadro },
              { id: 2, label: 'Quadro 2', fechado: !doTamanhoDeUmQuadro },
            ]}
            nota={doTamanhoDeUmQuadro ? undefined : 'Abre com o recorte de 32.'}
            onChange={(cell) => dispatch({ type: 'cut', cell })}
          />
          {/* ⚠️⚠️ O tamanho no jogo abre DEPOIS do recorte de uma nave inteira: antes ele era a única
              meta da Aula 6, e um toque no + a fechava sem a criança ter olhado a folha. */}
          <Medida
            label={nome('tamanho no jogo')}
            value={state.sheet.size}
            min={SCENE_LIMITS.sprite.min}
            max={SCENE_LIMITS.sprite.max}
            step={2}
            passo={8}
            texto={(v) => `${v} por ${v}`}
            tom="text-scene-a"
            disabled={!nave}
            nota={
              nave ? undefined : 'Abre depois que você achar o recorte que mostra uma nave inteira.'
            }
            onChange={(size) => dispatch({ type: 'sprite', size })}
          />
        </div>
      )
    }
    case 'fill-stroke':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <Chave
              label={nome('Preenchimento')}
              ligado={state.ink.fill}
              ligadoTexto="com cor"
              desligadoTexto="Sem cor"
              onToggle={(on) => dispatch({ type: 'ink', part: 'fill', on })}
            />
          </div>
          <div className="rounded-2xl border border-border p-4">
            <Chave
              label={nome('Contorno')}
              ligado={state.ink.stroke}
              ligadoTexto="com cor"
              desligadoTexto="Sem cor"
              onToggle={(on) => dispatch({ type: 'ink', part: 'stroke', on })}
            />
          </div>
        </div>
      )
    case 'shading':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <Chave
              label={nome('A sombra e a luz')}
              ligado={state.light.shade}
              ligadoTexto="ligadas"
              desligadoTexto="desligadas"
              onToggle={(on) => dispatch({ type: 'shade', on })}
            />
          </div>
          <div className="rounded-2xl border border-border p-4">
            <Chave
              label={nome('O sol')}
              ligado={state.light.side === 'right'}
              ligadoTexto="na direita"
              desligadoTexto="na esquerda"
              seletor
              onToggle={(direita) => dispatch({ type: 'light', side: direita ? 'right' : 'left' })}
            />
          </div>
        </div>
      )
    default:
      return null
  }
}

/**
 * "Ou toque num quadradinho da grade.", só quando a casa tem tamanho de DEDO (consertos do review da
 * onda B do lote 5, M3): a 390 px cada quadradinho tinha 8 px, e o convite mandava a criança errar. A
 * medida é a do palco (`useCasaDeDedo`), na grade da mesma cena (a `section` que tem os dois).
 */
function ConviteDoToque() {
  const convite = useRef<HTMLParagraphElement | null>(null)
  // ⚠️ A grade desta cena é a da MESMA `section`: numa aula pode haver outra cena mais acima.
  const cabe = useCasaDeDedo(
    () => convite.current?.closest('section')?.querySelector('[data-toque-na-grade]') ?? null,
  )
  return (
    <p ref={convite} hidden={!cabe} className="mt-2 text-sm text-muted-foreground">
      Ou toque num quadradinho da grade.
    </p>
  )
}
