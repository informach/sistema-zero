import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { AwardGamificationService } from '../../src/application/gamification/award-gamification.service'
import { AdvancePensaStageService } from '../../src/application/pensa/advance-stage.service'
import { AppendPensaConversationTurnService } from '../../src/application/pensa/append-conversation-turn.service'
import { CreatePensaCycleService } from '../../src/application/pensa/create-cycle.service'
import { CreatePensaProjectService } from '../../src/application/pensa/create-project.service'
import { GetPensaProjectService } from '../../src/application/pensa/get-project.service'
import { GetPensaStageService } from '../../src/application/pensa/get-stage.service'
import { GetPensaStudioSnapshotService } from '../../src/application/pensa/get-studio-snapshot.service'
import { ListPensaProjectsService } from '../../src/application/pensa/list-projects.service'
import { ReplacePensaChecklistService } from '../../src/application/pensa/replace-checklist.service'
import { ReplacePensaTasksService } from '../../src/application/pensa/replace-tasks.service'
import { SavePensaArtifactService } from '../../src/application/pensa/save-artifact.service'
import { SavePensaStudioSnapshotService } from '../../src/application/pensa/save-studio-snapshot.service'
import { TogglePensaChecklistItemService } from '../../src/application/pensa/toggle-checklist-item.service'
import { UpdatePensaProjectService } from '../../src/application/pensa/update-project.service'
import { UpdatePensaTaskService } from '../../src/application/pensa/update-task.service'
import { ValidatePensaArtifactService } from '../../src/application/pensa/validate-artifact.service'
import { pensaStageSourceId } from '../../src/domain/pensa/gamification'
import type { PensaMission, PensaWorkStage } from '../../src/domain/pensa/pensa'
import { InMemoryGamificationRepository, silentLogger } from '../fakes/in-memory'
import { InMemoryPensaRepository } from '../fakes/pensa-in-memory'

const USER = '11111111-1111-1111-1111-111111111111'
const OTHER = '22222222-2222-2222-2222-222222222222'
const ACCOUNT = '33333333-3333-3333-3333-333333333333'

const mission: PensaMission = {
  steps: [{ text: 'Desenhar a nave' }],
  doneWhen: ['A nave aparece na tela'],
}

function buildServices(now = new Date('2026-07-01T12:00:00.000Z')) {
  const clockRef = { now }
  const clock = () => clockRef.now
  const repo = new InMemoryPensaRepository()
  const gamification = new InMemoryGamificationRepository()
  const award = new AwardGamificationService(gamification, clock, silentLogger)
  return {
    repo,
    gamification,
    award,
    clockRef,
    list: new ListPensaProjectsService(repo),
    create: new CreatePensaProjectService(repo, () => randomUUID(), clock),
    get: new GetPensaProjectService(repo),
    update: new UpdatePensaProjectService(repo, clock),
    getSnapshot: new GetPensaStudioSnapshotService(repo),
    saveSnapshot: new SavePensaStudioSnapshotService(repo, clock),
    createCycle: new CreatePensaCycleService(repo, () => randomUUID(), clock),
    getStage: new GetPensaStageService(repo),
    appendTurn: new AppendPensaConversationTurnService(repo, clock),
    saveArtifact: new SavePensaArtifactService(repo, () => randomUUID(), clock),
    validateArtifact: new ValidatePensaArtifactService(repo, clock),
    advance: new AdvancePensaStageService(repo, award, clock),
    replaceTasks: new ReplacePensaTasksService(repo, () => randomUUID(), clock),
    updateTask: new UpdatePensaTaskService(repo, clock),
    replaceChecklist: new ReplacePensaChecklistService(repo, () => randomUUID(), clock),
    toggleItem: new TogglePensaChecklistItemService(repo, clock),
  }
}

type Services = ReturnType<typeof buildServices>

async function createProject(s: Services, name = 'Meu Jogo') {
  return s.create.execute(USER, ACCOUNT, 'kids', { name, kind: 'game' })
}

