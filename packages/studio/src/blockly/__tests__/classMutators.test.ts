import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace } from '../buildIR'
import { withWorkspaceLoad } from '../loadFence'
import { ensureBlocklyInitialized } from '../setup'

interface ExtendsApi extends Blockly.Block {
  addExtends_(): void
}
interface ParamsApi extends Blockly.Block {
  addParam_(): void
}
interface ArgsApi extends Blockly.Block {
  syncShape_(): void
}

function classDeclOf(ws: Blockly.Workspace) {
  const ir = buildIRFromWorkspace(ws)
  const decl = ir.js.find((s) => s.type === 'classDecl')
  if (decl?.type !== 'classDecl') throw new Error('sem classDecl')
  return decl
}

describe('mutators de classe — + adiciona herança e parâmetros', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('addExtends_ + campo SUPER → classDecl.superClass no IR', () => {
    const ws = new Blockly.Workspace()
    const cls = ws.newBlock('sz_js_class') as ExtendsApi
    cls.setFieldValue('Cao', 'NAME')

    // Antes de clicar no +, não há herança.
    expect(classDeclOf(ws).superClass).toBeUndefined()

    // Clicar no + abre a cláusula extends (com SUPER = 'Base' por padrão).
    cls.addExtends_()
    cls.setFieldValue('Animal', 'SUPER')
    expect(classDeclOf(ws).superClass).toBe('Animal')
  })

  it('addParam_ no construtor → ctorParams no IR', () => {
    const ws = new Blockly.Workspace()
    const cls = ws.newBlock('sz_js_class')
    cls.setFieldValue('Pessoa', 'NAME')
    const ctor = ws.newBlock('sz_js_constructor') as ParamsApi
    // Encaixa o construtor em MEMBERS da classe.
    const members = cls.getInput('MEMBERS')
    if (members?.connection && ctor.previousConnection) {
      members.connection.connect(ctor.previousConnection)
    }

    expect(classDeclOf(ws).ctorParams).toEqual([])

    ctor.addParam_()
    ctor.setFieldValue('nome', 'P0')
    expect(classDeclOf(ws).ctorParams).toEqual(['nome'])
  })

  it('rejeita renomear um parâmetro para um nome já usado por outro (evita constructor(x, x))', () => {
    const ws = new Blockly.Workspace()
    const cls = ws.newBlock('sz_js_class')
    cls.setFieldValue('Pessoa', 'NAME')
    const ctor = ws.newBlock('sz_js_constructor') as ParamsApi
    const members = cls.getInput('MEMBERS')
    if (members?.connection && ctor.previousConnection) {
      members.connection.connect(ctor.previousConnection)
    }

    ctor.addParam_()
    ctor.addParam_()
    ctor.setFieldValue('x', 'P0')
    ctor.setFieldValue('y', 'P1')
    expect(classDeclOf(ws).ctorParams).toEqual(['x', 'y'])

    // Renomear P1 para 'x' colidiria com P0 → o validador rejeita e mantém 'y',
    // evitando gerar `constructor(x, x)` (SyntaxError ao rodar).
    ctor.setFieldValue('x', 'P1')
    expect(ctor.getFieldValue('P1')).toBe('y')
    expect(classDeclOf(ws).ctorParams).toEqual(['x', 'y'])
  })

  it('ignora insertion markers ao montar a IR', () => {
    const ws = new Blockly.Workspace()
    const real = ws.newBlock('sz_js_class')
    real.setFieldValue('Pessoa', 'NAME')
    const marker = ws.newBlock('sz_js_class')
    marker.setFieldValue('Pessoa', 'NAME')
    marker.setInsertionMarker(true)

    const ir = buildIRFromWorkspace(ws)
    expect(ir.js.filter((s) => s.type === 'classDecl')).toHaveLength(1)
  })

  it('sincroniza argumentos de new Classe com parâmetros do construtor', () => {
    const ws = new Blockly.Workspace()
    const cls = ws.newBlock('sz_js_class')
    cls.setFieldValue('Pessoa', 'NAME')
    const ctor = ws.newBlock('sz_js_constructor') as ParamsApi
    const members = cls.getInput('MEMBERS')
    if (members?.connection && ctor.previousConnection) {
      members.connection.connect(ctor.previousConnection)
    }

    ctor.addParam_()
    ctor.setFieldValue('nome', 'P0')

    const createPessoa = ws.newBlock('sz_js_new_var') as ArgsApi
    createPessoa.setFieldValue('pessoa', 'VARNAME')
    createPessoa.setFieldValue('Pessoa', 'CLASS')
    createPessoa.syncShape_()

    expect(createPessoa.getInput('ARG0')).toBeTruthy()
    expect(createPessoa.getInput('ARG1')).toBeNull()
  })

  it('encolher a assinatura do construtor NÃO descarta argumentos já preenchidos', () => {
    // Regressão (finding #2): `new Pessoa("Ana", 20, true)` com o construtor de 3
    // parâmetros; ao aparar o construtor para 1 parâmetro, os args 2 e 3 não
    // podem sumir silenciosamente (eram desconectados e nunca reconectados —
    // viravam órfãos que o buildIR ignora).
    const ws = new Blockly.Workspace()
    const cls = ws.newBlock('sz_js_class')
    cls.setFieldValue('Pessoa', 'NAME')
    const ctor = ws.newBlock('sz_js_constructor') as ParamsApi & {
      params_: Array<{ name: string; id: string }>
      removeParam_(id: string): void
    }
    const members = cls.getInput('MEMBERS')
    if (members?.connection && ctor.previousConnection) {
      members.connection.connect(ctor.previousConnection)
    }
    ctor.addParam_()
    ctor.addParam_()
    ctor.addParam_()
    ctor.setFieldValue('nome', 'P0')
    ctor.setFieldValue('idade', 'P1')
    ctor.setFieldValue('ativo', 'P2')

    const novo = ws.newBlock('sz_js_new_var') as ArgsApi
    novo.setFieldValue('p', 'VARNAME')
    novo.setFieldValue('Pessoa', 'CLASS')
    novo.syncShape_()
    expect(novo.getInput('ARG2')).toBeTruthy()

    // Preenche os 3 espaços com expressões de verdade (não-sombra).
    connectValue(ws, novo, 'ARG0', 'sz_val_text', 'TEXT', 'Ana')
    connectValue(ws, novo, 'ARG1', 'sz_val_number', 'NUM', 20)
    connectValue(ws, novo, 'ARG2', 'sz_val_bool', 'VALUE', 'true')

    // Apara o construtor para 1 parâmetro (remove os 2 últimos) e re-sincroniza.
    const ids = ctor.params_.map((p) => p.id)
    ctor.removeParam_(ids[2] as string)
    ctor.removeParam_(ids[1] as string)
    novo.syncShape_()

    // A assinatura agora tem 1 nome, mas os 3 argumentos sobrevivem (a contagem
    // nunca cai abaixo dos espaços já preenchidos).
    const args = argsOf(ws)
    expect(args).toEqual([
      { type: 'str', value: 'Ana' },
      { type: 'num', value: 20 },
      { type: 'bool', value: true },
    ])
  })

  it('sincroniza argumentos de chamada de método usando o input MEMBERS da classe', () => {
    const ws = new Blockly.Workspace()
    const cls = ws.newBlock('sz_js_class')
    cls.setFieldValue('Pessoa', 'NAME')
    const method = ws.newBlock('sz_js_class_method') as ParamsApi
    method.setFieldValue('falar', 'NAME')
    const members = cls.getInput('MEMBERS')
    if (members?.connection && method.previousConnection) {
      members.connection.connect(method.previousConnection)
    }
    method.addParam_()
    method.setFieldValue('texto', 'P0')

    const createPessoa = ws.newBlock('sz_js_new_var')
    createPessoa.setFieldValue('pessoa', 'VARNAME')
    createPessoa.setFieldValue('Pessoa', 'CLASS')

    const call = ws.newBlock('sz_js_call_method') as ArgsApi
    call.setFieldValue('pessoa', 'OBJ')
    call.setFieldValue('falar', 'METHOD')
    call.syncShape_()

    expect(call.getInput('ARG0')).toBeTruthy()
    expect(call.getInput('ARG1')).toBeNull()
  })
})

