// Espelho editorial vigente; histórico v6 preservado em copy/historico.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { espelhoPerguntasVida, espelhoResultadosVida } from './espelho-quiz-vida'
export const PASTA_ESPELHO_QUIZ = join(
  import.meta.dir,
  '..',
  '..',
  '..',
  'docs',
  'marketing',
  'kids',
  'comunidade-dos-criadores',
  'copy',
)
export const ARQUIVO_PERGUNTAS = 'quiz-comunidade.md'
export const ARQUIVO_RESULTADOS = 'resultados-quiz.md'

export const espelhoPerguntas = () => espelhoPerguntasVida('comunidade')
export const espelhoResultados = () => espelhoResultadosVida('comunidade')
if (import.meta.main) {
  writeFileSync(join(PASTA_ESPELHO_QUIZ, ARQUIVO_PERGUNTAS), espelhoPerguntas())
  writeFileSync(join(PASTA_ESPELHO_QUIZ, ARQUIVO_RESULTADOS), espelhoResultados())
  console.log(ARQUIVO_PERGUNTAS, ARQUIVO_RESULTADOS)
}