/** Leva o ciclo de z até a etapa alvo cumprindo os gates. */
async function driveTo(s: Services, cycleId: string, target: PensaWorkStage | 'done') {
  const order: Array<PensaWorkStage | 'done'> = ['z', 'e', 'r', 'o', 'done']
  const steps: PensaWorkStage[] = ['z', 'e', 'r', 'o']
  for (const from of steps) {
    if (order.indexOf(from) >= order.indexOf(target)) break
    if (from === 'z') {
      await s.saveArtifact.execute(USER, 'kids', cycleId, { stage: 'z', type: 'idea', content: {} })
      await s.validateArtifact.execute(USER, 'kids', cycleId, 'idea')
    } else if (from === 'e') {
      for (const type of ['friendly_spec', 'identity'] as const) {
        await s.saveArtifact.execute(USER, 'kids', cycleId, { stage: 'e', type, content: {} })
        await s.validateArtifact.execute(USER, 'kids', cycleId, type)
      }
    } else if (from === 'r') {
      await s.replaceTasks.execute(USER, 'kids', cycleId, [{ title: 'Missão 1', mission }])
    } else {
      const items = await s.replaceChecklist.execute(USER, 'kids', cycleId, [
        { category: 'test', title: 'Testar o jogo' },
      ])
      const first = items[0]
      if (!first) throw new Error('checklist vazio')
      await s.toggleItem.execute(USER, 'kids', first.id, true)
    }
    await s.advance.execute(USER, 'kids', cycleId, from)
  }
}

describe('Pensa — criar/listar/atualizar projeto', () => {
  test('cria projeto + ciclo 1 (stage z) e devolve o detail', async () => {
    const s = buildServices()
    const detail = await createProject(s)
    expect(detail.name).toBe('Meu Jogo')
    expect(detail.status).toBe('active')
    expect(detail.studioProjectId).toBeNull()
    expect(detail.cycles).toHaveLength(1)
    expect(detail.currentCycle).toMatchObject({ number: 1, stage: 'z', goal: null })
    expect(detail.artifactsIndex).toEqual([])
    // Data como ISO string (mapper).
    expect(detail.createdAt).toBe('2026-07-01T12:00:00.000Z')
  })

  test('nome é trimado e revalidado (2..120) → VALIDATION_ERROR', async () => {
    const s = buildServices()
    expect(createProject(s, '  a  ')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    const ok = await createProject(s, '  ab  ')
    expect(ok.name).toBe('ab')
  })

  test('cota: 21º projeto ACTIVE → PENSA_QUOTA_EXCEEDED; arquivado não conta', async () => {
    const s = buildServices()
    const first = await createProject(s, 'Projeto 0')
    for (let i = 1; i < 20; i++) await createProject(s, `Projeto ${i}`)
    expect(createProject(s, 'Estourou')).rejects.toMatchObject({ code: 'PENSA_QUOTA_EXCEEDED' })
    // Arquivar um libera espaço (a cota é de ATIVOS).
    await s.update.execute(USER, 'kids', first.id, { status: 'archived' })
    const again = await createProject(s, 'Coube')
    expect(again.name).toBe('Coube')
  })

  test('lista só ativos, ordenada por updatedAt DESC (escrita toca o projeto)', async () => {
    const s = buildServices()
    const a = await createProject(s, 'AA')
    const b = await createProject(s, 'BB')
    await createProject(s, 'CC')
    await s.update.execute(USER, 'kids', b.id, { status: 'archived' })
    s.clockRef.now = new Date('2026-07-01T13:00:00.000Z')
    await s.appendTurn.execute(USER, 'kids', a.cycles[0]?.id ?? '', 'z', {
      userMessage: { content: 'oi' },
      assistantMessage: { content: 'olá!' },
    })
    const list = await s.list.execute(USER, 'kids')
    expect(list.map((p) => p.name)).toEqual(['AA', 'CC'])
    expect(list[0]).toMatchObject({ cycleNumber: 1, stage: 'z' })
  })

  test('update: name/status/studioProjectId (vazio limpa) e toca updated_at', async () => {
    const s = buildServices()
    const created = await createProject(s)
    s.clockRef.now = new Date('2026-07-02T09:00:00.000Z')
    const updated = await s.update.execute(USER, 'kids', created.id, {
      name: '  Nave Zero  ',
      studioProjectId: 'studio-abc',
    })
    expect(updated.name).toBe('Nave Zero')
    expect(updated.studioProjectId).toBe('studio-abc')
    expect(updated.updatedAt).toBe('2026-07-02T09:00:00.000Z')
    const cleared = await s.update.execute(USER, 'kids', created.id, { studioProjectId: '  ' })
    expect(cleared.studioProjectId).toBeNull()
  })

  test('buildEnv: nasce null (chooser pendente), PATCH troca e re-troca', async () => {
    const s = buildServices()
    const created = await createProject(s)
    expect(created.buildEnv).toBeNull()
    expect(created.studioSnapshotAt).toBeNull()

    const chosen = await s.update.execute(USER, 'kids', created.id, { buildEnv: 'embedded' })
    expect(chosen.buildEnv).toBe('embedded')
    // Trocável a qualquer momento (o chooser reabre); os demais campos preservam.
    const swapped = await s.update.execute(USER, 'kids', created.id, { buildEnv: 'external' })
    expect(swapped.buildEnv).toBe('external')
    expect(swapped.name).toBe('Meu Jogo')
    const detail = await s.get.execute(USER, 'kids', created.id)
    expect(detail.buildEnv).toBe('external')
  })

  test('ownership: outro dono ou outra vitrine → PENSA_NOT_FOUND (não vaza)', async () => {
    const s = buildServices()
    const created = await createProject(s)
    expect(s.get.execute(OTHER, 'kids', created.id)).rejects.toMatchObject({
      code: 'PENSA_NOT_FOUND',
    })
    expect(s.get.execute(USER, 'adult', created.id)).rejects.toMatchObject({
      code: 'PENSA_NOT_FOUND',
    })
    expect(s.update.execute(OTHER, 'kids', created.id, { name: 'Roubado' })).rejects.toMatchObject({
      code: 'PENSA_NOT_FOUND',
    })
  })
})

describe('Pensa — ciclos', () => {
  test('criar ciclo 2 exige o anterior done; nasce z com goal', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycle1 = project.currentCycle.id
    expect(s.createCycle.execute(USER, 'kids', project.id, 'Nova versão')).rejects.toMatchObject({
      code: 'PENSA_CYCLE_NOT_DONE',
    })

    await driveTo(s, cycle1, 'done')
    const detail = await s.createCycle.execute(USER, 'kids', project.id, 'Mais fases')
    expect(detail.cycles).toHaveLength(2)
    expect(detail.currentCycle).toMatchObject({ number: 2, stage: 'z', goal: 'Mais fases' })
    // O artifactsIndex é do ciclo CORRENTE (novo, vazio) — não do concluído.
    expect(detail.artifactsIndex).toEqual([])
  })

  test('cota de 10 ciclos → PENSA_QUOTA_EXCEEDED', async () => {
    const s = buildServices()
    const project = await createProject(s)
    let detail = await s.get.execute(USER, 'kids', project.id)
    for (let i = 2; i <= 10; i++) {
      await driveTo(s, detail.currentCycle.id, 'done')
      detail = await s.createCycle.execute(USER, 'kids', project.id, `Ciclo ${i}`)
    }
    await driveTo(s, detail.currentCycle.id, 'done')
    expect(s.createCycle.execute(USER, 'kids', project.id, 'Ciclo 11')).rejects.toMatchObject({
      code: 'PENSA_QUOTA_EXCEEDED',
    })
  })
})

