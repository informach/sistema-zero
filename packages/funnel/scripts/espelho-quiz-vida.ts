import { buildKidsResult } from '../src/funnels/kids-vida'
import { BRANCHES, KIDS_ENGINES } from '../src/funnels/kids-vida/engine'
import { QUIZ_HEADLINES, quizEntry } from '../src/funnels/kids-vida/entry'
import type { KidsMode } from '../src/funnels/kids-vida/types'
import samples from '../tests/fixtures/kids-vida-approved.json'
import { kidsJourney } from '../tests/helpers/kids-vida'

const heading = (mode: KidsMode) =>
  `# Quiz Kids · ${mode === 'desafio' ? 'Desafio do Primeiro Jogo' : 'Comunidade dos Criadores'}`
const note = (mode: KidsMode) =>
  `Gerado da implementação ${KIDS_ENGINES[mode].version}. Proposta V5 aprovada em 06/11/2026. Dez perguntas; filho/filha é a entrada. As marcações abaixo servem à revisão editorial.`
export function espelhoPerguntasVida(mode: KidsMode): string {
  const entry = quizEntry(mode),
    parts = [
      heading(mode),
      note(mode),
      QUIZ_HEADLINES.habilidades.title,
      entry.description,
      entry.note,
    ]
  for (const s of KIDS_ENGINES[mode].steps) {
    parts.push(
      `## ${s.quizPosition === 0 ? 'Entrada' : `Pergunta ${s.quizPosition}`} · ${s.rotuloCurto}${s.ramo ? ` · ${BRANCHES[s.ramo as keyof typeof BRANCHES]}` : ''}`,
      `Chave: ${s.key}`,
      s.titulo,
      ...(s.subtitulo ? [s.subtitulo] : []),
      s.opcoes.map((o) => `- ${o.label}`).join('\n'),
    )
  }
  return parts.join('\n\n') + '\n'
}
export function espelhoResultadosVida(mode: KidsMode): string {
  const parts = [
    heading(mode) + ' · resultados',
    note(mode),
    'O perfil registra a habilidade indicada como prioridade e a idade; não é diagnóstico nem classificação psicológica. Contexto, ajuda anterior, efeitos, alcance, interesses, benefício e condições modificam o texto.',
  ]
  for (const sample of samples.filter((s) => s.mode === mode)) {
    const r = buildKidsResult(mode, kidsJourney(mode, sample.answers).answers)!
    const body = r.blocos.find((b) => b.tipo === 'leitura')!,
      cta = r.blocos.find((b) => b.tipo === 'cta')!
    const c = body.leitura
    parts.push(
      `## ${sample.key}`,
      `### ${r.titulo}`,
      c.lead,
      ...(c.payoff ? [`**${c.payoff}**`] : []),
      c.context,
      c.attempt,
      '### Um treinamento com escolhas, tentativas e orientação',
      c.purpose,
      c.interest,
      c.offer,
      c.practice,
      '[Captura real da Chave do Farol: instruções em blocos e a cena do jogo lado a lado.]',
      '### A prática continua fora da tela',
      `- **Na escola:** ${c.school}\n- **Em casa e no dia a dia:** ${c.home}`,
      c.transfer,
      ...(c.continuity ? [c.continuity] : []),
      '### Para participar em casa',
      `- **Como acontece:** ${c.format}\n- **O que usar:** ${c.equipment}\n- **O apoio do responsável:** ${c.support}`,
      c.expectation,
      cta.termos!,
      cta.texto,
      `Botão: ${cta.rotulo}\n\nDestino: ${cta.href}`,
    )
  }
  return parts.join('\n\n') + '\n'
}
