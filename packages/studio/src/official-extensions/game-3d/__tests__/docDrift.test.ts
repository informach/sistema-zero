import { describe, expect, it } from 'bun:test'
import {
  NO_PALETTE_TREE_DRIFT,
  NO_TOOLBOX_DRIFT,
  paletteTreeDrift,
  toolboxDrift,
} from '../../__tests__/paletteDrift'
import { gameThreeDPromptContext } from '../ai'
import { gameThreeDPromptSummary } from '../aiSummary'
import { gameThreeDBlocks, gameThreeDToolboxCategory } from '../blocks'
import { gameThreeDExamples } from '../exampleCatalog'
import { gameThreeDManifest } from '../manifest'
import { GAME_THREE_D_PALETTE } from '../palette'
import { gameThreeDRuntime } from '../runtime'

/**
 * Full review (R4): MATA A CLASSE, não o caso (a rede do docDrift do g3k/g2d,
 * adaptada ao Jogo 3D).
 *
 * O contexto da IA (`ai.ts`) cita os MÉTODOS da API `window.SZGame3D`. Quando um
 * lote renomeia/remove um helper e esquece o texto, a IA passa a gerar código que
 * não roda. Este arquivo cruza as citações contra as chaves REAIS do runtime
 * (mesma receita do blockAudit) e falha na hora. Se um nome legítimo cair aqui,
 * conserte o TEXTO do `ai.ts`; não afrouxe o teste.
 */

describe('game-3d — a doc/IA não pode citar o que não existe', () => {
  it('o contexto da IA só cita métodos que EXISTEM no window.SZGame3D', () => {
    // As chaves reais, do runtime avaliado (THREE={}: só define, não roda a cena).
    const body = gameThreeDRuntime.replace(/^import \* as THREE from 'three';\n/, '')
    const win = {
      addEventListener() {},
      SZGame3D: undefined,
      __SZGAME_ASSETS: {},
    } as unknown as Record<string, unknown>
    const doc = { getElementById: () => null, addEventListener() {} }
    new Function('THREE', 'window', 'document', body)({}, win, doc)
    const apiKeys = new Set(Object.keys(win.SZGame3D as Record<string, unknown>))

    // `nome(` colado no parêntese e SEM ponto/letra antes = citação de método da
    // API. O lookbehind tira `obj.metodo(` e `palavra(` no meio de outra palavra.
    const citados = new Set<string>()
    for (const m of gameThreeDPromptContext.matchAll(/(?<![.\w])([a-z][A-Za-z0-9]*)\(/g)) {
      citados.add(m[1] ?? '')
    }
    // Anti-vácuo: o contexto cita dezenas de métodos; uma extração morta cairia p/ 0.
    expect(citados.size).toBeGreaterThanOrEqual(60)
    expect([...citados].filter((n) => !apiKeys.has(n))).toEqual([])
  })

  it('IA, resumo e manifest ensinam a API pública do Kit Plataforma', () => {
    const platformMethods = [
      'createPlatformScene',
      'createHero',
      'setStageTheme',
      'loadStage',
      'stageStep',
      'shootFire',
      'sideCamera',
      'onStageEvent',
      'stageValue',
      'setStageNumber',
      'heroIs',
      'stageIs',
      'stageReset',
      'clearStage',
    ]
    for (const method of platformMethods) expect(gameThreeDPromptContext).toContain(`${method}(`)
    expect(gameThreeDPromptSummary).toContain('Kit Plataforma')
    expect(gameThreeDPromptSummary).toContain('Reino Cogumelo')
    expect(gameThreeDManifest.description).toContain('"Plataforma"')
    expect(gameThreeDManifest.docs).toContain('### Kit "Plataforma"')
    expect(gameThreeDManifest.docs).toContain('Reino Cogumelo')
  })

  it('nenhum exemplo do manifest usa travessão em texto visível', () => {
    // Guarda TRANSVERSAL (a versão por-exemplo vive nos drift tests dos jogos
    // gerados; esta varre TODOS os exemplos do manifest, inclusive os antigos
    // com IR embutida à mão): nome, descrição e o HTML do jogo (HUD/telas) são
    // texto que a criança vê e a voz da casa não usa travessão.
    const comTravessao = gameThreeDExamples
      .filter(
        (ex) =>
          ex.name.includes('—') ||
          (ex.description ?? '').includes('—') ||
          JSON.stringify(ex.ir.html ?? []).includes('—'),
      )
      .map((ex) => ex.name)
    expect(comTravessao).toEqual([])
    // Anti-vácuo: a varredura tem de estar olhando o catálogo real.
    expect(gameThreeDExamples.length).toBeGreaterThanOrEqual(10)
  })

  it('todo bloco está na paleta em UM lugar só, sem fantasma e sem categoria "Mais"', () => {
    // Bloco fora da árvore some da paleta sem erro nenhum: a versão silenciosa do
    // chip fantasma. A rede é a comum das extensões (`paletteDrift.ts`).
    expect(paletteTreeDrift(GAME_THREE_D_PALETTE, gameThreeDBlocks)).toEqual(NO_PALETTE_TREE_DRIFT)
    expect(toolboxDrift(gameThreeDToolboxCategory, gameThreeDBlocks)).toEqual(NO_TOOLBOX_DRIFT)
  })
})
