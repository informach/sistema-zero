import { describe, expect, test } from 'bun:test'
import {
  discoveryGuidance,
  type ExperimentationActivity,
  initialExperiment,
  type SceneAction,
  type SceneStart,
  type SceneState,
  stepExperiment,
} from '@sistemazero/core/learning/scene'
import type { ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import {
  LivreCopyVsOriginal,
  METAS_DA_COPIA,
  proximoGestoDaCopia,
} from '../src/components/scene-livre/copy-vs-original'
import {
  LivrePublishedCopy,
  METAS_DA_PUBLICACAO,
  proximoGestoDaPublicacao,
} from '../src/components/scene-livre/published-copy'
import {
  LivreSameRulesNewSkin,
  METAS_DO_TEMA,
  proximoGestoDoTema,
} from '../src/components/scene-livre/same-rules-new-skin'
import {
  LivreSheetVsSprite,
  METAS_DA_FOLHA,
  proximoGestoDaFolha,
  TAMANHOS_DA_NAVE,
} from '../src/components/scene-livre/sheet-vs-sprite'
import {
  LivreTwoClocks,
  METAS_DOS_RELOGIOS,
  proximoGestoDosRelogios,
} from '../src/components/scene-livre/two-clocks'
import {
  LivreUniqueNames,
  METAS_DOS_NOMES,
  proximoGestoDosNomes,
} from '../src/components/scene-livre/unique-names'

/**
 * O Jogo do Meu Jeito em exploração livre (02/11/2026): `copy-vs-original`, `published-copy`,
 * `same-rules-new-skin`, `sheet-vs-sprite`, `two-clocks` e `unique-names`. Só a IDEIA na tela (com a
 * exceção das aulas 6 e 7, em que o bloco é o conceito); o que cada caso faz só aparece depois do teste
 * daquele caso, e o botão em destaque é o gesto que a fala do Zappy pede.
 */
type Cena =
  | 'copy-vs-original'
  | 'published-copy'
  | 'same-rules-new-skin'
  | 'sheet-vs-sprite'
  | 'two-clocks'
  | 'unique-names'
const METAS: Record<Cena, readonly string[]> = {
  'copy-vs-original': METAS_DA_COPIA,
  'published-copy': METAS_DA_PUBLICACAO,
  'same-rules-new-skin': METAS_DO_TEMA,
  'sheet-vs-sprite': METAS_DA_FOLHA,
  'two-clocks': METAS_DOS_RELOGIOS,
  'unique-names': METAS_DOS_NOMES,
}
const TELAS: Record<Cena, ComponentType> = {
  'copy-vs-original': LivreCopyVsOriginal,
  'published-copy': LivrePublishedCopy,
  'same-rules-new-skin': LivreSameRulesNewSkin,
  'sheet-vs-sprite': LivreSheetVsSprite,
  'two-clocks': LivreTwoClocks,
  'unique-names': LivreUniqueNames,
}
const caso = (scene: Cena) => {
  const activity: ExperimentationActivity = {
    type: 'experimentation',
    scene,
    cenario: 'meu-jeito',
    setup: { freeExploration: true, goals: [...METAS[scene]] },
  }
  const start: SceneStart = { scene, setup: activity.setup }
  // Os gestos passam pela SESSÃO de verdade (`stepExperiment`), como no player: na exploração livre o
  // `reset` dela é o "Recomeçar experiência", que apaga tudo. `passo` continua da última sessão.
  let sessao = initialExperiment(start)
  const play = (actions: SceneAction[]) => {
    sessao = actions.reduce((x, a) => stepExperiment(start, x, a).session, initialExperiment(start))
    return sessao.state
  }
  const passo = (_atual: SceneState, a: SceneAction) => {
    sessao = stepExperiment(start, sessao, a).session
    return sessao.state
  }
  const fala = (s: SceneState) => discoveryGuidance(activity, s)?.id
  const tela = (s: SceneState, running = false) => {
    const Tela = TELAS[scene]
    return renderToStaticMarkup(
      <DiscoveryContext.Provider
        value={{
          activity,
          state: s,
          dispatch: () => {},
          running,
          setRunning: () => {},
          tick: () => {},
          instruction: 'Fala do Zappy',
          dialogue: (text) => <p>{text}</p>,
          tools: null,
        }}
      >
        <Tela />
      </DiscoveryContext.Provider>,
    )
  }
  return { activity, play, passo, fala, tela }
}
const texto = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
/** O nome de cada botão em destaque (o `aria-label`, ou o texto). */
const destaques = (html: string) =>
  [...html.matchAll(/<button([^>]*data-tom="gesto"[^>]*)>([\s\S]*?)<\/button>/g)].map(
    (m) => /aria-label="([^"]*)"/.exec(m[1] ?? '')?.[1] ?? texto(m[2] ?? '').trim(),
  )