interface ParamsApiFull extends Blockly.Block {
  addParam_(): void
  params_: Array<{ name: string; id: string }>
}
interface ObjectApi extends Blockly.Block {
  itemCount_: number
  plus(): void
  minus(): void
}
interface ArgsApiFull extends Blockly.Block {
  syncShape_(event?: Blockly.Events.Abstract | null): void
  resolveSignature_(event?: Blockly.Events.Abstract | null): string[] | null
  onchange(event?: Blockly.Events.Abstract): void
}

describe('paramsMutator.renameReporters respeita o escopo (sombra de parâmetro)', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('NÃO renomeia um parâmetro sombreado numa definição aninhada', () => {
    const ws = new Blockly.Workspace()
    // Função externa com o parâmetro `x`.
    const outer = ws.newBlock('sz_js_function') as ParamsApiFull
    outer.setFieldValue('externa', 'NAME')
    outer.addParam_()
    outer.setFieldValue('x', 'P0')

    // Corpo da externa: usa o relator `x` (deve ser renomeado).
    const outerUse = ws.newBlock('sz_js_var_create')
    outerUse.setFieldValue('a', 'NAME')
    const outerArg = ws.newBlock('sz_val_arg')
    outerArg.setFieldValue('x', 'NAME')
    connectInput(outerUse, 'VALUE', outerArg)
    connectStatement(outer, 'BODY', outerUse)

    // Definição ANINHADA no corpo da externa, com o MESMO nome de parâmetro `x`
    // (sombra) e um relator `x` que pertence ao escopo interno.
    const inner = ws.newBlock('sz_js_function') as ParamsApiFull
    inner.setFieldValue('interna', 'NAME')
    inner.addParam_()
    inner.setFieldValue('x', 'P0')
    const innerUse = ws.newBlock('sz_js_var_create')
    innerUse.setFieldValue('b', 'NAME')
    const innerArg = ws.newBlock('sz_val_arg')
    innerArg.setFieldValue('x', 'NAME')
    connectInput(innerUse, 'VALUE', innerArg)
    connectStatement(inner, 'BODY', innerUse)
    // Encadeia a função interna logo após o uso no corpo da externa.
    if (outerUse.nextConnection && inner.previousConnection) {
      outerUse.nextConnection.connect(inner.previousConnection)
    }

    // Renomeia o parâmetro `x` da função EXTERNA para `y`.
    outer.setFieldValue('y', 'P0')

    // O relator do corpo da externa virou `y`; o da interna (sombra) continua `x`.
    expect(outerArg.getFieldValue('NAME')).toBe('y')
    expect(innerArg.getFieldValue('NAME')).toBe('x')
  })
})

