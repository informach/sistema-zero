import { describe, expect, test } from 'bun:test'
import {
  type AdultCreatorCapability,
  type AdultJourneyView,
  projectAdultJourney,
} from '@sistemazero/core/journey'
import { renderToStaticMarkup } from 'react-dom/server'
import { creatorCurriculumFixture } from '../../core/tests/fixtures/creator-curriculum'
import { ToolNotice } from '../src/components/community/tool-notice'
import {
  type CreativeToolKey,
  currentStageHref,
  type ToolAccessState,
  toolLock,
  toolLockReason,
  toolStageTitle,
} from '../src/lib/tool-lock'

/**
 * A ferramenta fechada explica o motivo (20/10/2026): sem licença, a oferta de continuidade e a
 * etapa em que a ferramenta abre na Comunidade (ou que ela volta a abrir, se já foi conquistada);
 * pela jornada, a etapa em que abre e a página da etapa atual; o Pensa sem IA, o curso avançado. A
 * régua é a MESMA do quadro `/criar`.
 */

const journey = (
  stages: { title: string; completed: boolean; capabilities: AdultCreatorCapability[] }[],
  capabilities: AdultCreatorCapability[] = [],
): AdultJourneyView => ({
  audience: 'adult',
  policyVersion: 1,
  configured: stages.length > 0,
  capabilities,
  stages: stages.map((stage, index) => ({
    id: `etapa-${index + 1}`,
    title: stage.title,
    completed: stage.completed,
    available: index === 0 || stages[index - 1]?.completed === true,
    requirements: [],
    missing: [],
    capabilities: stage.capabilities,
  })),
})

const ALL_ACCESS = { 'estudio-completo': true, pinta: true, molda: true, pensa: true }

// Etapa 1 libera Estúdio; a 2 libera Pinta e Molda; a 3 libera Pro, IA e Pensa.
const STAGES = [
  { title: 'Explorador(a)', completed: true, capabilities: ['studio'] as AdultCreatorCapability[] },
  {
    title: 'Inventor(a)',
    completed: false,
    capabilities: ['pinta', 'molda'] as AdultCreatorCapability[],
  },
  {
    title: 'Construtor(a)',
    completed: false,
    capabilities: ['pro', 'ai', 'pensa'] as AdultCreatorCapability[],
  },
]

const state = (over: Partial<ToolAccessState> = {}): ToolAccessState => ({
  access: ALL_ACCESS,
  journey: journey(STAGES, ['studio']),
  tier: { hasPalette: true, pro: false },
  ...over,
})

describe('toolLockReason (a régua do /criar e das páginas)', () => {
  test('sem a licença é plano, antes de olhar a jornada', () => {
    const noPinta = state({ access: { ...ALL_ACCESS, pinta: false } })
    expect(toolLockReason('pinta', noPinta)).toBe('plan')
    expect(toolLockReason('estudio-pro', state({ access: {} }))).toBe('plan')
  })

  test('sem a capacidade é jornada; o Pensa sem IA pede o curso avançado', () => {
    expect(toolLockReason('pinta', state())).toBe('journey')
    expect(toolLockReason('molda', state())).toBe('journey')
    expect(toolLockReason('pensa', state())).toBe('advanced')
    expect(toolLockReason('estudio', state())).toBeNull()
  })

  test('o Estúdio sem blocos conquistados e o Pro sem a capacidade são jornada', () => {
    expect(toolLockReason('estudio', state({ tier: { hasPalette: false, pro: false } }))).toBe(
      'journey',
    )
    expect(toolLockReason('estudio-pro', state())).toBe('journey')
    expect(
      toolLockReason('estudio-pro', state({ tier: { hasPalette: true, pro: true } })),
    ).toBeNull()
  })
})

