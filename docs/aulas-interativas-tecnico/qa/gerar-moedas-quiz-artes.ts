import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveCourseModels } from '../../../packages/studio/src/core/courseModels'
import { ilhaModelo } from './ilha-do-farol-assets'
import { moedasModeloAsset } from './moedas-projeto'

// As artes da pergunta 3D do quiz das Moedas: o personagem da Ilha e a moeda do projeto.
const models = await resolveCourseModels([
  ilhaModelo('aventureiro').asset,
  moedasModeloAsset('moeda-de-ouro'),
])
writeFileSync(
  resolve(import.meta.dirname, '../../../packages/studio/src/arte/moedas-quiz.generated.ts'),
  `// Gerado por gerar-moedas-quiz-artes.ts. Mesmas artes dos projetos.\nexport const MOEDAS_QUIZ_ART = ${JSON.stringify(
    { models: Object.fromEntries(models.map((a) => [a.name, a.dataUrl])) },
  )} as const\n`,
)