describe('Pensa — conversa (upsert por ciclo+etapa)', () => {
  test('turno acumula mensagens/messageCount; state substitui; summary preserva', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycleId = project.currentCycle.id

    const r1 = await s.appendTurn.execute(USER, 'kids', cycleId, 'z', {
      userMessage: { content: 'quero um jogo de nave' },
      assistantMessage: { content: 'legal! quem joga?' },
      state: { answered: { who: false }, ready: false },
    })
    expect(r1.messageCount).toBe(2)
    const r2 = await s.appendTurn.execute(USER, 'kids', cycleId, 'z', {
      userMessage: { content: 'crianças' },
      assistantMessage: { content: 'anotado!' },
      summary: 'Jogo de nave para crianças',
    })
    expect(r2.messageCount).toBe(4)
    // state ausente no 2º turno → preserva o do 1º.
    expect(r2.state).toEqual({ answered: { who: false }, ready: false })

    const view = await s.getStage.execute(USER, 'kids', cycleId, 'z')
    expect(view.conversation.messages).toHaveLength(4)
    expect(view.conversation.summary).toBe('Jogo de nave para crianças')
    expect(view.conversation.messages[0]).toMatchObject({
      role: 'user',
      content: 'quero um jogo de nave',
    })
  })

  test('trim mantém as últimas 80 mensagens mas o messageCount TOTAL cresce', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycleId = project.currentCycle.id
    for (let i = 0; i < 40; i++) {
      await s.appendTurn.execute(USER, 'kids', cycleId, 'z', {
        userMessage: { content: `pergunta ${i}` },
        assistantMessage: { content: `resposta ${i}` },
      })
    }
    // 90 mensagens somadas → só as 80 últimas ficam.
    for (let i = 40; i < 45; i++) {
      await s.appendTurn.execute(USER, 'kids', cycleId, 'z', {
        userMessage: { content: `pergunta ${i}` },
        assistantMessage: { content: `resposta ${i}` },
      })
    }
    const view = await s.getStage.execute(USER, 'kids', cycleId, 'z')
    expect(view.conversation.messages).toHaveLength(80)
    expect(view.conversation.messageCount).toBe(90)
    expect(view.conversation.messages[0]?.content).toBe('pergunta 5')
  })

  test('conversas de etapas diferentes não se misturam', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycleId = project.currentCycle.id
    await s.appendTurn.execute(USER, 'kids', cycleId, 'z', {
      userMessage: { content: 'na etapa z' },
      assistantMessage: { content: 'ok' },
    })
    const e = await s.getStage.execute(USER, 'kids', cycleId, 'e')
    expect(e.conversation.messages).toEqual([])
    expect(e.conversation.messageCount).toBe(0)
    expect(e.state).toEqual({})
  })

  test('ownership do ciclo → PENSA_NOT_FOUND', async () => {
    const s = buildServices()
    const project = await createProject(s)
    expect(
      s.appendTurn.execute(OTHER, 'kids', project.currentCycle.id, 'z', {
        userMessage: { content: 'oi' },
        assistantMessage: { content: 'olá' },
      }),
    ).rejects.toMatchObject({ code: 'PENSA_NOT_FOUND' })
  })
})

