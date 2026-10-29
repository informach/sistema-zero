import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveCourseModels } from '../../../packages/studio/src/core/courseModels'
import { JARDIM_ASSETS_2D, JARDIM_ASSETS_3D, jardimModeloAsset } from './jardim-projeto'

const models = await resolveCourseModels([
  ...JARDIM_ASSETS_3D.filter((a) => ['regador-azul', 'aventureiro'].includes(a.name)),
  // A pedra que esconde parte do regador na pergunta do ponto de vista.
  jardimModeloAsset('pedra-do-jardim'),
])
writeFileSync(
  resolve(import.meta.dirname, '../../../packages/studio/src/arte/jardim-quiz.generated.ts'),
  `// Gerado por gerar-jardim-quiz-artes.ts. Mesmas artes dos projetos.\nexport const JARDIM_QUIZ_ART = ${JSON.stringify(
    {
      images: Object.fromEntries(
        JARDIM_ASSETS_2D.filter((a) => a.name !== 'menina-de-laco').map((a) => [a.name, a.dataUrl]),
      ),
      models: Object.fromEntries(models.map((a) => [a.name, a.dataUrl])),
    },
  )} as const\n`,
)
