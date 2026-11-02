import { describe, expect, test } from 'bun:test'
import {
  CAMINHOS_LIVRES_MEU_JEITO_E,
  tempo,
} from '../../../tests/fixtures/caminhos-livres/meu-jeito-e'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { discoveryGuidance, discoverySpeechSteps, type ExperimentationActivity } from './index'
import { initialExperiment, stepExperiment } from './session'
import type { SceneStart } from './state'

/**
 * O Jogo do Meu Jeito em exploração livre (Construtor, 02/11/2026): `copy-vs-original`, `published-copy`,
 * `same-rules-new-skin`, `sheet-vs-sprite`, `two-clocks` e `unique-names`. A experiência trabalha só a
 * IDEIA e convida à investigação: antes do teste, o Zappy pergunta e diz o que observar; o resultado só
 * vem na fala de DEPOIS dele. ⚠️ Exceção decidida pela responsável: nas aulas 6 e 7 (`unique-names`,
 * `sheet-vs-sprite`, `two-clocks`) o conceito é o próprio bloco, e o nome dele pode aparecer.
 */
const CENAS = [
  'copy-vs-original',
  'published-copy',
  'same-rules-new-skin',
  'sheet-vs-sprite',
  'two-clocks',
  'unique-names',
] as const
type Cena = (typeof CENAS)[number]
/** As metas que os blocos do manifesto do Meu Jeito cobram (aulas 1, 6, 7 e 8). */
const METAS: Record<Cena, string[]> = {
  'copy-vs-original': ['exported', 'imported', 'independent'],
  'published-copy': ['first-publish', 'only-project', 'republish'],
  'same-rules-new-skin': ['skin-only', 'three-skins', 'rule-off'],
  'sheet-vs-sprite': ['squeezed', 'crop-half', 'crop-whole', 'size-apart'],
  'two-clocks': ['more-rocks', 'faster-spin', 'each-one'],
  'unique-names': ['missing', 'clash', 'own-name'],
}
/** A cena com o caso do manifesto (cenário e elenco) e a exploração livre ligada. */
const atividadeLivre = (scene: Cena): ExperimentationActivity => ({
  type: 'experimentation',
  scene,
  cenario: 'meu-jeito',
  ...(scene === 'two-clocks'
    ? {
        cast: {
          hero: { name: 'nave', gender: 'f' as const },
          obstacle: { name: 'asteroide', gender: 'm' as const },
        },
      }
    : {}),
  setup: { freeExploration: true, goals: METAS[scene] },
})
/**
 * Os gestos passam pela SESSÃO de verdade (`stepExperiment`), como no player e no servidor: na
 * exploração livre o `reset` dela é o "Recomeçar experiência", que apaga tudo.
 */
const jogar = (scene: Cena, actions: SceneAction[]) => {
  const activity = atividadeLivre(scene)
  const start: SceneStart = { scene, setup: activity.setup }
  return actions.reduce((s, a) => stepExperiment(start, s, a).session, initialExperiment(start))
    .state
}
const fala = (scene: Cena, actions: SceneAction[]) =>
  discoveryGuidance(atividadeLivre(scene), jogar(scene, actions))?.id
const viu = (scene: Cena, actions: SceneAction[]) => jogar(scene, actions).evidence.discoveries

const falas = new Map(
  CENAS.flatMap((cena) => discoverySpeechSteps(cena).map(({ id, text }) => [id, text] as const)),
)

