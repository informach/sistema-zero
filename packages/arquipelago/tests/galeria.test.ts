import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  APARENCIAS_GUARDADAS_MAXIMO,
  criarSalvamentoInicial,
  GALERIA,
  GravarSalvamentoSchema,
  type ProjetoAzul,
  ProjetoAzulSchema,
  SalvamentoGuardadoSchema,
} from '@sistemazero/arquipelago-contracts'
import { criarLojaDaGaleria } from '../src/estado/galeria'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { MOEDAS_DE_EXEMPLO } from '../src/plataforma/galeria-falsa'
import {
  aparenciasQueEleTem,
  estadoDoCartao,
  motivoDaRecusa,
  recadoDaCompra,
  sugestaoSemSaldo,
  usarAparencia,
} from '../src/sistemas/construcao/galeria'

const AGORA = new Date('2026-10-29T12:00:00Z')
const vazio: ProjetoAzul = { ganhoEm: AGORA.toISOString(), aparencia: null, aparencias: [] }
const GELADEIRA = GALERIA['geladeira-classica']
const daGaleria = { origem: 'galeria' as const, id: GELADEIRA.id }
const pintada = { origem: 'pinta' as const, id: 'p1' }

describe('usar uma aparência', () => {
  test('vira a em uso e fica guardada, sem repetir', () => {
    const p = usarAparencia(usarAparencia(vazio, pintada), daGaleria)
    expect(p.aparencia).toEqual(daGaleria)
    expect(p.aparencias).toEqual([pintada, daGaleria])
    const volta = usarAparencia(p, pintada)
    expect(volta.aparencia).toEqual(pintada)
    expect(volta.aparencias).toEqual([daGaleria, pintada])
    expect(ProjetoAzulSchema.safeParse(volta).success).toBe(true)
  })

  test('no teto, sai a mais antiga e nunca a que entrou', () => {
    let p = vazio
    for (let i = 0; i < APARENCIAS_GUARDADAS_MAXIMO + 3; i++)
      p = usarAparencia(p, { origem: 'pinta', id: `p${i}` })
    expect(p.aparencias).toHaveLength(APARENCIAS_GUARDADAS_MAXIMO)
    expect(p.aparencias.at(-1)).toEqual(p.aparencia ?? undefined)
    expect(p.aparencias[0]?.id).toBe('p3')
    expect(ProjetoAzulSchema.safeParse(p).success).toBe(true)
  })
})

describe('o cartão da galeria', () => {
  const galeria = (saldo: number | null, possuidas: string[] = [], ilimitado = false) => ({
    possuidas: possuidas as (typeof GELADEIRA.id)[],
    saldo,
    ilimitado,
  })

  test('com saldo: comprar, com quanto sobra; saldo desconhecido ou equipe: comprar sem conta', () => {
    expect(estadoDoCartao(GELADEIRA, galeria(100), vazio)).toEqual({
      tipo: 'comprar',
      depois: 100 - GELADEIRA.preco,
    })
    expect(estadoDoCartao(GELADEIRA, galeria(null), vazio)).toEqual({
      tipo: 'comprar',
      depois: null,
    })
    expect(estadoDoCartao(GELADEIRA, galeria(null, [], true), vazio).tipo).toBe('comprar')
  })

  test('sem saldo: diz quanto falta e sugere um desafio', () => {
    expect(estadoDoCartao(GELADEIRA, galeria(25), vazio)).toEqual({
      tipo: 'falta',
      falta: GELADEIRA.preco - 25,
    })
    expect(sugestaoSemSaldo(35)).toBe(
      'Faltam 35 moedas. Um desafio do Quadro das Cores paga 20 moedas.',
    )
    expect(sugestaoSemSaldo(1)).toStartWith('Faltam 1 moeda.')
  })

  test('já é dela: usar sem cobrar; em uso: só o selo', () => {
    expect(estadoDoCartao(GELADEIRA, galeria(0, [GELADEIRA.id]), vazio)).toEqual({ tipo: 'usar' })
    const vestida = usarAparencia(vazio, daGaleria)
    expect(estadoDoCartao(GELADEIRA, galeria(0, [GELADEIRA.id]), vestida)).toEqual({
      tipo: 'em-uso',
    })
  })

  test('suas aparências: as guardadas e as da galeria pagas, a em uso marcada', () => {
    const p = usarAparencia(vazio, pintada)
    expect(aparenciasQueEleTem('geladeira', p, [GELADEIRA.id, 'forno-classico'])).toEqual([
      { aparencia: pintada, rotulo: 'Pintada no Pinta', emUso: true },
      { aparencia: daGaleria, rotulo: GELADEIRA.nome, emUso: false },
    ])
    expect(aparenciasQueEleTem('geladeira', vazio, [])).toEqual([])
  })
})