describe('Pensa — artefatos versionados', () => {
  test('save incrementa a versão; validate marca o LATEST; stage view filtra por etapa', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycleId = project.currentCycle.id

    const v1 = await s.saveArtifact.execute(USER, 'kids', cycleId, {
      stage: 'z',
      type: 'idea',
      content: { titulo: 'Nave Zero' },
    })
    expect(v1).toMatchObject({ version: 1, status: 'draft', type: 'idea', stage: 'z' })
    const v2 = await s.saveArtifact.execute(USER, 'kids', cycleId, {
      stage: 'z',
      type: 'idea',
      content: { titulo: 'Nave Zero 2' },
    })
    expect(v2.version).toBe(2)

    const validated = await s.validateArtifact.execute(USER, 'kids', cycleId, 'idea')
    expect(validated).toMatchObject({ version: 2, status: 'validated' })

    const stage = await s.getStage.execute(USER, 'kids', cycleId, 'z')
    expect(stage.artifacts).toHaveLength(1)
    expect(stage.artifacts[0]).toMatchObject({ version: 2, status: 'validated' })
    // Outra etapa não enxerga o artefato de z.
    const e = await s.getStage.execute(USER, 'kids', cycleId, 'e')
    expect(e.artifacts).toEqual([])
    // O detail indexa o latest por type do ciclo corrente.
    const detail = await s.get.execute(USER, 'kids', project.id)
    expect(detail.artifactsIndex).toEqual([
      { type: 'idea', stage: 'z', version: 2, status: 'validated', createdAt: expect.any(String) },
    ])
  })

  test('validate sem artefato do type → PENSA_NOT_FOUND', async () => {
    const s = buildServices()
    const project = await createProject(s)
    expect(
      s.validateArtifact.execute(USER, 'kids', project.currentCycle.id, 'prd'),
    ).rejects.toMatchObject({ code: 'PENSA_NOT_FOUND' })
  })

  test('content acima de 262_144 chars stringificado → VALIDATION_ERROR', async () => {
    const s = buildServices()
    const project = await createProject(s)
    expect(
      s.saveArtifact.execute(USER, 'kids', project.currentCycle.id, {
        stage: 'z',
        type: 'idea',
        content: { texto: 'x'.repeat(262_200) },
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })
})

describe('Pensa — advance com gates', () => {
  test('from ≠ stage atual → PENSA_STAGE_MISMATCH', async () => {
    const s = buildServices()
    const project = await createProject(s)
    expect(s.advance.execute(USER, 'kids', project.currentCycle.id, 'e')).rejects.toMatchObject({
      code: 'PENSA_STAGE_MISMATCH',
    })
  })

  test('z sem idea validated → PENSA_GATE_NOT_READY com missing', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycleId = project.currentCycle.id
    expect(s.advance.execute(USER, 'kids', cycleId, 'z')).rejects.toMatchObject({
      code: 'PENSA_GATE_NOT_READY',
      gate: 'z',
      missing: ['idea'],
    })
    // Draft ainda não destrava.
    await s.saveArtifact.execute(USER, 'kids', cycleId, { stage: 'z', type: 'idea', content: {} })
    expect(s.advance.execute(USER, 'kids', cycleId, 'z')).rejects.toMatchObject({
      code: 'PENSA_GATE_NOT_READY',
    })
  })

  test('caminho completo z→done grava <from>_completed_at em cada avanço', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycleId = project.currentCycle.id

    await s.saveArtifact.execute(USER, 'kids', cycleId, { stage: 'z', type: 'idea', content: {} })
    await s.validateArtifact.execute(USER, 'kids', cycleId, 'idea')
    const afterZ = await s.advance.execute(USER, 'kids', cycleId, 'z')
    expect(afterZ.cycle.stage).toBe('e')
    expect(afterZ.cycle.zCompletedAt).toBe('2026-07-01T12:00:00.000Z')

    // e exige friendly_spec + identity validated.
    expect(s.advance.execute(USER, 'kids', cycleId, 'e')).rejects.toMatchObject({
      code: 'PENSA_GATE_NOT_READY',
      missing: ['friendly_spec', 'identity'],
    })
    for (const type of ['friendly_spec', 'identity'] as const) {
      await s.saveArtifact.execute(USER, 'kids', cycleId, { stage: 'e', type, content: {} })
      await s.validateArtifact.execute(USER, 'kids', cycleId, type)
    }
    expect((await s.advance.execute(USER, 'kids', cycleId, 'e')).cycle.stage).toBe('r')

    // r exige ≥1 task.
    expect(s.advance.execute(USER, 'kids', cycleId, 'r')).rejects.toMatchObject({
      code: 'PENSA_GATE_NOT_READY',
      missing: ['tasks'],
    })
    await s.replaceTasks.execute(USER, 'kids', cycleId, [{ title: 'Missão 1', mission }])
    expect((await s.advance.execute(USER, 'kids', cycleId, 'r')).cycle.stage).toBe('o')

    // o exige todo required done — o item pendente trava.
    const items = await s.replaceChecklist.execute(USER, 'kids', cycleId, [
      { category: 'test', title: 'Testar tudo' },
      { category: 'polish', title: 'Toque de brilho', required: false },
    ])
    expect(s.advance.execute(USER, 'kids', cycleId, 'o')).rejects.toMatchObject({
      code: 'PENSA_GATE_NOT_READY',
      missing: ['checklist'],
    })
    const required = items[0]
    if (!required) throw new Error('checklist vazio')
    await s.toggleItem.execute(USER, 'kids', required.id, true)
    // O item OPCIONAL pendente não trava.
    const done = await s.advance.execute(USER, 'kids', cycleId, 'o')
    expect(done.cycle.stage).toBe('done')
    expect(done.cycle.oCompletedAt).not.toBeNull()
  })
})

