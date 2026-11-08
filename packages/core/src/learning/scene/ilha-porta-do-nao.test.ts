import { describe, expect, test } from 'bun:test'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import {
  discoveryGuidance,
  discoverySpeechSteps,
  type ExperimentationActivity,
  isSceneSetup,
  sceneStart,
  sceneTargets,
} from './index'
import { initialExperiment, packExperiment, readExperimentSession, stepExperiment } from './session'
import { isSceneState, LIGHTHOUSE_NOT_GOALS, lighthouseKeyNotCase, type SceneStart } from './state'

/**
 * "A pergunta com o não" (A Ilha do Farol, aula 3): a porta do farol pergunta "a porta está
 * trancada?" ou "a porta não está trancada?". Sem a chave, ela está trancada; sim abre. O modo liga
 * pelas metas do caso (`lighthouseKeyNotCase`); a porta do Farol (Dias 2 e 3) fica igual. Desde
 * 08/11/2026 a experiência acontece na ilha 3D do jogo do curso (cenário `ilha`), e o Zappy fala
 * curto: depois de cada teste, ele aponta o que a porta fez e pede a outra pergunta.
 */
export const BLOCO_DA_PORTA_DO_NAO: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'lighthouse-key',
  cenario: 'ilha',
  setup: { freeExploration: true, goals: [...LIGHTHOUSE_NOT_GOALS] },
}
const start: SceneStart = sceneStart(BLOCO_DA_PORTA_DO_NAO)
const jogar = (actions: SceneAction[], s: SceneStart = start) =>
  actions.reduce((e, a) => stepScene(s, e, a), openScene(s))
const fala = (actions: SceneAction[]) => discoveryGuidance(BLOCO_DA_PORTA_DO_NAO, jogar(actions)).id
const TESTAR: SceneAction = { type: 'try-lighthouse-door' }
const chave = (hasKey: boolean): SceneAction => ({ type: 'key-state', hasKey })
const nao = (not: boolean): SceneAction => ({ type: 'door-question', not })

const falas = new Map(
  discoverySpeechSteps('lighthouse-key')
    .filter(({ id }) => id.startsWith('door-not-'))
    .map(({ id, text }) => [id, text] as const),
)

describe('a porta do não: o Zappy fala curto, só da ideia', () => {
  test('as falas do não têm a ideia e o "No seu jogo"', () => {
    expect(falas.get('door-not-idea')).toContain('obedece à resposta')
    expect(falas.get('door-not-bridge')).toStartWith('No seu jogo: ')
  })
  test.each([
    ...falas.keys(),
  ])('%s é curta e não fala de bloco, Se, então, senão, variável nem botão', (id) => {
    const texto = falas.get(id) ?? ''
    if (!/-(?:idea|bridge)$/.test(id)) expect(texto.split(/\s+/).length).toBeLessThanOrEqual(12)
    expect(texto).not.toMatch(
      /\bbloco|\bregra|\bentão\b|\bsenão\b|\bSe\b|temChave|ganhou|variável|código|[Cc]lique em|Testar a porta|Dar a chave/,
    )
  })
  test('antes de testar, a fala não conta a resposta', () => {
    for (const id of ['door-not-start', 'door-not-go'])
      expect(falas.get(id)).not.toMatch(/abriu|fechada|SIM|NÃO|troca/i)
  })
  test('a surpresa da pergunta sem o não: abre sem a chave e fica fechada com ela', () => {
    expect(falas.get('door-not-opened')).toContain('Abriu sem a chave')
    expect(falas.get('door-not-closed')).toContain('Fechada com a chave')
  })
})

describe('a porta do não: as respostas', () => {
  test('sem a chave a porta está trancada: sem o não, sim (abre); com o não, não (fechada)', () => {
    expect(jogar([TESTAR]).lighthouse.door).toBe('open')
    expect(jogar([nao(true), TESTAR]).lighthouse.door).toBe('closed')
  })
  test('com a chave, destrancada: sem o não, não (fechada); com o não, sim (abre)', () => {
    expect(jogar([chave(true), TESTAR]).lighthouse.door).toBe('closed')
    expect(jogar([chave(true), nao(true), TESTAR]).lighthouse.door).toBe('open')
  })
  test('a meta da comparação só cai com as duas perguntas testadas com a mesma chave', () => {
    const uma = jogar([chave(true), TESTAR])
    expect(uma.evidence.discoveries).toEqual(['asked-locked-with-key'])
    // Trocar de chave no meio não compara: cada chave tem a sua dupla.
    const misturado = jogar([chave(true), TESTAR, chave(false), nao(true), TESTAR])
    expect(misturado.evidence.discoveries).not.toContain('not-flips-with-key')
    expect(misturado.evidence.discoveries).not.toContain('not-flips-without-key')
    const dupla = jogar([chave(true), TESTAR, nao(true), TESTAR])
    expect(dupla.evidence.discoveries).toContain('not-flips-with-key')
  })
  test('trocar a pergunta ou a chave prepara outra tentativa: a porta fecha e a marca sai', () => {
    const s = jogar([TESTAR, nao(true)])
    expect(s.lighthouse).toMatchObject({ door: 'closed', checkedKey: null, checkedNot: null })
  })
  test('⚠️ a porta do Farol (Dias 2 e 3) segue igual, até com a pergunta trocada', () => {
    const farol: SceneStart = { scene: 'lighthouse-key', setup: { freeExploration: true } }
    expect(lighthouseKeyNotCase(farol.setup)).toBe(false)
    const comChave = jogar([chave(true), TESTAR], farol)
    expect(comChave.lighthouse.door).toBe('open')
    expect(comChave.evidence.discoveries).toEqual(['opened-with-key'])
    expect(jogar([nao(true), chave(true), TESTAR], farol).lighthouse.door).toBe('open')
    expect(jogar([TESTAR], farol).evidence.discoveries).toEqual(['locked-without-key'])
  })
  test('⚠️ fora da exploração livre, as metas do não não ligam o modo (a bancada não tem o botão)', () => {
    const bancada: SceneStart = {
      scene: 'lighthouse-key',
      setup: { goals: [...LIGHTHOUSE_NOT_GOALS] },
    }
    expect(lighthouseKeyNotCase(bancada.setup)).toBe(false)
    expect(jogar([TESTAR], bancada).lighthouse.door).not.toBe('open')
  })
})

