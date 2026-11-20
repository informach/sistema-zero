import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { loadExtensionExamples } from '#extensions'
import { projetosDosCursos } from '../../../../docs/aulas-interativas-tecnico/qa/matriz-compatibilidade'
import { CORE_EXAMPLE_SUMMARIES, loadCoreExample } from '../examples/coreCatalog'
import { OFFICIAL_CATALOG } from '../official-extensions'
import { countBlocksInState, openingViewFor, planDeferredTail } from './deferredTail'
import { mayHaveManyBlocks, OFFSCREEN_BODIES_MIN_BLOCKS } from './offscreenThreshold'
import { buildWorkspaceStateFromIR } from './workspaceState'

/**
 * A abertura que não desenha a cauda distante (`deferredTail.ts`). O desenho em si só existe num
 * navegador (`e2e/offscreen-lifecycle.spec.ts` e `e2e/classic-offscreen.spec.ts`); aqui ficam o
 * plano, o portão das aulas e dos exemplos, e o que o módulo supõe do Blockly instalado.
 */

interface StateBlock {
  type: string
  id?: string
  x?: number
  y?: number
  next?: { block: StateBlock }
  inputs?: Record<string, { block?: StateBlock; shadow?: StateBlock }>
}

/** Uma unidade com `size` blocos: o bloco de fora e um corpo de `size - 1` comandos encadeados. */
function unit(id: string | undefined, size: number): StateBlock {
  let body: StateBlock | undefined
  for (let i = size - 1; i >= 1; i--)
    body = { type: 'sz_g2d_test', id: `${id}-${i}`, ...(body ? { next: { block: body } } : {}) }
  return {
    type: 'sz_js_test',
    ...(id ? { id } : {}),
    ...(body ? { inputs: { DO: { block: body } } } : {}),
  }
}

function area(type: string, y: number, units: StateBlock[]): StateBlock {
  let chain: StateBlock | undefined
  for (const item of [...units].reverse())
    chain = { ...item, ...(chain ? { next: { block: chain } } : {}) }
  return { type, id: type, x: 0, y, ...(chain ? { inputs: { CHILDREN: { block: chain } } } : {}) }
}

function workspace(...tops: StateBlock[]) {
  return { blocks: { languageVersion: 0, blocks: tops } }
}

const units = (prefix: string, count: number, size: number) =>
  Array.from({ length: count }, (_, i) => unit(`${prefix}${i}`, size))

