/**
 * Espelho editorial do quiz da Comunidade Kids (v6, 20/10/2026): docs/marketing/kids/
 * comunidade-dos-criadores/copy/quiz-comunidade.md (entrada, ramos, perguntas e regra do perfil) e
 * resultados-quiz.md (uma carta de cada perfil dos dois ramos, montada pelo código), gerados a
 * partir de src/funnels/comunidade-dos-criadores/quiz. A copy vive no código; o espelho existe para
 * ler e revisar em Markdown. Para mudar uma frase, edite o `.ts` e rode
 * `bun scripts/espelho-quiz-comunidade.ts`; `comunidade-quiz.test.ts` reprova espelho desatualizado.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ResultadoConversa } from '../src/content/resultado-conversa'
import {
  CLEAR_PROFILE_MIN,
  CONDITIONAL_BY_PROFILE,
  PROFILE_IDS,
  PROFILE_IDS_M9,
  PROFILE_WEIGHTS,
  QUIZ_VERSION,
} from '../src/funnels/comunidade-dos-criadores/quiz/engine'
import {
  ADULT_EXIT,
  QUIZ_ENTRY,
  QUIZ_HEADLINES,
  STAGE_LABELS,
} from '../src/funnels/comunidade-dos-criadores/quiz/entry-copy'
import {
  BRANCHES,
  CALCULADORA_POR_DIA,
  COMMUNITY_QUESTIONS,
} from '../src/funnels/comunidade-dos-criadores/quiz/questions'
import { buildCommunityResult } from '../src/funnels/comunidade-dos-criadores/quiz/result'
import { PROFILE_LABELS_9A17 } from '../src/funnels/comunidade-dos-criadores/quiz/result-copy-9a17'
import { PROFILE_LABELS_M9 } from '../src/funnels/comunidade-dos-criadores/quiz/result-copy-m9'
import type { QuizAnswers } from '../src/lib/quiz-types'

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

const CABECALHO =
  '<!-- Espelho gerado da copy tipada em packages/funnel/src/funnels/comunidade-dos-criadores/quiz/. Edite o código e rode `bun scripts/espelho-quiz-comunidade.ts` (em packages/funnel). -->'

export function espelhoPerguntas(): string {
  const b: string[] = [CABECALHO, '# Quiz da Comunidade Kids: entrada, ramos e perguntas']
  b.push(
    `_Versão \`${QUIZ_VERSION}\`. As perguntas falam só da criança e da casa; nenhuma tela antes do resultado cita a Comunidade nem apresenta a criação de jogos como solução. O texto é escrito no masculino e vira "ela" quando a entrada é "Na minha filha"._`,
  )
  b.push('## Entrada', `_${QUIZ_ENTRY.eyebrow}_`)
  for (const [id, h] of Object.entries(QUIZ_HEADLINES)) {
    const quando = id === 'padrao' ? 'padrão' : `com \`?manchete=${id}\``
    b.push(`**Manchete ${quando}** (${h.label}):`, `# ${h.title}`)
  }
  b.push(QUIZ_ENTRY.description, QUIZ_ENTRY.note)
  b.push(
    '## Ramos',
    Object.entries(BRANCHES)
      .map(([id, label]) => `- \`${id}\`: ${label}`)
      .join('\n'),
  )
  b.push(
    `### Saída de 18 ou mais`,
    `**${ADULT_EXIT.title}**`,
    ADULT_EXIT.text,
    `[${ADULT_EXIT.action}]`,
  )
  b.push('## Perguntas')
  for (const step of COMMUNITY_QUESTIONS) {
    const perfil = Object.entries(CONDITIONAL_BY_PROFILE).find(([, key]) => key === step.key)?.[0]
    const ramo = step.ramo ? BRANCHES[step.ramo as keyof typeof BRANCHES] : 'Entrada'
    const etapa = step.ramo
      ? STAGE_LABELS[step.ramo === 'm9' ? 'm9' : '9a17'][step.etapa as 'rotina' | 'casa' | 'desejo']
      : 'Entrada'
    b.push(`### ${ramo}${step.condicional ? ` · extra (perfil ${perfil})` : ''}. ${step.titulo}`)
    b.push(`_Etapa: ${etapa}. Chave \`${step.key}\`. No /admin: ${step.rotuloCurto}._`)
    if (step.subtitulo) b.push(step.subtitulo)
    if (step.key === 'tempo_criacao')
      b.push(
        `Na tela, o título repete o tempo por dia: ${Object.values(CALCULADORA_POR_DIA)
          .map((t) => `"${t}"`)
          .join('; ')}.`,
      )
    b.push(step.opcoes.map((o) => `- \`${o.value}\`: ${o.label}`).join('\n'))
  }
  b.push(
    '## Regra do perfil',
    `Nos dois ramos, a cena de casa e a frase-síntese valem ${PROFILE_WEIGHTS.cena}; a preocupação e a cena desejada valem ${PROFILE_WEIGHTS.preocupacao}. Com ${CLEAR_PROFILE_MIN} pontos ou mais, o diagnóstico é claro; abaixo, a carta avisa que as respostas apontaram para mais de um lado. No menor de 9, a cena dos avós soma para o tempo a dois, e o irmão mais velho não soma.`,
  )
  return `${b.join('\n\n')}\n`
}

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
    else b.push(bloco.texto, `[${bloco.rotulo}](${bloco.href})`)
  }
  b.push(`_${r.assinatura}_`)
  return b
}

const base917: QuizAnswers = {
  _quiz_version: QUIZ_VERSION,
  _quiz_revision: 11,
  genero: 'filho',
  idade: '9_12',
  tempo_tela: '2_4h',
  computador: 'sim',
  quando_trava: 'tenta',
  tempo_criacao: 'um_pouco',
  garantia: 'acompanhar',
}
const EXTRA_917: Record<string, QuizAnswers> = {
  B: { ferramenta: 'pode_outra' },
  C: { desenho: 'movimento' },
  F: { escola: 'matematica' },
}
const baseM9: QuizAnswers = {
  _quiz_version: QUIZ_VERSION,
  _quiz_revision: 10,
  genero: 'filha',
  idade: 'menos_9',
  m9_leitura: 'comecando',
  m9_computador: 'sim',
  m9_tempo_juntos: 'duas_tres',
  m9_garantia: 'conduzir',
}

export function espelhoResultados(): string {
  const b: string[] = [CABECALHO, '# Quiz da Comunidade Kids: o resultado em conversa']
  b.push(
    '_Uma carta de cada perfil, com as respostas que levam a ele nas quatro perguntas de perfil. Em **negrito**, as respostas da família devolvidas no texto. As outras respostas mudam frases da carta; todas estão em `result-copy-9a17.ts` e `result-copy-m9.ts`._',
  )
  for (const [letra, slug] of Object.entries(PROFILE_IDS)) {
    const r = buildCommunityResult({
      ...base917,
      cena: letra,
      preocupacao: letra,
      cena_desejada: letra,
      sintese: letra,
      ...EXTRA_917[letra],
    })
    if (!r) throw new Error(`Sem carta para ${slug}`)
    b.push(...carta(PROFILE_LABELS_9A17[letra as keyof typeof PROFILE_IDS], r))
  }
  for (const [letra, slug] of Object.entries(PROFILE_IDS_M9)) {
    const r = buildCommunityResult({
      ...baseM9,
      m9_cena: letra,
      m9_preocupacao: letra,
      m9_cena_desejada: letra,
      m9_sintese: letra,
    })
    if (!r) throw new Error(`Sem carta para ${slug}`)
    b.push(...carta(PROFILE_LABELS_M9[letra as keyof typeof PROFILE_IDS_M9], r))
  }
  return `${b.join('\n\n')}\n`
}

if (import.meta.main) {
  writeFileSync(join(PASTA_ESPELHO_QUIZ, ARQUIVO_PERGUNTAS), espelhoPerguntas())
  writeFileSync(join(PASTA_ESPELHO_QUIZ, ARQUIVO_RESULTADOS), espelhoResultados())
  console.log(ARQUIVO_PERGUNTAS, ARQUIVO_RESULTADOS)
}