const SO_A_IDEIA = /\bregra|\bbloco|\bcódigo|\bcomando|\bsprite/i
const AULAS_6_E_7 = /\bregra|\bcódigo|\bcomando/i

/**
 * Segue o destaque, gesto a gesto, até a fala de conclusão: em cada passo, o botão aceso é o do gesto,
 * e o gesto leva às metas. `rodando` simula o relógio do player (o ▶ que a tela solta).
 */
function seguirODestaque(
  scene: Cena,
  proximo: (
    fala: string | undefined,
    s: SceneState,
    rodando: boolean,
  ) => {
    acao: SceneAction | 'rodar' | 'esperar'
    rotulo: string | null
  } | null,
  { rodando: rodandoNoComeco = false, tempoPorGesto = 0 } = {},
) {
  const { play, passo, fala, tela } = caso(scene)
  let s = play([])
  let rodando = rodandoNoComeco
  for (let i = 0; i < 80 && fala(s) !== `${scene}-complete`; i++) {
    const p = proximo(fala(s), s, rodando)
    expect(p).not.toBeNull()
    if (!p) break
    expect([fala(s), destaques(tela(s, rodando))]).toEqual([fala(s), p.rotulo ? [p.rotulo] : []])
    if (p.acao === 'rodar') rodando = true
    else if (p.acao === 'esperar') s = passo(s, { type: 'advance', seconds: 0.5 })
    else {
      s = passo(s, p.acao)
      if (p.acao.type === 'restart-case') rodando = false
      if (rodando && tempoPorGesto) s = passo(s, { type: 'advance', seconds: tempoPorGesto })
    }
  }
  expect(fala(s)).toBe(`${scene}-complete`)
  for (const meta of METAS[scene]) expect(s.evidence.discoveries).toContain(meta)
  return s
}

describe('Meu Jeito (E): as telas falam só da ideia', () => {
  const casos: [Cena, SceneAction[][]][] = [
    [
      'copy-vs-original',
      [[], [{ type: 'export-file' }], [{ type: 'export-file' }, { type: 'import-file' }]],
    ],
    ['published-copy', [[], [{ type: 'publish' }]]],
    [
      'same-rules-new-skin',
      [[], [{ type: 'skin', theme: 'road' }], [{ type: 'rule-toggle', enabled: false }]],
    ],
  ]
  test.each(casos)('%s: sem regra, bloco nem código', (scene, estados) => {
    const { play, tela } = caso(scene)
    for (const acoes of estados) expect(texto(tela(play(acoes)))).not.toMatch(SO_A_IDEIA)
  })
  test.each([
    'sheet-vs-sprite',
    'two-clocks',
    'unique-names',
  ] as const)('%s (aulas 6 e 7): o bloco pode aparecer, a regra e o código não', (scene) => {
    const { play, tela } = caso(scene)
    expect(texto(tela(play([])))).not.toMatch(AULAS_6_E_7)
  })

  test('same-rules-new-skin: "O que o jogo faz" no lugar das regras', () => {
    const { play, tela } = caso('same-rules-new-skin')
    const lido = texto(tela(play([])))
    expect(lido).toContain('O que o jogo faz')
    expect(lido).toContain('a tecla solta um tiro')
    expect(lido).not.toContain('a tecla atira')
    expect(lido).not.toContain('Regras do jogo')
  })

  test('two-clocks: "quadro" é só o do jogo; o desenho de cada pedra é "desenho"', () => {
    const { play, tela } = caso('two-clocks')
    const lido = texto(
      tela(
        play([
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 0.5 },
        ]),
      ),
    )
    expect(lido).toContain('desenho 1')
    expect(lido).not.toMatch(/quadro [0-9]\b/)
    expect(lido).toContain('A cada 40 quadros')
  })
})