describe('Meu Jeito (E): o Zappy fala só da ideia', () => {
  test.each(CENAS)('%s tem falas próprias, com a chave da cena', (cena) => {
    const ids = discoverySpeechSteps(cena).map((s) => s.id)
    expect(ids.length).toBeGreaterThanOrEqual(4)
    for (const id of ids) expect(id.startsWith(`${cena}-`)).toBe(true)
    expect(ids).toContain(`${cena}-complete`)
  })

  const SO_A_IDEIA = /\bregra|\bbloco|\bcódigo|\bcomando|\bsprite|\bvariável/i
  test.each(
    [...falas.keys()].filter((id) =>
      ['copy-vs-original-', 'published-copy-', 'same-rules-new-skin-'].some((p) =>
        id.startsWith(p),
      ),
    ),
  )('%s não fala de regra, bloco nem código', (id) => {
    expect(falas.get(id)).not.toMatch(SO_A_IDEIA)
  })

  // A exceção das aulas 6 e 7: o bloco pode aparecer, a regra de programação e o código não.
  test.each(
    [...falas.keys()].filter((id) =>
      ['sheet-vs-sprite-', 'two-clocks-', 'unique-names-'].some((p) => id.startsWith(p)),
    ),
  )('%s (aulas 6 e 7) não fala de regra nem de código', (id) => {
    expect(falas.get(id)).not.toMatch(/\bregra|\bcódigo|\bcomando/i)
  })

  test('em two-clocks, "quadro" é só o do jogo: o desenho da animação é "desenho"', () => {
    for (const [id, texto] of falas)
      if (id.startsWith('two-clocks-')) {
        expect(texto).not.toMatch(/quadro \d|quadros? por segundo|quadro 0/i)
        expect(texto).toMatch(/desenho/)
      }
  })

  test('em same-rules-new-skin, a ideia é dita com palavras do jogo', () => {
    expect(falas.get('same-rules-new-skin-skins')).toContain(
      'o que o jogo faz quando você aperta a tecla continua o mesmo; só a aparência muda',
    )
  })

  /** Cada fala de ANTES de um teste não conta o resultado dele. */
  const ANTES: [string, RegExp][] = [
    ['copy-vs-original-start', /continuou|cópia|ficou na aula/i],
    ['copy-vs-original-exported', /apareceu|o mesmo jogo|projeto seu/i],
    ['copy-vs-original-imported', /ficou como estava|não mud|cada um segue/i],
    ['published-copy-start', /mesma nave|cópia/i],
    ['published-copy-first', /só (a tela da esquerda|o seu projeto)|ficou como estava|não mud/i],
    ['published-copy-only', /publicação nova|continua lá|anterior continua/i],
    ['same-rules-new-skin-start', /continuou|mesmas coisas|só a aparência mudou|apag/i],
    ['same-rules-new-skin-after-off', /continuou|mesmas coisas|só a aparência mudou/i],
    ['same-rules-new-skin-road', /três histórias|nenhuma apagou|nada apagou/i],
    ['same-rules-new-skin-skins', /não soltou|não sai|mudou de verdade/i],
    ['same-rules-new-skin-off', /não soltou|não sai|mudou/i],
    ['unique-names-start', /aviso|parou|para de mudar|acend/i],
    ['unique-names-missing', /nome diferente|já existe|pede/i],
    ['unique-names-clash', /sem aviso|sem briga|volt(ou|a) a andar/i],
    ['unique-names-own-first', /acend|parou|para\b/i],
    ['sheet-vs-sprite-start-64', /espremid/i],
    ['sheet-vs-sprite-start-16', /metade|meia/i],
    ['sheet-vs-sprite-start-32', /nave inteira/i],
    ['sheet-vs-sprite-64-16', /metade|meia/i],
    ['sheet-vs-sprite-64-32', /nave inteira/i],
    ['sheet-vs-sprite-16-32', /nave inteira/i],
    ['sheet-vs-sprite-16-64', /espremid/i],
    ['sheet-vs-sprite-32-64', /espremid/i],
    ['sheet-vs-sprite-32-16', /metade|meia/i],
    ['sheet-vs-sprite-size', /folha continua|não muda a folha|cresce|encolhe/i],
    ['two-clocks-start', /desenho 1|começa na hora/i],
    ['two-clocks-each-more', /nasceu mais|mesmo ritmo/i],
    ['two-clocks-each-faster', /giraram mais rápido|mesma hora/i],
    ['two-clocks-more-faster', /giraram mais rápido/i],
    ['two-clocks-faster-more', /nasceu mais/i],
    ['two-clocks-more-each', /nasceu mostrando|começa na hora/i],
    ['two-clocks-faster-each', /nasceu mostrando|começa na hora/i],
  ]
  test.each(ANTES)('%s não conta o resultado do próximo teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    // A explicação do que JÁ foi testado vem antes do pedido: só o pedido é conferido.
    const texto = falas.get(id) ?? ''
    const pedido = /^sheet-vs-sprite-\d+-|^two-clocks-(each|more|faster)-/.test(id)
      ? texto.slice(texto.indexOf('. ') + 2)
      : texto
    expect(pedido).not.toMatch(resultado)
  })
})

