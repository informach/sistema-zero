import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { MoldaUsageCard, ToolUsageGrid } from '../src/components/members/usage-cards'
import { relativeDayLabel } from '../src/lib/format'
import type { LearnerToolUsageView } from '../src/lib/tool-usage'

/**
 * O cartão do Molda em "Ferramentas e comunidades" (06/09): criações na nuvem + última
 * atividade, e a grade não cai quando o members ainda não manda o campo.
 */
const learner: LearnerToolUsageView = {
  userId: 'u1',
  pensa: { projects: 0, cyclesCompleted: 0, lastActivityAt: null },
  pinta: { drawings: 0, deliveries: 0, lastActivityAt: null },
  estudio: { creations: 0, deliveries: 0, lastActivityAt: null },
  clube: null,
  mural: null,
}

describe('cartão do Molda na ficha do aluno', () => {
  test('mostra as criações na nuvem (singular/plural) e a última atividade', () => {
    const one = renderToStaticMarkup(
      <MoldaUsageCard name="Molda" usage={{ creations: 1, lastActivityAt: null }} />,
    )
    expect(one).toContain('1 criação na nuvem')
    expect(one).toContain('Nunca abriu')
    // Data FIXA e explícita (nunca `new Date()`): o rótulo vem do `relativeDayLabel` e o cartão
    // põe "em" antes de uma data curta, então a asserção compara com a saída do próprio helper
    // em vez de depender do dia em que o teste roda ("hoje" é coberto em `tool-usage.test.ts`).
    const lastActivityAt = '2026-06-10T12:00:00.000Z'
    const label = relativeDayLabel(lastActivityAt)
    expect(label).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    const many = renderToStaticMarkup(
      <MoldaUsageCard name="Molda" usage={{ creations: 3, lastActivityAt }} />,
    )
    expect(many).toContain('3 criações na nuvem')
    expect(many).toContain(`última atividade em ${label}`)
  })

  test('members sem o campo `molda` (versão antiga): "Indisponível agora", e a grade não cai', () => {
    const html = renderToStaticMarkup(
      <ToolUsageGrid
        usage={learner}
        owned={[
          { kind: 'molda', name: 'Molda' },
          { kind: 'pinta', name: 'Pinta' },
        ]}
      />,
    )
    expect(html).toContain('Indisponível agora')
    expect(html).toContain('0 desenhos na nuvem')
  })

  test('com o campo, a grade mostra o número', () => {
    const html = renderToStaticMarkup(
      <ToolUsageGrid
        usage={{ ...learner, molda: { creations: 2, lastActivityAt: null } }}
        owned={[{ kind: 'molda', name: 'Molda' }]}
      />,
    )
    expect(html).toContain('2 criações na nuvem')
  })
})
