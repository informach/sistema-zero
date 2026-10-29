import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveCourseModels } from '../../../packages/studio/src/core/courseModels'
import { cabanaModeloAsset } from './cabana-projeto'
import { ilhaModelo } from './ilha-do-farol-assets'

// As artes da pergunta 3D do quiz da Cabana: o personagem da Ilha e a cabana do projeto (com o clipe abrir).
const models = await resolveCourseModels([
  ilhaModelo('aventureiro').asset,
  cabanaModeloAsset('cabana-do-faroleiro'),
])
writeFileSync(
  resolve(import.meta.dirname, '../../../packages/studio/src/arte/cabana-quiz.generated.ts'),
  `// Gerado por gerar-cabana-quiz-artes.ts. Mesmas artes dos projetos.\nexport const CABANA_QUIZ_ART = ${JSON.stringify(
    { models: Object.fromEntries(models.map((a) => [a.name, a.dataUrl])) },
  )} as const\n`,
)
