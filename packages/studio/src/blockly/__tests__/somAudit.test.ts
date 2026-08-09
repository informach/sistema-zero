import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement, JSStatementSchema } from '#ir'
import 'blockly/blocks'
import { parseJS } from '../../parsers/js'
import { CORE_BLOCKLY_BLOCK_TYPES } from '../../state/projectStore'
import { SOM_BLOCKS, SOM_GROUPS } from '../blocks/som'
import { buildIRFromWorkspace } from '../buildIR'
import { palettePathOf } from '../paletteMap'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'
import { attachBlockInContractContext } from './blockContractTestUtils'

/**
 * Categoria 🔊 Som do NÚCLEO — tocar os arquivos que a criança enviou em
 * qualquer projeto web/Canvas, sem extensão de jogo instalada.
 *
 * O que este arquivo guarda é o FIO INTEIRO: bloco → IR → blocos → IR → JS →
 * Ponte. É a mesma prova que os `blockAudit` das extensões fazem, e ela importa
 * aqui porque a categoria nasceu com SEIS pontos de registro obrigatórios (cor,
 * nível, CORE_BLOCKS, toolbox, paletteMap e blockCatalog) — esquecer qualquer um
 * some com o bloco em algum lugar sem quebrar nada de forma visível.
 */

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const saida: Record<string, unknown> = {}
    for (const [chave, filho] of Object.entries(value)) {
      if (chave !== '__id') saida[chave] = stripIds(filho)
    }
    return saida as T
  }
  return value
}

function irDoBloco(type: string): JSStatement[] {
  const workspace = new Blockly.Workspace()
  try {
    attachBlockInContractContext({
      workspace,
      type,
      kind: 'statement',
      expressionHost: 'sz_js_var_create',
      expressionInput: 'VALUE',
      loopHost: 'sz_canvas_anim_loop',
    })
    return stripIds(behaviorStatements(buildIRFromWorkspace(workspace)))
  } finally {
    workspace.dispose()
  }
}

function irPelosBlocos(js: JSStatement[]): JSStatement[] {
  const ir = { html: [], css: [], js, extensions: [] }
  const state = buildWorkspaceStateFromIR(ir as Parameters<typeof buildWorkspaceStateFromIR>[0])
  const workspace = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, workspace)
    return stripIds(behaviorStatements(buildIRFromWorkspace(workspace)))
  } finally {
    workspace.dispose()
  }
}

beforeAll(() => {
  ensureBlocklyInitialized()
})

describe('🔊 Som do núcleo — o fio fecha', () => {
  for (const definicao of SOM_BLOCKS) {
    it(`${definicao.type}: bloco → IR → blocos → IR → JS → Ponte`, () => {
      const ir = irDoBloco(definicao.type)
      expect(ir.length).toBeGreaterThan(0)
      // `rawJS` significaria que o gerador ou o parser não conhece o bloco, e a
      // criança perderia o bloco ao passar pela Ponte.
      expect(ir.some((s) => s.type === 'rawJS')).toBe(false)
      expect(ir.every((s) => JSStatementSchema.safeParse(s).success)).toBe(true)
      expect(irPelosBlocos(ir)).toEqual(ir)

      const code = compileStatements(ir, 0)
      expect(code).toContain('__szAudio.')
      expect(stripIds(parseJS(code))).toEqual(ir)
    })
  }

  it('o volume aceita VARIÁVEL no soquete, não só número', () => {
    // ⚠️ Defeito real (revisão de 08/2026): o parser só reconhecia
    // `NumericLiteral`, então uma variável da criança no soquete fazia o bloco
    // virar `rawJS` ao passar pela Ponte — ela perdia o bloco. Os testes acima
    // não pegavam porque só exercitam a sombra padrão (um número).
    const ir: JSStatement[] = [
      { type: 'somVolume', level: { type: 'var', name: 'meuVolume' } } as JSStatement,
    ]
    const code = compileStatements(ir, 0)
    expect(code).toContain('__szAudio.volume(meuVolume)')
    expect(stripIds(parseJS(code))).toEqual(ir)
  })

  it('o seletor de apelido conhece o "carregar" do núcleo', async () => {
    // ⚠️ Defeito real (revisão de 08/2026): `sz_som_load` ficou de fora do
    // `SOUND_DECL_BLOCKS` do FieldNamePicker. Os quatro irmãos (gk, g3k, w3d,
    // g3d) estavam lá; o do núcleo não. Resultado: a criança carregava o som com
    // um apelido e o seletor de "Tocar o som" abria VAZIO.
    const fonte = await Bun.file(new URL('../fields/FieldNamePicker.ts', import.meta.url)).text()
    const bloco = fonte.slice(fonte.indexOf('const SOUND_DECL_BLOCKS'))
    expect(bloco.slice(0, bloco.indexOf('}'))).toContain('sz_som_load')
  })

  it('todo bloco está na allowlist do núcleo', () => {
    // ⚠️ A allowlist é TUDO-OU-NADA no load: um tipo faltando não some só com
    // aquele bloco, zera TODOS os blocos do projeto da criança.
    for (const definicao of SOM_BLOCKS) {
      expect(CORE_BLOCKLY_BLOCK_TYPES.has(definicao.type)).toBe(true)
    }
  })

  it('todo bloco tem caminho de paleta (a categoria está registrada nos 6 pontos)', () => {
    for (const definicao of SOM_BLOCKS) {
      const caminho = palettePathOf(definicao.type)
      expect(caminho[0]).toBe('Som')
      expect(caminho.length).toBeGreaterThan(1)
    }
  })

  it('cada bloco está em exatamente UM subgrupo', () => {
    const vistos = new Map<string, number>()
    for (const grupo of SOM_GROUPS) {
      for (const tipo of grupo.types) vistos.set(tipo, (vistos.get(tipo) ?? 0) + 1)
    }
    for (const definicao of SOM_BLOCKS) {
      expect(vistos.get(definicao.type)).toBe(1)
    }
  })

  it('a copy não vaza vocabulário de máquina', () => {
    // Espelha o `canvasAudit` (que proíbe `ctx.`/`Image`/`requestAnimationFrame`):
    // a criança lê "som" e "música", nunca `Audio`, `dataUrl` nem "loop".
    const proibidos = ['Audio', 'dataUrl', '__SZGAME_SOUNDS', '__szAudio', 'mp3', 'loop']
    for (const definicao of SOM_BLOCKS) {
      const visivel = `${definicao.message0 ?? ''} ${definicao.tooltip ?? ''}`
      for (const palavra of proibidos) {
        expect(visivel.includes(palavra)).toBe(false)
      }
    }
  })

  it('só o "carregar" nasce no Ao iniciar; a música é criadora de recurso', () => {
    // ⚠️ Carregar NÃO é molde: molde é a receita que a criança escreve; trazer
    // um arquivo que já existe é preparação de partida.
    expect(SOM_BLOCKS.find((b) => b.type === 'sz_som_load')?.placement).toBe('start-only-command')
    // `resource-creator`: dentro de um laço, a faixa recomeçaria a cada quadro.
    expect(SOM_BLOCKS.find((b) => b.type === 'sz_som_play_music')?.placement).toBe(
      'resource-creator',
    )
  })
})