describe('o plano da cauda adiada', () => {
  it('abaixo do limiar nada é adiado', () => {
    // 1 área + 374 unidades de 4 blocos = 1 497 blocos.
    const state = workspace(area('sz_frame_events', 0, units('u', 374, 4)))
    expect(countBlocksInState(state)).toBe(1497)
    expect(planDeferredTail(state, { top: 0, height: 800 })).toBeNull()
  })

  it('a cauda começa na primeira unidade estimada a mais de uma tela abaixo da vista', () => {
    const state = workspace(area('sz_frame_events', 0, units('u', 400, 4)))
    expect(countBlocksInState(state)).toBeGreaterThanOrEqual(OFFSCREEN_BODIES_MIN_BLOCKS)
    // Vista de 800 de altura no alto: a cauda começa depois de 1 600. Cabeçalho 64 + 160 por
    // unidade de 4 blocos: a unidade 10 é a primeira que começa abaixo disso.
    const plan = planDeferredTail(state, { top: 0, height: 800 })
    expect(plan?.boundaries).toEqual(['u10'])
    // Com todos os ids no estado, a carga usa o próprio estado de quem chamou.
    expect(plan?.state).toBe(state)
    // A vista mais abaixo leva a fronteira junto: nada acima dela fica sem desenho.
    expect(planDeferredTail(state, { top: 3200, height: 800 })?.boundaries).toEqual(['u30'])
  })

  it('uma fronteira por área; área que cabe perto da vista abre inteira', () => {
    const state = workspace(
      area('sz_frame_start', 0, units('s', 3, 4)),
      area('sz_frame_events', 0, units('e', 400, 4)),
      area('sz_frame_loops', 4000, units('l', 5, 4)),
      // Pilha solta (rascunho) nunca é adiada, por maior que seja.
      area('sz_js_loose', 0, units('r', 50, 4)),
    )
    expect(planDeferredTail(state, { top: 0, height: 800 })?.boundaries).toEqual(['e10', 'l0'])
  })

  it('unidade sem id (exemplo recém-criado) ganha um id sorteado numa cópia do estado', () => {
    // O projeto vindo de um exemplo nasce da IR sem ids: o Blockly sortearia um na carga.
    const semId = units('u', 400, 4).map((item, i) => (i === 10 ? unit(undefined, 4) : item))
    const state = workspace(area('sz_frame_events', 0, semId))
    const original = JSON.stringify(state)
    const plan = planDeferredTail(state, { top: 0, height: 800 }, undefined, () => 'sorteado')
    expect(plan?.boundaries).toEqual(['sorteado'])
    // O estado de quem chamou não muda; o carregado só difere pelo id da unidade da fronteira.
    expect(JSON.stringify(state)).toBe(original)
    let fronteira = (plan?.state as ReturnType<typeof workspace>).blocks.blocks[0]?.inputs?.CHILDREN
      ?.block
    for (let i = 0; i < 10; i++) fronteira = fronteira?.next?.block
    expect(fronteira?.id).toBe('sorteado')
    const semOSorteado = JSON.stringify(plan?.state, (chave, valor) =>
      chave === 'id' && valor === 'sorteado' ? undefined : valor,
    )
    expect(semOSorteado).toBe(original)
  })

  it('conta como o Blockly: a sombra só vira bloco quando não há bloco encaixado', () => {
    const comSombra = (item: StateBlock): StateBlock => ({
      ...item,
      inputs: {
        ...item.inputs,
        X: { block: { type: 'math_number', id: `${item.id}-x` }, shadow: { type: 'math_number' } },
        Y: { shadow: { type: 'math_number' } },
      },
    })
    const state = workspace(area('sz_frame_events', 0, units('u', 100, 2).map(comSombra)))
    // 1 área + 100 × (2 blocos + o encaixado em X + a sombra de Y).
    expect(countBlocksInState(state)).toBe(401)
  })

  it('a vista da primeira abertura é a do "blocos no alto"', () => {
    const state = workspace(area('sz_frame_start', 392, []), area('sz_frame_events', 500, []))
    expect(openingViewFor(state, 700, 1)).toEqual({ top: 392 - 24, height: 700 })
    expect(openingViewFor(state, 700, 0.8)).toEqual({ top: 392 - 30, height: 875 })
  })
})

describe('o portão: nada muda nas aulas nem nos exemplos abaixo do limiar', () => {
  it('os jogos dos cursos nem baixam o módulo', () => {
    const projetos = projetosDosCursos()
    expect(projetos.length).toBeGreaterThan(5)
    for (const { curso, origem, projeto } of projetos) {
      const blocksState = (projeto as { blocksState?: unknown }).blocksState
      expect(blocksState, `${curso}/${origem}`).toBeTruthy()
      expect(mayHaveManyBlocks(JSON.stringify(blocksState)), `${curso}/${origem}`).toBe(false)
    }
  })

  it('exemplo oficial abaixo do limiar abre como sempre; os de cima ficam listados aqui', async () => {
    const acima: string[] = []
    let conferidos = 0
    const conferir = (nome: string, state: unknown) => {
      conferidos++
      if (countBlocksInState(state) >= OFFSCREEN_BODIES_MIN_BLOCKS) {
        acima.push(nome)
        return
      }
      // Qualquer vista: abaixo do limiar o plano é vazio e a carga é a de sempre.
      expect(planDeferredTail(state, { top: -1e6, height: 1 }), nome).toBeNull()
    }
    for (const extensao of OFFICIAL_CATALOG)
      for (const exemplo of await loadExtensionExamples(extensao))
        conferir(`${extensao.manifest.id}: ${exemplo.name}`, buildWorkspaceStateFromIR(exemplo.ir))
    for (const resumo of CORE_EXAMPLE_SUMMARIES) {
      const exemplo = await loadCoreExample(resumo.name)
      conferir(
        `núcleo: ${resumo.name}`,
        buildWorkspaceStateFromIR(exemplo.ir, exemplo.workspaceOptions),
      )
    }
    expect(conferidos).toBe(185)
    // Os que passam do limiar abrem pelo caminho novo: a igualdade do projeto gravado e do código
    // gerado com o caminho de antes está medida no navegador (`classico-em-escala.md`, etapa 3).
    expect(acima).toEqual(['game-2d: Reino Zero', 'núcleo: Reino Zero Ultra (na mão)'])
  }, 120_000)
})

