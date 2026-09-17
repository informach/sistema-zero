import { describe, expect, test } from 'bun:test'
import { SCENE_IDS, type SceneAction } from './actions'
import { castText } from './cast'
import { SCENE_MODELS } from './catalog'
import { openScene, stepScene } from './engine'
import { evaluateDemonstration, evaluateExperimentation, sceneGoals } from './evaluate'
import { isSceneActivity, isSceneScript } from './index'
import { drawLoopOnScreen, sceneReadout, sceneSituation } from './readout'
import { hydrateSceneState, initialScene, isSceneState, type SceneState } from './state'

/**
 * ⚠️ A equivalência com o motor anterior foi PROVADA no commit que criou este módulo
 * (`820b9a0a`): as 14 cenas rodaram o mesmo roteiro nos dois motores e as descobertas, as
 * observações, a legenda e os 44 campos do estado bateram. Os testes que faziam essa
 * comparação morreram junto com o motor antigo — mantê-lo vivo só para eles seria exatamente
 * o puxadinho que a reescrita existe para tirar. O que ficou testa a cena por si.
 */

describe('cena: o catálogo', () => {
  test('tem os 45 modelos, e cada um traz metas, três dicas e um roteiro', () => {
    // Eram 14 até 14/09/2026. Entraram as quatro que as duas primeiras aulas do Corre Dino
    // pediam e que só existiam como vídeo planejado (`coordinates`, `screen-reader`,
    // `stage-size` e `draw-loop`) e, no mesmo dia, as seis do lote 4 da proposta: as cinco de
    // desenho de O Jogo do Meu Jeito (`frames`, `onion-skin`, `symmetry`, `pixel-vector`,
    // `sheet-vs-sprite`) e a das vidas do Desafio (`lives`). Em 15/09/2026 vieram as onze do
    // núcleo do Iniciante 2D e as dez do motor, do 3D e do ateliê — os degraus da trilha que
    // não tinham cena nenhuma (ver `docs/aulas-interativas/proposta-experiencias-trilha.md`).
    expect(SCENE_IDS).toHaveLength(45)
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
    // ⚠️ Mudou de propósito (full review de experiência, M4): na `layers` a volta ao arranjo do jogo é a
    // META `back-in-front`, e não uma condição escondida. Com duas trocas, a faixa diz "2 de 3".
    let s = initialScene({ scene: 'layers' })
    s = stepScene({ scene: 'layers' }, s, { type: 'layer', front: true })
    s = stepScene({ scene: 'layers' }, s, { type: 'layer', front: false })
    expect(sceneGoals('layers', s).filter((g) => g.complete).length).toBe(2)
    expect(sceneGoals('layers', s).length).toBe(3)
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

  test('⚠️⚠️ a frase de sucesso veste o ELENCO, como as metas', () => {
    // Crua, uma turma de nave lia no cartão "É o mesmo Dino", com a pergunta e a faixa
    // falando da nave. É o texto que o servidor grava na tentativa e o relatório lê de volta.
    const nave = { hero: { name: 'nave', gender: 'f' as const } }
    let s = initialScene({ scene: 'world' })
    s = stepScene({ scene: 'world' }, s, { type: 'create' })
    s = stepScene({ scene: 'world' }, s, { type: 'connect', port: 'draw', enabled: true })
    const vestido = evaluateExperimentation('world', s, true, nave)
    expect(vestido.passed).toBe(true)
    expect(vestido.feedback).toBe(castText(SCENE_MODELS.world.success, nave))
    expect(vestido.feedback).toContain('a mesma nave')
    expect(vestido.feedback).not.toContain('Dino')
    // Sem elenco, o texto de fábrica continua como está.
    expect(evaluateExperimentation('world', s).feedback).toBe(SCENE_MODELS.world.success)
  })

  test('ação que não pertence à cena não muda nada', () => {
    const s = initialScene({ scene: 'world' })
    // `impulse` é de outra cena: no-op silencioso, sem contar como ação.
    const depois = stepScene({ scene: 'world' }, s, { type: 'impulse', force: 9 })
    expect(depois).toBe(s)
  })
})

describe('controls: o Enter começa a partida com ou sem o fio do toque', () => {
  const start = { scene: 'controls' } as const
  const rodar = (acoes: SceneAction[], de = openScene(start)) =>
    acoes.reduce((e, a) => stepScene(start, e, a), de)

  test('⚠️⚠️ quem segue a instrução (teclado primeiro, toque depois) fecha as três metas', () => {
    // "Comece pelo teclado e depois pelo toque": o Enter antes do fio começava a partida sem
    // registrar a meta, e o "Já descobri" respondia "Ainda falta: Partida iniciada por Enter".
    const enter = rodar([{ type: 'start', input: 'key' }])
    expect(enter.match.screen).toBe('playing')
    expect(enter.evidence.discoveries).toContain('start-key')
    const tudo = rodar(
      [
        { type: 'home' },
        { type: 'start', input: 'tap' },
        { type: 'connect', port: 'touch', enabled: true },
        { type: 'start', input: 'tap' },
      ],
      enter,
    )
    expect(evaluateExperimentation('controls', tudo).passed).toBe(true)
  })

  test('⚠️ sem brecha: a meta só cai com a tela SAINDO do Início pelo Enter', () => {
    // Jogando, o Enter não começa nada, e a meta não cai.
    const jogando = rodar([
      { type: 'connect', port: 'touch', enabled: true },
      { type: 'start', input: 'tap' },
    ])
    const deNovo = rodar([{ type: 'start', input: 'key' }], jogando)
    expect(deNovo.evidence.discoveries).not.toContain('start-key')
    // E um caso que já abre jogando pelo Enter não traz a descoberta junto.
    const caso = openScene({
      scene: 'controls',
      setup: { actions: [{ type: 'start', input: 'key' }] },
    })
    expect(caso.match.screen).toBe('playing')
    expect(caso.evidence.discoveries).toEqual([])
  })
})

describe('draw-loop: limpar sem desenhar deixa a tela VAZIA', () => {
  const start = { scene: 'draw-loop' } as const
  const rodar = (acoes: SceneAction[], de = openScene(start)) =>
    acoes.reduce((e, a) => stepScene(start, e, a), de)
  const dinosNaFaixa = (s: SceneState) =>
    sceneReadout('draw-loop', s).find((l) => l.label === 'Dinos na tela')?.value
  // ⚠️ Mudou de propósito (lote 4 do Raio-X): o relógio anda em QUADROS de 0,25 s nesta cena, e um
  // `advance` de 0,2 s não fecha quadro nenhum. "O relógio anda" aqui é UM quadro.
  const umQuadro: SceneAction = { type: 'advance', seconds: 1 / 4 }

  test('⚠️⚠️ o relógio anda com a limpeza e sem o desenho: 0 na tela, e a tela NÃO congela', () => {
    // A cena mostrava o Dino inteiro, dizia "a tela continua igual" e fechava "a tela congela",
    // justo no estado que a pergunta do modelo pergunta ("E se limpar sem desenhar?").
    const vazia = rodar([{ type: 'erase', on: true }, umQuadro])
    expect(vazia.render.empty).toBe(true)
    expect(drawLoopOnScreen(vazia)).toBe(0)
    expect(dinosNaFaixa(vazia)).toBe('0')
    // ⚠️ Mudou de propósito (consertos do lote 1): a frase diz "vazia" e o número fica na faixa,
    // sem a mesma coisa três vezes na tela.
    expect(vazia.caption).toBe('Limpou e não desenhou: a tela ficou vazia.')
    expect(vazia.caption).not.toContain('continua igual')
    expect(vazia.evidence.discoveries).not.toContain('frozen')
    expect(sceneSituation('draw-loop', { ...vazia, caption: '' })).toContain('vazia')
    expect(isSceneState(vazia)).toBe(true)

    // Desligar a limpeza não traz o Dino de volta: ninguém desenhou. E tela vazia parada também
    // não é "congelar", porque não há desenho nenhum para ver parado.
    const semLimpar = rodar([{ type: 'erase', on: false }, umQuadro], vazia)
    expect(drawLoopOnScreen(semLimpar)).toBe(0)
    expect(semLimpar.evidence.discoveries).not.toContain('frozen')

    // O primeiro quadro que desenha acaba com o vazio.
    const desenhou = rodar([{ type: 'loop', on: true }, umQuadro], semLimpar)
    expect(desenhou.render.empty).toBe(false)
    expect(drawLoopOnScreen(desenhou)).toBe(1)
  })

  test('com as duas chaves desligadas a tela congela, como sempre', () => {
    const congelada = rodar([umQuadro])
    expect(congelada.evidence.discoveries).toContain('frozen')
    expect(drawLoopOnScreen(congelada)).toBe(1)
    expect(dinosNaFaixa(congelada)).toBe('1')
  })

  test('⚠️ retrato guardado antes do campo `empty` continua valendo', () => {
    const { empty: _fora, ...antigo } = openScene(start).render
    const hidratado = hydrateSceneState({ ...openScene(start), render: antigo })
    expect(isSceneState(hidratado)).toBe(true)
    expect((hidratado as SceneState).render.empty).toBe(false)
  })
})

describe('hitbox: as pistas citam só o que existe na tela', () => {
  test('⚠️ nada de "marca do meio", "alças" ou "contato indicado"', () => {
    // A pista literal é a última saída de quem travou, e ela mandava procurar controles que a
    // bancada nunca teve. Os que existem: a Distância do cacto e a Largura da área do Dino.
    const textos = [SCENE_MODELS.hitbox.instruction, ...SCENE_MODELS.hitbox.hints]
    for (const t of textos) expect(t).not.toMatch(/marca do meio|alças?|contato indicado/i)
    // ⚠️ Mudou de propósito (lote 5): o controle virou "Tamanho da área do Dino", em porcentagem.
    expect(SCENE_MODELS.hitbox.hints[2]).toContain('Tamanho da área do Dino')
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

describe('consertos do review do lote 1 (Raio-X)', () => {
  test('⚠️⚠️ `spawn`: "criação em cada quadro" pede a parede à vista (1 s e 20 cactos)', () => {
    // Com um "Um passo" (0,2 s) nasciam 6 cactos empilhados num tufo que ninguém conta, e a meta
    // caía afirmando o que a criança não tinha visto (relatório g2).
    const start = { scene: 'spawn' } as const
    const passo = stepScene(start, openScene(start), { type: 'advance', seconds: 0.2 })
    expect(passo.crowd.born).toBeGreaterThan(1)
    expect(passo.evidence.discoveries).not.toContain('every-frame')
    const parede = stepScene(start, openScene(start), { type: 'advance', seconds: 1 })
    expect(parede.crowd.born).toBeGreaterThanOrEqual(20)
    expect(parede.evidence.discoveries).toContain('every-frame')
    // O intervalo continua caindo como antes.
    const comRelogio = [
      { type: 'connect' as const, port: 'timer' as const, enabled: true },
      { type: 'advance' as const, seconds: 2 },
    ].reduce((e, a) => stepScene(start, e, a), openScene(start))
    expect(comRelogio.evidence.discoveries).toContain('spaced')
  })

  test('⚠️ `cooldown`: a etapa da recarga termina ESPERANDO, com vírgula no decimal', () => {
    // Desde que a etapa dura o `advance` inteiro, o último quadro dela dizia "Pronto para atirar"
    // enquanto a fala era sobre esperar a vez.
    const start = { scene: 'cooldown' } as const
    let s = openScene(start)
    for (const passo of SCENE_MODELS.cooldown.script)
      for (const acao of passo.actions) s = stepScene(start, s, acao)
    // ⚠️ Mudou de propósito (lote 2 do Raio-X): abaixo de 2 segundos, "falta" no singular.
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): quanto falta da recarga é a SITUAÇÃO que diz. A
    // legenda de cada quadro apagava a frase do tiro 0,1 s depois, com os tiros voando.
    expect(s.caption).toBe('')
    expect(sceneSituation('cooldown', s)).toStartWith('Recarregando: falta 0,5 s.')
    expect(isSceneScript([...SCENE_MODELS.cooldown.script], 'cooldown')).toBe(true)
  })

  test('⚠️⚠️ `circle-collision`: com o quadro fixo a distância anda INTEIRA e para EXATA em 60', () => {
    // ⚠️ Mudou de propósito (lote 4 do Raio-X). A ponte do lote 1 guardava a distância crua e
    // arredondava a COMPARAÇÃO no milionésimo, porque cem fatias de 0,04 s paravam em 60,0000001. O
    // relógio de quadro fixo anda 2 inteiros por quadro: as mesmas cem fatias dão 60 exato, a
    // comparação sem arredondar dá a batida, e a faixa (que nunca arredondou) diz o mesmo.
    const start = { scene: 'circle-collision' } as const
    let s = openScene(start)
    for (let i = 0; i < 100; i++) s = stepScene(start, s, { type: 'advance', seconds: 0.04 })
    expect(s.circles.distance).toBe(60)
    expect(s.evidence.discoveries).toContain('touch')
    expect(sceneReadout('circle-collision', s).some((l) => l.value === 'bateu')).toBe(true)
    expect(isSceneState(s)).toBe(true)
  })
})
