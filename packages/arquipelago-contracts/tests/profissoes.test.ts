import { expect, test } from 'bun:test'
import {
  ConcluirProfissaoSchema,
  conferirBandejasDaProfissao,
  IniciarProfissaoSchema,
  POSTOS_DA_VILA,
  pedidosDoTurno,
  SessaoDaProfissaoSchema,
} from '../src'

test('cada balcão confere seis pedidos da sessão, não aceita conclusão declarada', () => {
  for (const posto of POSTOS_DA_VILA) {
    const sessao = '11111111-1111-4111-8111-111111111111'
    const pedidos = pedidosDoTurno(posto, sessao, 0)
    const respostas = pedidos.map((p) => ({ ...p.itens }))
    expect(conferirBandejasDaProfissao(sessao, posto, respostas)).toBe(true)
    for (let i = 0; i < respostas.length; i++) {
      const errado = structuredClone(respostas)
      errado[i] = {}
      expect(conferirBandejasDaProfissao(sessao, posto, errado)).toBe(false)
    }
    expect(conferirBandejasDaProfissao(sessao, posto, respostas.slice(1))).toBe(false)
    expect(conferirBandejasDaProfissao(sessao, posto, [...respostas, respostas[0]!])).toBe(false)
    expect(ConcluirProfissaoSchema.safeParse({ sessao, respostas, moedas: 100 }).success).toBe(
      false,
    )
    expect(ConcluirProfissaoSchema.safeParse({ sessao, respostas, concluido: true }).success).toBe(
      false,
    )
    expect(
      SessaoDaProfissaoSchema.safeParse({
        id: sessao,
        versao: 1,
        posto,
        dia: '2026-10-29',
        pedidos,
        concluido: false,
        moedas: 5,
        pagamento: 'aguardando',
      }).success,
    ).toBe(true)
  }
})

test('contrato limita tamanho e dados que o navegador pode escolher', () => {
  expect(IniciarProfissaoSchema.safeParse({ posto: 'padaria', dia: '2026-10-29' }).success).toBe(
    false,
  )
  expect(IniciarProfissaoSchema.safeParse({ posto: 'outro' }).success).toBe(false)
  for (const quantidade of [0, -1, 1.5, 6, NaN, Infinity]) {
    expect(
      ConcluirProfissaoSchema.safeParse({
        sessao: crypto.randomUUID(),
        respostas: Array.from({ length: 6 }, () => ({ bolo: quantidade })),
      }).success,
    ).toBe(false)
  }
  expect(
    ConcluirProfissaoSchema.safeParse({
      sessao: crypto.randomUUID(),
      respostas: Array.from({ length: 6 }, () => ({ bolo: 3, sonho: 3 })),
    }).success,
  ).toBe(false)
})

test('sessão exige dia real e estado de pagamento coerente com a conclusão', () => {
  const id = crypto.randomUUID()
  const sessao = {
    id,
    versao: 1,
    posto: 'padaria',
    dia: '2026-10-29',
    pedidos: pedidosDoTurno('padaria', id, 0),
    concluido: false,
    moedas: 5,
    pagamento: 'aguardando',
  }
  for (const dia of ['2026-02-30', '2026-13-01', '2026-10-29T12:00:00Z'])
    expect(SessaoDaProfissaoSchema.safeParse({ ...sessao, dia }).success).toBe(false)
  expect(SessaoDaProfissaoSchema.safeParse({ ...sessao, concluido: true }).success).toBe(false)
  for (const pagamento of ['pendente', 'teto', 'creditado']) {
    expect(SessaoDaProfissaoSchema.safeParse({ ...sessao, pagamento }).success).toBe(false)
    expect(
      SessaoDaProfissaoSchema.safeParse({ ...sessao, pagamento, concluido: true }).success,
    ).toBe(true)
  }
})