describe('Meu Jeito (E): os rótulos de todos os controles', () => {
  const ROTULOS: Record<Cena, string[]> = {
    'copy-vs-original': [
      'Baixar o projeto',
      'Importar no Estúdio',
      'Cor da nave da aula',
      'Cor da nave do Estúdio',
      'azul',
      'rosa',
      'verde',
      'laranja',
      'Recomeçar experiência',
    ],
    'published-copy': [
      'Cor da nave no seu projeto',
      'Publicar',
      'Abrir a versão do Mural',
      'Recomeçar experiência',
    ],
    'same-rules-new-skin': [
      'Nave no espaço',
      'Carrinho na estrada',
      'Submarino no mar',
      'Desligar o tiro',
      '← Mover',
      'Mover →',
      'Tecla de tiro',
      'Jogar',
    ],
    'sheet-vs-sprite': [
      'Recorte de 16',
      'Recorte de 32',
      'Recorte de 64',
      'Quadro 1',
      'Quadro 2',
      ...TAMANHOS_DA_NAVE.map((t) => t.rotulo),
    ],
    'two-clocks': [
      'A cada 20 quadros',
      'A cada 40 quadros',
      'A cada 80 quadros',
      '2 desenhos por segundo',
      '8 desenhos por segundo',
      '16 desenhos por segundo',
      'Passar o tempo',
      'Voltar ao começo',
    ],
    'unique-names': [
      'Tirar o bloco de cima',
      'Ver a prévia andando',
      'Sem nome',
      'nave',
      'folha-nave',
      'nave2',
    ],
  }
  test.each(Object.keys(ROTULOS) as Cena[])('%s', (scene) => {
    const { play, tela } = caso(scene)
    const lido = texto(tela(play([])))
    for (const rotulo of ROTULOS[scene]) expect(lido).toContain(rotulo)
  })
})

describe('Meu Jeito (E): o que cada caso faz só aparece depois do teste', () => {
  const REVELA: [Cena, SceneAction[], string, string[]][] = [
    [
      'copy-vs-original',
      [{ type: 'export-file' }],
      'Sai um arquivo com uma cópia; o jogo continua na aula',
      ['A cópia vira um projeto seu no Estúdio', 'Só aquele lado muda; o outro fica como estava'],
    ],
    [
      'published-copy',
      [{ type: 'publish' }],
      'Uma cópia do jogo daquele momento vai para o Mural',
      [
        'Só o seu projeto muda; o Mural guarda a cópia como estava',
        'Entra uma publicação nova; a anterior continua lá',
      ],
    ],
    [
      'same-rules-new-skin',
      [{ type: 'skin', theme: 'road' }],
      'Muda só a aparência; o que o jogo faz continua o mesmo',
      ['A tecla não solta tiro: o jogo muda de verdade'],
    ],
    [
      'sheet-vs-sprite',
      [{ type: 'crop', width: 64 }],
      'A folha inteira, com as duas naves espremidas',
      [
        'Metade de uma nave, esticada',
        'Uma nave inteira: um quadro da folha',
        'A nave do jogo muda; a folha continua igual',
      ],
    ],
    [
      'two-clocks',
      [{ type: 'advance', seconds: 1 }, ...Array(4).fill({ type: 'advance', seconds: 0.8 })],
      'Começa no desenho 1: o giro dela começa quando ela nasce',
      [
        'Mais rápido, nasce mais pedra; o giro de cada uma fica igual',
        'Mais rápido, cada pedra gira mais rápido; a hora de nascer fica igual',
      ],
    ],
    [
      'unique-names',
      [{ type: 'toggle-block', present: false }],
      'Os blocos que procuram nave avisam, e a prévia para',
      ['O Estúdio avisa e pede um nome diferente', 'Cada um com o seu nome, sem aviso'],
    ],
  ]
  test.each(REVELA)('%s', (scene, primeiro, resposta, outras) => {
    const { play, tela } = caso(scene)
    const antes = texto(tela(play([])))
    for (const r of [resposta, ...outras]) expect(antes).not.toContain(r)
    expect(antes).toContain('Teste para descobrir')
    const depois = texto(tela(play(primeiro)))
    expect(depois).toContain(resposta)
    for (const r of outras) expect(depois).not.toContain(r)
  })
})

