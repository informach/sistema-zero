import { describe, expect, test } from 'bun:test'
import { SCENE_IDS } from './actions'
import { castText, DEFAULT_CAST, isSceneCast, type SceneCast } from './cast'
import { SCENE_MODELS } from './catalog'
import { openScene, stepScene } from './engine'
import { SCENE_QUESTIONS } from './questions'

const NAVE: SceneCast = {
  hero: { name: 'nave', gender: 'f' },
  obstacle: { name: 'asteroide', gender: 'm' },
}
const PEDRA: SceneCast = { obstacle: { name: 'pedra', gender: 'f' } }

describe('o elenco em português', () => {
  test('⚠️ o artigo acompanha o gênero do ator novo', () => {
    // É a linha que separa "Faça a nave aparecer" de "Faça o nave aparecer" — e a segunda é
    // como a criança percebe que ninguém escreveu aquilo para ela.
    expect(castText('Faça o Dino aparecer', NAVE)).toBe('Faça a nave aparecer')
    expect(castText('Aproxime o cacto do Dino', NAVE)).toBe('Aproxime o asteroide da nave')
  })

  test('as contrações são refeitas, não copiadas', () => {
    expect(castText('a área do Dino', NAVE)).toBe('a área da nave')
    expect(castText('Toque no Dino', NAVE)).toBe('Toque na nave')
    expect(castText('ligação da gravidade ao Dino', NAVE)).toBe('ligação da gravidade à nave')
    expect(castText('a batida do cacto', PEDRA)).toBe('a batida da pedra')
    expect(castText('a sombra dos cactos', PEDRA)).toBe('a sombra das pedras')
  })

  test('o plural segue o determinante, e o irregular pode ser declarado', () => {
    expect(castText('os cactos nascem', PEDRA)).toBe('as pedras nascem')
    expect(castText('Abra espaço entre os cactos', NAVE)).toBe('Abra espaço entre os asteroides')
    const canhao: SceneCast = { obstacle: { name: 'canhão', gender: 'm', plural: 'canhões' } }
    expect(castText('os cactos', canhao)).toBe('os canhões')
    expect(castText('o cacto', canhao)).toBe('o canhão')
  })

  test('⚠️ a capitalização é local: só quem começa a frase volta maiúsculo', () => {
    expect(castText('O Dino existe. O cacto some.', NAVE)).toBe('A nave existe. O asteroide some.')
    // E o meio da frase continua minúsculo, inclusive depois de um termo substituído.
    expect(castText('Veja o Dino e o cacto', NAVE)).toBe('Veja a nave e o asteroide')
  })

  test('papel não declarado fica como está', () => {
    // Um curso que só troca o obstáculo não precisa reescrever o personagem.
    expect(castText('O Dino pula o cacto', PEDRA)).toBe('O Dino pula a pedra')
    expect(castText('a floresta cobre o Dino', PEDRA)).toBe('a floresta cobre o Dino')
  })

  test('sem elenco, o texto volta idêntico', () => {
    for (const scene of SCENE_IDS) {
      const m = SCENE_MODELS[scene]
      expect(castText(m.instruction)).toBe(m.instruction)
      expect(castText(m.success, {})).toBe(m.success)
    }
  })

  test('⚠️ o elenco de fábrica não muda uma vírgula do catálogo', () => {
    // O texto das catorze cenas foi escrito CONTRA este elenco. Se vesti-lo com ele próprio
    // mudasse alguma coisa, a régua estaria reescrevendo conteúdo pedagógico por conta.
    for (const scene of SCENE_IDS) {
      const m = SCENE_MODELS[scene]
      for (const texto of [m.title, m.instruction, m.success, m.extra, ...m.hints])
        expect(castText(texto, DEFAULT_CAST)).toBe(texto)
      for (const g of m.goals) expect(castText(g.label, DEFAULT_CAST)).toBe(g.label)
      for (const p of m.script) expect(castText(p.caption, DEFAULT_CAST)).toBe(p.caption)
    }
  })

  test('⚠️⚠️ nenhuma concordância errada sobra no catálogo REAL depois de vestido', () => {
    // Varredura sobre o conteúdo de verdade, e não sobre exemplos escolhidos a dedo — foi ela
    // que pegou as ONZE ocorrências que a primeira versão desta régua produzia ("É o mesmo
    // nave", "Crie um pedra", "Este pedra guarda…", "E os cactos antigos" → "as pedras
    // antigos"). O teste anterior olhava só o ARTIGO colado ao nome, e em todas as onze havia
    // uma palavra no meio.
    const M = 'o|os|um|uns|este|estes|esse|esses|aquele|aqueles|mesmo|mesmos|outro|outros'
    const M2 = 'novo|novos|antigo|antigos|nenhum|todo|todos|criado|criados|guardado|guardados'
    const F = 'a|as|uma|umas|esta|estas|essa|essas|aquela|aquelas|mesma|mesmas|outra|outras'
    const F2 = 'nova|novas|antiga|antigas|nenhuma|toda|todas|criada|criadas|guardada|guardadas'
    const FEM_NOMES = 'nave|naves|pedra|pedras'
    const MASC_NOMES = 'asteroide|asteroides'
    // ⚠️ E o PREDICATIVO, separado do nome por um verbo de ligação: por aqui passaram "A nave
    // está escondido", "A nave foi criado" e "a nave está vivo" — os três achados do review do
    // lote A. O adjetivo longe do nome também concorda com ele.
    const LIG =
      'está|estão|estava|estavam|fica|ficam|ficou|ficaram|foi|foram|continua|continuam|parece|parecem|era|eram'
    const PM =
      'escondido|escondidos|criado|criados|guardado|guardados|coberto|cobertos|vivo|vivos|pronto|prontos|parado|parados|sozinho|sozinhos|preso|presos|salvo|salvos|ligado|ligados|desenhado|desenhados'
    const PF =
      'escondida|escondidas|criada|criadas|guardada|guardadas|coberta|cobertas|viva|vivas|pronta|prontas|parada|paradas|sozinha|sozinhas|presa|presas|salva|salvas|ligada|ligadas|desenhada|desenhadas'
    // Palavra masculina grudada num nome feminino, ou o contrário, dos DOIS lados do nome —
    // que é onde o português cobra a concordância.
    const errado = new RegExp(
      [
        `\\b(?:${FEM_NOMES})\\s+(?:${LIG})\\s+(?:${PM})\\b`,
        `\\b(?:${MASC_NOMES})\\s+(?:${LIG})\\s+(?:${PF})\\b`,
        `\\b(?:${M}|${M2})\\s+(?:${FEM_NOMES})\\b`,
        `\\b(?:${FEM_NOMES})\\s+(?:${M2})\\b`,
        `\\b(?:${F}|${F2})\\s+(?:${MASC_NOMES})\\b`,
        `\\b(?:${MASC_NOMES})\\s+(?:${F2})\\b`,
      ].join('|'),
      'i',
    )

    // ⚠️⚠️ A guarda que faz a varredura valer alguma coisa: a regex TEM que pegar as quatro
    // frases que a versão antiga produzia, e deixar passar as quatro certas. Sem esta prova o
    // laço abaixo aprovaria tudo em silêncio, que é o pior tipo de verde.
    for (const ruim of [
      'É o mesmo nave',
      'Crie um pedra',
      'Este pedra guarda',
      'as pedras antigos',
      'A nave está escondido atrás de quê?',
      'A nave foi criado e aparece na tela.',
      'enquanto a nave está vivo',
      'O asteroide está parada',
    ])
      expect(ruim).toMatch(errado)
    for (const bom of [
      'É a mesma nave',
      'Crie uma pedra',
      'Esta pedra guarda',
      'as pedras antigas',
      'A nave está escondida atrás de quê?',
      'A nave foi criada e aparece na tela.',
      'enquanto a nave está viva',
      'O asteroide está parado',
    ])
      expect(bom).not.toMatch(errado)

    const FEMININO: SceneCast = {
      hero: { name: 'nave', gender: 'f' },
      obstacle: { name: 'pedra', gender: 'f' },
      scenery: { name: 'céu', gender: 'm' },
    }
    let vistos = 0
    for (const scene of SCENE_IDS) {
      const m = SCENE_MODELS[scene]
      const textos = [
        m.title,
        m.instruction,
        m.manipulates,
        m.success,
        m.extra,
        ...m.hints,
        ...m.goals.map((g) => g.label),
        ...m.script.map((p) => p.caption),
      ]
      for (const texto of textos) {
        const vestido = castText(texto, FEMININO)
        if (errado.test(vestido)) throw new Error(`${scene}: "${texto}" virou "${vestido}"`)
        expect(vestido).not.toContain('Dino')
        expect(vestido).not.toContain('cacto')
        vistos++
      }
    }
    // Guarda que a varredura LEU alguma coisa: laço vazio aprova tudo.
    expect(vistos).toBeGreaterThan(150)
  })

  test('⚠️⚠️ as legendas que o MOTOR escreve também concordam', () => {
    // A varredura acima lê o catálogo. Metade do que a criança lê, porém, é escrita pelo motor
    // em tempo de execução (`state.caption` e o rótulo de cada descoberta) e passa pelo elenco
    // no `sceneSituation`. Foi lá que estava "O Dino foi criado", que um elenco feminino
    // transformava em "A nave foi criado". O roteiro de cada modelo é um caminho válido pelo
    // motor, então ele serve de passeio.
    const FEMININO: SceneCast = {
      hero: { name: 'nave', gender: 'f' },
      obstacle: { name: 'pedra', gender: 'f' },
      scenery: { name: 'chama', gender: 'f' },
    }
    const NOMES = 'nave|naves|pedra|pedras|chama|chamas'
    const LIGA = 'está|estão|fica|ficam|ficou|ficaram|foi|foram|continua|continuam|parece|parecem'
    const MASC =
      'escondido|criado|guardado|coberto|vivo|pronto|parado|sozinho|preso|salvo|ligado|desenhado'
    const DET = 'o|os|um|uns|este|estes|esse|esses|mesmo|mesmos|outro|outros|novo|novos'
    const errado = new RegExp(
      `\\b(?:${NOMES})\\s+(?:${LIGA})\\s+(?:${MASC})s?\\b|\\b(?:${DET})\\s+(?:${NOMES})\\b`,
      'i',
    )
    // A prova de que a régua morde, antes de usá-la.
    expect('A nave foi criado e aparece na tela.').toMatch(errado)
    expect('A nave foi criada e aparece na tela.').not.toMatch(errado)
    let lidas = 0
    for (const scene of SCENE_IDS) {
      let estado = openScene({ scene })
      for (const passo of SCENE_MODELS[scene].script)
        for (const acao of passo.actions) {
          estado = stepScene({ scene }, estado, acao)
          for (const frase of [estado.caption, ...estado.evidence.observations.map((o) => o.label)])
            if (frase) {
              const vestida = castText(frase, FEMININO)
              if (errado.test(vestida)) throw new Error(`${scene}: "${frase}" virou "${vestida}"`)
              lidas++
            }
        }
    }
    expect(lidas).toBeGreaterThan(80)
  })

  test('⚠️⚠️ texto que o elenco veste não usa PRONOME de terceira pessoa', () => {
    /**
     * A régua flexiona o que está COLADO ao nome ("a nave está escondida"), e nada mais. Um
     * pronoun duas orações adiante fica para trás, e o resultado é a frase meio trocada que a
     * criança lê como "ninguém escreveu isto para mim":
     *  - "Quando a nave perde uma vida, os pontos **dele** voltam a zero?" (pergunta de `lives`,
     *    e a Aula 4 do Desafio usa `lives` com elenco de nave HOJE);
     *  - "Ligue Gravidade à nave. Depois toque **nele** para saltar." (instrução do catálogo);
     *  - "A nave está em 700, e a tela acaba em 480. **Ele** sumiu." (legenda do motor).
     *
     * ⚠️ A régua é ABSOLUTA de propósito, e não "pronome que aponta para o personagem": decidir
     * o referente é coisa que nenhuma varredura faz, e quem escreve também erra. Ela só alcança
     * o texto que o elenco REALMENTE veste (`castText(t) !== t`), que é um punhado de frases —
     * repetir o nome ali custa nada e é sempre mais claro para quem tem 9 anos.
     */
    const PRONOME = /\b(ele|dele|nele|eles|deles|neles)\b|-l[oa]s?\b/i
    // A prova de que a régua morde, antes de usá-la.
    expect('Toque nele para saltar').toMatch(PRONOME)
    expect('Toque no Dino para saltar').not.toMatch(PRONOME)
    const FEMININO: SceneCast = {
      hero: { name: 'nave', gender: 'f' },
      obstacle: { name: 'pedra', gender: 'f' },
      scenery: { name: 'chama', gender: 'f' },
    }
    const achados: string[] = []
    const olha = (onde: string, texto: string | undefined) => {
      if (!texto) return
      if (castText(texto, FEMININO) !== texto && PRONOME.test(texto))
        achados.push(`${onde}: ${texto}`)
    }
    for (const scene of SCENE_IDS) {
      const m = SCENE_MODELS[scene]
      for (const t of [
        m.title,
        m.instruction,
        m.manipulates,
        m.success,
        m.extra,
        ...m.hints,
        ...m.goals.map((g) => g.label),
        ...m.script.map((p) => p.caption),
      ])
        olha(`catálogo ${scene}`, t)
      const q = SCENE_QUESTIONS[scene]
      for (const x of [q.prediction, q.explain]) {
        olha(`pergunta ${scene}`, x.prompt)
        for (const c of x.choices) olha(`pergunta ${scene}`, c.label)
      }
      olha(`pergunta ${scene}`, q.explain.explanation)
      // E o que o MOTOR escreve, pelo roteiro do próprio modelo.
      let estado = openScene({ scene })
      for (const passo of m.script)
        for (const acao of passo.actions) {
          estado = stepScene({ scene }, estado, acao)
          olha(`motor ${scene}`, estado.caption)
          for (const o of estado.evidence.observations) olha(`motor ${scene}`, o.label)
        }
    }
    expect(achados).toEqual([])
  })

  test('o guard recusa o que não é elenco', () => {
    expect(isSceneCast({ hero: { name: 'nave', gender: 'f' } })).toBe(true)
    expect(isSceneCast({})).toBe(true)
    expect(isSceneCast({ hero: { name: 'nave' } })).toBe(false)
    expect(isSceneCast({ hero: { name: '', gender: 'f' } })).toBe(false)
    expect(isSceneCast({ hero: { name: '<img src=x>', gender: 'f' } })).toBe(false)
    expect(isSceneCast({ hero: { name: 'x'.repeat(30), gender: 'm' } })).toBe(false)
    expect(isSceneCast(null)).toBe(false)
  })
})
