import { describe, expect, test } from 'bun:test'
import { openScene, SCENE_IDS, type SceneId } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { ExplorationPieces } from '../src/components/exploration-pieces'
import { ExplorationStage } from '../src/components/exploration-stage'
import { LessonSceneControls } from '../src/components/scene-lesson-controls'

/**
 * ⚠️⚠️ Toda cena tem PALCO e BANCADA (full review de 16/09/2026, M5).
 *
 * O despacho cena → palco terminava em `return <AccelerationStage/>`: uma cena acrescentada a `SCENE_IDS`
 * sem palco desenhava a da aceleração, sem erro nenhum. Hoje o `ExplorationStage` é exaustivo no tipo
 * (`semPalco(m: never)`), e este teste cobra o que o tipo não vê: que cada palco DESENHA alguma coisa, e
 * que cada bancada monta pelo menos um controle. As bancadas continuam decidindo sozinhas se a cena é
 * delas (`switch … default: return null`), então uma cena esquecida em todas elas renderizaria vazia, em
 * silêncio, e a criança leria uma instrução sem ter onde mexer.
 */

/** Cenas cujo gesto mora NO PALCO, sem controle na bancada. Exceção nova precisa de motivo. */
const GESTO_NO_PALCO: Partial<Record<SceneId, string>> = {
  tilemap: 'as letras do mapa são tocadas no próprio desenho (`TilemapStage` recebe o `dispatch`)',
}

const nada = () => {}

describe('o despacho da cena chega a um palco e a uma bancada de verdade', () => {
  test.each(SCENE_IDS.map((scene) => [scene]))('%s: o palco desenha', (scene) => {
    const html = renderToStaticMarkup(
      <ExplorationStage
        activity={{ type: 'experimentation', scene }}
        state={openScene({ scene })}
        dispatch={nada}
      />,
    )
    expect(html).toMatch(/<svg\b/)
  })

  test.each(
    SCENE_IDS.map((scene) => [scene]),
  )('%s: a bancada (ou o palco) tem onde mexer', (scene) => {
    const state = openScene({ scene })
    const activity = { type: 'experimentation', scene } as const
    const bancada = renderToStaticMarkup(
      <>
        <LessonSceneControls
          scene={scene}
          state={state}
          dispatch={nada}
          goals={[]}
          onRunning={nada}
        />
        <ExplorationPieces activity={activity} state={state} dispatch={nada} more={false} />
      </>,
    )
    const controles = (bancada.match(/<button\b|<input\b|<textarea\b/g) ?? []).length
    if (GESTO_NO_PALCO[scene]) {
      expect(controles, `${scene} ganhou bancada: tire a exceção`).toBe(0)
      const palco = renderToStaticMarkup(
        <ExplorationStage activity={activity} state={state} dispatch={nada} />,
      )
      expect(palco).toMatch(/<button\b|role="button"|tabindex="0"/i)
    } else expect(controles, scene).toBeGreaterThan(0)
  })
})