describe('Pensa — gamificação do advance (award-dentro-da-ação, fail-open)', () => {
  test('concluir uma ETAPA credita 15 XP + 5 coins (pensa_stage_complete) e move o streak', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycleId = project.currentCycle.id
    await s.saveArtifact.execute(USER, 'kids', cycleId, { stage: 'z', type: 'idea', content: {} })
    await s.validateArtifact.execute(USER, 'kids', cycleId, 'idea')

    const result = await s.advance.execute(USER, 'kids', cycleId, 'z')
    expect(result.cycle.stage).toBe('e')
    expect(result.gamification).toMatchObject({
      xpAwarded: 15,
      totalXp: 15,
      coinsAwarded: 5,
      coinBalance: 5,
      streak: { current: 1, best: 1, extended: true },
    })
    // Ledger: 1 evento pensa_stage_complete na AUDIÊNCIA DO PROJETO (kids), com o
    // sourceId DETERMINÍSTICO da etapa (uuid derivado de cycleId+stage).
    const events = s.gamification.events.filter((e) => e.sourceType === 'pensa_stage_complete')
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      audience: 'kids',
      sourceId: pensaStageSourceId(cycleId, 'z'),
      amount: 15,
    })
    // Badge: a 1ª etapa concluída é sempre a Z → 1ª Carta da Ideia.
    expect(result.gamification?.badgesUnlocked.map((b) => b.slug)).toContain('pensa-first-idea')
  })

  test('fechar o CICLO (o→done) credita 30 XP + 15 coins (pensa_cycle_complete, sourceId = cycleId) SEM stage_complete duplicado', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycleId = project.currentCycle.id
    await driveTo(s, cycleId, 'o')
    const before = s.gamification.events.filter(
      (e) => e.sourceType === 'pensa_stage_complete',
    ).length

    const items = await s.replaceChecklist.execute(USER, 'kids', cycleId, [
      { category: 'test', title: 'Testar o jogo' },
    ])
    const first = items[0]
    if (!first) throw new Error('checklist vazio')
    await s.toggleItem.execute(USER, 'kids', first.id, true)
    const result = await s.advance.execute(USER, 'kids', cycleId, 'o')

    expect(result.cycle.stage).toBe('done')
    expect(result.gamification).toMatchObject({ xpAwarded: 30, coinsAwarded: 15 })
    const cycleEvents = s.gamification.events.filter((e) => e.sourceType === 'pensa_cycle_complete')
    expect(cycleEvents).toHaveLength(1)
    expect(cycleEvents[0]).toMatchObject({ sourceId: cycleId, amount: 30 })
    // O fechamento vale o prêmio MAIOR: o→done NÃO credita stage_complete junto.
    expect(
      s.gamification.events.filter((e) => e.sourceType === 'pensa_stage_complete'),
    ).toHaveLength(before)
    expect(result.gamification?.badgesUnlocked.map((b) => b.slug)).toContain('pensa-first-launch')
  })

  test('etapas z/e/r geram sourceIds DISTINTOS entre si e entre ciclos', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycle1 = project.currentCycle.id
    await driveTo(s, cycle1, 'done')
    const detail = await s.createCycle.execute(USER, 'kids', project.id, 'Ciclo 2 com mais fases')
    const cycle2 = detail.currentCycle.id
    await driveTo(s, cycle2, 'done')

    const stageEvents = s.gamification.events.filter((e) => e.sourceType === 'pensa_stage_complete')
    // 3 etapas × 2 ciclos, TODAS com sourceId único (não colidem entre etapas nem ciclos).
    expect(stageEvents).toHaveLength(6)
    expect(new Set(stageEvents.map((e) => e.sourceId)).size).toBe(6)
  })

  test('replay do award NÃO duplica (ledger idempotente por sourceId determinístico)', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycleId = project.currentCycle.id
    await s.saveArtifact.execute(USER, 'kids', cycleId, { stage: 'z', type: 'idea', content: {} })
    await s.validateArtifact.execute(USER, 'kids', cycleId, 'idea')
    await s.advance.execute(USER, 'kids', cycleId, 'z')

    // Re-advance é impossível pela máquina (from ≠ stage → 409); o replay do
    // AWARD (retry/crash-recovery) é deduplicado pelo UNIQUE do ledger.
    const replay = await s.award.awardPensaAdvance({
      userId: USER,
      accountId: ACCOUNT,
      cycleId,
      from: 'z',
      audience: 'kids',
      privileged: false,
    })
    expect(replay).toMatchObject({ xpAwarded: 0, coinsAwarded: 0, totalXp: 15 })
    expect(
      s.gamification.events.filter((e) => e.sourceType === 'pensa_stage_complete'),
    ).toHaveLength(1)
  })

  test('badges de lançamento: 1º ciclo → pensa-first-launch; 3º → pensa-creator-3', async () => {
    const s = buildServices()
    const project = await createProject(s)
    let cycleId = project.currentCycle.id
    for (let n = 1; n <= 3; n++) {
      await driveTo(s, cycleId, 'done')
      if (n < 3) {
        const detail = await s.createCycle.execute(
          USER,
          'kids',
          project.id,
          `Objetivo do ciclo ${n + 1}`,
        )
        cycleId = detail.currentCycle.id
      }
    }
    const slugs = s.gamification.badges.map((b) => b.badgeSlug)
    expect(slugs).toContain('pensa-first-idea')
    expect(slugs).toContain('pensa-first-launch')
    expect(slugs).toContain('pensa-creator-3')
    // 3 ciclos lançados no ledger (1 marco por ciclo).
    expect(
      s.gamification.events.filter((e) => e.sourceType === 'pensa_cycle_complete'),
    ).toHaveLength(3)
  })

  test('award falhando → advance ainda responde com o ciclo e gamification: null (fail-open)', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycleId = project.currentCycle.id
    await s.saveArtifact.execute(USER, 'kids', cycleId, { stage: 'z', type: 'idea', content: {} })
    await s.validateArtifact.execute(USER, 'kids', cycleId, 'idea')

    s.gamification.failAlways = true
    const result = await s.advance.execute(USER, 'kids', cycleId, 'z')
    expect(result.cycle.stage).toBe('e')
    expect(result.gamification).toBeNull()
  })

  test('privileged é gravado no perfil (equipe fora do ranking, padrão existente)', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycleId = project.currentCycle.id
    await s.saveArtifact.execute(USER, 'kids', cycleId, { stage: 'z', type: 'idea', content: {} })
    await s.validateArtifact.execute(USER, 'kids', cycleId, 'idea')

    const result = await s.advance.execute(USER, 'kids', cycleId, 'z', true, ACCOUNT)
    expect(result.gamification).not.toBeNull()
    // Mirror da coluna `privileged` (o ranking filtra privileged = false); a CONTA
    // da sessão de perfil é propagada ao perfil de gamificação.
    expect(s.gamification.privilegedUsers.has(USER)).toBe(true)
    expect(s.gamification.accountIds.get(`${USER}:kids`)).toBe(ACCOUNT)
  })
})

