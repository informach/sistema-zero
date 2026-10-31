import { expect, test } from 'bun:test'
import { criarSalvamentoInicial, type Obra } from '@sistemazero/arquipelago-contracts'
import { conciliarSalvamento, mesmosDados } from '../src/sistemas/conciliar-salvamento'

const base = criarSalvamentoInicial(new Date('2026-10-28T10:00:00Z'))
const obra: Obra = {
  paredes: [{ x: 0, z: 0, eixo: 'x', n: 4 }],
  aberturas: [],
  pisos: [],
  objetos: [],
  cercas: [],
  caminhos: [],
  canteiros: [],
  moveis: [],
}

test('V4 preserva construção local ao conciliar progresso remoto independente', () => {
  const local = { ...base, construcao: { ...base.construcao, casa: obra } }
  const remoto = { ...base, casa: { portaNova: true } }
  expect(conciliarSalvamento(base, local, remoto)).toEqual({ ...local, casa: remoto.casa })
})

test('V4 preserva projeto azul local ao conciliar progresso remoto independente', () => {
  const local = {
    ...base,
    projetos: { geladeira: { ganhoEm: base.criadoEm, aparencia: null, aparencias: [] } },
  }
  const remoto = { ...base, casa: { portaNova: true } }
  expect(conciliarSalvamento(base, local, remoto)).toEqual({ ...local, casa: remoto.casa })
})

test('V4 não separa transferência da mochila para a geladeira', () => {
  const antes = {
    ...base,
    inventario: { milho: 2 },
    projetos: {
      geladeira: { ganhoEm: base.criadoEm, aparencia: null, aparencias: [], guardado: {} },
    },
  }
  const local = {
    ...antes,
    inventario: { milho: 1 },
    projetos: { geladeira: { ...antes.projetos.geladeira, guardado: { milho: 1 } } },
  }
  const remoto = { ...antes, casa: { portaNova: true } }
  expect(conciliarSalvamento(antes, local, remoto)).toEqual({ ...local, casa: remoto.casa })
})

test('V4 exige escolha quando as duas cópias alteram a obra', () => {
  const local = { ...base, construcao: { ...base.construcao, casa: obra } }
  const remoto = {
    ...base,
    construcao: { ...base.construcao, casa: { ...obra, cercas: obra.paredes } },
  }
  expect(conciliarSalvamento(base, local, remoto)).toBeNull()
})

test('reconhece dados iguais com inventário em outra ordem', () => {
  expect(mesmosDados({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
  expect(mesmosDados({ a: 1 }, { a: 1, b: undefined })).toBe(false)
})

test('não duplica consumo nem prêmio quando os dois aparelhos mudam a economia', () => {
  const local = { ...base, inventario: { milho: 2 } }
  const remoto = { ...base, inventario: { milho: 3 } }
  expect(conciliarSalvamento(base, local, remoto)).toBeNull()
})

test('não separa um presente de seu consumo na mochila', () => {
  const local = {
    ...base,
    inventario: {},
    moradores: { ...base.moradores, capi: { ...base.moradores.capi, amizade: 10 } },
  }
  const remoto = { ...base, necessidades: { ...base.necessidades, fome: 50 } }
  expect(conciliarSalvamento(base, local, remoto)).toBeNull()
})

test('une progresso independente, mantendo a economia inteira de quem a mudou', () => {
  const local = { ...base, inventario: { milho: 2 } }
  const remoto = { ...base, casa: { portaNova: true } }
  expect(conciliarSalvamento(base, local, remoto)).toEqual({ ...local, casa: { portaNova: true } })
})

test('reconhece envio confirmado e preserva alteração local posterior', () => {
  const enviado = { ...base, inventario: { milho: 2 } }
  const local = { ...enviado, inventario: { milho: 1 } }
  expect(conciliarSalvamento(enviado, local, enviado)).toEqual(local)
  expect(conciliarSalvamento(base, enviado, enviado)).toEqual(enviado)
})

test('dois jogos novos diferentes nunca se sobrepõem automaticamente', () => {
  const outro = criarSalvamentoInicial(new Date('2026-10-28T11:00:00Z'))
  expect(conciliarSalvamento(null, base, outro)).toBeNull()
})

test('V20: a galeria do Farol vale a da sessão que mudou; mudada nas duas, a criança escolhe', () => {
  const fim = { ...base, farol: { pagina: true, concluido: true, galeria: [] } }
  const jogo = ['j', '7d3f2c1a-5b6e-4f80-9a1b-2c3d4e5f6a7b'] as ['j', string]
  const minijogo = ['d', '1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d'] as ['d', string]
  const local = { ...fim, farol: { ...fim.farol, galeria: [jogo] } }
  // O remoto só mudou o clima: a galeria de cá fica.
  const remoto = { ...fim, clima: 'chuva' as const }
  expect(conciliarSalvamento(fim, local, remoto)?.farol.galeria).toEqual([jogo])
  expect(conciliarSalvamento(fim, remoto, local)?.farol.galeria).toEqual([jogo])
  const outra = { ...remoto, farol: { ...fim.farol, galeria: [null, minijogo] } }
  expect(conciliarSalvamento(fim, local, outra)).toBeNull()
})
