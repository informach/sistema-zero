import type { PensaProjectView, PensaTeamArtItem, PensaTeamView } from '@sistemazero/core/pensa'

export const PENSA_TEST_PROJECT = '0f1e2d3c-4b5a-4978-8a9b-0c1d2e3f4a5b'
export const PENSA_TEST_PROGRAMMER = 'b1a00000-0000-4000-8000-000000000001'
export const PENSA_TEST_ARTIST = 'b1a00000-0000-4000-8000-000000000002'
export const PENSA_TEST_MISSION = 'b1a00000-0000-4000-8000-000000000003'
export const PENSA_TEST_SLOT = 'b1a00000-0000-4000-8000-000000000004'
export function pensaTestTeam(viewer = PENSA_TEST_PROGRAMMER, memberCount = 1): PensaTeamView {
  return {
    viewerProfileId: viewer,
    ownerProfileId: PENSA_TEST_PROGRAMMER,
    programmerProfileId: PENSA_TEST_PROGRAMMER,
    artistProfileIds: [PENSA_TEST_ARTIST],
    memberCount,
    people: [
      {
        profileId: PENSA_TEST_PROGRAMMER,
        firstName: 'Bia',
        photoUrl: null,
        owner: true,
        joinedAt: null,
      },
      {
        profileId: PENSA_TEST_ARTIST,
        firstName: 'Leo',
        photoUrl: null,
        owner: false,
        joinedAt: null,
      },
    ],
    shareCode: null,
    codeLocked: false,
  }
}
export function pensaTestView(team = pensaTestTeam()): PensaProjectView {
  return {
    project: {
      id: PENSA_TEST_PROJECT,
      name: 'Jogo',
      status: 'active',
      paused: false,
      ownerProfileId: PENSA_TEST_PROGRAMMER,
      createdAt: '2026-10-16T00:00:00.000Z',
      updatedAt: '2026-10-16T00:00:00.000Z',
      metadataRevision: 0,
      teamRevision: 0,
      executionRevision: 0,
    },
    revision: null,
    progress: [],
    availability: [],
    nextAction: { type: 'define' },
    draft: null,
    operation: null,
    team,
    studioAuthoring: 'blocks',
    messages: [],
    gameCreation: null,
    restoredSaveRevision: null,
  }
}
export function pensaTestArt(overrides: Partial<PensaTeamArtItem> = {}): PensaTeamArtItem {
  return {
    missionId: PENSA_TEST_MISSION,
    slot: {
      id: PENSA_TEST_SLOT,
      name: 'Heroi',
      kind: 'sprite',
      description: 'Desenhe o heroi.',
      source: 'create',
      existing: null,
    },
    creation: {
      tool: 'pinta',
      profileId: PENSA_TEST_ARTIST,
      creationId: 'heroi',
      saveRevision: '3',
      contentFingerprint: null,
    },
    completedByProfileId: PENSA_TEST_ARTIST,
    ...overrides,
  }
}