describe('objectMutator — minus preserva o texto da CHAVE no undo', () => {
  beforeAll(() => ensureBlocklyInitialized())

  // O Blockly despacha eventos via setTimeout(…,0); aguardar um macrotask
  // esvazia a fila para a pilha de undo (não há `TEST_ONLY.fireNow` no runtime).
  const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

  it('minus dispara um BlockChange de campo com o texto da CHAVE removida', async () => {
    const ws = new Blockly.Workspace()
    const obj = ws.newBlock('sz_val_object') as ObjectApi
    obj.plus()
    obj.setFieldValue('minhaChave', 'KEY1')
    await flush()

    const fieldChanges: Array<{ name?: string; oldValue?: unknown }> = []
    ws.addChangeListener((e) => {
      const ev = e as unknown as {
        type?: string
        element?: string
        name?: string
        oldValue?: unknown
      }
      if (ev.type === Blockly.Events.BLOCK_CHANGE && ev.element === 'field') {
        fieldChanges.push({ name: ev.name, oldValue: ev.oldValue })
      }
    })

    obj.minus()
    await flush()

    expect(obj.itemCount_).toBe(1)
    expect(obj.getField('KEY1')).toBeNull()
    // O evento que viabiliza o undo carrega o texto digitado pelo aluno.
    expect(fieldChanges).toContainEqual({ name: 'KEY1', oldValue: 'minhaChave' })
  })

  it('desfazer a remoção do último campo restaura a CHAVE digitada', async () => {
    const ws = new Blockly.Workspace()
    const obj = ws.newBlock('sz_val_object') as ObjectApi
    obj.plus()
    obj.setFieldValue('minhaChave', 'KEY1')
    await flush()

    obj.minus()
    await flush()
    expect(obj.itemCount_).toBe(1)
    expect(obj.getField('KEY1')).toBeNull()

    // Desfaz: a contagem volta a 2 e o texto da chave do aluno é restaurado.
    ws.undo(false)
    await flush()
    expect(obj.itemCount_).toBe(2)
    expect(obj.getFieldValue('KEY1')).toBe('minhaChave')
  })
})

describe('argsMutator.onchange — atalho barato evita o scan O(workspace)', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('pula resolveSignature_ quando os campos do próprio bloco não mudaram', () => {
    const ws = new Blockly.Workspace()
    const cls = ws.newBlock('sz_js_class')
    cls.setFieldValue('Pessoa', 'NAME')
    const ctor = ws.newBlock('sz_js_constructor') as ParamsApiFull
    const members = cls.getInput('MEMBERS')
    if (members?.connection && ctor.previousConnection) {
      members.connection.connect(ctor.previousConnection)
    }
    ctor.addParam_()
    ctor.setFieldValue('nome', 'P0')

    const novo = ws.newBlock('sz_js_new_var') as ArgsApiFull
    novo.setFieldValue('p', 'VARNAME')
    novo.setFieldValue('Pessoa', 'CLASS')

    // Conta quantas vezes o scan caro roda.
    let scans = 0
    const realResolve = novo.resolveSignature_.bind(novo)
    novo.resolveSignature_ = () => {
      scans += 1
      return realResolve()
    }

    // 1ª onchange (evento NESTE bloco): preKey ainda não cacheada → scan roda.
    const ev = new Blockly.Events.BlockMove(novo) as Blockly.Events.Abstract
    novo.onchange(ev)
    expect(scans).toBe(1)

    // 2ª onchange com o MESMO evento auto-direcionado e campos inalterados:
    // o atalho barato bate e o scan NÃO roda de novo.
    novo.onchange(ev)
    expect(scans).toBe(1)
  })
})

