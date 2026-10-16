/**
 * Espelho editorial do quiz da Comunidade (v5): docs/marketing/kids/comunidade-dos-criadores/copy/
 * quiz-comunidade.md (entrada, perguntas e regra do perfil) e resultados-quiz.md (copy do resultado
 * e exemplos montados), gerados a partir do código em src/funnels/comunidade-dos-criadores/quiz.
 * A copy vive no código; o espelho existe para ler e revisar em Markdown. Para mudar uma frase,
 * edite o `.ts` e rode `bun scripts/espelho-quiz-comunidade.ts`; `comunidade-quiz.test.ts`
 * reprova espelho desatualizado.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { RELATOS } from '../src/funnels/comunidade-dos-criadores/oferta/relatos'
import type { RelatoId } from '../src/funnels/comunidade-dos-criadores/oferta/types'
import {
  CLEAR_PROFILE_MIN,
  CONDITIONAL_BY_PROFILE,
  PROFILE_IDS,
  PROFILE_WEIGHTS,
  QUIZ_VERSION,
} from '../src/funnels/comunidade-dos-criadores/quiz/engine'
import { QUIZ_ENTRY, QUIZ_HEADLINES } from '../src/funnels/comunidade-dos-criadores/quiz/entry-copy'
import {
  COMMUNITY_QUESTIONS,
  HORAS_POR_ANO,
} from '../src/funnels/comunidade-dos-criadores/quiz/questions'
import { buildCommunityResult } from '../src/funnels/comunidade-dos-criadores/quiz/result'
import * as C from '../src/funnels/comunidade-dos-criadores/quiz/result-copy'
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
const ETAPAS: Record<string, string> = {
  rotina: 'A rotina (situação)',
  casa: 'O que acontece em casa (problema e implicação)',
  desejo: 'O que você quer ver (necessidade e diagnóstico final)',
}
const relato = (id: RelatoId) => {
  const r = RELATOS[id]
  return `> “${r.fala}” ${r.nome} · ${r.papel} · ${r.contexto} (\`${id}\`)`
}
const lista = (map: Record<string, string>) =>
  Object.entries(map)
    .map(([k, v]) => `- \`${k}\`: ${v}`)
    .join('\n')

export function espelhoPerguntas(): string {
  const b: string[] = [CABECALHO, '# Quiz da Comunidade: entrada e perguntas']
  b.push(
    `_Versão \`${QUIZ_VERSION}\`. Tráfego frio em SPIN: as perguntas falam só da criança e da casa; nenhuma tela antes do resultado cita a Comunidade nem apresenta a criação de jogos como solução. O texto é escrito no masculino e vira "ela" quando a primeira resposta é "Filha"._`,
  )
  b.push('## Entrada', `_${QUIZ_ENTRY.eyebrow}_`)
  for (const [id, h] of Object.entries(QUIZ_HEADLINES)) {
    const quando = id === 'padrao' ? 'padrão' : `com \`?manchete=${id}\``
    b.push(`**Manchete ${quando}** (${h.label}):`, `# ${h.title}`)
  }
  b.push(QUIZ_ENTRY.description)
  b.push(`### ${QUIZ_ENTRY.lookAtTitle}`, QUIZ_ENTRY.lookAt.map((i) => `- ${i.title}`).join('\n'))
  b.push(QUIZ_ENTRY.note)
  b.push('## Perguntas')
  for (const step of COMMUNITY_QUESTIONS) {
    const perfil = Object.entries(CONDITIONAL_BY_PROFILE).find(([, key]) => key === step.key)?.[0]
    b.push(`### ${step.condicional ? `Extra (perfil ${perfil})` : `P${step.id}`}. ${step.titulo}`)
    b.push(
      `_Etapa: ${ETAPAS[step.etapa]}. Chave \`${step.key}\`. No /admin: ${step.rotuloCurto}.${step.key === 'crianca' ? ' Fica na própria tela de entrada.' : ''}_`,
    )
    if (step.subtitulo) b.push(step.subtitulo)
    if (step.key === 'tempo_criacao')
      b.push(
        'Na tela, o título vem montado com o tempo de tela:',
        Object.entries(HORAS_POR_ANO)
          .map(
            ([tempo, horas]) =>
              `- \`${tempo}\`: Isso dá ${horas} por ano em jogos e vídeos. Quanto desse tempo vira alguma coisa que ele mesmo fez?`,
          )
          .join('\n'),
      )
    b.push(step.opcoes.map((o) => `- \`${o.value}\`: ${o.label}`).join('\n'))
  }
  b.push('## Como o perfil é definido')
  b.push(
    [
      '| Pergunta | Pontos |',
      '| --- | --- |',
      ...Object.entries(PROFILE_WEIGHTS).map(
        ([key, pontos]) =>
          `| ${COMMUNITY_QUESTIONS.find((s) => s.key === key)?.rotuloCurto} (\`${key}\`) | ${pontos} |`,
      ),
    ].join('\n'),
  )
  b.push(
    'O perfil é o que soma mais pontos. Empate: vence a frase-síntese, depois a cena de casa. O segundo perfil (2 pontos ou mais) ganha uma frase no resultado; empate no segundo lugar: a preocupação, depois a cena desejada. A cena desejada não tem opção neutra, então sempre sai um perfil.',
    `Com menos de ${CLEAR_PROFILE_MIN} pontos no perfil vencedor, o resultado abre com "${C.APPROXIMATE_NOTE}"`,
    [
      '| Perfil | Página de oferta | Pergunta extra |',
      '| --- | --- | --- |',
      ...Object.entries(PROFILE_IDS).map(
        ([p, slug]) =>
          `| ${p}. ${C.PROFILE_LABELS[p as keyof typeof PROFILE_IDS]} | \`${slug}\` | ${CONDITIONAL_BY_PROFILE[p as keyof typeof PROFILE_IDS] ?? 'n/a'} |`,
      ),
    ].join('\n'),
  )
  return `${b.join('\n\n')}\n`
}

const EXEMPLOS: Array<[string, QuizAnswers]> = [
  [
    'Perfil F, para uma filha que trava nas contas',
    {
      crianca: 'filha_9_11',
      tempo_tela: '2_4h',
      computador: 'sim',
      cena: 'F',
      quando_trava: 'larga',
      tempo_criacao: 'quase_nada',
      preocupacao: 'F',
      cena_desejada: 'F',
      garantia: 'acompanhar',
      sintese: 'F',
      escola: 'matematica',
    },
  ],
  [
    'Perfil A com a programação em segundo lugar e duas condições (só celular, professor ao vivo)',
    {
      crianca: 'filho_12_14',
      tempo_tela: 'mais_4h',
      computador: 'celular_tablet',
      cena: 'A',
      quando_trava: 'chama',
      tempo_criacao: 'um_pouco',
      preocupacao: 'D',
      cena_desejada: 'D',
      garantia: 'ao_vivo',
      sintese: 'A',
    },
  ],
  [
    'Perfil C pouco nítido, chegando pela cena de casa',
    {
      crianca: 'filho_9_11',
      tempo_tela: '1_2h',
      computador: 'organizar',
      cena: 'C',
      quando_trava: 'nao_reparou',
      tempo_criacao: 'nao_sei',
      preocupacao: 'nenhum',
      cena_desejada: 'B',
      garantia: 'recorrer',
      sintese: 'conhecer',
      desenho: 'movimento',
    },
  ],
]

function exemplo(titulo: string, answers: QuizAnswers): string {
  const r = buildCommunityResult({ ...answers, _quiz_version: QUIZ_VERSION, _quiz_revision: 11 })
  if (!r) throw new Error(`Exemplo incompleto: ${titulo}`)
  const b = [`### ${titulo}`]
  b.push(
    `_Pontos: ${Object.entries(r.decision.scores)
      .map(([p, n]) => `${p} ${n}`)
      .join(
        ' · ',
      )}. Perfil ${r.decision.profile}${r.decision.secondary ? `, segundo ${r.decision.secondary}` : ''}._`,
  )
  if (r.approximateNote) b.push(`_${r.approximateNote}_`)
  b.push(`#### ${r.title}`)
  b.push('**O que você contou**', r.told.map((l) => `- ${l}`).join('\n'))
  b.push('**Por que isso acontece**', ...r.why)
  b.push('**O que muda isso**', ...r.change)
  b.push('**Onde isso acontece**', ...r.where, `_(tela \`${r.visual}\`)_`, ...r.relatos.map(relato))
  if (r.conditions.length)
    b.push(
      '**Antes de seguir**',
      ...r.conditions.map(
        (c) => `- **${c.title}** (${c.unmet ? 'não atendida' : 'conferir'}): ${c.text}`,
      ),
    )
  b.push('**O próximo passo**', ...r.next, `[${r.cta}](${r.offerPath})`)
  return b.join('\n\n')
}

export function espelhoResultados(): string {
  const b: string[] = [CABECALHO, '# Quiz da Comunidade: o resultado como ponte']
  b.push(
    `_Versão \`${QUIZ_VERSION}\`. Ordem dos níveis de consciência: o título nomeia o problema; o quadro "O que você contou" devolve as respostas; "Por que isso acontece" dá a tese; "O que muda isso" apresenta a criação de jogos, ainda sem o produto; "Onde isso acontece" mostra a Comunidade com uma tela real e os relatos; "Antes de seguir" só aparece com condição; "O próximo passo" leva à oferta do perfil. Sem preço. Recados só para quem precisa de alguém a quem recorrer._`,
  )
  b.push('## Por perfil')
  b.push(`Abertura comum de "Onde isso acontece": ${C.COMMUNITY_OPENING}`)
  for (const [p, copy] of Object.entries(C.PROFILE_COPY)) {
    b.push(`### ${p}. ${C.PROFILE_LABELS[p as keyof typeof PROFILE_IDS]}`)
    b.push(`**Título:** ${copy.title}`)
    b.push(`**Abertura pela cena de casa:** ${copy.scene}`)
    b.push(`**Tese:** ${copy.thesis}`)
    if (copy.worry) b.push(`**Com a preocupação deste perfil:** ${copy.worry}`)
    b.push(`**O que muda isso:** ${copy.change}`)
    b.push(`**Onde isso acontece:** ${copy.where}`)
    b.push(`**Tela:** \`${copy.visual}\``, relato(copy.relato))
    b.push(`**O próximo passo:** ${copy.next}`, `**Botão:** ${copy.cta}`)
  }
  b.push('## Tempo de tela (perfil A): a calculadora no argumento')
  b.push(
    `**Título com "Boa parte":** ${C.TITLE_A_GOOD_PART}`,
    '**Frase da calculadora, depois da abertura** (`{horas}` vem do tempo de tela):',
    lista(C.CREATION_SENTENCE),
    `Depois da cena de casa: "${C.A_SCENE_BRIDGE}"`,
    '**Fim da tese:**',
    lista(C.THESIS_A_END),
  )
  b.push('## Escola (perfil F)')
  b.push(
    '**Título pela parte da escola:**',
    lista(C.SCHOOL_TITLE),
    `Contas ou reforço sem a cena da lição: ${C.TITLE_F_NUMBERS}`,
  )
  b.push('**Depois da cena da lição, a frase continua:**', lista(C.SCHOOL_SCENE_TAIL))
  b.push(
    '**Depois de outra abertura:**',
    lista(C.SCHOOL_WEIGHT),
    `"Vai bem" com a preocupação da escola: ${C.F_GOING_WELL_WORRY}`,
  )
  b.push('**Tese pela parte da escola** (sem entrada, vale a das contas):', lista(C.SCHOOL_THESIS))
  b.push(
    '**O que muda isso, no lugar do parágrafo do número:**',
    lista(C.SCHOOL_CHANGE_REPLACE),
    '**O que muda isso, somado ao parágrafo do número:**',
    lista(C.SCHOOL_CHANGE_ADD),
    `**Ciências:** tela \`${C.SCHOOL_VISUAL.ciencias}\` e "Onde isso acontece": ${C.SCHOOL_WHERE.ciencias}`,
  )
  b.push('## Frases montadas pelas respostas')
  b.push('**Aberturas quando o perfil veio de outras respostas:**')
  b.push(
    [
      `- Pela preocupação: ${C.OPENER_FROM_WORRY('…')}`,
      `- Pela frase-síntese: ${C.OPENER_FROM_SYNTHESIS('…')}`,
      `- Pela cena desejada: ${C.OPENER_FROM_WISH_SCENE('…')}`,
    ].join('\n'),
  )
  b.push('**Cena desejada, em "O que muda isso":**', lista(C.WISH_SCENE_SENTENCE))
  b.push('**Segundo perfil, em "O que muda isso":**', lista(C.SECONDARY_SENTENCE))
  b.push(
    '**Quando trava, em "Onde isso acontece":**',
    lista(C.STUCK_SENTENCE),
    `\`{zappy}\` vira "${C.ZAPPY_FIRST}" (no perfil D, que já apresentou o Zappy, "${C.ZAPPY_AGAIN}").`,
  )
  b.push('**O que precisa estar garantido, em "O próximo passo":**', lista(C.NEED_SENTENCE))
  const relatos = (map: Partial<Record<string, RelatoId>>) =>
    Object.entries(map)
      .map(([k, id]) => `- \`${k}\`: ${relato(id!).slice(2)}`)
      .join('\n')
  b.push(
    '**Segundo relato, pela necessidade:**',
    relatos(C.NEED_RELATO),
    '**Se for da mesma pessoa do relato do perfil, entra outra:**',
    relatos(C.NEED_RELATO_ALT),
  )
  b.push('## Antes de seguir')
  for (const [kind, porValor] of Object.entries(C.CONDITION_COPY))
    for (const [valor, c] of Object.entries(porValor))
      b.push(`- **${c.title}** (\`${kind}\` · \`${valor}\`): ${c.text}`)
  b.push(`Com uma condição não atendida, o botão vira "${C.CTA_WITH_UNMET_CONDITION}".`)
  b.push('## O quadro "O que você contou"')
  b.push('**Idade:**', lista(C.MIRROR_AGE), '**Computador:**', lista(C.MIRROR_COMPUTER))
  b.push(
    '**Tempo de tela:**',
    lista(C.MIRROR_SCREEN_TIME),
    '**Calculadora:**',
    lista(C.MIRROR_CREATION),
  )
  b.push('**Cena de casa:**', lista(C.MIRROR_SCENE), '**Quando trava:**', lista(C.MIRROR_STUCK))
  b.push(
    '**Preocupação:**',
    lista(C.MIRROR_WORRY),
    '**Cena desejada:**',
    lista(C.MIRROR_WISH_SCENE),
  )
  b.push('**O que precisa estar garantido:**', lista(C.MIRROR_NEED))
  b.push('**Frase-síntese:**', lista(C.MIRROR_SYNTHESIS))
  for (const [key, map] of Object.entries(C.MIRROR_CONDITIONAL))
    b.push(`**Pergunta extra \`${key}\`:**`, lista(map))
  b.push('## Exemplos montados')
  for (const [titulo, answers] of EXEMPLOS) b.push(exemplo(titulo, answers))
  return `${b.join('\n\n')}\n`
}

if (import.meta.main) {
  writeFileSync(join(PASTA_ESPELHO_QUIZ, ARQUIVO_PERGUNTAS), espelhoPerguntas())
  writeFileSync(join(PASTA_ESPELHO_QUIZ, ARQUIVO_RESULTADOS), espelhoResultados())
  console.log(ARQUIVO_PERGUNTAS, ARQUIVO_RESULTADOS)
}
