import { describe, expect, test } from 'bun:test'
import { SCENE_IDS } from './actions'
import {
  actorFigure,
  castText,
  DEFAULT_CAST,
  figureFromName,
  isSceneCast,
  SCENE_FIGURE_NAMES,
  SCENE_FIGURES,
  SCENE_ROLES,
  type SceneCast,
  type SceneFigure,
  sceneWorld,
} from './cast'
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
        // ⚠️ O PEDIDO também (lote 2 do Raio-X): é o que o "Conferir" e as bolinhas mostram antes
        // de a meta cair, e ele cita o personagem tanto quanto o rótulo.
        ...m.goals.map((g) => g.pedido),
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
        ...m.goals.map((g) => g.pedido),
        ...m.script.map((p) => p.caption),
      ])
        olha(`catálogo ${scene}`, t)
      const q = SCENE_QUESTIONS[scene]
      for (const x of [q.prediction, q.explain]) {
        olha(`pergunta ${scene}`, x.prompt)
        for (const c of x.choices) {
          olha(`pergunta ${scene}`, c.label)
          olha(`pergunta ${scene}`, c.shows)
        }
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

describe('a figura do elenco: o desenho segue o nome', () => {
  test('⚠️⚠️ os elencos REAIS dos cursos v6 ganham o desenho certo sem declarar `figure`', () => {
    // São os casos que os manifestos publicados usam hoje (Desafio e O Jogo do Meu Jeito). Nenhum
    // deles declara a figura: é o nome que a decide, e é isso que dispensa reimportar.
    expect(actorFigure({ hero: { name: 'nave', gender: 'f' } }, 'hero')).toBe('nave')
    expect(actorFigure({ hero: { name: 'tiro', gender: 'm' } }, 'hero')).toBe('tiro')
    expect(actorFigure({ hero: { name: 'pedra', gender: 'f', plural: 'pedras' } }, 'hero')).toBe(
      'pedra',
    )
    const layers: SceneCast = {
      hero: { name: 'pedra', gender: 'f' },
      scenery: { name: 'chama', gender: 'f' },
    }
    expect(actorFigure(layers, 'hero')).toBe('pedra')
    expect(actorFigure(layers, 'scenery')).toBe('chama')
    // Papel não declarado continua o de fábrica.
    expect(actorFigure(layers, 'obstacle')).toBe('cacto')
    const spawn: SceneCast = {
      hero: { name: 'nave', gender: 'f' },
      obstacle: { name: 'asteroide', gender: 'm' },
    }
    expect(actorFigure(spawn, 'obstacle')).toBe('asteroide')
  })

  test('sem elenco, é o Corre Dino', () => {
    expect(actorFigure(undefined, 'hero')).toBe('dino')
    expect(actorFigure(undefined, 'obstacle')).toBe('cacto')
    expect(actorFigure(undefined, 'scenery')).toBe('floresta')
    expect(actorFigure({}, 'hero')).toBe('dino')
    // O elenco de fábrica se desenha pelo nome, como qualquer outro.
    for (const papel of ['hero', 'obstacle', 'scenery'] as const)
      expect(actorFigure(DEFAULT_CAST, papel)).toBe(actorFigure(undefined, papel))
  })

  test('o nome é lido sem maiúscula, sem acento e no singular', () => {
    expect(figureFromName('NAVE')).toBe('nave')
    expect(figureFromName('  Naves ')).toBe('nave')
    expect(figureFromName('Asteróide')).toBe('asteroide')
    expect(figureFromName('asteroides')).toBe('asteroide')
    expect(figureFromName('Árvores')).toBe('floresta')
    expect(figureFromName('Tiros')).toBe('tiro')
    expect(figureFromName('lasers')).toBe('tiro')
    expect(figureFromName('Dinos')).toBe('dino')
  })

  test('os sinônimos curtos chegam à figura', () => {
    const casos: [string, SceneFigure][] = [
      ['dinossauro', 'dino'],
      ['foguete', 'nave'],
      ['meteoro', 'asteroide'],
      ['meteorito', 'asteroide'],
      ['rocha', 'pedra'],
      ['laser', 'tiro'],
      ['disparo', 'tiro'],
      ['fogo', 'chama'],
      ['árvore', 'floresta'],
      ['mata', 'floresta'],
      // Os que faltavam (review do lote 3): "espaçonave" é o jeito mais comum de dizer nave.
      ['Espaçonave', 'nave'],
      ['astronave', 'nave'],
      ['óvni', 'nave'],
      ['OVNI', 'nave'],
      ['disco voador', 'nave'],
      ['cometa', 'asteroide'],
      ['projétil', 'tiro'],
      ['míssil', 'tiro'],
      ['pedrinha', 'pedra'],
      ['pedregulho', 'pedra'],
      ['labareda', 'chama'],
    ]
    for (const [nome, figura] of casos)
      expect({ nome, f: figureFromName(nome) }).toEqual({ nome, f: figura })
  })

  test('⚠️ "bala" não é tiro: no Brasil bala é doce', () => {
    // Um jogo de pegar balas desenharia tiros no espaço (review do lote 3).
    expect(figureFromName('bala')).toBeNull()
    expect(figureFromName('balas')).toBeNull()
    expect(actorFigure({ obstacle: { name: 'bala', gender: 'f' } }, 'obstacle')).toBe('cacto')
  })

  test('a lista exportada é a MESMA que a leitura usa, sem nome repetido entre figuras', () => {
    // O editor do admin monta a nota a partir desta lista: nome que ela mostra e a leitura não
    // reconhece seria uma promessa falsa ao professor.
    const vistos = new Set<string>()
    for (const figura of SCENE_FIGURES)
      for (const nome of SCENE_FIGURE_NAMES[figura]) {
        expect({ nome, f: figureFromName(nome) }).toEqual({ nome, f: figura })
        const chave = nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
        expect({ chave, repetido: vistos.has(chave) }).toEqual({ chave, repetido: false })
        vistos.add(chave)
      }
  })

  test('nome composto: o núcleo na frente, e a palavra que diz alguma coisa', () => {
    expect(figureFromName('nave espacial')).toBe('nave')
    expect(figureFromName('pedra grande')).toBe('pedra')
    expect(figureFromName('bola de fogo')).toBe('chama')
    // ⚠️ Palavra inteira, não pedaço: "Tirolesa" não é tiro e "Navegador" não é nave.
    expect(figureFromName('Tirolesa')).toBeNull()
    expect(figureFromName('Navegador')).toBeNull()
    // ⚠️ E nome que é chave do protótipo de um objeto não devolve uma função no lugar da figura.
    expect(figureFromName('constructor')).toBeNull()
    expect(actorFigure({ hero: { name: 'toString', gender: 'm' } }, 'hero')).toBe('dino')
  })

  test('nome que não diz figura cai no padrão do PAPEL, nunca no Dino por acaso', () => {
    expect(actorFigure({ hero: { name: 'Zé', gender: 'm' } }, 'hero')).toBe('dino')
    expect(actorFigure({ obstacle: { name: 'nebulosa', gender: 'f' } }, 'obstacle')).toBe('cacto')
    expect(actorFigure({ scenery: { name: 'nebulosa', gender: 'f' } }, 'scenery')).toBe('floresta')
    // O plural declarado também serve, quando só ele diz a figura.
    expect(actorFigure({ hero: { name: 'Zé', gender: 'm', plural: 'foguetes' } }, 'hero')).toBe(
      'nave',
    )
  })

  test('⚠️ a figura DECLARADA vence o nome', () => {
    expect(actorFigure({ hero: { name: 'Zé', gender: 'm', figure: 'nave' } }, 'hero')).toBe('nave')
    expect(actorFigure({ hero: { name: 'nave', gender: 'f', figure: 'pedra' } }, 'hero')).toBe(
      'pedra',
    )
  })

  test('o mundo: espaço quando alguma figura DESENHADA é do espaço', () => {
    expect(sceneWorld(undefined, 'lives')).toBe('terra')
    expect(sceneWorld(DEFAULT_CAST, 'lives')).toBe('terra')
    expect(sceneWorld({ hero: { name: 'Zé', gender: 'm' } }, 'lives')).toBe('terra')
    for (const nome of ['nave', 'asteroide', 'tiro', 'pedra', 'chama'])
      expect({
        nome,
        mundo: sceneWorld({ obstacle: { name: nome, gender: 'm' } }, 'lives'),
      }).toEqual({
        nome,
        mundo: 'espaco',
      })
    // O cenário também leva: a pedra com a chama do Meu Jeito é o espaço.
    const meuJeito: SceneCast = {
      hero: { name: 'pedra', gender: 'f' },
      scenery: { name: 'chama', gender: 'f' },
    }
    expect(sceneWorld(meuJeito, 'layers')).toBe('espaco')
    // E a figura declarada decide, mesmo com um nome de terra.
    expect(sceneWorld({ hero: { name: 'Dino', gender: 'm', figure: 'nave' } }, 'lives')).toBe(
      'espaco',
    )
    expect(sceneWorld({ hero: { name: 'nave', gender: 'f', figure: 'dino' } }, 'lives')).toBe(
      'terra',
    )
  })

  test('⚠️⚠️ só contam os papéis que o palco da cena DESENHA (review do lote 3)', () => {
    // Uma chama de cenário numa cena que não desenha cenário levava o Dino e os cactos ao espaço.
    const soChama: SceneCast = { scenery: { name: 'chama', gender: 'f' } }
    expect(sceneWorld(soChama, 'spawn')).toBe('terra')
    expect(sceneWorld(soChama, 'layers')).toBe('espaco')
    // A nave de herói não muda o mundo de uma cena que só desenha o obstáculo.
    const soNave: SceneCast = { hero: { name: 'nave', gender: 'f' } }
    expect(sceneWorld(soNave, 'group-loop')).toBe('terra')
    expect(sceneWorld(soNave, 'lives')).toBe('espaco')
    // Cena abstrata não desenha ninguém: fica na terra com qualquer elenco.
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): a `tilemap` ganhou o personagem que cai até o chão.
    for (const scene of ['symmetry', 'axis-z', 'shading'] as const)
      expect({ scene, mundo: sceneWorld(NAVE, scene) }).toEqual({ scene, mundo: 'terra' })
  })

  test('⚠️ pedra e chama seguem o que o professor DECLAROU da terra', () => {
    // Com o Dino escrito no elenco, a pedra é a pedra do caminho dele, na grama.
    const dinoEPedra: SceneCast = {
      hero: { name: 'Dino', gender: 'm' },
      obstacle: { name: 'pedra', gender: 'f' },
    }
    expect(sceneWorld(dinoEPedra, 'lives')).toBe('terra')
    // ⚠️ Mas só o papel que a cena DESENHA: a `layers` não desenha o obstáculo, então um cacto
    // declarado ali não tira a pedra e a chama do espaço.
    const pedraChamaECacto: SceneCast = {
      hero: { name: 'pedra', gender: 'f' },
      obstacle: { name: 'cacto', gender: 'm' },
      scenery: { name: 'chama', gender: 'f' },
    }
    expect(sceneWorld(pedraChamaECacto, 'layers')).toBe('espaco')
    expect(sceneWorld(pedraChamaECacto, 'lives')).toBe('terra')
    // Nave, asteroide e tiro vencem a terra declarada: o espaço é deles.
    const dinoEAsteroide: SceneCast = {
      hero: { name: 'Dino', gender: 'm' },
      obstacle: { name: 'asteroide', gender: 'm' },
    }
    expect(sceneWorld(dinoEAsteroide, 'lives')).toBe('espaco')
    // O papel de fábrica (não declarado) não puxa para a terra.
    expect(sceneWorld({ obstacle: { name: 'pedra', gender: 'f' } }, 'lives')).toBe('espaco')
  })

  test('a tabela de papéis cobre as 45 cenas, na ordem canônica e sem repetir papel', () => {
    expect(Object.keys(SCENE_ROLES).sort()).toEqual([...SCENE_IDS].sort())
    const ordem = ['hero', 'obstacle', 'scenery']
    for (const scene of SCENE_IDS) {
      const papeis: readonly string[] = SCENE_ROLES[scene]
      expect({ scene, papeis: [...papeis] }).toEqual({
        scene,
        papeis: ordem.filter((p) => papeis.includes(p)),
      })
    }
    // O CONTEÚDO é conferido pelo desenho (a varredura do member-shell); aqui, a contagem.
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): a `entity-state` desenha TORRES, e não o elenco (G6);
    // `frames`, `onion-skin` e `sheet-vs-sprite` desenham a nave do ateliê (G4); a `diagonal` e a
    // `tilemap` ganharam o personagem (G5).
    expect(SCENE_IDS.filter((s) => SCENE_ROLES[s].length > 0).length).toBe(31)
  })

  test('um espaço no fim do nome não entra na frase', () => {
    // O editor do admin guarda o nome como digitado e só apara ao sair do campo.
    const digitando: SceneCast = { hero: { name: 'nave ', gender: 'f' } }
    expect(castText('Faça o Dino aparecer. Os Dinos correm.', digitando)).toBe(
      'Faça a nave aparecer. As naves correm.',
    )
  })

  test('o guard aceita a figura da lista, e só ela', () => {
    for (const figure of SCENE_FIGURES)
      expect(isSceneCast({ hero: { name: 'Zé', gender: 'm', figure } })).toBe(true)
    expect(isSceneCast({ hero: { name: 'Zé', gender: 'm', figure: 'dragao' } })).toBe(false)
    expect(isSceneCast({ hero: { name: 'Zé', gender: 'm', figure: 3 } })).toBe(false)
    expect(isSceneCast({ hero: { name: 'Zé', gender: 'm', figure: '' } })).toBe(false)
  })
})
