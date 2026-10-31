import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { isSectionExecutionRule } from '../../../packages/core/src/learning/project-execution'
import {
  isSectionCompletion,
  type SectionJavaScriptProjectCheck,
} from '../../../packages/core/src/learning/section-progression'
import { evaluateStudioProjectStructure } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import type { Project } from '../../../packages/studio/src/core/project'
import { SZIRV2Schema } from '../../../packages/studio/src/ir/schema'
import { criarManifesto } from './gerar-manifesto'

const manifesto = criarManifesto()
const [desafio] = manifesto.desafios
if (!desafio) throw new Error('sem desafio')
const GABARITO = desafio.conteudo.gabarito
const checks = desafio.conteudo.objetivos as SectionJavaScriptProjectCheck[]
const raiz = new URL('../../aulas-interativas/', import.meta.url)
const blocosDoFaisca = new Set(
  ['faisca/desafio-primeiro-jogo', 'faisca/o-jardim-secreto'].flatMap((curso) => {
    const dados = JSON.parse(readFileSync(new URL(`${curso}/blocos.json`, raiz), 'utf8'))
    return dados.blocks ?? dados['2d']
  }),
)
function tipos(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(tipos)
  const o = value as Record<string, unknown>
  return [
    ...(typeof o.type === 'string' && o.type.startsWith('sz_') ? [o.type] : []),
    ...Object.values(o).flatMap(tipos),
  ]
}

test('os arquivos importáveis correspondem à fonte, um quadro do Farol que não pinta', async () => {
  expect(await Bun.file(new URL('./farol.manifesto.json', import.meta.url)).json()).toEqual(
    manifesto,
  )
  expect(await Bun.file(new URL('./farol-adulto.manifesto.json', import.meta.url)).json()).toEqual(
    criarManifesto('adulto'),
  )
  expect(desafio.ilha).toBe('farol')
  expect(desafio.quadro).toBe(1)
  expect(desafio.conteudo.recompensa.cor).toBe(false)
  for (const p of [desafio.conteudo.projetoInicial, desafio.conteudo.gabarito]) {
    const project = p as { ir: unknown; blocksState: unknown }
    expect(SZIRV2Schema.safeParse(project.ir).success).toBe(true)
    expect([...new Set(tipos(project.blocksState))].filter((t) => !blocosDoFaisca.has(t))).toEqual(
      [],
    )
  }
  expect(isSectionCompletion({ version: 1, blockIds: [], projectChecks: checks })).toBe(true)
})

test('os critérios de estrutura valem no exemplo e faltam no projeto inicial', () => {
  for (const c of checks) {
    if (isSectionExecutionRule(c.rule)) continue
    expect(evaluateStudioProjectStructure(c.rule, desafio.conteudo.gabarito), c.id).toBe(true)
    expect(evaluateStudioProjectStructure(c.rule, desafio.conteudo.projetoInicial), c.id).toBe(
      false,
    )
  }
})

test('outra ideia, com outros nomes e desenhos, também cumpre: nada de resposta pronta', () => {
  const outro = structuredClone(desafio.conteudo.gabarito) as Project
  const trocar = (json: string) =>
    json
      .replaceAll('"temEstrela"', '"achouOLumi"')
      .replaceAll('"aceso"', '"festa"')
      .replaceAll('"estrela"', '"lumi"')
      .replaceAll('"farol"', '"concha"')
  const ir = JSON.parse(trocar(JSON.stringify(outro.ir)))
  expect(SZIRV2Schema.safeParse(ir).success).toBe(true)
  const projeto = { ...outro, ir, blocksState: buildWorkspaceStateFromIR(ir) }
  for (const c of checks) {
    if (isSectionExecutionRule(c.rule)) continue
    expect(evaluateStudioProjectStructure(c.rule, projeto), c.id).toBe(true)
  }
})

/** O gabarito com uma mudança na IR, como a criança faria nos blocos. */
function variante(
  mudar: (ir: { behavior: { start: any[]; events: any[]; loops: any[] } }) => void,
): Project {
  const projeto = structuredClone(GABARITO) as Project
  mudar(projeto.ir as never)
  expect(SZIRV2Schema.safeParse(projeto.ir).success).toBe(true)
  return { ...projeto, blocksState: buildWorkspaceStateFromIR(projeto.ir as never) }
}
const se = (cond: unknown, corpo: unknown[]) => ({
  type: 'if',
  cond,
  // biome-ignore lint/suspicious/noThenProperty: campo da árvore de instruções SZIR.
  then: corpo,
  else: [],
})
const falso = { type: 'bool', value: false }
const passa = (projeto: Project) =>
  Object.fromEntries(
    checks
      .filter((c) => !isSectionExecutionRule(c.rule))
      .map((c) => [c.id, evaluateStudioProjectStructure(c.rule, projeto)]),
  )