describe('Meu Jeito (E): o caminho livre completa as metas', () => {
  test.each(CENAS)('%s', (cena) => {
    const caminho = CAMINHOS_LIVRES_MEU_JEITO_E[cena] ?? []
    const s = jogar(cena, caminho)
    for (const meta of METAS[cena]) expect(s.evidence.discoveries).toContain(meta)
    expect(fala(cena, caminho)).toBe(`${cena}-complete`)
    // Nenhuma fatia de tempo passa de 1 s (o teto do comando da criança).
    for (const a of caminho) if (a.type === 'advance') expect(a.seconds).toBeLessThanOrEqual(1)
  })
})

describe('Meu Jeito (E): a fala acompanha a ordem da criança', () => {
  test('copy-vs-original: a fala segue baixar, importar e pintar', () => {
    expect(fala('copy-vs-original', [])).toBe('copy-vs-original-start')
    expect(fala('copy-vs-original', [{ type: 'export-file' }])).toBe('copy-vs-original-exported')
    expect(fala('copy-vs-original', [{ type: 'export-file' }, { type: 'import-file' }])).toBe(
      'copy-vs-original-imported',
    )
  })
  test('copy-vs-original: pintar a aula depois de baixar e importar em seguida mostra a diferença', () => {
    const caminho: SceneAction[] = [
      { type: 'export-file' },
      { type: 'recolor', side: 'lesson', color: 'verde' },
      { type: 'import-file' },
    ]
    expect(viu('copy-vs-original', caminho)).toEqual(['exported', 'imported', 'independent'])
    expect(fala('copy-vs-original', caminho)).toBe('copy-vs-original-complete')
  })
  test('copy-vs-original: pintar antes de importar não conta, e importar sem arquivo não faz nada', () => {
    expect(viu('copy-vs-original', [{ type: 'recolor', side: 'lesson', color: 'rosa' }])).toEqual(
      [],
    )
    expect(viu('copy-vs-original', [{ type: 'import-file' }])).toEqual([])
  })

  test('published-copy: trocar a cor antes de publicar não é a comparação', () => {
    const antes: SceneAction[] = [
      { type: 'recolor', side: 'project', color: 'verde' },
      { type: 'publish' },
    ]
    expect(viu('published-copy', antes)).toEqual(['first-publish'])
    expect(fala('published-copy', antes)).toBe('published-copy-first')
  })
  test('published-copy: publicar de novo com a mesma cor não é a publicação nova', () => {
    const mesma: SceneAction[] = [{ type: 'publish' }, { type: 'publish' }]
    expect(viu('published-copy', mesma)).toEqual(['first-publish'])
    const voltou: SceneAction[] = [
      { type: 'publish' },
      { type: 'recolor', side: 'project', color: 'rosa' },
      { type: 'recolor', side: 'project', color: 'azul' },
      { type: 'publish' },
    ]
    expect(viu('published-copy', voltou)).toEqual(['first-publish', 'only-project'])
    expect(fala('published-copy', voltou)).toBe('published-copy-only')
  })

  test('same-rules-new-skin: quem desliga o tiro primeiro é acompanhado nesse teste', () => {
    const desligou: SceneAction[] = [{ type: 'rule-toggle', enabled: false }]
    expect(fala('same-rules-new-skin', desligou)).toBe('same-rules-new-skin-off')
    const testou = [...desligou, { type: 'play-shoot' } as SceneAction, ...tempo(1.2)]
    expect(viu('same-rules-new-skin', testou)).toEqual(['rule-off'])
    expect(fala('same-rules-new-skin', testou)).toBe('same-rules-new-skin-back')
    const ligou = [...testou, { type: 'rule-toggle', enabled: true } as SceneAction]
    expect(fala('same-rules-new-skin', ligou)).toBe('same-rules-new-skin-after-off')
    const tudo = [
      ...ligou,
      { type: 'skin', theme: 'sea' } as SceneAction,
      { type: 'skin', theme: 'road' } as SceneAction,
    ]
    expect(fala('same-rules-new-skin', tudo)).toBe('same-rules-new-skin-complete')
  })
  test('same-rules-new-skin: o tiro desligado sem apertar a tecla não é o teste', () => {
    const parado: SceneAction[] = [{ type: 'rule-toggle', enabled: false }, ...tempo(2)]
    expect(viu('same-rules-new-skin', parado)).toEqual([])
  })
  test('same-rules-new-skin: trocar a história com o tiro desligado não conta como "só a aparência"', () => {
    const caminho: SceneAction[] = [
      { type: 'rule-toggle', enabled: false },
      { type: 'skin', theme: 'road' },
      { type: 'skin', theme: 'sea' },
    ]
    expect(viu('same-rules-new-skin', caminho)).toEqual([])
  })
  test('same-rules-new-skin: o mar antes do carrinho fecha as duas no carrinho', () => {
    const caminho: SceneAction[] = [
      { type: 'skin', theme: 'sea' },
      { type: 'skin', theme: 'road' },
    ]
    expect(viu('same-rules-new-skin', caminho)).toEqual(['skin-only', 'three-skins'])
    expect(fala('same-rules-new-skin', caminho)).toBe('same-rules-new-skin-skins')
  })

  test('unique-names: o nome repetido primeiro, depois o nome próprio e o bloco tirado', () => {
    const repetido: SceneAction[] = [{ type: 'name-field', name: 'nave' }]
    expect(fala('unique-names', repetido)).toBe('unique-names-clash')
    const proprio = [...repetido, { type: 'name-field', name: 'folha-nave' } as SceneAction]
    expect(fala('unique-names', proprio)).toBe('unique-names-own-first')
    const tirado = [...proprio, { type: 'toggle-block', present: false } as SceneAction]
    expect(fala('unique-names', tirado)).toBe('unique-names-complete')
  })
  test('unique-names: o nome repetido com o bloco de cima fora não é o teste da briga', () => {
    const caminho: SceneAction[] = [
      { type: 'toggle-block', present: false },
      { type: 'name-field', name: 'nave' },
      { type: 'toggle-block', present: true },
    ]
    expect(viu('unique-names', caminho)).toEqual(['missing'])
    expect(fala('unique-names', caminho)).toBe('unique-names-missing')
  })

  test('sheet-vs-sprite: a fala explica a largura de agora e pede a que falta', () => {
    expect(fala('sheet-vs-sprite', [])).toBe('sheet-vs-sprite-start-64')
    expect(fala('sheet-vs-sprite', [{ type: 'crop', width: 32 }])).toBe('sheet-vs-sprite-32-64')
    expect(
      fala('sheet-vs-sprite', [
        { type: 'crop', width: 32 },
        { type: 'crop', width: 64 },
      ]),
    ).toBe('sheet-vs-sprite-64-16')
    const tres: SceneAction[] = [
      { type: 'crop', width: 32 },
      { type: 'crop', width: 64 },
      { type: 'crop', width: 16 },
    ]
    expect(fala('sheet-vs-sprite', tres)).toBe('sheet-vs-sprite-size')
    // "Recomeçar experiência" apaga as descobertas: a fala volta ao começo.
    expect(fala('sheet-vs-sprite', [{ type: 'crop', width: 64 }, { type: 'reset' }])).toBe(
      'sheet-vs-sprite-start-64',
    )
  })
  test('sheet-vs-sprite: o tamanho logo depois da nave inteira, e os recortes depois', () => {
    const caminho: SceneAction[] = [
      { type: 'crop', width: 32 },
      { type: 'sprite', size: 24 },
      { type: 'crop', width: 16 },
      { type: 'crop', width: 64 },
    ]
    expect(viu('sheet-vs-sprite', caminho).sort()).toEqual(METAS['sheet-vs-sprite'].sort())
    expect(fala('sheet-vs-sprite', caminho)).toBe('sheet-vs-sprite-complete')
  })
  test('sheet-vs-sprite: o tamanho antes da nave inteira, ou parecido com o de fábrica, não conta', () => {
    expect(viu('sheet-vs-sprite', [{ type: 'sprite', size: 88 }])).toEqual([])
    expect(
      viu('sheet-vs-sprite', [
        { type: 'crop', width: 32 },
        { type: 'sprite', size: 62 },
      ]),
    ).toEqual(['crop-whole'])
  })

  test('two-clocks: o giro mais rápido primeiro, depois cada pedra e o nascer', () => {
    const giro: SceneAction[] = [{ type: 'rate', perSecond: 16 }, ...tempo(3)]
    expect(viu('two-clocks', giro)).toEqual(['faster-spin'])
    expect(fala('two-clocks', giro)).toBe('two-clocks-faster-each')
    const cada = [...giro, ...tempo(1.2)]
    expect(viu('two-clocks', cada)).toEqual(['faster-spin', 'each-one'])
    expect(fala('two-clocks', cada)).toBe('two-clocks-each-more')
  })
  test('two-clocks: mudar o relógio no meio do tempo não vale sem voltar ao começo', () => {
    const meio: SceneAction[] = [...tempo(1), { type: 'birth-every', frames: 20 }, ...tempo(3)]
    expect(viu('two-clocks', meio)).not.toContain('more-rocks')
    expect(viu('two-clocks', [...meio, { type: 'restart-case' }, ...tempo(2.2)])).toContain(
      'more-rocks',
    )
  })
})