describe('Pensa — kanban (replace + move)', () => {
  test('replace: nascem backlog com position = índice; >60 → quota', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycleId = project.currentCycle.id
    const tasks = await s.replaceTasks.execute(USER, 'kids', cycleId, [
      { title: 'T0', mission },
      { title: 'T1', mission, summary: 'resumo', taskType: 'setup' },
      { title: 'T2', mission },
    ])
    expect(tasks.map((t) => [t.title, t.column, t.position])).toEqual([
      ['T0', 'backlog', 0],
      ['T1', 'backlog', 1],
      ['T2', 'backlog', 2],
    ])
    expect(tasks[1]).toMatchObject({ summary: 'resumo', taskType: 'setup', notes: null })

    const many = Array.from({ length: 61 }, (_, i) => ({ title: `T${i}`, mission }))
    expect(s.replaceTasks.execute(USER, 'kids', cycleId, many)).rejects.toMatchObject({
      code: 'PENSA_QUOTA_EXCEEDED',
    })
  })

  test('mover entre colunas re-sequencia DESTINO e ORIGEM (posições densas)', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycleId = project.currentCycle.id
    const [t0, t1, t2] = await s.replaceTasks.execute(USER, 'kids', cycleId, [
      { title: 'T0', mission },
      { title: 'T1', mission },
      { title: 'T2', mission },
    ])
    if (!t0 || !t1 || !t2) throw new Error('replace falhou')

    // T1 vai pra doing (posição default = fim da coluna vazia → 0).
    const moved = await s.updateTask.execute(USER, 'kids', t1.id, { column: 'doing' })
    expect(moved).toMatchObject({ column: 'doing', position: 0 })

    // Origem re-sequenciada: T0=0, T2=1 (sem buraco).
    const after = await s.repo.listTasks(cycleId)
    const backlog = after
      .filter((t) => t.column === 'backlog')
      .sort((a, b) => a.position - b.position)
    expect(backlog.map((t) => [t.title, t.position])).toEqual([
      ['T0', 0],
      ['T2', 1],
    ])

    // T2 entra em doing na posição 0 → empurra T1 pra 1.
    await s.updateTask.execute(USER, 'kids', t2.id, { column: 'doing', position: 0 })
    const doing = (await s.repo.listTasks(cycleId))
      .filter((t) => t.column === 'doing')
      .sort((a, b) => a.position - b.position)
    expect(doing.map((t) => [t.title, t.position])).toEqual([
      ['T2', 0],
      ['T1', 1],
    ])
  })

  test('mover dentro da MESMA coluna re-ordena; notes null limpa', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycleId = project.currentCycle.id
    const [t0, , t2] = await s.replaceTasks.execute(USER, 'kids', cycleId, [
      { title: 'T0', mission },
      { title: 'T1', mission },
      { title: 'T2', mission },
    ])
    if (!t0 || !t2) throw new Error('replace falhou')

    await s.updateTask.execute(USER, 'kids', t2.id, { position: 0 })
    const backlog = (await s.repo.listTasks(cycleId)).sort((a, b) => a.position - b.position)
    expect(backlog.map((t) => t.title)).toEqual(['T2', 'T0', 'T1'])

    const noted = await s.updateTask.execute(USER, 'kids', t0.id, { notes: 'ficou difícil' })
    expect(noted.notes).toBe('ficou difícil')
    const cleared = await s.updateTask.execute(USER, 'kids', t0.id, { notes: null })
    expect(cleared.notes).toBeNull()
  })

  test('ownership da task → PENSA_NOT_FOUND', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const [task] = await s.replaceTasks.execute(USER, 'kids', project.currentCycle.id, [
      { title: 'T0', mission },
    ])
    if (!task) throw new Error('replace falhou')
    expect(s.updateTask.execute(OTHER, 'kids', task.id, { column: 'doing' })).rejects.toMatchObject(
      { code: 'PENSA_NOT_FOUND' },
    )
  })
})