describe('toolStageTitle (a etapa em que a ferramenta abre)', () => {
  test('é a etapa a que a pessoa chega ao concluir a que libera a ferramenta', () => {
    const view = journey(STAGES, ['studio'])
    expect(toolStageTitle('pinta', view)).toBe('Construtor(a)')
    // A última etapa libera o Pro: quem a conclui chega à Lenda.
    expect(toolStageTitle('estudio-pro', view)).toBe('Lenda')
  })

  test('sem etapa por concluir que libere, nenhuma promessa', () => {
    const view = journey(STAGES, ['studio'])
    const inicio = journey(STAGES.map((stage) => ({ ...stage, completed: false })))
    expect(toolStageTitle('estudio', inicio)).toBe('Inventor(a)')
    // Nada falta na jornada (o Estúdio sem blocos): a etapa não explica o cadeado.
    expect(toolStageTitle('estudio', view)).toBeNull()
    const semPinta = journey([{ title: 'Única', completed: false, capabilities: ['studio'] }])
    expect(toolStageTitle('pinta', semPinta)).toBeNull()
    // Etapa já concluída (piso) que não entregou a capacidade não vira promessa.
    const piso = journey([{ title: 'Primeira', completed: true, capabilities: ['pinta'] }])
    expect(toolStageTitle('pinta', piso)).toBeNull()
  })

  test('o botão leva à etapa atual; sem etapa aberta, a Seu progresso', () => {
    expect(currentStageHref(journey(STAGES, ['studio']))).toBe('/cursos/etapa/etapa-2')
    expect(currentStageHref(journey([]))).toBe('/progresso')
  })
})

function notice(tool: CreativeToolKey, s: ToolAccessState) {
  return renderToStaticMarkup(<ToolNotice tool={tool} lock={toolLock(tool, s)} />)
}

describe('toolLock (o que o ToolNotice recebe)', () => {
  test('plano com a ferramenta conquistada: volta a abrir, sem etapa', () => {
    const lock = toolLock('estudio', state({ access: {} }))
    expect(lock).toEqual({ reason: 'plan', stageTitle: null, stageHref: null, earned: true })
  })

  test('plano sem a capacidade: a etapa em que ela abre na Comunidade', () => {
    const lock = toolLock('pinta', state({ access: {} }))
    expect(lock).toEqual({
      reason: 'plan',
      stageTitle: 'Construtor(a)',
      stageHref: null,
      earned: false,
    })
  })

  test('avançado leva à etapa atual, sem nome de etapa', () => {
    expect(toolLock('pensa', state())).toEqual({
      reason: 'advanced',
      stageTitle: null,
      stageHref: '/cursos/etapa/etapa-2',
      earned: false,
    })
  })
})

