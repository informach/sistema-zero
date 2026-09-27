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
  sceneCenario,
} from './cast'
import { SCENE_MODELS } from './catalog'
import type { SceneCenarioId } from './cenario'

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

  test('o cenário: o jogo que a cena retrata sai das figuras DESENHADAS', () => {
    expect(sceneCenario(undefined, 'lives')).toBe('corre-dino')
    expect(sceneCenario(DEFAULT_CAST, 'lives')).toBe('corre-dino')
    expect(sceneCenario({ hero: { name: 'Zé', gender: 'm' } }, 'lives')).toBe('corre-dino')
    // ⚠️ A pedra e a chama vão para o jogo DELAS, não para o do Desafio: as duas famílias moram
    // no espaço (as duas sem chão), mas são cursos diferentes e cada um tem o seu elenco.
    const esperado: Record<string, SceneCenarioId> = {
      nave: 'nave',
      asteroide: 'nave',
      tiro: 'nave',
      pedra: 'meu-jeito',
      chama: 'meu-jeito',
    }
    for (const [nome, cenario] of Object.entries(esperado))
      expect({
        nome,
        mundo: sceneCenario({ obstacle: { name: nome, gender: 'm' } }, 'lives'),
      }).toEqual({ nome, mundo: cenario })
    // O cenário também leva: a pedra com a chama é O Jogo do Meu Jeito.
    const meuJeito: SceneCast = {
      hero: { name: 'pedra', gender: 'f' },
      scenery: { name: 'chama', gender: 'f' },
    }
    expect(sceneCenario(meuJeito, 'layers')).toBe('meu-jeito')
    // E a figura declarada decide, mesmo com um nome do Corre Dino.
    expect(sceneCenario({ hero: { name: 'Dino', gender: 'm', figure: 'nave' } }, 'lives')).toBe(
      'nave',
    )
    expect(sceneCenario({ hero: { name: 'nave', gender: 'f', figure: 'dino' } }, 'lives')).toBe(
      'corre-dino',
    )
  })

  test('⭐ o cenário DECLARADO vence a derivação inteira', () => {
    // É o campo que o professor escreve no manifesto. Sem ele vale a derivação, que é o que
    // mantém de pé os manifestos já publicados.
    const soDino: SceneCast = { hero: { name: 'Dino', gender: 'm' } }
    expect(sceneCenario(soDino, 'lives')).toBe('corre-dino')
    expect(sceneCenario(soDino, 'lives', 'gorilas')).toBe('gorilas')
    expect(sceneCenario(undefined, 'symmetry', 'nave')).toBe('nave')
  })

  test('⚠️⚠️ só contam os papéis que o palco da cena DESENHA (review do lote 3)', () => {
    // Uma chama de cenário numa cena que não desenha cenário levava o Dino e os cactos ao espaço.
    const soChama: SceneCast = { scenery: { name: 'chama', gender: 'f' } }
    expect(sceneCenario(soChama, 'spawn')).toBe('corre-dino')
    expect(sceneCenario(soChama, 'layers')).toBe('meu-jeito')
    // A nave de herói não muda o mundo de uma cena que só desenha o obstáculo.
    const soNave: SceneCast = { hero: { name: 'nave', gender: 'f' } }
    expect(sceneCenario(soNave, 'group-loop')).toBe('corre-dino')
    expect(sceneCenario(soNave, 'lives')).toBe('nave')
    // Cena abstrata não desenha ninguém: fica na terra com qualquer elenco.
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): a `tilemap` ganhou o personagem que cai até o chão.
    for (const scene of ['symmetry', 'axis-z', 'shading'] as const)
      expect({ scene, mundo: sceneCenario(NAVE, scene) }).toEqual({ scene, mundo: 'corre-dino' })
  })

  test('⚠️ pedra e chama seguem o que o professor DECLAROU do Corre Dino', () => {
    // Com o Dino escrito no elenco, a pedra é a pedra do caminho dele, na grama.
    const dinoEPedra: SceneCast = {
      hero: { name: 'Dino', gender: 'm' },
      obstacle: { name: 'pedra', gender: 'f' },
    }
    expect(sceneCenario(dinoEPedra, 'lives')).toBe('corre-dino')
    // ⚠️ Mas só o papel que a cena DESENHA: a `layers` não desenha o obstáculo, então um cacto
    // declarado ali não tira a pedra e a chama do espaço.
    const pedraChamaECacto: SceneCast = {
      hero: { name: 'pedra', gender: 'f' },
      obstacle: { name: 'cacto', gender: 'm' },
      scenery: { name: 'chama', gender: 'f' },
    }
    expect(sceneCenario(pedraChamaECacto, 'layers')).toBe('meu-jeito')
    expect(sceneCenario(pedraChamaECacto, 'lives')).toBe('corre-dino')
    // Nave, asteroide e tiro vencem o Corre Dino declarado: o Desafio é deles.
    const dinoEAsteroide: SceneCast = {
      hero: { name: 'Dino', gender: 'm' },
      obstacle: { name: 'asteroide', gender: 'm' },
    }
    expect(sceneCenario(dinoEAsteroide, 'lives')).toBe('nave')
    // O papel de fábrica (não declarado) não puxa para o Corre Dino.
    expect(sceneCenario({ obstacle: { name: 'pedra', gender: 'f' } }, 'lives')).toBe('meu-jeito')
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
    expect(SCENE_IDS.filter((s) => SCENE_ROLES[s].length > 0).length).toBe(39)
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
