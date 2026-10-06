import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest } from '@sistemazero/core/learning'
import { openScene, sceneStart } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { SceneCenarioProvider } from '../src/components/scene-cenario-context'
import { OnceVsAlwaysStage } from '../src/components/scene-once-vs-always'

for (const [file, figure, description] of [
  ['corre-dino-aula-01', 'dino', 'O Dino está visível na cena.'],
  ['nave-contra-asteroides-primeira-nave', 'nave', 'A nave está visível na cena.'],
])
  test(`${file}: a mesma comparação de movimento respeita a figura e a descrição`, () => {
    const manifest: unknown = JSON.parse(
      readFileSync(
        resolve(import.meta.dir, `../../../docs/aulas-interativas/aulas/${file}.manifesto.json`),
        'utf8',
      ),
    )
    if (!isLearningManifest(manifest)) throw new Error('Manifesto inválido')
    const entry = manifest.blocks.find(
      (b) =>
        'content' in b &&
        b.content?.kind === 'interactive' &&
        b.content.activity.type === 'experimentation' &&
        b.content.activity.scene === 'once-vs-always',
    )
    const content = entry && 'content' in entry ? entry.content : undefined
    if (content?.kind !== 'interactive' || content.activity.type !== 'experimentation')
      throw new Error('Experiência ausente')
    const activity = content.activity
    const preset = activity.setup?.preset
    if (!preset || !('cards' in preset)) throw new Error('Montagem ausente')
    const html = renderToStaticMarkup(
      <SceneCenarioProvider cenario={activity.cenario}>
        <OnceVsAlwaysStage
          state={openScene(sceneStart(activity))}
          cast={activity.cast}
          preset={preset}
        />
      </SceneCenarioProvider>,
    )
    expect(html).toContain(`data-figure="${figure}"`)
    expect(html).toContain(description!)
  })
