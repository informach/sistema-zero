import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial, LUMIS } from '@sistemazero/arquipelago-contracts'
import {
  PeriodoDaMedicaoInvalidoError,
  ServicoDaMedicao,
} from '../../src/application/servico-da-medicao'
import {
  type AgregadosDaMedicao,
  contarRotinas,
  montarMedicao,
  protegerContagem,
  protegerCoorte,
  protegerVoltaAoCurso,
} from '../../src/domain/medicao'

const c = { dia: '2026-10-01', pessoas: 10, seguinte: 5, dia7: 5 }
test('coorte pequena e complementar pequeno não revelam nenhuma parte da linha', () => {
  for (const delta of [
    { pessoas: 4, seguinte: 4, dia7: 4 },
    { seguinte: 1 },
    { seguinte: 9 },
    { dia7: 6 },
  ]) {
    const linha = protegerCoorte({ ...c, ...delta }, '2026-10-28')
    expect([linha.dia1.valor, linha.diaSeguinte.valor, linha.dia7.valor]).toEqual([
      null,
      null,
      null,
    ])
  }
  expect(protegerCoorte(c, '2026-10-28').dia7.valor).toBe(5)
  expect(protegerCoorte({ ...c, seguinte: 0, dia7: 10 }, '2026-10-28').diaSeguinte.valor).toBe(0)
})
test('retorno aguarda o encerramento do dia local e dia 7 significa D+6', () => {
  expect(protegerCoorte(c, '2026-10-02').diaSeguinte.situacao).toBe('aguardando')
  expect(protegerCoorte(c, '2026-10-03').diaSeguinte.valor).toBe(5)
  expect(protegerCoorte(c, '2026-10-07').dia7.situacao).toBe('aguardando')
  expect(protegerCoorte(c, '2026-10-08').dia7.valor).toBe(5)
})
test('muitos objetos de poucas pessoas continuam protegidos', () => {
  expect(protegerContagem({ quantidade: 100, pessoas: 4 }).valor).toBeNull()
  expect(protegerContagem({ quantidade: 10, pessoas: 5 }).valor).toBe(10)
})
const contagem = { quantidade: 10, pessoas: 5 }
const dados: AgregadosDaMedicao = {
  coortes: [c],
  pintaMolda: contagem,
  galeria: contagem,
  criacaoGuardada: contagem,
  desafiosAprovados: contagem,
}
test('eventos são opcionais e cada origem protege grupos pequenos independentemente da fotografia', () => {
  const filtro = { de: '2026-10-01', ate: '2026-10-28', publico: 'kids' as const }
  const agora = new Date('2026-10-29T12:00:00Z')
  expect(montarMedicao(filtro, dados, '2026-10-29', agora).mudancasDeAparencia).toBeUndefined()
  const report = montarMedicao(
    filtro,
    {
      ...dados,
      mudancasDeAparencia: {
        pintaMolda: { quantidade: 42, pessoas: 4 },
        criacaoGuardada: { quantidade: 8, pessoas: 5 },
        galeria: { quantidade: 0, pessoas: 0 },
      },
    },
    '2026-10-29',
    agora,
  )
  expect(report.mudancasDeAparencia).toEqual({
    pintaMolda: { situacao: 'poucos-dados', valor: null },
    criacaoGuardada: { situacao: 'disponivel', valor: 8 },
    galeria: { situacao: 'poucos-dados', valor: null },
  })
  expect(report.criacao.pintaMolda.valor).toBe(10)
  expect(report.semFonte).toContain('compras')
  expect(JSON.stringify(report)).not.toContain('42')
})
test('minijogos deixam de ser sem fonte e grupos pequenos continuam protegidos', () => {
  const r = montarMedicao(
    { de: '2026-10-01', ate: '2026-10-28', publico: 'kids' },
    { ...dados, minijogos: { quantidade: 20, pessoas: 4 } },
    '2026-10-29',
    new Date('2026-10-29T12:00:00Z'),
  )
  expect(r.minijogos).toEqual({ situacao: 'poucos-dados', valor: null })
  expect(r.semFonte).not.toContain('minijogos')
  expect(JSON.stringify(r)).not.toContain('jogadorId')
})
test('o adulto mede a volta pelos próprios dias de jogo; permanência e satisfação ficam sem fonte', () => {
  // As coortes do adulto vêm de `dias_de_jogo` (o repositório não lê o tempo do Kids para ele).
  const adulto = montarMedicao(
    { de: '2026-10-01', ate: '2026-10-28', publico: 'adulto' },
    dados,
    '2026-10-28',
    new Date('2026-10-28T12:00:00Z'),
  )
  expect(adulto.volta.situacao).toBe('disponivel')
  expect(adulto.volta.coortes).toHaveLength(dados.coortes.length)
  expect(adulto.semFonte).not.toContain('volta-adulto')
  expect(adulto.semFonte).toContain('permanencia')
  expect(adulto.semFonte).not.toContain('satisfacao-dos-pais')
  const kids = montarMedicao(
    { de: '2026-10-01', ate: '2026-10-28', publico: 'kids' },
    dados,
    '2026-10-28',
    new Date('2026-10-28T12:00:00Z'),
  )
  expect(kids.semFonte).toContain('satisfacao-dos-pais')
  expect(kids.semFonte).toContain('permanencia')
})
test('data futura é recusada antes do banco, pelo dia de São Paulo', async () => {
  let chamadas = 0
  const service = new ServicoDaMedicao(
    {
      async agregar() {
        chamadas++
        return dados
      },
      async finsDeSessao() {
        return new Map()
      },
    },
    () => new Date('2026-10-28T02:59:59Z'),
  )
  await expect(
    service.ler({ de: '2026-10-01', ate: '2026-10-28', publico: 'kids' }),
  ).rejects.toBeInstanceOf(PeriodoDaMedicaoInvalidoError)
  expect(chamadas).toBe(0)
  expect(
    (await service.ler({ de: '2026-10-01', ate: '2026-10-27', publico: 'kids' })).periodo.ate,
  ).toBe('2026-10-27')
})

