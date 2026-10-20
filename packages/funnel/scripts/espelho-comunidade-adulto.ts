/**
 * Espelho editorial do funil adulto da Comunidade dos Criadores (20/10/2026):
 * docs/marketing/comunidade-dos-criadores/adulto/copy/ com a página de oferta (`pagina.md`), a
 * entrada e as perguntas do quiz (`quiz.md`) e uma carta de resultado de cada perfil
 * (`resultados-quiz.md`), gerados da copy tipada em src/funnels/comunidade-adulto. A copy vive no
 * código; o espelho existe para ler e revisar em Markdown. Para mudar uma frase, edite o `.ts` e rode
 * `bun scripts/espelho-comunidade-adulto.ts`; `comunidade-adulto-funnel.test.ts` reprova espelho
 * desatualizado.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ResultadoConversa } from '../src/content/resultado-conversa'
import { PAGINA_ADULTO } from '../src/funnels/comunidade-adulto/oferta/pagina'
import {
  CLEAR_PROFILE_MIN,
  CONDITIONAL_BY_PROFILE,
  PROFILE_IDS,
  PROFILE_WEIGHTS,
  QUIZ_VERSION,
} from '../src/funnels/comunidade-adulto/quiz/engine'
import {
  QUIZ_ENTRY,
  QUIZ_HEADLINES,
  QUIZ_STAGES,
} from '../src/funnels/comunidade-adulto/quiz/entry-copy'
import { ADULT_PROFILE_LABELS } from '../src/funnels/comunidade-adulto/quiz/index'
import {
  ADULT_QUESTIONS,
  CALCULADORA_POR_SEMANA,
} from '../src/funnels/comunidade-adulto/quiz/questions'
import { buildAdultResult } from '../src/funnels/comunidade-adulto/quiz/result'
import type { QuizAnswers } from '../src/lib/quiz-types'

export const PASTA_ESPELHO_ADULTO = join(
  import.meta.dir,
  '..',
  '..',
  '..',
  'docs',
  'marketing',
  'comunidade-dos-criadores',
  'adulto',
  'copy',
)
export const ARQUIVOS_ESPELHO_ADULTO = {
  pagina: 'pagina.md',
  quiz: 'quiz.md',
  resultados: 'resultados-quiz.md',
} as const

const CABECALHO =
  '<!-- Espelho gerado da copy tipada em packages/funnel/src/funnels/comunidade-adulto/. Edite o código e rode `bun scripts/espelho-comunidade-adulto.ts` (em packages/funnel). -->'

/** Chaves técnicas do módulo que não são texto da página. */
const CHAVES_TECNICAS = new Set(['src', 'width', 'height', 'href', 'cor', 'id'])

/** Cada texto da página de oferta, na ordem do módulo (a ordem da página), com o caminho da chave. */
export function espelhoPaginaAdulto(): string {
  const b: string[] = [CABECALHO, '# Comunidade dos Criadores para adultos: a página de oferta']
  b.push(
    '_Os preços aparecem como marcadores (`{{preco_mensal}}`, `{{preco_anual}}`…): a página os preenche com os planos ao vivo do catálogo. As imagens aparecem pelo texto alternativo._',
  )
  const visita = (valor: unknown, caminho: string) => {
    if (typeof valor === 'string') {
      b.push(`**${caminho}**: ${valor}`)
      return
    }
    if (Array.isArray(valor)) {
      valor.forEach((item, i) => {
        visita(item, `${caminho}[${i}]`)
      })
      return
    }
    if (valor && typeof valor === 'object')
      for (const [chave, item] of Object.entries(valor)) {
        if (CHAVES_TECNICAS.has(chave)) continue
        visita(item, caminho ? `${caminho}.${chave}` : chave)
      }
  }
  visita(PAGINA_ADULTO, '')
  return `${b.join('\n\n')}\n`
}