describe('two-clocks: "Voltar ao começo" guarda os relógios e as descobertas (02/11/2026)', () => {
  const ateCadaUma: SceneAction[] = tempo(4.2)
  test('na exploração livre, `restart-case` zera o tempo e guarda relógios e descobertas', () => {
    const s = jogar('two-clocks', [
      ...ateCadaUma,
      { type: 'birth-every', frames: 20 },
      { type: 'rate', perSecond: 2 },
      { type: 'restart-case' },
    ])
    expect(s.evidence.discoveries).toEqual(['each-one'])
    expect(s.twoClocks).toMatchObject({
      birthEvery: 20,
      animationRate: 2,
      birthAtStart: 20,
      rateAtStart: 2,
      frames: 0,
      born: 0,
      rocks: [],
    })
  })
  test('o `reset` da sessão livre é o "Recomeçar experiência": apaga descobertas e relógios', () => {
    const s = jogar('two-clocks', [
      ...ateCadaUma,
      { type: 'birth-every', frames: 20 },
      { type: 'reset' },
    ])
    expect(s.evidence.discoveries).toEqual([])
    expect(s.twoClocks.birthEvery).toBe(40)
  })
  test('as três descobertas fecham juntas com "Voltar ao começo" entre os casos', () => {
    const s = jogar('two-clocks', CAMINHOS_LIVRES_MEU_JEITO_E['two-clocks'] ?? [])
    expect([...s.evidence.discoveries].sort()).toEqual(['each-one', 'faster-spin', 'more-rocks'])
  })
  test('fora da exploração livre, `restart-case` não faz nada', () => {
    const start: SceneStart = { scene: 'two-clocks' }
    const antes = tempo(1.4).reduce((s, a) => stepScene(start, s, a), openScene(start))
    expect(stepScene(start, antes, { type: 'restart-case' })).toBe(antes)
  })
  test('a legenda do nascimento diz "desenho 1" na exploração livre e "quadro 0" fora dela', () => {
    const livre = jogar('two-clocks', tempo(1.4))
    expect(livre.caption).toContain('desenho 1')
    expect(livre.caption).not.toMatch(/quadro \d/)
    const start: SceneStart = { scene: 'two-clocks' }
    const guiada = tempo(1.4).reduce((s, a) => stepScene(start, s, a), openScene(start))
    expect(guiada.caption).toContain('quadro 0')
  })
})

test('same-rules-new-skin: as falas dizem "clique em Tecla de tiro", nunca "aperte"', () => {
  for (const [id, texto] of falas)
    if (id.startsWith('same-rules-new-skin-')) expect(texto).not.toMatch(/\baperte\b/i)
  expect(falas.get('same-rules-new-skin-off')).toContain('Clique em Tecla de tiro')
})
