import { describe, expect, it } from 'bun:test'
import ts from 'typescript'
import {
  extensionBootstrapContext,
  extensionBootstrapVariantsKey,
  loadExtensionBootstrapScript,
  loadExtensionBootstrapScripts,
} from '#extensions'
import { loadJavaScriptClassicResources } from '../../../runtime/javascript/classicDocument'
import { gameTwoDExtension } from '../../game-2d'
import { gameTwoDRuntime } from '../../game-2d/runtime'
import { gameKitExtension } from '../../game-2d-advanced'
import { gameKitRuntime } from '../../game-2d-advanced/runtime'
import {
  MAP_TWO_D_FRAGMENT_MAX_CHARS,
  MAP_TWO_D_FULL_BOOTSTRAP_MAX_CHARS,
  mapTwoDBootstrap,
  mapTwoDComposedSourceForTests,
} from '../bootstrap'

/**
 * O caminho REAL do host, e não a função do fragmento chamada na mão: a prévia e a capa usam
 * `loadExtensionBootstrapScripts`, o jogar público e a captura usam
 * `loadJavaScriptClassicResources`, o export usa `loadExtensionBootstrapScript`. Todos montam
 * o contexto com `extensionBootstrapContext`.
 *
 * Em 17/11/2026 o teste do fragmento passava e o host entregava o motor COMPLETO a todo jogo
 * 2D (430.969 caracteres no Jogo 2D, 419.335 no Avançado, com `createMap2D` dentro): a chave
 * reduzida era `''`, e para `''` o host troca o contexto por `undefined`.
 */

const SEM_CENARIO = extensionBootstrapContext({
  html: '<canvas id="jogo"></canvas>',
  js: 'SZGame2D.clear();SZGame2D.createTileMapFromAsset("mapa");',
})
const COM_CENARIO = extensionBootstrapContext({
  js: 'SZGame2D.createMapScene("mapa", "meu-desenho");',
})
/** O bloco pode estar num arquivo extra: o contexto é o documento inteiro. */
const COM_CENARIO_NO_EXTRA = extensionBootstrapContext({
  js: 'SZGame2D.clear();',
  extraFiles: [{ content: 'SZGame2D.drawMapScene("mapa", "back");' }],
})

const MOTORES = [
  {
    nome: 'Jogo 2D',
    id: 'game-2d',
    extensao: gameTwoDExtension,
    base: gameTwoDRuntime,
    alvo: 'g2d',
  },
  {
    nome: 'Jogo 2D Avançado',
    id: 'game-2d-advanced',
    extensao: gameKitExtension,
    base: gameKitRuntime,
    alvo: 'gk',
  },
] as const

describe('variante do cenário pelo caminho do host', () => {
  for (const { nome, id, extensao, base, alvo } of MOTORES) {
    it(`${nome}: jogo sem cenário recebe o motor de sempre, sem um byte do cenário`, async () => {
      const [daPrevia] = await loadExtensionBootstrapScripts([extensao], SEM_CENARIO)
      const doJogar = (await loadJavaScriptClassicResources([id], 'baloo2', SEM_CENARIO))
        .extensionScripts[0]
      const doExport = await loadExtensionBootstrapScript(extensao, SEM_CENARIO)
      for (const texto of [daPrevia, doJogar, doExport]) {
        expect(texto).toBe(base)
        expect(texto).not.toContain('createMap2D')
        expect(texto).not.toContain('_map2d')
      }
    })

    it(`${nome}: jogo com bloco de cenário recebe o motor completo, dentro do teto`, async () => {
      for (const contexto of [COM_CENARIO, COM_CENARIO_NO_EXTRA]) {
        const daPrevia = (await loadExtensionBootstrapScripts([extensao], contexto))[0] ?? ''
        const doExport = await loadExtensionBootstrapScript(extensao, contexto)
        expect(doExport).toBe(daPrevia)
        expect(daPrevia).toContain('createMap2D')
        expect(daPrevia.length).toBeGreaterThan(base.length + 9_000)
        expect(daPrevia.length).toBeLessThanOrEqual(MAP_TWO_D_FULL_BOOTSTRAP_MAX_CHARS[alvo])
      }
    })

    it(`${nome}: a chave da prévia muda quando o primeiro bloco de cenário entra`, () => {
      const sem = extensionBootstrapVariantsKey([extensao], SEM_CENARIO)
      const com = extensionBootstrapVariantsKey([extensao], COM_CENARIO)
      expect(sem).toBe(`${id}=sem-cenario-pinta`)
      expect(com).toBe(`${id}=`)
    })
  }

  it('os números medidos em 18/11/2026', async () => {
    const medidas: Record<string, number> = {}
    for (const { alvo, extensao } of MOTORES) {
      medidas[`${alvo} sem`] = (await loadExtensionBootstrapScript(extensao, SEM_CENARIO)).length
      medidas[`${alvo} com`] = (await loadExtensionBootstrapScript(extensao, COM_CENARIO)).length
    }
    // Os tetos de sempre valem para o motor sem cenário (bundle.test.ts e runtimePayload.test.ts).
    // 21/11/2026: sem os comentários de bloco no Jogo 2D (lote 4), o teto do bundle.test desceu.
    expect(medidas['g2d sem'] ?? 0).toBeLessThan(369_500)
    expect(medidas['gk sem'] ?? 0).toBeLessThan(415_000)
    expect((medidas['g2d com'] ?? 0) - (medidas['g2d sem'] ?? 0)).toBeLessThan(
      MAP_TWO_D_FRAGMENT_MAX_CHARS,
    )
    expect((medidas['gk com'] ?? 0) - (medidas['gk sem'] ?? 0)).toBeLessThan(
      MAP_TWO_D_FRAGMENT_MAX_CHARS,
    )
  })
})

// Revisão do lote 4 (21/11/2026): a variante com cenário também sai sem os comentários de bloco, e
// o programa tem de ser o mesmo da fonte composta (o mesmo teste do `game-2d/__tests__/bundle.test.ts`).
describe('Jogo 2D com cenário: tirar os comentários de bloco não muda o programa', () => {
  it('o programa impresso sem comentários é igual ao da fonte composta', async () => {
    const imprimir = (source: string) => {
      const arquivo = ts.createSourceFile(
        'runtime.js',
        source,
        ts.ScriptTarget.ES2022,
        false,
        ts.ScriptKind.JS,
      )
      const erros = (arquivo as unknown as { parseDiagnostics: unknown[] }).parseDiagnostics
      expect(erros).toHaveLength(0)
      return ts.createPrinter({ removeComments: true }).printFile(arquivo)
    }
    const contexto = { code: 'const g=SZGame2D;g["createMapScene"]("mapa","vila");' }
    const compactado = await mapTwoDBootstrap('g2d', contexto as never)
    const fonte = await mapTwoDComposedSourceForTests()
    expect(compactado).toContain('createMapScene:_map2d.createMapScene')
    expect(compactado.length).toBeLessThan(fonte.length - 40_000)
    expect(imprimir(compactado)).toBe(imprimir(fonte))
  })
})
