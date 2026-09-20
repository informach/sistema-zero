'use client'

import {
  CLEANUP_PRESETS,
  cleanupPreset,
  GAME_STATE_PRESETS,
  gameStatePreset,
  isCleanupPreset,
  isGameStatePreset,
  isRandomPreset,
  isSceneSetup,
  isSpawnPreset,
  ONCE_VS_ALWAYS_PRESETS,
  oncePreset,
  RANDOM_PRESETS,
  randomPreset,
  type SceneAction,
  type SceneActivity,
  type SceneSetup,
  SETUP_LIMITS,
  SPAWN_PRESETS,
  sceneModel,
  sceneSetupGoals,
  sceneTargets,
  sceneUnknownSetupGoals,
  spawnPreset,
} from '@sistemazero/core/learning/scene'
import { Button } from '@sistemazero/ui/button'
import { useId } from 'react'
import { saltoParadoNoCaso } from '../../lib/scene-authoring-rules'
import { SceneActionEditor } from './scene-action-editor'

/**
 * O CASO desta atividade: de onde a cena parte e o que ela cobra.
 *
 * ⚠️⚠️ É o campo que faz uma cena render mais de um uso. Sem ele, cada modelo tinha uma missão
 * só — as metas eram as do catálogo, iguais para todo mundo — e a biblioteca inteira rendia um
 * uso por cena. O elenco trocou QUEM está no palco; isto troca DE ONDE ele parte e O QUE conta
 * como descoberta, que é como uma mesma mecânica serve dezenas de exercícios no Brilliant.
 *
 * ⚠️ As ações do caso são as MESMAS do motor, pela mesma régua (`isSceneAction`) e pelo mesmo
 * editor do roteiro. Não há um segundo vocabulário de "condição inicial" para manter em dia.
 */