test('a reprodução da revisão: tudo dentro de "Se falso" não cumpre nada além de andar', () => {
  const projeto = variante((ir) => {
    for (const evento of ir.behavior.events) evento.body = [se(falso, evento.body)]
  })
  expect(passa(projeto)).toEqual({
    encontro: false,
    lembra: false,
    decide: false,
    recomeca: false,
    some: false,
  })
})

test('N3: tudo dentro de "Se podeAgir", com podeAgir sempre falso, também não cumpre nada', () => {
  const pode = { type: 'var', name: 'podeAgir' }
  const projeto = variante((ir) => {
    ir.behavior.start.unshift({ type: 'var', name: 'podeAgir', value: falso })
    for (const evento of ir.behavior.events) evento.body = [se(pode, evento.body)]
  })
  expect(passa(projeto)).toEqual({
    encontro: false,
    lembra: false,
    decide: false,
    recomeca: false,
    some: false,
  })
})

test('N3: a única atribuição de podeAgir está em código morto, e continua sem cumprir nada', () => {
  const pode = { type: 'var', name: 'podeAgir' }
  const projeto = variante((ir) => {
    ir.behavior.start.unshift({ type: 'var', name: 'podeAgir', value: falso })
    for (const evento of ir.behavior.events) evento.body = [se(pode, evento.body)]
    ir.behavior.events.push({
      type: 'g2d:onKey',
      key: 'p',
      body: [
        se(falso, [{ type: 'assign', name: 'podeAgir', value: { type: 'bool', value: true } }]),
      ],
    })
  })
  expect(Object.values(passa(projeto)).some(Boolean)).toBe(false)
})

test('encontro sem efeito: o corpo vazio ou morto não conta', () => {
  const projeto = variante((ir) => {
    for (const evento of ir.behavior.events)
      if (evento.type === 'g2d:onOverlap')
        evento.body = [
          se(
            { type: 'logical', op: '&&', left: { type: 'var', name: 'temEstrela' }, right: falso },
            evento.body,
          ),
        ]
  })
  const r = passa(projeto)
  expect(r.encontro).toBe(false)
  expect(r.lembra).toBe(false)
  expect(r.decide).toBe(false)
  expect(r.recomeca).toBe(true)
})

test('condição que nunca produz a consequência não é decisão', () => {
  const projeto = variante((ir) => {
    const noFarol = ir.behavior.events.find((e) => e.bVar === 'farol')
    noFarol.body[0].cond = {
      type: 'logical',
      op: '&&',
      left: { type: 'var', name: 'temEstrela' },
      right: falso,
    }
  })
  const r = passa(projeto)
  expect(r.encontro).toBe(true)
  expect(r.lembra).toBe(true)
  expect(r.decide).toBe(false)
})

test('Se ao contrário da lembrança: o ramo que roda depois do encontro está vazio', () => {
  const projeto = variante((ir) => {
    const noFarol = ir.behavior.events.find((e) => e.bVar === 'farol')
    noFarol.body[0].cond = {
      type: 'binop',
      op: '===',
      left: { type: 'var', name: 'temEstrela' },
      right: falso,
    }
    // Sem o desenho que lê "aceso", a única decisão é a do farol.
    ir.behavior.loops[0].body = ir.behavior.loops[0].body.filter((s: any) => s.type !== 'if')
  })
  expect(passa(projeto).decide).toBe(false)
})

test('tecla que não reinicia: o recomeço morto ou fora da tecla não conta', () => {
  const morto = variante((ir) => {
    const tecla = ir.behavior.events.find((e) => e.type === 'g2d:onKey')
    tecla.body = [se(falso, tecla.body)]
  })
  expect(passa(morto).recomeca).toBe(false)
  const semRecomeco = variante((ir) => {
    const tecla = ir.behavior.events.find((e) => e.type === 'g2d:onKey')
    tecla.body = []
  })
  expect(passa(semRecomeco).recomeca).toBe(false)
})

test('textos sem travessão e sem exclamação', () => {
  const textos = [
    desafio.conteudo.titulo,
    desafio.conteudo.enunciado,
    ...desafio.conteudo.dicas,
    desafio.conteudo.desafioExtra?.texto ?? '',
    ...checks.map((c) => c.label),
  ]
  for (const t of textos) expect(t).not.toMatch(/[—–!]/)
})
