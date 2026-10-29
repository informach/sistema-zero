import {
  CARTAS_LUMI,
  CASOS_DA_ESCOLHA,
  type CartaoDaRotina,
  type CartasDoJogador,
  CONDICOES_DA_ROTINA,
  cartasNaMao,
  LIMITES_DA_ROTINA,
  validarRotina,
} from '@sistemazero/arquipelago-contracts'
import { CATEGORY_COLORS, ensureWhiteTextContrast } from '@sistemazero/studio/blockly-theme'
import * as Blockly from 'blockly/core'

const PREFIXO = 'sz_lumi_'
const cor = {
  quando: CATEGORY_COLORS.events,
  acao: ensureWhiteTextContrast(CATEGORY_COLORS.canvas3d, 4.8),
  controle: ensureWhiteTextContrast(CATEGORY_COLORS.canvas, 4.8),
}
const condicoes = {
  maduro: 'o canteiro está maduro',
  'precisa-de-agua': 'o canteiro precisa de água',
  carregando: 'o Lumi carrega algo',
  'lembra-menos-que': 'o número lembrado é menor que',
}
export function tipoDoBlocoLumi(c: string): string {
  return PREFIXO + c
}

export function registrarBlocosLumi(): void {
  for (const carta of CARTAS_LUMI) {
    const type = tipoDoBlocoLumi(carta.id)
    if (Blockly.Blocks[type]) continue
    Blockly.Blocks[type] = {
      init(this: Blockly.Block) {
        this.setColour(cor[carta.tipo])
        this.setTooltip(carta.efeito)
        this.setNextStatement(true, 'Lumi')
        if (carta.tipo !== 'quando') this.setPreviousStatement(true, 'Lumi')
        else this.hat = 'cap'
        const input = this.appendDummyInput().appendField(carta.nome)
        if (carta.id === 'voar-ate')
          input.appendField(
            new Blockly.FieldDropdown([
              ['horta', 'horta'],
              ['geladeira', 'geladeira'],
            ]),
            'A',
          )
        if (['repetir', 'esperar', 'guardar-na-memoria'].includes(carta.id)) {
          const range =
            carta.id === 'repetir'
              ? LIMITES_DA_ROTINA.vezes
              : carta.id === 'esperar'
                ? LIMITES_DA_ROTINA.segundos
                : LIMITES_DA_ROTINA.memoria
          input.appendField(new Blockly.FieldNumber(range.min, range.min, range.max, 1), 'N')
        }
        if (carta.id === 'se' || carta.id === 'enquanto') {
          input.appendField(
            new Blockly.FieldDropdown(CONDICOES_DA_ROTINA.map((c) => [condicoes[c], c])),
            'SE',
          )
          input.appendField(new Blockly.FieldNumber(1, 1, 99, 1), 'N')
          const ajustar = () =>
            this.getField('N')?.setVisible(this.getFieldValue('SE') === 'lembra-menos-que')
          this.setOnChange(ajustar)
          ajustar()
        }
        if (['repetir', 'para-cada', 'enquanto', 'se'].includes(carta.id))
          this.appendStatementInput('D').setCheck('Lumi').appendField('fazer')
        if (carta.id === 'escolha')
          for (const c of CASOS_DA_ESCOLHA)
            this.appendStatementInput(c)
              .setCheck('Lumi')
              .appendField(c === 'precisa-de-agua' ? 'precisa de água' : c)
      },
    }
  }
}

export function caixaDeBlocosLumi(
  cartas: CartasDoJogador | null,
): Blockly.utils.toolbox.ToolboxInfo {
  const naMao = cartasNaMao(cartas)
  return {
    kind: 'categoryToolbox',
    contents: (['quando', 'acao', 'controle'] as const).map((tipo) => ({
      kind: 'category',
      name: { quando: 'Quando', acao: 'Ação', controle: 'Controle' }[tipo],
      colour: cor[tipo],
      contents: CARTAS_LUMI.filter((c) => c.tipo === tipo).map((c) => ({
        kind: 'block',
        type: tipoDoBlocoLumi(c.id),
        enabled: tipo !== 'controle' || Boolean(naMao?.has(c.id)),
      })),
    })),
  }
}

