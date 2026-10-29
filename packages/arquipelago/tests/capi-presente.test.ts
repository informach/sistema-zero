import { expect, test } from 'bun:test'
import {
  BICHOS_DO_BOSQUE,
  criarSalvamentoInicial,
  migrarSalvamento,
  SALVAMENTO_MAX_BYTES,
  SalvamentoSchema,
} from '@sistemazero/arquipelago-contracts'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { receberPresenteDosBichos } from '../src/sistemas/bichos'
import { conciliarSalvamento } from '../src/sistemas/conciliar-salvamento'
import { comecarConversa } from '../src/sistemas/conversa-da-capi'
import { CORACOES_DA_PAGINA, FALA_DA_PAGINA } from '../src/sistemas/diario'

const AGORA = new Date('2026-10-28T12:00:00Z')
const HOJE = '2026-10-28'
const inicial = () => criarSalvamentoInicial(AGORA)
const todos = () => ({ ...inicial(), bichos: { achados: [...BICHOS_DO_BOSQUE], adotado: null } })

test('quatro achados entregam uma salada e a marca no mesmo salvamento, sem mutar a entrada', () => {
  const s = todos()
  const antes = structuredClone(s)
  const r = comecarConversa(s, HOJE, 'p1')
  expect(r.salvamento.inventario.salada).toBe(1)
  expect(r.salvamento.presenteDosBichosEntregue).toBe(true)
  expect(r.falas.at(-1)).toContain('salada')
  expect(s).toEqual(antes)
  expect(SalvamentoSchema.parse(r.salvamento)).toEqual(r.salvamento)
})

test('zero a três achados não ganham presente', () => {
  for (let n = 0; n < 4; n++) {
    const s = { ...inicial(), bichos: { achados: BICHOS_DO_BOSQUE.slice(0, n), adotado: null } }
    const r = comecarConversa(s, HOJE, 'p1')
    expect(r.salvamento.inventario.salada).toBeUndefined()
    expect(r.salvamento.presenteDosBichosEntregue).toBe(false)
  }
})

test('quatro entradas repetidas não substituem os quatro bichos distintos', () => {
  const s = todos()
  s.bichos.achados = ['gato', 'gato', 'gato', 'gato']
  expect(comecarConversa(s, HOJE, 'p1').salvamento.inventario.salada).toBeUndefined()
})

test('ganha ao voltar com o quarto bicho, mesmo depois da primeira conversa do dia', () => {
  const a = comecarConversa(inicial(), HOJE, 'p1').salvamento
  const r = comecarConversa({ ...a, bichos: todos().bichos }, HOJE, 'p1')
  expect(r.salvamento.inventario.salada).toBe(1)
  expect(r.salvamento.moradores.capi.amizade).toBe(a.moradores.capi.amizade)
  expect(r.falas.at(-1)).toContain('salada')
})

test('reabrir, passar o dia e recarregar o salvamento não repetem a entrega', () => {
  const a = comecarConversa(todos(), HOJE, 'p1').salvamento
  const lido = migrarSalvamento(JSON.parse(JSON.stringify(a)))
  if (!lido) throw Error('Salvamento deve reabrir')
  for (const dia of [HOJE, '2026-10-29']) {
    const r = comecarConversa(lido, dia, 'p1')
    expect(r.salvamento.inventario.salada).toBe(1)
    expect(r.salvamento.presenteDosBichosEntregue).toBe(true)
    expect(r.falas.join(' ')).not.toContain('Preparei uma salada')
  }
})

test('saladas no limite adiam a entrega, e liberar uma vaga permite receber exatamente uma', () => {
  const s = { ...todos(), inventario: { salada: 999 } }
  const r = comecarConversa(s, HOJE, 'p1')
  expect(r.salvamento.inventario.salada).toBe(999)
  expect(r.salvamento.presenteDosBichosEntregue).toBe(false)
  expect(r.falas.at(-1)).toContain('espaço')
  const recebeu = comecarConversa({ ...r.salvamento, inventario: { salada: 998 } }, HOJE, 'p1')
  expect(recebeu.salvamento.inventario.salada).toBe(999)
  expect(recebeu.salvamento.presenteDosBichosEntregue).toBe(true)
})

test('presente fica ao final, depois da página do diário, sem travessão ou exclamação', () => {
  const s = todos()
  s.moradores.capi.amizade = CORACOES_DA_PAGINA * 100 - 10
  const r = comecarConversa(s, HOJE, 'p1')
  const pagina = r.falas.indexOf(FALA_DA_PAGINA[0]!)
  expect(pagina).toBeGreaterThanOrEqual(0)
  expect(r.falas.slice(pagina, pagina + FALA_DA_PAGINA.length)).toEqual([...FALA_DA_PAGINA])
  expect(r.falas.slice(pagina + FALA_DA_PAGINA.length).join(' ')).toContain('salada')
  for (const fala of r.falas) expect(fala).not.toMatch(/[—!]/)
})

test('não marca a entrega se acrescentar a salada ultrapassaria os 64 KB', () => {
  const s = todos()
  s.inventario = {}
  // Cada chave respeita os 40 caracteres do contrato. Preenche sem tornar o dado inválido.
  for (let i = 0; ; i++) {
    const chave = `reserva-${String(i).padStart(4, '0')}-${'a'.repeat(27)}`
    s.inventario[chave] = 1
    if (new TextEncoder().encode(JSON.stringify(s)).length > SALVAMENTO_MAX_BYTES) {
      delete s.inventario[chave]
      break
    }
  }
  const restante = SALVAMENTO_MAX_BYTES - new TextEncoder().encode(JSON.stringify(s)).length
  if (restante >= 6) s.inventario['b'.repeat(restante - 5)] = 1
  expect(SalvamentoSchema.safeParse(s).success).toBe(true)
  expect(new TextEncoder().encode(JSON.stringify(s)).length).toBeLessThanOrEqual(
    SALVAMENTO_MAX_BYTES,
  )
  const r = receberPresenteDosBichos(s)
  expect(r.resultado).toBe('sem-espaco')
  expect(r.salvamento).toBe(s)
  expect(s.presenteDosBichosEntregue).toBe(false)
  delete s.inventario[Object.keys(s.inventario)[0]!]
  expect(receberPresenteDosBichos(s).resultado).toBe('entregue')
})

test('conciliação preserva marca e item juntos e não soma duas entregas concorrentes', () => {
  const base = todos()
  const recebeu = comecarConversa(base, HOJE, 'p1').salvamento
  expect(conciliarSalvamento(base, recebeu, recebeu)).toEqual(recebeu)
  expect(
    conciliarSalvamento(base, recebeu, { ...base, posicao: { x: 1, y: 2, z: 3 } }),
  ).toMatchObject({ presenteDosBichosEntregue: true, inventario: { salada: 1 } })
  expect(conciliarSalvamento(base, recebeu, { ...base, inventario: { milho: 1 } })).toBeNull()
})

test('playground prepara os quatro, mas só a conversa entrega o presente', async () => {
  const p = criarPlataformaFalsa({ persistir: false, bichos: 'achados' })
  const r = await p.servico.buscar('/salvamento')
  expect(r.corpo).toMatchObject({
    salvamento: {
      versao: 9,
      bichos: { achados: [...BICHOS_DO_BOSQUE] },
      presenteDosBichosEntregue: false,
    },
  })
})