describe('argsMutator — varredura O(N·M) coalescida e cercada na carga', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('M blocos respondendo ao MESMO evento compartilham UMA varredura por tipo', () => {
    const ws = new Blockly.Workspace()
    const cls = ws.newBlock('sz_js_class')
    cls.setFieldValue('Pessoa', 'NAME')

    // Dois `novo X = new Pessoa(...)`: ambos resolvem a assinatura varrendo
    // `sz_js_class`. Sob o MESMO objeto de evento, a varredura é compartilhada.
    const a = ws.newBlock('sz_js_new_var') as ArgsApiFull
    a.setFieldValue('a', 'VARNAME')
    a.setFieldValue('Pessoa', 'CLASS')
    const b = ws.newBlock('sz_js_new_var') as ArgsApiFull
    b.setFieldValue('b', 'VARNAME')
    b.setFieldValue('Pessoa', 'CLASS')

    let classScans = 0
    const realGet = ws.getBlocksByType.bind(ws)
    ws.getBlocksByType = ((type: string, ordered?: boolean) => {
      if (type === 'sz_js_class') classScans += 1
      return realGet(type, ordered ?? false)
    }) as typeof ws.getBlocksByType

    // Evento de um TERCEIRO bloco (não-self para ambos): os dois `novo` passam
    // pela resolução. O mesmo objeto de evento é despachado aos dois.
    const ev = new Blockly.Events.BlockMove(cls) as Blockly.Events.Abstract
    a.onchange(ev)
    b.onchange(ev)

    // Sem coalescing seriam 2 varreduras de `sz_js_class`; com o cache por
    // evento, é 1.
    expect(classScans).toBe(1)
  })

  it('ignora os eventos intermediários enquanto uma carga está em voo', () => {
    const ws = new Blockly.Workspace()
    const cls = ws.newBlock('sz_js_class')
    cls.setFieldValue('Pessoa', 'NAME')
    const novo = ws.newBlock('sz_js_new_var') as ArgsApiFull
    novo.setFieldValue('p', 'VARNAME')
    novo.setFieldValue('Pessoa', 'CLASS')

    let scans = 0
    const realResolve = novo.resolveSignature_.bind(novo)
    novo.resolveSignature_ = ((event?: Blockly.Events.Abstract | null) => {
      scans += 1
      return realResolve(event)
    }) as typeof novo.resolveSignature_

    // Durante a cerca de carga, um BLOCK_CREATE intermediário é ignorado…
    withWorkspaceLoad(() => {
      const create = new Blockly.Events.BlockCreate(cls) as Blockly.Events.Abstract
      novo.onchange(create)
    })
    expect(scans).toBe(0)

    // …mas o FINISHED_LOADING final SEMPRE resolve a assinatura uma vez.
    withWorkspaceLoad(() => {
      const finished = new Blockly.Events.FinishedLoading(ws) as Blockly.Events.Abstract
      novo.onchange(finished)
    })
    expect(scans).toBe(1)
  })
})

/** Cria um bloco de valor, define um campo e o encaixa numa tomada ARG do pai. */
function connectValue(
  ws: Blockly.Workspace,
  parent: Blockly.Block,
  input: string,
  type: string,
  field: string,
  value: string | number,
): void {
  const child = ws.newBlock(type)
  child.setFieldValue(value, field)
  const conn = parent.getInput(input)?.connection
  if (conn && child.outputConnection) conn.connect(child.outputConnection)
}

/** Encaixa um bloco de valor numa tomada de valor (`input_value`) do pai. */
function connectInput(parent: Blockly.Block, input: string, child: Blockly.Block): void {
  const conn = parent.getInput(input)?.connection
  if (conn && child.outputConnection) conn.connect(child.outputConnection)
}

/** Encaixa um bloco de comando no topo de um input de statement do pai. */
function connectStatement(parent: Blockly.Block, input: string, child: Blockly.Block): void {
  const conn = parent.getInput(input)?.connection
  if (conn && child.previousConnection) conn.connect(child.previousConnection)
}

/** Lê os argumentos do `newInstance` (único) da IR, sem o `__id` dos blocos. */
function argsOf(ws: Blockly.Workspace): Array<Record<string, unknown>> {
  const ir = buildIRFromWorkspace(ws)
  const novo = ir.js.find((s) => s.type === 'newInstance')
  if (novo?.type !== 'newInstance') throw new Error('sem newInstance')
  return (novo.args ?? []).map((a) => {
    const { __id, ...rest } = a as unknown as Record<string, unknown>
    return rest
  })
}
