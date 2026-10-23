import type { PensaMissionSession } from '../src/components/ui/pensa-mission-session'

export function missionSessionFixture(): PensaMissionSession {
  const missionId = '10000000-0000-4000-8000-000000000004'
  const slotId = '10000000-0000-4000-8000-000000000007'
  return {
    mission: {
      id: missionId,
      contentRevision: 1,
      stageId: '10000000-0000-4000-8000-000000000005',
      position: 0,
      title: 'Desenhar a nave',
      objective: 'Crie a nave do seu jogo.',
      kind: 'asset',
      destination: 'pinta',
      requirementIds: ['10000000-0000-4000-8000-000000000006'],
      dependencyIds: [],
      assetSlotIds: [slotId],
      rules: [{ id: 'shape', text: 'A nave deve ser reconhecida pelo jogador.' }],
      checks: [
        {
          id: 'look',
          action: 'Veja a nave no tamanho em que ela aparece no jogo.',
          expected: 'Você reconhece a nave.',
        },
      ],
    },
    progress: {
      missionId,
      progressRevision: 0,
      status: 'in_progress',
      validity: 'current',
      assigneeProfileId: null,
      completedByProfileId: null,
      deliveries: [],
      verification: null,
      resumeNote: null,
      startedAt: null,
      completedAt: null,
    },
    project: { id: '10000000-0000-4000-8000-000000000001', name: 'Bosque' },
    assetSlots: [
      {
        id: slotId,
        name: 'Nave',
        kind: 'sprite',
        description: 'Uma nave comprida.',
        source: 'create',
        existing: null,
      },
    ],
    references: [],
    blockedReason: null,
    collapsed: false,
    onCollapsedChange() {},
    onComplete: async () => {},
    onReopen: async () => {},
    onNextMission: async () => {},
    nextMissionLabel: 'Continuar meu caminho',
    onNeedHelp() {},
    onReturnToPlan() {},
    onBindCreation: async () => {},
    onSaveNote: async () => {},
  }
}
