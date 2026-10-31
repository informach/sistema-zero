import { expect, test } from 'bun:test'
import { MundoDaRotinaSchema } from '../src/rotina-ferramenta'
import {
  criarSalvamentoInicial,
  migrarDaV14,
  migrarSalvamento,
  SalvamentoV14Schema,
  SalvamentoV15Schema,
} from '../src/salvamento'
import { inicialV14 } from './ajuda-salvamento'

const AGORA = new Date('2026-10-29T12:00:00Z')

test('a migração atual preserva a aparência de 80 caracteres aceita pela V14', () => {
  const antiga = SalvamentoV14Schema.parse(inicialV14(AGORA))
  const aparencia = { origem: 'criacao' as const, id: 'á'.repeat(80) }
  antiga.projetos.geladeira = {
    ganhoEm: AGORA.toISOString(),
    aparencia,
    aparencias: [aparencia],
  }
  const antes = structuredClone(antiga)
  const atual = migrarSalvamento(antiga)
  expect(atual?.projetos.geladeira).toEqual(antiga.projetos.geladeira)
  expect(antiga).toEqual(antes)
  expect(atual?.versao).toBe(23)
  const mundo = {
    horta: [],
    inventario: {},
    geladeira: atual?.projetos.geladeira ?? null,
    geladeiraPosta: true,
  }
  expect(MundoDaRotinaSchema.parse(mundo)).toEqual(mundo)
})

test('V15 mantém o filhote e recebe progresso novo sem inventar conquistas', () => {
  const antiga = migrarDaV14(inicialV14(AGORA))
  antiga.vale.filhote = {
    ovo: 3,
    nome: 'Tricê',
    aquecidoEm: '2026-10-29',
    comeuEm: '2026-10-29',
    carinhoEm: null,
    dias: 2,
  }
  expect(SalvamentoV15Schema.safeParse(antiga).success).toBe(true)
  const atual = migrarSalvamento(antiga)
  expect(atual?.vale).toEqual({ ...antiga.vale, fosseis: 0 })
  expect(atual).toMatchObject({
    versao: 23,
    nuvens: { constelacoes: 0 },
    farol: { pagina: false, concluido: false },
    clima: 'sol',
  })
})

test('recordes das Nuvens, constelações, final e clima atravessam JSON', () => {
  const salvo = {
    ...criarSalvamentoInicial(AGORA),
    nuvens: { constelacoes: 63 },
    farol: { pagina: true, concluido: true, galeria: [] },
    clima: 'chuva' as const,
    percursos: {
      'nuvens-saltos': [5, 60001] as [number, number],
      'nuvens-balao': [3, 42000] as [number, number],
    },
  }
  expect(migrarSalvamento(JSON.parse(JSON.stringify(salvo)))).toEqual(salvo)
  expect(SalvamentoV15Schema.safeParse({ ...salvo, versao: 15 }).success).toBe(false)
})

test('progresso impossível, clima desconhecido e versão futura são recusados', () => {
  const s = criarSalvamentoInicial(AGORA)
  for (const constelacoes of [-1, 64, 1.5])
    expect(migrarSalvamento({ ...s, nuvens: { constelacoes } })).toBeNull()
  expect(migrarSalvamento({ ...s, farol: { pagina: false, concluido: true } })).toBeNull()
  expect(migrarSalvamento({ ...s, clima: 'neve' })).toBeNull()
  expect(migrarSalvamento({ ...s, versao: 24 })).toBeNull()
})