describe('Meu Jeito (E): o destaque é o gesto do Zappy, e segui-lo completa as metas', () => {
  test('copy-vs-original', () => {
    seguirODestaque('copy-vs-original', (fala, s) => {
      const g = proximoGestoDaCopia(fala, s.copies)
      if (!g) return null
      if (g.gesto === 'baixar') return { acao: { type: 'export-file' }, rotulo: 'Baixar o projeto' }
      if (g.gesto === 'importar')
        return { acao: { type: 'import-file' }, rotulo: 'Importar no Estúdio' }
      return {
        acao: { type: 'recolor', side: 'studio', color: g.cor },
        rotulo: `Nave do Estúdio ${g.cor}`,
      }
    })
  })

  test('published-copy', () => {
    seguirODestaque('published-copy', (fala, s) => {
      const g = proximoGestoDaPublicacao(fala, s.copies)
      if (!g) return null
      if (g.gesto === 'publicar') return { acao: { type: 'publish' }, rotulo: 'Publicar' }
      return {
        acao: { type: 'recolor', side: 'project', color: g.cor },
        rotulo: `Nave do projeto ${g.cor}`,
      }
    })
  })

  const HISTORIA = { space: 'Nave no espaço', road: 'Carrinho na estrada', sea: 'Submarino no mar' }
  const gestoDoTema = (fala: string | undefined, s: SceneState, rodando: boolean) => {
    const g = proximoGestoDoTema(fala, s.skinGame, rodando)
    if (!g) return null
    switch (g.gesto) {
      case 'historia':
        return { acao: { type: 'skin', theme: g.tema } as SceneAction, rotulo: HISTORIA[g.tema] }
      case 'desligar':
        return {
          acao: { type: 'rule-toggle', enabled: false } as SceneAction,
          rotulo: 'Desligar o tiro',
        }
      case 'ligar':
        return {
          acao: { type: 'rule-toggle', enabled: true } as SceneAction,
          rotulo: 'Ligar o tiro de volta',
        }
      case 'atirar':
        return { acao: { type: 'play-shoot' } as SceneAction, rotulo: 'Tecla de tiro' }
      case 'jogar':
        return { acao: 'rodar' as const, rotulo: 'Jogar' }
    }
  }
  test('same-rules-new-skin (o jogo anda sozinho)', () => {
    seguirODestaque('same-rules-new-skin', gestoDoTema, { rodando: true, tempoPorGesto: 0.3 })
  })
  test('same-rules-new-skin: com o jogo parado, o tiro desligado pede Jogar', () => {
    const { play, fala, tela } = caso('same-rules-new-skin')
    const s = play([{ type: 'rule-toggle', enabled: false }])
    expect(fala(s)).toBe('same-rules-new-skin-off')
    expect(destaques(tela(s, false))).toEqual(['Jogar'])
    expect(destaques(tela(s, true))).toEqual(['Tecla de tiro'])
  })
  test('same-rules-new-skin: quem começa desligando o tiro também chega ao fim', () => {
    const { play, passo, fala, tela } = caso('same-rules-new-skin')
    let s = play([{ type: 'rule-toggle', enabled: false }])
    for (let i = 0; i < 40 && fala(s) !== 'same-rules-new-skin-complete'; i++) {
      const p = gestoDoTema(fala(s), s, true)
      if (!p || p.acao === 'rodar') throw Error(`sem gesto em ${fala(s)}`)
      expect(destaques(tela(s, true))).toEqual([p.rotulo])
      s = passo(passo(s, p.acao), { type: 'advance', seconds: 0.3 })
    }
    expect(fala(s)).toBe('same-rules-new-skin-complete')
  })

  const gestoDosNomes = (fala: string | undefined, s: SceneState) => {
    const g = proximoGestoDosNomes(fala, s.uniqueNames)
    if (!g) return null
    if (g.gesto === 'tirar')
      return {
        acao: { type: 'toggle-block', present: false } as SceneAction,
        rotulo: 'Tirar o bloco de cima',
      }
    if (g.gesto === 'por')
      return {
        acao: { type: 'toggle-block', present: true } as SceneAction,
        rotulo: 'Pôr o bloco de cima de volta',
      }
    return {
      acao: { type: 'name-field', name: g.nome } as SceneAction,
      rotulo: `Bloco de baixo: ${g.nome || 'sem nome'}`,
    }
  }
  test('unique-names', () => {
    seguirODestaque('unique-names', gestoDosNomes)
  })
  test('unique-names: o nome escolhido com o bloco de cima fora é pedido de novo', () => {
    const { play, fala, tela } = caso('unique-names')
    const s = play([
      { type: 'toggle-block', present: false },
      { type: 'name-field', name: 'nave' },
      { type: 'toggle-block', present: true },
    ])
    expect(fala(s)).toBe('unique-names-missing')
    expect(destaques(tela(s))).toEqual(['Bloco de baixo: nave'])
  })

  const gestoDaFolha = (fala: string | undefined, s: SceneState) => {
    const g = proximoGestoDaFolha(fala, s.sheet)
    if (!g) return null
    if (g.gesto === 'recorte')
      return {
        acao: { type: 'crop', width: g.largura } as SceneAction,
        rotulo: `Recorte de ${g.largura}`,
      }
    return {
      acao: { type: 'sprite', size: g.tamanho } as SceneAction,
      rotulo: TAMANHOS_DA_NAVE.find((t) => t.id === g.tamanho)?.rotulo ?? null,
    }
  }
  test('sheet-vs-sprite', () => {
    seguirODestaque('sheet-vs-sprite', gestoDaFolha)
  })
  test('sheet-vs-sprite: o tamanho no jogo fica fechado até a nave inteira', () => {
    const { play, tela } = caso('sheet-vs-sprite')
    const fechado = tela(play([{ type: 'crop', width: 16 }]))
    expect(fechado).toMatch(/aria-disabled="true"[^>]*>Bem maior/)
    expect(texto(fechado)).toContain(
      'Abre depois que você achar o recorte que mostra uma nave inteira.',
    )
    const aberto = tela(play([{ type: 'crop', width: 32 }]))
    expect(aberto).not.toMatch(/aria-disabled="true"[^>]*>Bem maior/)
  })

  const gestoDosRelogios = (fala: string | undefined, s: SceneState, rodando: boolean) => {
    const g = proximoGestoDosRelogios(fala, s.twoClocks, rodando)
    if (!g) return null
    switch (g.gesto) {
      case 'nascer':
        return {
          acao: { type: 'birth-every', frames: g.quadros } as SceneAction,
          rotulo: `A cada ${g.quadros} quadros`,
        }
      case 'girar':
        return {
          acao: { type: 'rate', perSecond: g.porSegundo } as SceneAction,
          rotulo: `${g.porSegundo} desenhos por segundo`,
        }
      case 'comeco':
        return { acao: { type: 'restart-case' } as SceneAction, rotulo: 'Voltar ao começo' }
      case 'tempo':
        return { acao: 'rodar' as const, rotulo: 'Passar o tempo' }
      case 'esperar':
        // Com o tempo passando, nada fica aceso: o pedido é olhar.
        return { acao: 'esperar' as const, rotulo: null }
    }
  }
  test('two-clocks', () => {
    seguirODestaque('two-clocks', gestoDosRelogios)
  })
  test('two-clocks: mudar o relógio no meio pede Voltar ao começo', () => {
    const { play, fala, tela } = caso('two-clocks')
    const s = play([
      ...Array(5).fill({ type: 'advance', seconds: 1 }),
      { type: 'birth-every', frames: 20 },
    ])
    expect(fala(s)).toBe('two-clocks-each-more')
    expect(destaques(tela(s))).toEqual(['Voltar ao começo'])
  })
})