describe('Pensa — checklist', () => {
  test('replace com defaults (required=true, position=índice); >40 → quota', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const cycleId = project.currentCycle.id
    const items = await s.replaceChecklist.execute(USER, 'kids', cycleId, [
      { category: 'test', title: 'Testar' },
      { category: 'share', title: 'Compartilhar', required: false, position: 7 },
    ])
    expect(items[0]).toMatchObject({ required: true, position: 0, done: false, doneAt: null })
    expect(items[1]).toMatchObject({ required: false, position: 7 })

    const many = Array.from({ length: 41 }, (_, i) => ({
      category: 'test' as const,
      title: `Item ${i}`,
    }))
    expect(s.replaceChecklist.execute(USER, 'kids', cycleId, many)).rejects.toMatchObject({
      code: 'PENSA_QUOTA_EXCEEDED',
    })
  })

  test('toggle liga/desliga com done_at; ownership → PENSA_NOT_FOUND', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const [item] = await s.replaceChecklist.execute(USER, 'kids', project.currentCycle.id, [
      { category: 'publish', title: 'Publicar no Mural' },
    ])
    if (!item) throw new Error('replace falhou')

    const on = await s.toggleItem.execute(USER, 'kids', item.id, true)
    expect(on.done).toBe(true)
    expect(on.doneAt).toBe('2026-07-01T12:00:00.000Z')
    const off = await s.toggleItem.execute(USER, 'kids', item.id, false)
    expect(off).toMatchObject({ done: false, doneAt: null })

    expect(s.toggleItem.execute(OTHER, 'kids', item.id, true)).rejects.toMatchObject({
      code: 'PENSA_NOT_FOUND',
    })
  })
})