describe('ToolNotice por motivo', () => {
  test('currículo libera durante os cursos do próprio posto, sem prometer a etapa seguinte', () => {
    const curriculum = creatorCurriculumFixture()
    const view = projectAdultJourney({ schemaVersion: 1, stages: [], curriculum }, 1, [])
    const first = curriculum.stages[0]!
    expect(toolStageTitle('pinta', view)).toBe(first.title)
    const html = notice('pinta', state({ journey: view }))
    expect(html).toContain(`cursos do posto ${first.title}`)
    expect(html).not.toContain('quando você chega à etapa')
    expect(html).toContain('href="/cursos/etapa/noob"')
    const noPlan = notice('pinta', state({ journey: view, access: {} }))
    expect(noPlan).toContain('Ver como continuar')
    expect(noPlan).not.toContain('quando você chega à etapa')
  })

  test('Pensa no currículo usa o posto que ensina IA e não a condição legada de curso avançado', () => {
    const original = creatorCurriculumFixture()
    const curriculum = {
      ...original,
      stages: original.stages.map((stage, index) =>
        index === 1
          ? {
              ...stage,
              grants: [
                { after: 'pair' as const, capabilities: ['bridge', 'ai', 'pensa'] as const },
              ],
            }
          : stage,
      ),
    }
    const view = projectAdultJourney({ schemaVersion: 1, stages: [], curriculum }, 1, [])
    const access = state({ journey: view })
    expect(toolLockReason('pensa', access)).toBe('journey')
    const html = notice('pensa', access)
    expect(html).not.toContain('curso avançado')
    expect(html).toContain('cursos do posto')
  })

  test('plano com a ferramenta já conquistada: volta a abrir com a assinatura', () => {
    const html = notice('estudio', state({ access: {} }))
    expect(html).toContain(
      'O Estúdio faz parte da Comunidade dos Criadores. Com a assinatura, ele volta a abrir na sua conta, com o que você já fez.',
    )
    expect(html).toContain('Ver como continuar')
  })

  test('plano sem a capacidade: a etapa da jornada e o botão para a oferta de continuidade', () => {
    const html = notice('pinta', state({ access: {} }))
    expect(html).toContain(
      'O Pinta faz parte da Comunidade dos Criadores. Na Comunidade, ele abre quando você chega à etapa Construtor(a) da jornada.',
    )
    expect(html).not.toContain('Com a assinatura, ele')
    expect(html).toContain('Ver como continuar')
    expect(html).toContain(
      'href="https://sistemazero.com.br/pro/comunidade-dos-criadores/oferta/continuar?utm_source=plataforma&amp;utm_medium=app&amp;utm_content=ferramenta-pinta"',
    )
    expect(html).toContain('target="_blank"')
  })

  test('plano sem etapa conhecida: abre conforme a pessoa avança', () => {
    const html = notice('pinta', state({ access: {}, journey: journey([]) }))
    expect(html).toContain(
      'O Pinta faz parte da Comunidade dos Criadores. Na Comunidade, ele abre conforme você avança nas etapas da jornada.',
    )
    expect(html).toContain('Ver como continuar')
  })

  test('plano do Estúdio Pro marca a origem com o slug da ferramenta', () => {
    expect(notice('estudio-pro', state({ access: {} }))).toContain(
      'utm_content=ferramenta-estudio-pro',
    )
  })

  test('jornada: a etapa em que abre e o botão para a etapa atual', () => {
    const html = notice('pinta', state())
    expect(html).toContain(
      'O Pinta abre quando você chega à etapa Construtor(a). O caminho começa pelos cursos da etapa atual.',
    )
    expect(html).toContain('href="/cursos/etapa/etapa-2"')
    expect(html).toContain('Ver os cursos da etapa')
    expect(html).not.toContain('Ver como continuar')
  })

  test('jornada a mais de uma etapa: o nome da etapa mais distante', () => {
    const html = notice('estudio-pro', state())
    expect(html).toContain(
      'O Estúdio Pro abre quando você chega à etapa Lenda. O caminho começa pelos cursos da etapa atual.',
    )
  })

  test('jornada sem etapa conhecida: a frase sem nome de etapa', () => {
    const html = notice('estudio', state({ tier: { hasPalette: false, pro: false } }))
    expect(html).toContain(
      'O Estúdio abre conforme você avança nas etapas da jornada. O caminho começa pelos cursos da etapa atual.',
    )
    expect(html).not.toContain('mais adiante')
    expect(html).toContain('href="/cursos/etapa/etapa-2"')
  })

  test('etapa concluída pelo piso sem a capacidade: nada de "mais adiante"', () => {
    // Todas as etapas aparecem concluídas (piso), e a do Pinta não o entregou.
    const piso = journey(
      STAGES.map((stage) => ({ ...stage, completed: true })),
      ['studio'],
    )
    const html = notice('pinta', state({ journey: piso }))
    expect(html).toContain('O Pinta abre conforme você avança nas etapas da jornada.')
    expect(html).not.toContain('mais adiante')
    expect(html).not.toContain('etapa atual')
    expect(html).toContain('href="/progresso"')
    expect(html).toContain('Ver a sua jornada')
  })

  test('avançado: o curso avançado e o botão para a etapa atual', () => {
    const html = notice('pensa', state())
    expect(html).toContain('O Pensa abre depois que você conclui um curso avançado da jornada.')
    expect(html).toContain('href="/cursos/etapa/etapa-2"')
    expect(html).toContain('Ver os cursos da etapa')
    expect(html).not.toContain('Ver como continuar')
  })

  test('sem motivo fica no recado genérico, sem botão de oferta', () => {
    const html = renderToStaticMarkup(<ToolNotice tool="molda" />)
    expect(html).toContain('Esta ferramenta ainda não está liberada para sua conta.')
    expect(html).not.toContain('Ver como continuar')
    expect(html).toContain('href="/criar"')
  })

  test('consulta indisponível e suporte somente-leitura não mostram motivo', () => {
    const lock = toolLock('pinta', state({ access: {} }))
    const unavailable = renderToStaticMarkup(<ToolNotice tool="pinta" lock={lock} unavailable />)
    expect(unavailable).toContain('Não foi possível conferir seu acesso agora.')
    expect(unavailable).not.toContain('Ver como continuar')
    const readOnly = renderToStaticMarkup(<ToolNotice tool="pinta" lock={lock} readOnly />)
    expect(readOnly).toContain('modo de consulta')
    expect(readOnly).not.toContain('Ver como continuar')
  })
})
