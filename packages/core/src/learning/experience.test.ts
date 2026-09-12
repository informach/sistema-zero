import { describe, expect, test } from 'bun:test'
import { explorationPaths } from '../../tests/fixtures/exploration-paths'
import {
  applyExperienceSegment,
  evaluateExperience,
  experienceAnswers,
  experienceScript,
  initialExperience,
  isExperienceCommand,
  isExperienceScript,
  readExperienceCheckpoint,
  readExperienceSegment,
  stepExperience,
} from './experience'
import {
  EXPLORATION_MISSIONS,
  type ExplorationActivity,
  isExplorationActivity,
} from './exploration'

describe('versioned experience runtime', () => {
  test('authoring rejects an unreachable observation deadline and duplicate step identities', () => {
    const script = [
      {
        id: 'landing',
        caption: 'Espere voltar.',
        waitFor: 'landed',
        actions: [
          { type: 'connect', port: 'gravity', enabled: true },
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 1 },
        ],
      },
    ]
    expect(isExperienceScript(script, 'gravity', 9)).toBe(true)
    expect(isExperienceScript(script, 'gravity', 14)).toBe(false)
    expect(isExperienceScript([...script, ...script], 'gravity')).toBe(false)
    expect(isExperienceScript(script, 'constructor')).toBe(false)
  })
  test('capturing after a configuration change keeps the parameters of the jump actually observed', () => {
    const activity = { type: 'exploration', version: 3, mission: 'impulse' } as const
    let session = initialExperience(activity)
    for (const command of [
      { type: 'jump', input: 'tap' },
      { type: 'advance', seconds: 1 },
      { type: 'impulse', force: 14 },
      { type: 'capture' },
    ] as const)
      session = stepExperience(activity, session, command).session
    expect(session.state.force).toBe(14)
    expect(session.trials[0]?.state.force).toBe(9)
    expect(session.trials[0]?.state.peak).toBeCloseTo(67.5)
  })
  test('all authored missions remain solvable with incremental commands and checkpoint reload', () => {
    for (const mission of EXPLORATION_MISSIONS) {
      const activity: ExplorationActivity = { type: 'exploration', version: 3, mission }
      expect(isExplorationActivity(activity)).toBe(true)
      const checkpoint = applyExperienceSegment(activity, null, {
        sessionId: 'session-123',
        segmentId: 'segment-123',
        baseSequence: 0,
        commands: explorationPaths[mission],
      })
      const answers = experienceAnswers(activity, checkpoint)
      expect(readExperienceCheckpoint(activity, answers)?.session).toEqual(checkpoint.session)
      expect(evaluateExperience(activity, answers).passed).toBe(true)
      expect(isExperienceScript(experienceScript(activity), mission)).toBe(true)
    }
  })
  test('demonstrations run their script but reject manipulation and cannot become experiments', () => {
    for (const mission of EXPLORATION_MISSIONS) {
      const activity: ExplorationActivity = {
        type: 'exploration',
        version: 3,
        mission,
        mode: 'demonstrate',
      }
      let session = stepExperience(activity, initialExperience(activity), {
        type: 'demo-start',
      }).session
      for (let step = 0; step < experienceScript(activity).length; step++) {
        for (let i = 0; i < 1200 && !session.demo?.ready; i++)
          session = stepExperience(activity, session, { type: 'demo-tick', seconds: 0.04 }).session
        expect(session.demo?.ready).toBe(true)
        if (step < experienceScript(activity).length - 1)
          session = stepExperience(activity, session, { type: 'demo-next' }).session
      }
      const checkpoint = {
        session,
        sessionId: 'session-123',
        segmentId: 'segment-123',
        sequence: 1,
      }
      expect(evaluateExperience(activity, experienceAnswers(activity, checkpoint)).passed).toBe(
        true,
      )
      expect(evaluateExperience(activity, experienceAnswers(activity, checkpoint)).evidence).toBe(
        'demonstration',
      )
      expect(isExperienceCommand({ type: 'take-control' }, activity)).toBe(false)
      expect(isExperienceCommand({ type: 'reset' }, activity)).toBe(false)
      expect(isExperienceCommand({ type: 'capture' }, activity)).toBe(false)
      expect(isExperienceCommand({ type: 'demo-start' }, { ...activity, mode: 'explore' })).toBe(
        false,
      )
      const replay = stepExperience(activity, session, { type: 'demo-start' }).session
      expect(replay.demo?.step).toBe(0)
      expect(replay.state.actions).toBe(0)
      expect(replay.viewed).toBe(true)
    }
  })
  test('a long session uses bounded checkpoints rather than a lifetime command cap', () => {
    for (const mission of ['impulse', 'spawn', 'cleanup', 'random'] as const) {
      const activity: ExplorationActivity = { type: 'exploration', version: 3, mission }
      let current = null
      for (let i = 0; i < 1500; i++) {
        current = applyExperienceSegment(activity, current, {
          sessionId: 'session-123',
          segmentId: `segment-${i}`,
          baseSequence: current?.sequence ?? 0,
          commands: [{ type: 'advance', seconds: 0.04 }],
        })
        if (i % 100 === 0)
          expect(
            readExperienceCheckpoint(activity, experienceAnswers(activity, current)),
          ).not.toBeNull()
      }
      expect(current?.sequence).toBe(1500)
    }
  })
  test('a segment cannot carry a fabricated checkpoint and stale segments fail', () => {
    const activity: ExplorationActivity = { type: 'exploration', version: 3, mission: 'world' }
    const segment = {
      sessionId: 'session-123',
      segmentId: 'segment-123',
      baseSequence: 0,
      commands: [{ type: 'create' }],
    } as const
    const checkpoint = applyExperienceSegment(activity, null, {
      ...segment,
      commands: [...segment.commands],
    })
    expect(readExperienceSegment(activity, experienceAnswers(activity, checkpoint))).toBeNull()
    expect(() =>
      applyExperienceSegment(activity, checkpoint, { ...segment, commands: [...segment.commands] }),
    ).toThrow('EXPERIENCE_CONFLICT')
    expect(isExplorationActivity({ ...activity, version: 2, mode: 'demonstrate' })).toBe(false)
  })
})