describe('as recusas da compra', () => {
  test('cada resposta do serviço vira o recado certo, sem inventar número', () => {
    const saldo = motivoDaRecusa(409, {
      error: { code: 'SALDO_INSUFICIENTE' },
      preco: 60,
      saldo: 25,
    })
    expect(saldo).toEqual({ ok: false, motivo: 'saldo', preco: 60, saldo: 25 })
    if (!saldo.ok) expect(recadoDaCompra(saldo)).toStartWith('Faltam 35 moedas.')
    const semSaldo = motivoDaRecusa(409, {
      error: { code: 'SALDO_INSUFICIENTE' },
      preco: 60,
      saldo: null,
    })
    if (!semSaldo.ok) expect(recadoDaCompra(semSaldo)).toStartWith('Faltam moedas')
    expect(motivoDaRecusa(403, { error: { code: 'SOMENTE_LEITURA' } })).toEqual({
      ok: false,
      motivo: 'somente-leitura',
    })
    expect(motivoDaRecusa(403, { error: { code: 'ACESSO_BLOQUEADO' } })).toMatchObject({
      motivo: 'bloqueada',
    })
    for (const [status, corpo] of [
      [424, {}],
      [500, null],
      [409, { error: { code: 'SALDO_INSUFICIENTE' } }],
    ] as const)
      expect(motivoDaRecusa(status, corpo)).toMatchObject({ motivo: 'fora-do-ar' })
  })
})