export function SceneSetupEditor({
  activity,
  onChange,
}: {
  activity: SceneActivity
  onChange: (activity: SceneActivity) => void
}) {
  const id = useId()
  const modelo = sceneModel(activity.scene)
  const setup = activity.setup
  const alvo = activity.type === 'experimentation' ? (setup?.goals ?? []) : []
  const preset = activity.scene === 'once-vs-always' ? oncePreset(setup?.preset) : undefined
  const sorteio = activity.scene === 'random' ? randomPreset(setup?.preset) : undefined
  const nascimento = activity.scene === 'spawn' ? spawnPreset(setup?.preset) : undefined
  const limpeza = activity.scene === 'cleanup' ? cleanupPreset(setup?.preset) : undefined
  const estado = activity.scene === 'game-state' ? gameStatePreset(setup?.preset) : undefined
  const metasAutomaticas =
    activity.type === 'experimentation'
      ? sceneTargets({ ...activity, setup: { ...setup, goals: undefined } })
      : []
  const metasDoPreset =
    setup?.preset !== undefined &&
    (activity.scene === 'once-vs-always' ||
      activity.scene === 'spawn' ||
      activity.scene === 'random')
  const presetLabels = {
    'duas-caixas-nave': 'Nave · duas áreas',
    'tres-caixas-tiro': 'Tiro · três áreas',
    'uma-ficha-vidas': 'Vidas · uma ficha',
    'duas-caixas-dino': 'Dino · duas áreas',
    'tres-caixas-som': 'Som · três áreas',
  } as const

  function textoDaMeta(meta: string, campo: 'label' | 'pedido', texto: string) {
    const copias = { ...setup?.goalCopy }
    const proxima = { ...copias[meta], [campo]: texto || undefined }
    if (!proxima.label && !proxima.pedido) delete copias[meta]
    else copias[meta] = proxima
    aplicar({ ...setup, goalCopy: copias })
  }

  /** Grava o caso, e o REMOVE quando ele fica vazio — caso vazio não é caso. */
  function aplicar(proximo: SceneSetup) {
    const limpo = casoLimpo(proximo)
    const { setup: _, ...resto } = activity
    onChange((limpo ? { ...activity, setup: limpo } : resto) as SceneActivity)
  }

  /**
   * ⚠️⚠️ Os objetivos que a cena NÃO tem (full review final de dados e deploy, MÉDIO-3). O caso pode
   * citar um id que nenhuma caixa abaixo desenha: sem este aviso a professora lia "desmarque as
   * descobertas" sem ter o que desmarcar, e não conseguia salvar. O bloco fica RECUSADO na publicação
   * até ela resolver — o erro é dela para ver, não para conviver em silêncio.
   */
  const desconhecidas =
    activity.type === 'experimentation' ? sceneUnknownSetupGoals(activity.scene, setup?.goals) : []
  const soAsQueExistem: SceneSetup = {
    ...setup,
    goals: sceneSetupGoals(activity.scene, setup?.goals),
  }

  // O aviso genérico olha o caso SEM os objetivos que não existem: eles têm o aviso próprio acima.
  const casoConferido = desconhecidas.length ? casoLimpo(soAsQueExistem) : setup
  const invalido =
    casoConferido !== undefined &&
    !isSceneSetup(casoConferido, activity.scene, { goals: activity.type === 'experimentation' })

  return (
    <div className="space-y-4">
      {sorteio && (
        <label className="block space-y-1 text-sm font-medium">
          <span>Caso preparado do sorteio</span>
          <select
            className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            value={isRandomPreset(setup?.preset) ? setup.preset.id : ''}
            onChange={(event) => {
              const escolhido = event.target.value as keyof typeof RANDOM_PRESETS
              aplicar({
                ...setup,
                preset: structuredClone(RANDOM_PRESETS[escolhido]),
                goals: undefined,
              })
            }}
          >
            <option value="" disabled>
              Escolha o caso da aula
            </option>
            <option value="cacto-direita">
              Cacto · nasce pela direita, com velocidade sorteada
            </option>
            <option value="pedra-acima">Pedra · nasce acima, com queda fixa</option>
          </select>
        </label>
      )}
      {nascimento && (
        <label className="block space-y-1 text-sm font-medium">
          <span>Caso preparado do nascimento</span>
          <select
            className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            value={isSpawnPreset(setup?.preset) ? setup.preset.id : ''}
            onChange={(event) => {
              const escolhido = event.target.value as keyof typeof SPAWN_PRESETS
              aplicar({
                ...setup,
                preset: structuredClone(SPAWN_PRESETS[escolhido]),
                goals: undefined,
              })
            }}
          >
            <option value="" disabled>
              Escolha o caso da aula
            </option>
            <option value="cacto-segundos">Cacto · relógio em segundos</option>
            <option value="pedra-quadros">Pedra · relógio em quadros</option>
          </select>
        </label>
      )}
      {limpeza && (
        <label className="block space-y-1 text-sm font-medium">
          <span>Caso preparado da limpeza</span>
          <select
            className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            value={isCleanupPreset(setup?.preset) ? setup.preset.id : ''}
            onChange={(event) => {
              const escolhido = event.target.value as keyof typeof CLEANUP_PRESETS
              const noEspaco = escolhido === 'tiro-cima'
              onChange({
                ...activity,
                setup: {
                  ...setup,
                  preset: structuredClone(CLEANUP_PRESETS[escolhido]),
                  // Cleanup não tem mapa de metas por preset; escolher o caso não escolhe a missão.
                  goals: ['invisible-stored', 'rule-removes'],
                  goalCopy: undefined,
                },
                cast: {
                  obstacle: {
                    name: noEspaco ? 'tiro' : 'cacto',
                    gender: 'm',
                    figure: noEspaco ? 'tiro' : 'cacto',
                  },
                },
                cenario: noEspaco ? 'nave' : 'corre-dino',
              } as SceneActivity)
            }}
          >
            <option value="" disabled>
              Escolha o caso da aula
            </option>
            <option value="cacto-esquerda">Cacto · sai pela esquerda, outro chega</option>
            <option value="tiro-cima">Tiro · sai por cima, no espaço</option>
          </select>
        </label>
      )}
      {estado && (
        <label className="block space-y-1 text-sm font-medium">
          <span>Caso preparado do estado do jogo</span>
          <select
            className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            value={isGameStatePreset(setup?.preset) ? setup.preset.id : ''}
            onChange={(event) => {
              const escolhido = event.target.value as keyof typeof GAME_STATE_PRESETS
              const desafio = escolhido === 'pedra-40-quadros'
              onChange({
                ...activity,
                setup: {
                  ...setup,
                  preset: structuredClone(GAME_STATE_PRESETS[escolhido]),
                  goals: ['outside', 'waiting', 'playing'],
                  goalCopy: desafio
                    ? {
                        outside: {
                          label: 'Sem a pergunta, as pedras nasceram antes de começar',
                          pedido: 'No início, com Criar pedra fora do Se, deixe o tempo passar.',
                        },
                        waiting: {
                          label:
                            'Com a pergunta, o relógio tocou três vezes e nenhuma pedra nasceu',
                          pedido:
                            'Leve Criar pedra para dentro de Se o estado do jogo é jogando e deixe o relógio tocar três vezes no início.',
                        },
                        playing: {
                          label: 'Começando a partida, as pedras voltaram a nascer',
                          pedido:
                            'Com Criar pedra dentro do Se, comece a partida e deixe o tempo passar.',
                        },
                      }
                    : undefined,
                },
                cast: desafio
                  ? {
                      hero: { name: 'nave', gender: 'f', figure: 'nave' },
                      obstacle: { name: 'pedra', gender: 'f', figure: 'asteroide' },
                    }
                  : undefined,
                cenario: desafio ? 'nave' : 'corre-dino',
              } as SceneActivity)
            }}
          >
            <option value="" disabled>
              Escolha o caso da aula
            </option>
            <option value="cacto-18-quadros">Corre Dino · cacto, relógio em segundos</option>
            <option value="pedra-40-quadros">Desafio · pedra, relógio em 40 quadros</option>
          </select>
        </label>
      )}
      {preset && (
        <div className="space-y-3 rounded-2xl border border-border p-3">
          <label htmlFor={`${id}-preset`} className="block text-sm font-medium">
            Caso preparado
          </label>
          <select
            id={`${id}-preset`}
            className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            value={preset.id}
            onChange={(event) => {
              const escolhido = event.target.value as keyof typeof ONCE_VS_ALWAYS_PRESETS
              aplicar({
                ...setup,
                preset: structuredClone(ONCE_VS_ALWAYS_PRESETS[escolhido]),
                goals: undefined,
                goalCopy: undefined,
              })
            }}
          >
            {Object.entries(presetLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            As áreas e as ações são as mesmas; o caso escolhe as fichas e as descobertas desta aula.
          </p>
          {preset.cards.map((card) => (
            <label key={card.id} className="block space-y-1 text-sm">
              <span>Nome da ficha: {card.id}</span>
              <input
                className="min-h-11 w-full rounded-xl border border-input bg-background px-3"
                value={card.label}
                maxLength={80}
                onChange={(event) =>
                  aplicar({
                    ...setup,
                    preset: {
                      ...preset,
                      cards: preset.cards.map((item) =>
                        item.id === card.id ? { ...item, label: event.target.value } : item,
                      ),
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      )}
      <div className="space-y-2">
        <p className="text-sm font-medium">Por onde a cena começa</p>
        <p className="text-xs text-muted-foreground">
          As ações acontecem antes de a criança entrar. Ela chega com o mundo já assim, e sem
          nenhuma descoberta feita.
        </p>
        <SceneActionEditor
          scene={activity.scene}
          value={setup?.actions ?? []}
          stepNumber={0}
          // ⚠️ A régua do CASO, não a do roteiro: pode ficar vazio (e aí o caso some), o teto é
          // o do `SETUP_LIMITS`, e `Restaurar a cena` não entra na lista.
          minimo={0}
          maximo={SETUP_LIMITS.actions}
          semReset
          onChange={(actions: SceneAction[]) => aplicar({ ...setup, actions })}
        />
        {saltoParadoNoCaso(activity.scene, setup?.actions) && (
          <p className="text-xs text-amber-700" role="status">
            Um salto no caso só aparece com o relógio depois dele. Acrescente Avançar o relógio, ou
            tire o salto.
          </p>
        )}
      </div>

      {activity.type === 'experimentation' && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">O que esta atividade cobra</legend>
          <p className="text-xs text-muted-foreground">
            Sem nenhuma marcada, a atividade cobra as {metasAutomaticas.length} descobertas{' '}
            {metasDoPreset ? 'do caso preparado' : 'do modelo'}. Marcando, ela fecha só com as
            escolhidas — é assim que a mesma cena vira duas missões.
          </p>
          {modelo.goals.map((meta) => (
            <label
              key={meta.id}
              htmlFor={`${id}-${meta.id}`}
              className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
            >
              <input
                id={`${id}-${meta.id}`}
                type="checkbox"
                checked={alvo.includes(meta.id)}
                onChange={(event) =>
                  aplicar({
                    ...setup,
                    goals: event.target.checked
                      ? [...alvo, meta.id]
                      : alvo.filter((g) => g !== meta.id),
                  })
                }
              />
              {meta.label}
              {meta.soNoCaso && (
                <span className="text-xs text-muted-foreground">
                  (só vale marcada: fica fora da missão sem caso)
                </span>
              )}
            </label>
          ))}
          {sceneTargets(activity).map((goal) => {
            const meta = modelo.goals.find((item) => item.id === goal)
            if (!meta) return null
            return (
              <div
                key={`${goal}-copy`}
                className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2"
              >
                <label className="space-y-1 text-xs">
                  <span>Rótulo da meta · {goal}</span>
                  <input
                    className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    value={setup?.goalCopy?.[goal]?.label ?? ''}
                    placeholder={meta.label}
                    maxLength={120}
                    onChange={(event) => textoDaMeta(goal, 'label', event.target.value)}
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span>Pedido à criança · {goal}</span>
                  <input
                    className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    value={setup?.goalCopy?.[goal]?.pedido ?? ''}
                    placeholder={meta.pedido}
                    maxLength={240}
                    onChange={(event) => textoDaMeta(goal, 'pedido', event.target.value)}
                  />
                </label>
              </div>
            )
          })}
        </fieldset>
      )}

      {desconhecidas.length > 0 && (
        <div
          role="alert"
          className="space-y-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200"
        >
          <p>
            Este caso cita objetivos que não existem nesta cena. O rascunho guarda assim, mas a aula
            não publica enquanto eles estiverem aqui. Confira se a cena certa está escolhida e tire
            do caso:
          </p>
          <ul className="list-disc pl-5">
            {desconhecidas.map((meta) => (
              <li key={meta}>
                <code>{meta}</code> não é um objetivo desta cena.
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" size="sm" onClick={() => aplicar(soAsQueExistem)}>
            Tirar do caso
          </Button>
        </div>
      )}

      {invalido && (
        <p className="text-sm text-destructive">
          Este caso não vale para a cena escolhida. Refaça as ações ou desmarque as descobertas.
        </p>
      )}
    </div>
  )
}

/** O caso sem listas vazias; `undefined` quando não sobra nada (caso vazio não é caso). */
function casoLimpo(proximo: SceneSetup): SceneSetup | undefined {
  const limpo: SceneSetup = {
    ...(proximo.actions?.length ? { actions: proximo.actions } : {}),
    ...(proximo.goals?.length ? { goals: proximo.goals } : {}),
    ...(proximo.preset ? { preset: proximo.preset } : {}),
    ...(proximo.goalCopy && Object.keys(proximo.goalCopy).length
      ? { goalCopy: proximo.goalCopy }
      : {}),
  }
  return limpo.actions || limpo.goals || limpo.preset || limpo.goalCopy ? limpo : undefined
}
