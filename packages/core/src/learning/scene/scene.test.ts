import { describe, expect, test } from 'bun:test'
import { SCENE_IDS } from './actions'
import { SCENE_MODELS } from './catalog'
import { stepScene } from './engine'
import { evaluateDemonstration, evaluateExperimentation, sceneGoals } from './evaluate'
import { isSceneActivity, isSceneScript } from './index'
import { initialScene, isSceneState } from './state'

/**
 * ⚠️ A equivalência com o motor anterior foi PROVADA no commit que criou este módulo
 * (`820b9a0a`): as 14 cenas rodaram o mesmo roteiro nos dois motores e as descobertas, as
 * observações, a legenda e os 44 campos do estado bateram. Os testes que faziam essa
 * comparação morreram junto com o motor antigo — mantê-lo vivo só para eles seria exatamente
 * o puxadinho que a reescrita existe para tirar. O que ficou testa a cena por si.
 */

describe('cena: o catálogo', () => {
  test('tem os 14 modelos, e cada um traz metas, três dicas e um roteiro', () => {
    expect(SCENE_IDS).toHaveLength(14)
    for (const scene of SCENE_IDS) {
      const m = SCENE_MODELS[scene]
      expect(m.id).toBe(scene)
      expect(m.goals.length).toBeGreaterThan(0)
      expect(m.hints).toHaveLength(3)
      expect(m.script.length).toBeGreaterThan(0)
      expect(m.title.length).toBeGreaterThan(0)
      expect(m.manipulates.length).toBeGreaterThan(0)
    }
  })

  test('todo roteiro do catálogo é executável e cumpre o que promete', () => {
    // `isSceneScript` não confere só a forma: ele TOCA o roteiro e exige que cada `waitFor`
    // realmente aconteça. Se um modelo prometesse uma descoberta que não ocorre, a criança
    // ficaria presa esperando — e é isso que este teste impede de entrar no catálogo.
    for (const scene of SCENE_IDS)
      expect(isSceneScript([...SCENE_MODELS[scene].script], scene)).toBe(true)
  })
})

describe('cena: as duas atividades', () => {
  test('demonstração e experimentação são tipos irmãos, cada um com os seus campos', () => {
    expect(isSceneActivity({ type: 'demonstration', scene: 'world' })).toBe(true)
    expect(isSceneActivity({ type: 'experimentation', scene: 'world' })).toBe(true)
    // Não existe mais nem `mode` nem `version`: a forma antiga não é aceita.
    expect(isSceneActivity({ type: 'exploration', version: 3, mission: 'world' })).toBe(false)
    expect(isSceneActivity({ type: 'demonstration', scene: 'inexistente' })).toBe(false)
  })

  test('o impulso inicial só existe nas duas cenas de salto', () => {
    expect(isSceneActivity({ type: 'experimentation', scene: 'impulse', initialImpulse: 9 })).toBe(
      true,
    )
    expect(isSceneActivity({ type: 'experimentation', scene: 'world', initialImpulse: 9 })).toBe(
      false,
    )
    expect(isSceneActivity({ type: 'experimentation', scene: 'impulse', initialImpulse: 99 })).toBe(
      false,
    )
  })

  test('roteiro que promete uma descoberta sem produzi-la é recusado', () => {
    const promessaVazia = [
      { id: 'a', caption: 'Nada acontece aqui.', actions: [{ type: 'create' as const }] },
    ]
    // `world` não tem meta chamada assim, e mesmo que tivesse o passo não avança o tempo.
    expect(isSceneScript([{ ...promessaVazia[0], waitFor: 'visible' }], 'world')).toBe(false)
  })

  test('dica não entra em roteiro de demonstração', () => {
    const comDica = [{ id: 'a', caption: 'Olhe.', actions: [{ type: 'hint' as const, level: 1 }] }]
    expect(isSceneScript(comDica, 'world')).toBe(false)
  })
})

describe('cena: a avaliação', () => {
  test('experimentação cobra as metas; demonstração cobra ter assistido', () => {
    const vazio = initialScene({ scene: 'world' })
    expect(evaluateExperimentation('world', vazio).passed).toBe(false)
    expect(evaluateExperimentation('world', vazio).participated).toBe(false)
    expect(evaluateDemonstration(false).passed).toBe(false)
    expect(evaluateDemonstration(true).passed).toBe(true)
    // Quem só assistiu participou, mesmo sem ter tocado em nada.
    expect(evaluateDemonstration(false).participated).toBe(true)
  })

  test('descobrir e desfazer não fecha as duas cenas que pedem montagem final', () => {
    // ⚠️ `layers` e `jump-sound` exigem que a montagem FIQUE no estado descoberto.
    let s = initialScene({ scene: 'layers' })
    s = stepScene({ scene: 'layers' }, s, { type: 'layer', front: true })
    s = stepScene({ scene: 'layers' }, s, { type: 'layer', front: false })
    expect(sceneGoals('layers', s).every((g) => g.complete)).toBe(true)
    expect(evaluateExperimentation('layers', s).passed).toBe(false)

    s = stepScene({ scene: 'layers' }, s, { type: 'layer', front: true })
    expect(evaluateExperimentation('layers', s).passed).toBe(true)
  })

  test('recomeçar guarda as descobertas', () => {
    let s = initialScene({ scene: 'world' })
    s = stepScene({ scene: 'world' }, s, { type: 'create' })
    const antes = [...s.evidence.discoveries]
    expect(antes.length).toBeGreaterThan(0)
    s = stepScene({ scene: 'world' }, s, { type: 'reset' })
    expect(s.evidence.discoveries).toEqual(antes)
    expect(s.world.created).toBe(false)
  })

  test('ação que não pertence à cena não muda nada', () => {
    const s = initialScene({ scene: 'world' })
    // `impulse` é de outra cena: no-op silencioso, sem contar como ação.
    const depois = stepScene({ scene: 'world' }, s, { type: 'impulse', force: 9 })
    expect(depois).toBe(s)
  })
})

