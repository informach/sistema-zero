import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { MoldaUsageCard, ToolUsageGrid } from '../src/components/members/usage-cards'
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
    const many = renderToStaticMarkup(
      <MoldaUsageCard
        name="Molda"
        usage={{ creations: 3, lastActivityAt: new Date().toISOString() }}
      />,
    )
    expect(many).toContain('3 criações na nuvem')
    expect(many).toContain('última atividade hoje')
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
