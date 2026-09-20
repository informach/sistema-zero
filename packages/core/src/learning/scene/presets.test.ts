import { describe, expect, test } from 'bun:test'
import { openScene } from './engine'
import { evaluateExperimentation, sceneGoals } from './evaluate'
import { isExperimentationActivity, isSceneSetup, sceneTargets } from './index'
import { ONCE_VS_ALWAYS_PRESETS } from './presets'

describe('casos da once-vs-always', () => {
  test('os cinco casos são atividades da mesma cena', () => {
    for (const preset of Object.values(ONCE_VS_ALWAYS_PRESETS)) {
      expect(
        isExperimentationActivity({
          type: 'experimentation',
          scene: 'once-vs-always',
          setup: { preset, goals: preset.areas.length === 3 ? ['on-event'] : ['once'] },
        }),
      ).toBe(true)
    }
  })

  test('um preset de outra cena e uma ficha adulterada são recusados', () => {
    const preset = ONCE_VS_ALWAYS_PRESETS['duas-caixas-nave']
    expect(isSceneSetup({ preset }, 'coordinates')).toBe(false)
    expect(
      isSceneSetup(
        { preset: { ...preset, cards: [{ id: 'event', kind: 'shot', label: 'Criar tiro' }] } },
        'once-vs-always',
      ),
    ).toBe(false)
  })

  test('texto de meta só pode vestir um id existente', () => {
    const preset = ONCE_VS_ALWAYS_PRESETS['uma-ficha-vidas']
    expect(
      isSceneSetup(
        {
          preset,
          goals: ['once'],
          goalCopy: {
            once: { label: 'As vidas vieram uma vez', pedido: 'Avance até duas batidas.' },
          },
        },
        'once-vs-always',
      ),
    ).toBe(true)
    expect(
      isSceneSetup(
        { preset, goalCopy: { invented: { label: 'Meta inventada' } } },
        'once-vs-always',
      ),
    ).toBe(false)
  })

  test('o preset escolhe a missão possível e o texto da aula chega à avaliação', () => {
    const activity = {
      type: 'experimentation' as const,
      scene: 'once-vs-always' as const,
      setup: {
        preset: ONCE_VS_ALWAYS_PRESETS['uma-ficha-vidas'],
        goalCopy: {
          once: { label: 'As vidas vieram uma vez', pedido: 'Ponha Dar três vidas em Ao iniciar.' },
        },
      },
    }
    expect(sceneTargets(activity)).toEqual(['once'])
    const state = openScene({ scene: activity.scene, setup: activity.setup })
    expect(
      sceneGoals(
        activity.scene,
        state,
        undefined,
        sceneTargets(activity),
        undefined,
        activity.setup.goalCopy,
      )[0]?.label,
    ).toBe('As vidas vieram uma vez')
    expect(
      evaluateExperimentation(
        activity.scene,
        state,
        true,
        undefined,
        sceneTargets(activity),
        undefined,
        activity.setup.goalCopy,
      ).feedback,
    ).toBe('Ponha Dar três vidas em Ao iniciar.')
    expect(isSceneSetup({ preset: activity.setup.preset, goals: ['flood'] }, activity.scene)).toBe(
      false,
    )
  })
})
