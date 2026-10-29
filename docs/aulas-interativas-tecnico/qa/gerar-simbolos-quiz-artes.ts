import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveCourseModels } from '../../../packages/studio/src/core/courseModels'
import { ilhaModelo } from './ilha-do-farol-assets'
import { moedasModeloAsset } from './moedas-projeto'
import { simbolosModeloAsset } from './simbolos-projeto'

// As artes da pergunta 3D do quiz dos símbolos: o personagem da Ilha, as pedras e o baú (com os clipes).
const models = await resolveCourseModels([
  ilhaModelo('aventureiro').asset,
  simbolosModeloAsset('pedra-sol'),
  simbolosModeloAsset('pedra-lua'),
  simbolosModeloAsset('pedra-estrela'),
  moedasModeloAsset('bau-do-tesouro'),
])
writeFileSync(
  resolve(import.meta.dirname, '../../../packages/studio/src/arte/simbolos-quiz.generated.ts'),
  `// Gerado por gerar-simbolos-quiz-artes.ts. Mesmas artes dos projetos.\nexport const SIMBOLOS_QUIZ_ART = ${JSON.stringify(
    { models: Object.fromEntries(models.map((a) => [a.name, a.dataUrl])) },
  )} as const\n`,
)
