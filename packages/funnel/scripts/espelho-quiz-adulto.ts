import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { ADULT_ENGINES } from '../src/funnels/adulto-autonomia/engine'
import { ENTRY } from '../src/funnels/adulto-autonomia/entry'
import { buildNarrative } from '../src/funnels/adulto-autonomia/narrative'
import type { AdultMode, CompleteAnswers } from '../src/funnels/adulto-autonomia/types'
import samples from '../tests/fixtures/adulto-autonomia-approved.json'
import { adultJourney } from '../tests/helpers/adulto-autonomia'

export function espelhoQuizAdulto(mode: AdultMode): string {
  const entry = ENTRY[mode],
    engine = ADULT_ENGINES[mode]
  const parts = [
    `# Quiz adulto · ${mode === 'desafio' ? 'Desafio do Primeiro Jogo' : 'Comunidade dos Criadores'}`,
    `Espelho da implementação ${engine.version}, baseado na proposta V2 aprovada em 06/11/2026. As chaves e indicações de variantes abaixo são documentação interna; não aparecem para o visitante.`,
    '## Entrada',
    entry.title,
    entry.description,
    `Botão: ${entry.action}`,
    '## Perguntas',
    'Cada percurso tem dez perguntas. Q4, Q5 e Q7 mudam para quem ainda não começou; Q8 considera também o efeito relatado; Q10 considera a conquista escolhida. O produto só aparece no resultado.',
  ]
  for (const step of engine.steps)
    parts.push(
      `### ${step.quizPosition} · ${step.rotuloCurto} · ${step.key}`,
      step.titulo,
      step.subtitulo ?? '',
      step.multiple
        ? 'Seleção múltipla; “nenhuma” é exclusiva.'
        : 'Seleção única; confirmar para continuar.',
      step.opcoes.map((o) => `- ${o.label}`).join('\n'),
    )
  parts.push(
    '## Resultados de referência',
    'O perfil registra a conquista declarada em Q9. As outras respostas contextualizam a orientação. Os avisos de adequação se acumulam; computador, formato, prazo e acesso ao Estúdio não são tratados como simples objeções a contornar.',
  )
  for (const sample of samples.filter((s) => s.mode === mode)) {
    const r = buildNarrative(
      mode,
      engine.normalize(adultJourney(mode, sample.answers).answers) as CompleteAnswers,
    )
    parts.push(
      `### ${sample.id}`,
      r.title,
      r.lead,
      `**${r.priority}**`,
      ...(r.warningFirst ? r.fit : []),
      ...r.reasoning,
      r.productLead,
      r.mechanism,
      r.practice.map(([title, text]) => `- **${title}:** ${text}`).join('\n'),
      ...r.continuity,
      ...(!r.warningFirst ? r.fit : []),
      r.benefit,
      r.note,
      `Botão: ${r.cta}`,
      `Destino: ${r.href}`,
      r.disclaimer,
    )
  }
  return `${parts.join('\n\n')}\n`
}
if (import.meta.main) {
  const dir = new URL('../../../docs/marketing/pro/quizzes/', import.meta.url)
  await mkdir(dir, { recursive: true })
  for (const mode of ['desafio', 'comunidade'] as AdultMode[])
    await writeFile(new URL(`${mode}.md`, dir), espelhoQuizAdulto(mode))
  console.log(`Espelhos atualizados: ${fileURLToPath(dir)}`)
}