describe('a loja da galeria com a plataforma de mentira', () => {
  test('lê o saldo, compra uma vez só e o salvamento aceita a aparência paga', async () => {
    const plataforma = criarPlataformaFalsa({ persistir: false, galeria: { moedas: 100 } })
    const loja = criarLojaDaGaleria(plataforma)
    await loja.getState().carregar()
    expect(loja.getState().dados).toEqual({ possuidas: [], saldo: 100, ilimitado: false })

    // Antes de pagar, o salvamento com a da galeria é recusado.
    const s = criarSalvamentoInicial(AGORA)
    const vestido = {
      ...s,
      projetos: { geladeira: usarAparencia(vazio, daGaleria) },
    }
    const gravar = (salvamento: unknown, revisaoBase: number) =>
      plataforma.servico.buscar('/salvamento', {
        metodo: 'PUT',
        corpo: GravarSalvamentoSchema.parse({ revisaoBase, salvamento }),
      })
    expect((await gravar(vestido, 0)).status).toBe(422)

    expect(await loja.getState().comprar(GELADEIRA.id)).toEqual({ ok: true })
    expect(loja.getState().dados).toEqual({
      possuidas: [GELADEIRA.id],
      saldo: 100 - GELADEIRA.preco,
      ilimitado: false,
    })
    // Comprar de novo não cobra.
    expect(await loja.getState().comprar(GELADEIRA.id)).toEqual({ ok: true })
    expect(loja.getState().dados?.saldo).toBe(100 - GELADEIRA.preco)

    const r = await gravar(vestido, 0)
    expect(r.status).toBe(200)
    expect(
      SalvamentoGuardadoSchema.parse(r.corpo).salvamento?.projetos.geladeira?.aparencia,
    ).toEqual(daGaleria)
  })

  test('reabrir o playground não esquece as compras do salvamento guardado', async () => {
    const guardados = new Map<string, string>()
    const antes = (globalThis as { localStorage?: unknown }).localStorage
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => guardados.get(k) ?? null,
      setItem: (k: string, v: string) => guardados.set(k, v),
      removeItem: (k: string) => guardados.delete(k),
    }
    try {
      const vestido = {
        ...criarSalvamentoInicial(AGORA),
        projetos: { geladeira: usarAparencia(vazio, daGaleria) },
      }
      const gravar = (p: ReturnType<typeof criarPlataformaFalsa>, revisaoBase: number) =>
        p.servico.buscar('/salvamento', {
          metodo: 'PUT',
          corpo: GravarSalvamentoSchema.parse({ revisaoBase, salvamento: vestido }),
        })
      const primeira = criarPlataformaFalsa({ persistir: true, galeria: { moedas: 100 } })
      const loja = criarLojaDaGaleria(primeira)
      await loja.getState().carregar()
      expect(await loja.getState().comprar(GELADEIRA.id)).toEqual({ ok: true })
      expect((await gravar(primeira, 0)).status).toBe(200)
      // A página recarregou: a mesma aparência continua paga, e o salvamento segue aceito.
      const reaberta = criarPlataformaFalsa({ persistir: true, galeria: { moedas: 100 } })
      expect((await gravar(reaberta, 1)).status).toBe(200)
    } finally {
      ;(globalThis as { localStorage?: unknown }).localStorage = antes
    }
  })

  test('a compra fica guardada mesmo quando o progresso com ela só chega depois de reabrir', async () => {
    const guardados = new Map<string, string>()
    const antes = (globalThis as { localStorage?: unknown }).localStorage
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => guardados.get(k) ?? null,
      setItem: (k: string, v: string) => guardados.set(k, v),
      removeItem: (k: string) => guardados.delete(k),
    }
    try {
      const primeira = criarPlataformaFalsa({ persistir: true })
      const loja = criarLojaDaGaleria(primeira)
      await loja.getState().carregar()
      expect(await loja.getState().comprar(GELADEIRA.id)).toEqual({ ok: true })
      // A página fechou antes de a fila gravar: o progresso com a aparência ficou no aparelho.
      const reaberta = criarPlataformaFalsa({ persistir: true })
      const vestido = {
        ...criarSalvamentoInicial(AGORA),
        projetos: { geladeira: usarAparencia(vazio, daGaleria) },
      }
      const r = await reaberta.servico.buscar('/salvamento', {
        metodo: 'PUT',
        corpo: GravarSalvamentoSchema.parse({ revisaoBase: 0, salvamento: vestido }),
      })
      expect(r.status).toBe(200)
      const lida = await reaberta.servico.buscar('/galeria')
      expect(lida.corpo).toMatchObject({
        possuidas: [GELADEIRA.id],
        saldo: MOEDAS_DE_EXEMPLO - GELADEIRA.preco,
      })
    } finally {
      ;(globalThis as { localStorage?: unknown }).localStorage = antes
    }
  })

  test('saldo curto: o motivo com quanto falta e o saldo de agora no cartão', async () => {
    const plataforma = criarPlataformaFalsa({ persistir: false, galeria: { moedas: 10 } })
    const loja = criarLojaDaGaleria(plataforma)
    await loja.getState().carregar()
    expect(await loja.getState().comprar(GELADEIRA.id)).toEqual({
      ok: false,
      motivo: 'saldo',
      preco: GELADEIRA.preco,
      saldo: 10,
    })
    expect(loja.getState().dados?.possuidas).toEqual([])
    expect(loja.getState().comprando).toBeNull()
  })

  test('galeria fora do ar: o cartão diz que não abriu e comprar não finge sucesso', async () => {
    const plataforma = criarPlataformaFalsa({
      persistir: false,
      galeria: { situacao: 'fora-do-ar' },
    })
    const loja = criarLojaDaGaleria(plataforma)
    await loja.getState().carregar()
    expect(loja.getState()).toMatchObject({ dados: null, fechada: true })
    expect(await loja.getState().comprar(GELADEIRA.id)).toEqual({
      ok: false,
      motivo: 'fora-do-ar',
    })
  })
})

test('os textos da galeria seguem a voz da casa (sem travessão nem exclamação)', () => {
  for (const arquivo of ['../src/interface/galeria.tsx', '../src/sistemas/construcao/galeria.ts']) {
    const fonte = readFileSync(new URL(arquivo, import.meta.url), 'utf8')
    const textos = [...fonte.matchAll(/(['`])((?:(?!\1).)*[A-Za-zÀ-ú](?:(?!\1).)*)\1/g)].map(
      (m) => m[2] ?? '',
    )
    for (const t of textos) {
      expect(t).not.toContain('—')
      expect(t).not.toMatch(/!(?!=)/)
    }
  }
})