describe('cena: o estado que volta do servidor', () => {
  test('aceita o que o MOTOR produz, inclusive uma pista cheia de cactos', () => {
    // ⚠️ O review pegou um teto meu de 40 cactos. Na cena `spawn` sem o relógio ligado nasce
    // um cacto por quadro (1/30 s), então dois segundos de brincadeira já dão 60 — e o
    // estado voltava do servidor recusado, mandando a criança recomeçar do zero.
    let s = initialScene({ scene: 'spawn' })
    s = stepScene({ scene: 'spawn' }, s, { type: 'advance', seconds: 2 })
    expect(s.crowd.cacti.length).toBeGreaterThan(40)
    expect(isSceneState(s)).toBe(true)

    // O pior caso do motor: o filtro de limpeza segura o vivo em 288.
    let cheio = initialScene({ scene: 'spawn' })
    cheio = stepScene({ scene: 'spawn' }, cheio, { type: 'advance', seconds: 30 })
    expect(isSceneState(cheio)).toBe(true)
  })

  test('⚠️ o motor nunca produz um resto NEGATIVO, em nenhuma cena nem fatia de tempo', () => {
    // O `1e-9` que faz 0,1 s dez vezes contar o cacto certo empurrava o contador para cima sem
    // ser descontado do resto: ele saía em −2,22e−16 e o próprio validador recusava o estado.
    // A criança assistia a demonstração inteira e ouvia que ela "mudou, abra de novo".
    // ⚠️ Com o relógio LIGADO, que é onde ele morde: em `spawn` o intervalo passa a ser o que a
    // criança escolheu, e fatias que somam exatamente um múltiplo dele caem no fio.
    for (const scene of SCENE_IDS)
      for (const relogio of [false, true])
        for (const fatia of [0.1, 0.2, 0.3, 0.6, 1 / 30, 0.05, 1]) {
          let s = initialScene({ scene })
          if (relogio)
            s = stepScene({ scene }, s, { type: 'connect', port: 'timer', enabled: true })
          const onde = `${scene}, relógio ${relogio}, fatias de ${fatia}`
          for (let i = 0; i < 40; i++) {
            s = stepScene({ scene }, s, { type: 'advance', seconds: fatia })
            expect(s.crowd.remainder, onde).toBeGreaterThanOrEqual(0)
          }
          expect(isSceneState(s), onde).toBe(true)
        }
  })

  test('recusa um intervalo que travaria o motor em laço infinito', () => {
    // ⚠️ `interval: 0` faz `Math.floor(x / 0) = Infinity` no laço de nascimento: a aba
    // congela até estourar a memória. Só a ação `interval` alimenta esse campo no jogo
    // (0,5 a 2), então este validador é a única barreira para um checkpoint adulterado.
    const bom = initialScene({ scene: 'spawn' })
    expect(isSceneState({ ...bom, crowd: { ...bom.crowd, interval: 0 } })).toBe(false)
    expect(isSceneState({ ...bom, crowd: { ...bom.crowd, interval: 9 } })).toBe(false)
    expect(isSceneState({ ...bom, crowd: { ...bom.crowd, remainder: 1e9 } })).toBe(false)
  })

  test('o áudio da instrução não aceita URL sem protocolo', () => {
    // ⚠️ `//host/audio.mp3` parece caminho local e não é: carrega de terceiro, pelo
    // protocolo da página. Era o que a regex original barrava com `[^/]`.
    const com = (instructionAudioUrl: string) =>
      isSceneActivity({ type: 'experimentation', scene: 'world', instructionAudioUrl })
    expect(com('https://cdn.sistemazero.com.br/a.mp3')).toBe(true)
    expect(com('/audio/a.mp3')).toBe(true)
    expect(com('//host-qualquer/a.mp3')).toBe(false)
    expect(com('/')).toBe(false)
    expect(com('http://inseguro/a.mp3')).toBe(false)
  })

  test('aceita o estado inicial de todas as cenas', () => {
    for (const scene of SCENE_IDS) expect(isSceneState(initialScene({ scene }))).toBe(true)
  })

  test('recusa grupo ausente, campo de tipo errado e array acima do teto', () => {
    const bom = initialScene({ scene: 'world' })
    expect(isSceneState({ ...bom, flight: undefined })).toBe(false)
    expect(isSceneState({ ...bom, match: { ...bom.match, screen: 'meio' } })).toBe(false)
    expect(isSceneState({ ...bom, contact: { distance: 'longe', width: 48 } })).toBe(false)
    expect(
      isSceneState({
        ...bom,
        evidence: { ...bom.evidence, discoveries: Array.from({ length: 41 }, (_, i) => `d${i}`) },
      }),
    ).toBe(false)
    // ⚠️ O validador antigo descobria os campos por reflexão e deixava passar array novo com
    // um limite genérico. Este exige que cada grupo tenha a forma declarada.
    expect(
      isSceneState({
        ...bom,
        speed: { ...bom.speed, samples: { ...bom.speed.samples, positions: 'nenhuma' } },
      }),
    ).toBe(false)
  })
})
