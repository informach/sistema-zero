/**
 * Espelho editorial dos dois quizzes do Desafio do Primeiro Jogo (21/10/2026): em
 * docs/marketing/kids/desafio-primeiro-jogo/copy/, `quiz.md` e `resultados-quiz.md` (Kids v5:
 * entrada, ramos, perguntas, regra do perfil e uma carta por perfil dos dois ramos) e
 * `adulto-quiz.md` e `adulto-resultados-quiz.md` (adulto v1). A copy vive no código; o espelho
 * existe para ler e revisar em Markdown. Para mudar uma frase, edite o `.ts` e rode
 * `bun scripts/espelho-quiz-desafio.ts`; `desafio-quiz.test.ts` reprova espelho desatualizado.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ResultadoConversa } from '../src/content/resultado-conversa'
import {
  CLEAR_PROFILE_MIN as ADULTO_CLEAR_MIN,
  PROFILE_IDS as ADULTO_PROFILE_IDS,
  QUIZ_VERSION as ADULTO_VERSION,
  PROFILE_WEIGHTS as ADULTO_WEIGHTS,
} from '../src/funnels/desafio-adulto/quiz/engine'
import {
  QUIZ_ENTRY as ADULTO_ENTRY,
  QUIZ_HEADLINES as ADULTO_HEADLINES,
  QUIZ_STAGES as ADULTO_STAGES,
} from '../src/funnels/desafio-adulto/quiz/entry-copy'
import { DESAFIO_ADULTO_QUESTIONS } from '../src/funnels/desafio-adulto/quiz/questions'
import { buildDesafioAdultoResult } from '../src/funnels/desafio-adulto/quiz/result'
import { PROFILE_LABELS as ADULTO_LABELS } from '../src/funnels/desafio-adulto/quiz/result-copy'
import type { QuizAnswers } from '../src/lib/quiz-types'
import { espelhoPerguntasVida, espelhoResultadosVida } from './espelho-quiz-vida'

export const PASTA_ESPELHO_QUIZ_DESAFIO = join(
  import.meta.dir,
  '..',
  '..',
  '..',
  'docs',
  'marketing',
  'kids',
  'desafio-primeiro-jogo',
  'copy',
)
export const ARQUIVOS_ESPELHO_QUIZ_DESAFIO = {
  'quiz.md': () => espelhoPerguntasKids(),
  'resultados-quiz.md': () => espelhoResultadosKids(),
  'adulto-quiz.md': () => espelhoPerguntasAdulto(),
  'adulto-resultados-quiz.md': () => espelhoResultadosAdulto(),
} as const

const CABECALHO =
  '<!-- Espelho gerado da copy tipada em packages/funnel/src/funnels/desafio-primeiro-jogo/quiz/ e desafio-adulto/quiz/. Edite o código e rode `bun scripts/espelho-quiz-desafio.ts` (em packages/funnel). -->'

function manchetes(headlines: Record<string, { label: string; title: string }>): string[] {
  return Object.entries(headlines).flatMap(([id, h]) => [
    `**Manchete ${id === 'padrao' ? 'padrão' : `com \`?manchete=${id}\``}** (${h.label}):`,
    `# ${h.title}`,
  ])
}

export const espelhoPerguntasKids = () => espelhoPerguntasVida('desafio')

const marcado = (texto: string) => texto.replaceAll('[[', '**').replaceAll(']]', '**')

function carta(titulo: string, r: ResultadoConversa): string[] {
  const b: string[] = [`## ${titulo}`, `_Perfil \`${r.perfil}\`, destino ${r.destino}._`]
  if (r.aviso) b.push(`_${r.aviso}_`)
  b.push(`### ${r.titulo}`)
  for (const bloco of r.blocos) {
    if (bloco.tipo === 'p') b.push(marcado(bloco.texto))
    else if (bloco.tipo === 'h') b.push(`#### ${bloco.texto}`)
    else if (bloco.tipo === 'img') b.push(`_[Tela: ${bloco.legenda}]_`)
    else if (bloco.tipo === 'relato') b.push(`> “${bloco.texto}” ${bloco.autor}`)
    else
      b.push(
        bloco.texto,
        `[${bloco.rotulo}](${bloco.href})`,
        ...(bloco.nota ? [`_${bloco.nota}_`] : []),
      )
  }
  b.push(`_${r.assinatura}_`)
  return b
}

export const espelhoResultadosKids = () => espelhoResultadosVida('desafio')

export function espelhoPerguntasAdulto(): string {
  const b: string[] = [CABECALHO, '# Quiz adulto do Desafio: entrada e perguntas']
  b.push(
    `_Versão \`${ADULTO_VERSION}\`. Nenhuma tela antes do resultado cita o Desafio, A Chave do Farol, curso, aula, plataforma, preço ou prazo._`,
  )
  b.push('## Entrada', `_${ADULTO_ENTRY.eyebrow}_`, ...manchetes(ADULTO_HEADLINES))
  b.push(
    ADULTO_ENTRY.description,
    `Selos: ${ADULTO_ENTRY.chips.join(' · ')}`,
    `[${ADULTO_ENTRY.button}] · ${ADULTO_ENTRY.minorLink}`,
    ADULTO_ENTRY.note,
  )
  b.push(
    '### Saída de menos de 18',
    `**${ADULTO_ENTRY.minor.title}**`,
    ADULTO_ENTRY.minor.text,
    `[${ADULTO_ENTRY.minor.button}](${ADULTO_ENTRY.minor.href})`,
  )
  b.push('## Perguntas')
  for (const step of DESAFIO_ADULTO_QUESTIONS) {
    b.push(`### ${step.id}. ${step.titulo}`)
    b.push(
      `_Etapa: ${ADULTO_STAGES[step.etapa as keyof typeof ADULTO_STAGES]}. Chave \`${step.key}\`. No /admin: ${step.rotuloCurto}._`,
    )
    if (step.subtitulo) b.push(step.subtitulo)
    b.push(step.opcoes.map((o) => `- \`${o.value}\`: ${o.label}`).join('\n'))
  }
  b.push(
    '## Regra do perfil',
    `A frase que parece com a pessoa e a frase-síntese valem ${ADULTO_WEIGHTS.cena}; daqui a um mês vale ${ADULTO_WEIGHTS.cena_desejada}. O empate vai para a síntese, depois para a frase. Com ${ADULTO_CLEAR_MIN} pontos ou mais, o diagnóstico é claro; abaixo, a carta avisa que as respostas apontaram para mais de um lado. Só celular ou tablet, aula ao vivo e trabalhar com jogos trocam o botão por "Ver os requisitos e como funciona".`,
  )
  return `${b.join('\n\n')}\n`
}

const baseAdulto: QuizAnswers = {
  _quiz_version: ADULTO_VERSION,
  _quiz_revision: 8,
  computador: 'meu',
  programacao: 'nunca',
  tempo_livre: '1_3',
  tentativa: 'fechei',
  garantia: 'terminar',
}

export function espelhoResultadosAdulto(): string {
  const b: string[] = [CABECALHO, '# Quiz adulto do Desafio: o resultado em conversa']
  b.push(
    '_Uma carta de cada perfil, com as respostas que levam a ele nas três perguntas de perfil. Em **negrito**, as respostas da pessoa devolvidas no texto. As outras respostas mudam frases da carta; todas estão em `desafio-adulto/quiz/result-copy.ts`._',
  )
  for (const letra of Object.keys(ADULTO_PROFILE_IDS) as (keyof typeof ADULTO_PROFILE_IDS)[]) {
    const r = buildDesafioAdultoResult({
      ...baseAdulto,
      cena: letra,
      cena_desejada: letra,
      sintese: letra,
    })
    if (!r) throw new Error(`Sem carta para ${letra}`)
    b.push(...carta(ADULTO_LABELS[letra], r))
  }
  return `${b.join('\n\n')}\n`
}

if (import.meta.main) {
  for (const [arquivo, gerar] of Object.entries(ARQUIVOS_ESPELHO_QUIZ_DESAFIO))
    writeFileSync(join(PASTA_ESPELHO_QUIZ_DESAFIO, arquivo), gerar())
  console.log(Object.keys(ARQUIVOS_ESPELHO_QUIZ_DESAFIO).join(' '))
}