/** Restaura uma cadeia compacta, sem guardar o workspace no salvamento do jogo. */
export function carregarRotinaLumi(
  workspace: Blockly.Workspace,
  lista: readonly CartaoDaRotina[],
): void {
  registrarBlocosLumi()
  workspace.clear()
  function cadeia(cartoes: readonly CartaoDaRotina[]): Blockly.Block | null {
    let primeiro: Blockly.Block | null = null,
      anterior: Blockly.Block | null = null
    for (const c of cartoes) {
      const bloco = workspace.newBlock(tipoDoBlocoLumi(c.c))
      if ('a' in c) bloco.setFieldValue(c.a, 'A')
      if ('se' in c) bloco.setFieldValue(c.se, 'SE')
      if ('n' in c) bloco.setFieldValue(String(c.n), 'N')
      if ('d' in c) {
        const filho = cadeia(c.d)
        if (filho?.previousConnection)
          bloco.getInput('D')?.connection?.connect(filho.previousConnection)
      }
      if (c.c === 'escolha')
        for (const caso of CASOS_DA_ESCOLHA) {
          const filho = cadeia(c.casos[caso] ?? [])
          if (filho?.previousConnection)
            bloco.getInput(caso)?.connection?.connect(filho.previousConnection)
        }
      if (anterior?.nextConnection && bloco.previousConnection)
        anterior.nextConnection.connect(bloco.previousConnection)
      primeiro ??= bloco
      anterior = bloco
      if ('initSvg' in bloco) {
        ;(bloco as Blockly.BlockSvg).initSvg()
        ;(bloco as Blockly.BlockSvg).render()
      }
    }
    return primeiro
  }
  const primeiro = cadeia(lista)
  primeiro?.moveBy(24, 24)
}

/** Recusa peças soltas e estranhas: nunca descarta silenciosamente o trabalho da criança. */
export function lerRotinaLumi(
  workspace: Blockly.Workspace,
  cartas: CartasDoJogador | null,
): {
  rotina: CartaoDaRotina[]
  blocos: Map<CartaoDaRotina, string>
} {
  const todos = workspace.getAllBlocks(false).filter((b) => !b.isInsertionMarker())
  if (todos.length > LIMITES_DA_ROTINA.cartoesPorRotina) throw Error('Use até 16 blocos na rotina.')
  const topos = workspace.getTopBlocks(false).filter((b) => !b.isInsertionMarker())
  if (topos.length !== 1)
    throw Error('Encaixe todos os blocos em uma rotina, começando com Quando.')
  const blocos = new Map<CartaoDaRotina, string>()
  const vistos = new Set<string>()
  function cadeia(inicio: Blockly.Block | null, nivel = 0): CartaoDaRotina[] {
    if (nivel > LIMITES_DA_ROTINA.profundidade)
      throw Error('Use até 3 níveis de blocos dentro de blocos.')
    const lista: CartaoDaRotina[] = []
    for (let b = inicio; b; b = b.getNextBlock()) {
      if (vistos.has(b.id)) throw Error('Confira os encaixes da rotina.')
      vistos.add(b.id)
      const id = b.type.slice(PREFIXO.length)
      if (!b.type.startsWith(PREFIXO) || !CARTAS_LUMI.some((c) => c.id === id) || !b.isEnabled())
        throw Error('Use os blocos disponíveis para esta rotina.')
      let c: CartaoDaRotina
      switch (id) {
        case 'voar-ate':
          c = { c: id, a: b.getFieldValue('A') }
          break
        case 'repetir':
          c = {
            c: id,
            n: Number(b.getFieldValue('N')),
            d: cadeia(b.getInputTargetBlock('D'), nivel + 1),
          }
          break
        case 'para-cada':
          c = { c: id, d: cadeia(b.getInputTargetBlock('D'), nivel + 1) }
          break
        case 'se':
        case 'enquanto': {
          const se = b.getFieldValue('SE')
          c = {
            c: id,
            se,
            ...(se === 'lembra-menos-que' ? { n: Number(b.getFieldValue('N')) } : {}),
            d: cadeia(b.getInputTargetBlock('D'), nivel + 1),
          }
          break
        }
        case 'escolha': {
          const casos: Extract<CartaoDaRotina, { c: 'escolha' }>['casos'] = {}
          for (const caso of CASOS_DA_ESCOLHA) {
            const dentro = b.getInputTargetBlock(caso)
            if (dentro) casos[caso] = cadeia(dentro, nivel + 1)
          }
          c = { c: id, casos }
          break
        }
        case 'esperar':
        case 'guardar-na-memoria':
          c = { c: id, n: Number(b.getFieldValue('N')) }
          break
        case 'quando-amanhecer':
        case 'quando-anoitecer':
        case 'regar':
        case 'colher':
        case 'guardar':
        case 'contar':
          c = { c: id }
          break
        default:
          throw Error('Este bloco não pertence à rotina.')
      }
      lista.push(c)
      blocos.set(c, b.id)
    }
    return lista
  }
  const rotina = cadeia(topos[0] ?? null)
  if (vistos.size !== todos.length) throw Error('Encaixe todos os blocos na rotina.')
  const recusa = validarRotina(rotina, cartasNaMao(cartas))
  if (recusa) throw Error(recusa.motivo)
  return { rotina, blocos }
}