export function espelhoQuizAdulto(): string {
  const b: string[] = [CABECALHO, '# Quiz adulto da Comunidade dos Criadores: entrada e perguntas']
  b.push(
    `_Versão \`${QUIZ_VERSION}\`. Nenhuma tela antes do resultado cita a área adulta, curso, plataforma ou preço. A idade não é pergunta gravada: a entrada tem "Começar" e o link "${QUIZ_ENTRY.minorLink}"._`,
  )
  b.push('## Entrada', `_${QUIZ_ENTRY.eyebrow}_`)
  for (const [id, h] of Object.entries(QUIZ_HEADLINES)) {
    const quando = id === 'padrao' ? 'padrão' : `com \`?manchete=${id}\``
    b.push(`**Manchete ${quando}** (${h.label}):`, `# ${h.title}`)
  }
  b.push(QUIZ_ENTRY.description, QUIZ_ENTRY.chips.map((c) => `\`${c}\``).join(' · '))
  b.push(`[${QUIZ_ENTRY.button}]`, `[${QUIZ_ENTRY.minorLink}]`, QUIZ_ENTRY.note)
  b.push(
    '### Saída de menos de 18',
    `**${QUIZ_ENTRY.minor.title}**`,
    QUIZ_ENTRY.minor.text,
    `[${QUIZ_ENTRY.minor.button}](${QUIZ_ENTRY.minor.href})`,
  )
  b.push('## Perguntas')
  for (const step of ADULT_QUESTIONS) {
    const perfil = Object.entries(CONDITIONAL_BY_PROFILE).find(([, key]) => key === step.key)?.[0]
    const etapa = QUIZ_STAGES[step.etapa as keyof typeof QUIZ_STAGES] ?? step.etapa
    b.push(`### ${step.condicional ? `Extra (perfil ${perfil}). ` : ''}${step.titulo}`)
    b.push(`_Etapa: ${etapa}. Chave \`${step.key}\`. No /admin: ${step.rotuloCurto}._`)
    if (step.subtitulo) b.push(step.subtitulo)
    if (step.key === 'tempo_criacao')
      b.push(
        `Na tela, o título repete as horas por semana: ${Object.values(CALCULADORA_POR_SEMANA)
          .map((t) => `"${t}"`)
          .join('; ')}.`,
      )
    b.push(step.opcoes.map((o) => `- \`${o.value}\`: ${o.label}`).join('\n'))
  }
  b.push(
    '## Regra do perfil',
    `A frase que parece com a pessoa e a frase-síntese valem ${PROFILE_WEIGHTS.cena}; o que incomoda e a cena desejada valem ${PROFILE_WEIGHTS.preocupacao}. Com ${CLEAR_PROFILE_MIN} pontos ou mais, o diagnóstico é claro; abaixo, a carta avisa que foi o lado mais forte.`,
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

const BASE: QuizAnswers = {
  _quiz_version: QUIZ_VERSION,
  _quiz_revision: 11,
  tempo_jogo: '7_14',
  computador: 'meu',
  programacao: 'nunca',
  tentativa: 'perdi',
  tempo_criacao: 'quase_nada',
  garantia: 'sozinho',
}
const EXTRA: Partial<Record<keyof typeof PROFILE_IDS, QuizAnswers>> = {
  B: { ferramenta: 'qualquer' },
  D: { codigo: 'logica' },
}

export function espelhoResultadosAdulto(): string {
  const b: string[] = [CABECALHO, '# Quiz adulto: o resultado em conversa']
  b.push(
    '_Uma carta de cada perfil, com as quatro perguntas de perfil na mesma letra. Em **negrito**, as respostas devolvidas no texto. As outras respostas mudam frases da carta; todas estão em `quiz/result-copy.ts`._',
  )
  for (const [letra, slug] of Object.entries(PROFILE_IDS)) {
    const r = buildAdultResult({
      ...BASE,
      cena: letra,
      preocupacao: letra,
      cena_desejada: letra,
      sintese: letra,
      ...EXTRA[letra as keyof typeof PROFILE_IDS],
    })
    if (!r) throw new Error(`Sem carta para ${slug}`)
    b.push(...carta(ADULT_PROFILE_LABELS[slug] ?? slug, r))
  }
  return `${b.join('\n\n')}\n`
}

export const ESPELHOS_ADULTO: Record<keyof typeof ARQUIVOS_ESPELHO_ADULTO, () => string> = {
  pagina: espelhoPaginaAdulto,
  quiz: espelhoQuizAdulto,
  resultados: espelhoResultadosAdulto,
}

if (import.meta.main) {
  for (const [id, arquivo] of Object.entries(ARQUIVOS_ESPELHO_ADULTO))
    writeFileSync(
      join(PASTA_ESPELHO_ADULTO, arquivo),
      ESPELHOS_ADULTO[id as keyof typeof ESPELHOS_ADULTO](),
    )
  console.log(Object.values(ARQUIVOS_ESPELHO_ADULTO).join(' '))
}
