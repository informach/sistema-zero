import { describe, expect, it } from 'bun:test'
import type { ExtensionToolboxCategory } from '#extensions'
import { gameThreeDPromptContext } from '../ai'
import { gameThreeDBlocks, gameThreeDToolboxCategory } from '../blocks'
import { gameThreeDManifest } from '../manifest'
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

/** Todo `type` de bloco na toolbox, em qualquer nível (com repetição). */
function tiposNaToolbox(cat: ExtensionToolboxCategory, acc: string[] = []): string[] {
  for (const c of cat.contents) {
    if (c.kind === 'category') tiposNaToolbox(c, acc)
    else acc.push(c.type)
  }
  return acc
}

/** Todo nome de categoria da toolbox, em qualquer nível. */
function nomesDeCategoria(cat: ExtensionToolboxCategory, acc: string[] = []): string[] {
  acc.push(cat.name)
  for (const c of cat.contents) if (c.kind === 'category') nomesDeCategoria(c, acc)
  return acc
}

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

  it('nenhum exemplo do manifest usa travessão em texto visível', () => {
    // Guarda TRANSVERSAL (a versão por-exemplo vive nos drift tests dos jogos
    // gerados; esta varre TODOS os exemplos do manifest, inclusive os antigos
    // com IR embutida à mão): nome, descrição e o HTML do jogo (HUD/telas) são
    // texto que a criança vê e a voz da casa não usa travessão.
    const comTravessao = gameThreeDManifest.examples
      .filter(
        (ex) =>
          ex.name.includes('—') ||
          (ex.description ?? '').includes('—') ||
          JSON.stringify(ex.ir.html ?? []).includes('—'),
      )
      .map((ex) => ex.name)
    expect(comTravessao).toEqual([])
    // Anti-vácuo: a varredura tem de estar olhando o catálogo real.
    expect(gameThreeDManifest.examples.length).toBeGreaterThanOrEqual(10)
  })

  it('todo bloco está na toolbox em UM lugar só — e a categoria "Mais" não existe', () => {
    // Bloco fora do SUBCATS cai no grupo genérico "Mais" sem erro nenhum — a versão
    // silenciosa do chip fantasma (o bloco some do lugar certo).
    const conta = new Map<string, number>()
    for (const t of tiposNaToolbox(gameThreeDToolboxCategory)) conta.set(t, (conta.get(t) ?? 0) + 1)
    const visiveis = gameThreeDBlocks
      .filter((b) => !(b as { hidden?: boolean }).hidden)
      .map((b) => b.type)
    const conhecidos = new Set(gameThreeDBlocks.map((b) => b.type))
    expect({
      foraDaToolbox: visiveis.filter((t) => !conta.has(t)),
      emDoisLugares: [...conta.entries()].filter(([, n]) => n > 1).map(([t]) => t),
      fantasmasNaToolbox: [...conta.keys()].filter((t) => !conhecidos.has(t)),
      categoriaMais: nomesDeCategoria(gameThreeDToolboxCategory).filter((n) => n === 'Mais'),
    }).toEqual({ foraDaToolbox: [], emDoisLugares: [], fantasmasNaToolbox: [], categoriaMais: [] })
  })
})