test('volta ao curso: grupo pequeno ou complementar pequeno esconde os dois números', () => {
  const v = { pessoas: 10, pessoasComAula: 5, diasDeJogo: 30, diasComAula: 12 }
  expect(protegerVoltaAoCurso(v)).toEqual({
    diasDeJogo: { situacao: 'disponivel', valor: 30 },
    diasComAula: { situacao: 'disponivel', valor: 12 },
  })
  for (const delta of [
    { pessoas: 4, pessoasComAula: 0 },
    { pessoasComAula: 2 },
    { pessoasComAula: 8 },
  ])
    expect(protegerVoltaAoCurso({ ...v, ...delta }).diasComAula.valor).toBeNull()
  // Ninguém voltou (zero) não revela ninguém.
  expect(protegerVoltaAoCurso({ ...v, pessoasComAula: 0, diasComAula: 0 }).diasComAula.valor).toBe(
    0,
  )
})

describe('volta ao curso na Medição (mesma regra e rota do cartão dos pais)', () => {
  const AGORA = new Date('2026-10-28T15:00:00Z')
  const pessoas = Array.from(
    { length: 25 },
    (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  )
  const filtro = { de: '2026-10-01', ate: '2026-10-28', publico: 'kids' as const }
  // Cada pessoa jogou em 01/10 e 15/10 (15h UTC = meio-dia em São Paulo); metade voltou em 01/10.
  const fins = new Map(
    pessoas.map((p) => [p, [new Date('2026-10-01T15:00:00Z'), new Date('2026-10-15T15:00:00Z')]]),
  )
  const repo = {
    async agregar() {
      return dados
    },
    async finsDeSessao() {
      return fins
    },
  }
  function leituras() {
    const pedidos: Array<{ pessoas: number; dias: number }> = []
    return {
      pedidos,
      ligadas: () => true,
      async aulasConcluidas(usuarios: readonly string[], de: Date, ate: Date) {
        pedidos.push({
          pessoas: usuarios.length,
          dias: (ate.getTime() - de.getTime()) / 86_400_000,
        })
        return new Map(
          usuarios
            .filter((u) => Number(u.slice(-12)) % 2 === 0)
            .map((u) => [u, [new Date('2026-10-01T20:00:00Z')]]),
        )
      },
    }
  }

  test('soma pessoa e dia, respeita os tetos da rota e tira curso-24h de semFonte', async () => {
    const l = leituras()
    const r = await new ServicoDaMedicao(repo, () => AGORA, l).ler(filtro)
    // 25 pessoas, 2 dias cada; 13 (pares de 0 a 24) voltaram em 1 dia.
    expect(r.voltaAoCurso).toEqual({
      diasDeJogo: { situacao: 'disponivel', valor: 50 },
      diasComAula: { situacao: 'disponivel', valor: 13 },
    })
    expect(r.semFonte).not.toContain('curso-24h')
    expect(l.pedidos.every((p) => p.pessoas <= 20 && p.dias <= 9)).toBe(true)
  })

  test('sessão cujas 24 h ainda não passaram fica de fora', async () => {
    const recente = new Map(pessoas.map((p) => [p, [new Date('2026-10-28T12:00:00Z')]]))
    const r = await new ServicoDaMedicao(
      { ...repo, finsDeSessao: async () => recente },
      () => AGORA,
      leituras(),
    ).ler(filtro)
    expect(r.voltaAoCurso?.diasDeJogo.valor).toBeNull()
  })

  test('Members desligado ou fora: sem a linha, curso-24h volta para semFonte', async () => {
    const fora = {
      ligadas: () => true,
      aulasConcluidas: async () => {
        throw new Error('fora')
      },
    }
    for (const l of [null, { ligadas: () => false, aulasConcluidas: fora.aulasConcluidas }, fora]) {
      const r = await new ServicoDaMedicao(repo, () => AGORA, l).ler(filtro)
      expect(r.voltaAoCurso).toBeUndefined()
      expect(r.semFonte).toContain('curso-24h')
    }
  })

  test('adultos não têm a linha', async () => {
    const r = await new ServicoDaMedicao(repo, () => AGORA, leituras()).ler({
      ...filtro,
      publico: 'adulto',
    })
    expect(r.voltaAoCurso).toBeUndefined()
  })
})

describe('A26: como se aprende no jogo', () => {
  const filtro = { de: '2026-10-01', ate: '2026-10-28', publico: 'kids' as const }
  const agora = new Date('2026-10-29T12:00:00Z')
  const aprendizagem = {
    conclusoesMedidas: { quantidade: 30, pessoas: 8 },
    acertoNaPrimeira: { quantidade: 12, pessoas: 6 },
    tentativas: { quantidade: 70, pessoas: 8 },
    semDica: { quantidade: 4, pessoas: 3 },
    dicas: { quantidade: 25, pessoas: 8 },
    reenvios: { quantidade: 9, pessoas: 5 },
  }

  test('cada número protege grupos pequenos; compras só com o Members', () => {
    const sem = montarMedicao(filtro, { ...dados, aprendizagem }, '2026-10-29', agora)
    expect(sem.aprendizagem).toMatchObject({
      conclusoesMedidas: { situacao: 'disponivel', valor: 30 },
      acertoNaPrimeira: { situacao: 'disponivel', valor: 12 },
      tentativas: { situacao: 'disponivel', valor: 70 },
      semDica: { situacao: 'poucos-dados', valor: null },
      reenvios: { situacao: 'disponivel', valor: 9 },
      rotinas: { situacao: 'poucos-dados', valor: null },
    })
    expect(sem.aprendizagem?.compras).toBeUndefined()
    expect(sem.semFonte).toContain('compras')
    const com = montarMedicao(filtro, { ...dados, aprendizagem }, '2026-10-29', agora, null, {
      compras: { quantidade: 11, pessoas: 7, moedas: 540 },
      rotinas: {
        rotinas: { quantidade: 9, pessoas: 6 },
        funcionam: { quantidade: 7, pessoas: 5 },
      },
    })
    expect(com.aprendizagem?.compras).toEqual({ situacao: 'disponivel', valor: 11 })
    expect(com.aprendizagem?.moedasNasCompras).toEqual({ situacao: 'disponivel', valor: 540 })
    expect(com.aprendizagem?.rotinasQueFuncionam).toEqual({ situacao: 'disponivel', valor: 7 })
    expect(com.semFonte).not.toContain('compras')
    // Repositório anterior, sem a aprendizagem: nada novo aparece e compras segue sem fonte.
    expect(montarMedicao(filtro, dados, '2026-10-29', agora).aprendizagem).toBeUndefined()
  })

  test('rotina que vai até o fim funciona; a que para no meio não; salvamento ilegível sai', () => {
    const [um, dois] = LUMIS
    const s = criarSalvamentoInicial(agora)
    const salvamento = {
      ...s,
      lumis: { [um!]: 1, [dois!]: 1 },
      rotinas: {
        [um!]: [{ c: 'quando-amanhecer' }, { c: 'voar-ate', a: 'horta' }, { c: 'regar' }],
        // Regar longe da horta para a rotina no meio.
        [dois!]: [{ c: 'quando-amanhecer' }, { c: 'regar' }],
      },
    }
    expect(
      contarRotinas(
        [
          { jogadorId: 'a', dados: salvamento },
          { jogadorId: 'b', dados: { versao: 999 } },
        ],
        agora,
      ),
    ).toEqual({
      rotinas: { quantidade: 2, pessoas: 1 },
      funcionam: { quantidade: 1, pessoas: 1 },
    })
  })
})