describe('Pensa — snapshot do Estúdio na nuvem', () => {
  test('GET antes de salvar → { project: null, updatedAt: null }', async () => {
    const s = buildServices()
    const project = await createProject(s)
    expect(await s.getSnapshot.execute(USER, 'kids', project.id)).toEqual({
      project: null,
      updatedAt: null,
    })
  })

  test('save/get feliz: PUT grava e devolve updatedAt; GET devolve o blob', async () => {
    const s = buildServices()
    const project = await createProject(s)
    const game = { name: 'Nave Zero', scenes: [{ id: 'main', sprites: ['nave'] }] }

    const saved = await s.saveSnapshot.execute(USER, 'kids', project.id, game)
    expect(saved).toEqual({ updatedAt: '2026-07-01T12:00:00.000Z' })

    const got = await s.getSnapshot.execute(USER, 'kids', project.id)
    expect(got.project).toEqual(game)
    expect(got.updatedAt).toBe('2026-07-01T12:00:00.000Z')
  })

  test('detail expõe studioSnapshotAt mas NUNCA o blob; PUT toca updated_at do projeto', async () => {
    const s = buildServices()
    const project = await createProject(s)
    s.clockRef.now = new Date('2026-07-02T10:00:00.000Z')
    await s.saveSnapshot.execute(USER, 'kids', project.id, { scenes: [] })

    const detail = await s.get.execute(USER, 'kids', project.id)
    expect(detail.studioSnapshotAt).toBe('2026-07-02T10:00:00.000Z')
    // O PUT do snapshot toca o updated_at do projeto (a lista ordena por ele).
    expect(detail.updatedAt).toBe('2026-07-02T10:00:00.000Z')
    // O BLOB nunca sai na view (só o carimbo de quando foi salvo).
    expect('studioSnapshot' in detail).toBe(false)
    expect(JSON.stringify(detail)).not.toContain('"scenes"')
  })

  test('content não-objeto (array/string/null) → VALIDATION_ERROR', async () => {
    const s = buildServices()
    const project = await createProject(s)
    for (const bad of [[1, 2, 3], 'texto', null, 42]) {
      expect(s.saveSnapshot.execute(USER, 'kids', project.id, bad)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      })
    }
  })

  test('serializado acima de 1_800_000 chars → VALIDATION_ERROR (nada gravado)', async () => {
    const s = buildServices()
    const project = await createProject(s)
    expect(
      s.saveSnapshot.execute(USER, 'kids', project.id, { blob: 'x'.repeat(1_800_100) }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(await s.getSnapshot.execute(USER, 'kids', project.id)).toEqual({
      project: null,
      updatedAt: null,
    })
  })

  test('ownership: outro dono → PENSA_NOT_FOUND no GET e no PUT (não vaza)', async () => {
    const s = buildServices()
    const project = await createProject(s)
    await s.saveSnapshot.execute(USER, 'kids', project.id, { scenes: [] })
    expect(s.getSnapshot.execute(OTHER, 'kids', project.id)).rejects.toMatchObject({
      code: 'PENSA_NOT_FOUND',
    })
    expect(
      s.saveSnapshot.execute(OTHER, 'kids', project.id, { rouba: true }),
    ).rejects.toMatchObject({ code: 'PENSA_NOT_FOUND' })
  })
})