describe('guarda de atualização do Blockly (o que as adaptações supõem)', () => {
  const require = createRequire(import.meta.url)
  // O subpath não está no `exports` do pacote: parte da entrada principal (mesma pasta).
  const compressed = readFileSync(
    join(dirname(require.resolve('blockly')), 'blockly_compressed.js'),
    'utf8',
  ).replace(/\n/g, '')

  it('o desenho de um bloco passa sempre por renderEfficiently, e os filhos antes dele', () => {
    expect(compressed).toContain(
      'renderBlock$$module$build$src$core$render_management=function(a){if(dirtyBlocks$$module$build$src$core$render_management.has(a)&&a.initialized){for(const b of a.getChildren(!1))renderBlock$$module$build$src$core$render_management(b);a.renderEfficiently()}}',
    )
  })

  it('a carga cria a árvore inteira antes do initSvg de cada bloco e liga as conexões depois', () => {
    expect(compressed).toContain(
      'loadInputBlocks$$module$build$src$core$serialization$blocks(e,a);loadNextBlocks$$module$build$src$core$serialization$blocks(e,a);initBlock$$module$build$src$core$serialization$blocks(e,b.rendered)',
    )
    expect(compressed).toContain(
      'initBlock$$module$build$src$core$serialization$blocks=function(a,b){if(b){a.setConnectionTracking(!1);a.initSvg();a.queueRender();',
    )
    expect(compressed).toMatch(
      /setTimeout\(\(\)=>\{(\w)\.disposed\|\|\1\.setConnectionTracking\(!0\)\},1\)/,
    )
  })

  it('a altura de uma pilha desconta NOTCH_HEIGHT por bloco seguinte', () => {
    expect(compressed).toContain(
      'getHeightWidth(){let a=this.height,b=this.width;var c=this.getNextBlock();if(c){c=c.getHeightWidth();const d=this.workspace.getRenderer().getConstants().NOTCH_HEIGHT;a+=c.height-d;',
    )
  })

  it('trocar de pai mede a posição pelo DOM e põe o SVG dentro do novo pai', () => {
    expect(compressed).toContain(
      'setParent(a){var b=this.parentBlock_;if(a!==b){startTextWidthCache$$module$build$src$core$utils$dom();super.setParent(a);stopTextWidthCache$$module$build$src$core$utils$dom();var c=this.getSvgRoot();if(!this.workspace.isClearing&&c){var d=this.getRelativeToSurfaceXY()',
    )
  })

  it('encaixar o seguinte usa a posição da conexão de cima dele (por isso o pai reencaixa)', () => {
    expect(compressed).toContain(
      'tightenEfficiently(){var a=this.targetConnection;const b=this.targetBlock();a&&b&&(a=Coordinate$$module$build$src$core$utils$coordinate.difference(this.offsetInBlock,a.offsetInBlock),b.translate(a.x,a',
    )
  })
})