describe('a porta do não: o retrato guardado', () => {
  test('a porta aberta sem a chave vale no caso do não, e o retrato volta igual', () => {
    const s = jogar([TESTAR])
    expect(isSceneState(s)).toBe(true)
    let sessao = initialExperiment(start)
    for (const a of [TESTAR, nao(true), TESTAR]) sessao = stepExperiment(start, sessao, a).session
    const lido = readExperimentSession('lighthouse-key', packExperiment('lighthouse-key', sessao))
    expect(lido?.state.lighthouse).toEqual(sessao.state.lighthouse)
  })
  test('retrato incoerente é recusado (a porta não bate com a resposta testada)', () => {
    const s = jogar([TESTAR])
    expect(isSceneState({ ...s, lighthouse: { ...s.lighthouse, door: 'closed' } })).toBe(false)
    expect(isSceneState({ ...s, lighthouse: { ...s.lighthouse, checkedNot: true } })).toBe(false)
  })
})

describe('a porta do não: a fala acompanha a ordem escolhida', () => {
  test('começando sem a chave e sem o não (a abertura)', () => {
    expect(fala([])).toBe('door-not-start')
    expect(fala([TESTAR])).toBe('door-not-opened')
    expect(fala([TESTAR, nao(true)])).toBe('door-not-go')
    expect(fala([TESTAR, nao(true), TESTAR])).toBe('door-not-with')
    expect(fala([TESTAR, nao(true), TESTAR, chave(true)])).toBe('door-not-go')
    expect(fala([TESTAR, nao(true), TESTAR, chave(true), TESTAR])).toBe('door-not-remove')
    expect(fala([TESTAR, nao(true), TESTAR, chave(true), TESTAR, nao(false), TESTAR])).toBe(
      'door-not-complete',
    )
  })
  test('começando com a chave', () => {
    expect(fala([chave(true), TESTAR])).toBe('door-not-closed')
    expect(fala([chave(true), nao(true)])).toBe('door-not-start')
    expect(fala([chave(true), nao(true), TESTAR])).toBe('door-not-remove')
    expect(fala([chave(true), nao(true), TESTAR, nao(false), TESTAR])).toBe('door-not-without')
  })
  test('uma meta só: a fala não cobra a chave que a atividade não pede', () => {
    const so = {
      ...BLOCO_DA_PORTA_DO_NAO,
      setup: { freeExploration: true, goals: ['not-flips-with-key'] },
    }
    const s = jogar([chave(true), TESTAR, nao(true), TESTAR], sceneStart(so))
    expect(discoveryGuidance(so, s).id).toBe('door-not-complete')
  })
  test('uma meta só: testar na chave que não é cobrada não afirma a troca que ela não viu', () => {
    const so = {
      ...BLOCO_DA_PORTA_DO_NAO,
      setup: { freeExploration: true, goals: ['not-flips-with-key'] },
    }
    const s = jogar([TESTAR], sceneStart(so))
    expect(discoveryGuidance(so, s).id).not.toMatch(/^door-not-with(?:out)?$/)
  })
})

describe('a porta do não: o caso e o caminho livre', () => {
  test('o caso é legal e o caminho completa as duas metas', () => {
    expect(isSceneSetup(BLOCO_DA_PORTA_DO_NAO.setup, 'lighthouse-key')).toBe(true)
    let sessao = initialExperiment(start)
    for (const a of [TESTAR, nao(true), TESTAR, chave(true), TESTAR, nao(false), TESTAR])
      sessao = stepExperiment(start, sessao, a).session
    for (const meta of sceneTargets(BLOCO_DA_PORTA_DO_NAO))
      expect(sessao.state.evidence.discoveries).toContain(meta)
  })
})
