import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveCourseModels } from '../../../packages/studio/src/core/courseModels'
import { ilhaModelo } from './ilha-do-farol-assets'
import { ponteModeloAsset } from './ponte-projeto'

// As artes da pergunta 3D do quiz da Ponte: o personagem da Ilha e as peças do projeto (com os clipes).
const models = await resolveCourseModels([
  ilhaModelo('aventureiro').asset,
  ponteModeloAsset('laguinho'),
  ponteModeloAsset('pedra-do-sino'),
  ponteModeloAsset('ponte-levadica'),
  ponteModeloAsset('alavanca'),
])
writeFileSync(
  resolve(import.meta.dirname, '../../../packages/studio/src/arte/ponte-quiz.generated.ts'),
  `// Gerado por gerar-ponte-quiz-artes.ts. Mesmas artes dos projetos.\nexport const PONTE_QUIZ_ART = ${JSON.stringify(
    { models: Object.fromEntries(models.map((a) => [a.name, a.dataUrl])) },
  )} as const\n`,
)
