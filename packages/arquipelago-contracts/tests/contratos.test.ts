import { describe, expect, test } from 'bun:test'
import {
  AcessoSchema,
  criarSalvamentoInicial,
  diaDeSaoPaulo,
  GravarSalvamentoSchema,
  ILHA_IDS,
  ILHAS,
  ilhaAberta,
  ilhasDoAnel,
  LIMITE_DIARIO_MAXIMO_MINUTOS,
  LIMITE_DIARIO_MINIMO_MINUTOS,
  LIMITE_DIARIO_PADRAO_MINUTOS,
  ManifestoDoClienteSchema,
  migrarSalvamento,
  normalizarLimiteDiario,
  POSICOES_DA_JORNADA,
  posicaoDoPostoKids,
  type QuartoDoJogo,
  QuartoSchema,
  SALVAMENTO_MAX_BYTES,
  SalvamentoSchema,
} from '../src'

describe('ilhas', () => {
  test('oito ilhas, uma por posição da jornada, ids únicos', () => {
    expect(ILHAS).toHaveLength(POSICOES_DA_JORNADA)
    expect(new Set(ILHAS.map((i) => i.id)).size).toBe(ILHA_IDS.length)
    expect(ILHAS.map((i) => i.posicao)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  test('a sua ilha e o Farol ficam no centro; as outras seis em anel', () => {
    expect(ilhasDoAnel().map((i) => i.id)).toEqual([
      'bosque',
      'vila-doce',
      'recife',
      'pico',
      'vale-dos-dinos',
      'nuvens',
    ])
    const angulos = ilhasDoAnel().map((i) => i.angulo)
    expect(new Set(angulos).size).toBe(6)
  })

  test('a ilha abre na posição dela e continua aberta depois', () => {
    expect(ilhaAberta('sua-ilha', 1)).toBe(true)
    expect(ilhaAberta('bosque', 1)).toBe(false)
    expect(ilhaAberta('bosque', 2)).toBe(true)
    expect(ilhaAberta('farol', 7)).toBe(false)
    expect(ilhaAberta('farol', 8)).toBe(true)
  })

  test('posto do Kids vira posição; desconhecido vira 1', () => {
    expect(posicaoDoPostoKids('noob')).toBe(1)
    expect(posicaoDoPostoKids('coder')).toBe(2)
    expect(posicaoDoPostoKids('god')).toBe(8)
    expect(posicaoDoPostoKids('inventado')).toBe(1)
    expect(posicaoDoPostoKids(null)).toBe(1)
  })
})

describe('limite diário', () => {
  test('padrão de 30 minutos', () => {
    expect(LIMITE_DIARIO_PADRAO_MINUTOS).toBe(30)
  })

  test('os pais escolhem mais ou menos, em passos de 5, dentro da faixa', () => {
    expect(normalizarLimiteDiario(45)).toBe(45)
    expect(normalizarLimiteDiario(47)).toBe(45)
    expect(normalizarLimiteDiario(1)).toBe(LIMITE_DIARIO_MINIMO_MINUTOS)
    expect(normalizarLimiteDiario(10_000)).toBe(LIMITE_DIARIO_MAXIMO_MINUTOS)
    expect(normalizarLimiteDiario(Number.NaN)).toBe(30)
  })

  test('o dia é o de São Paulo', () => {
    expect(diaDeSaoPaulo(new Date('2026-10-28T02:30:00Z'))).toBe('2026-10-27')
    expect(diaDeSaoPaulo(new Date('2026-10-28T03:30:00Z'))).toBe('2026-10-28')
  })
})

describe('salvamento', () => {
  const agora = new Date('2026-10-27T15:00:00Z')

  test('o inicial é válido e cabe no teto', () => {
    const s = criarSalvamentoInicial(agora)
    expect(SalvamentoSchema.parse(s)).toEqual(s)
    expect(new TextEncoder().encode(JSON.stringify(s)).length).toBeLessThan(SALVAMENTO_MAX_BYTES)
  })

  test('migrar devolve a versão atual; lixo e versão futura voltam null', () => {
    const s = criarSalvamentoInicial(agora)
    expect(migrarSalvamento(s)).toEqual(s)
    expect(migrarSalvamento({ ...s, versao: 99 })).toBeNull()
    expect(migrarSalvamento('nada')).toBeNull()
  })

  test('campo desconhecido é recusado (o formato é estrito)', () => {
    const s = criarSalvamentoInicial(agora)
    expect(SalvamentoSchema.safeParse({ ...s, moedas: 9999 }).success).toBe(false)
  })

  test('necessidade fora de 0 a 100 é recusada', () => {
    const s = criarSalvamentoInicial(agora)
    const ruim = { ...s, necessidades: { ...s.necessidades, fome: 150 } }
    expect(GravarSalvamentoSchema.safeParse({ revisaoBase: 0, salvamento: ruim }).success).toBe(
      false,
    )
  })
})

describe('porta da plataforma', () => {
  test('o quarto da plataforma passa no espelho do contrato', () => {
    const quarto: QuartoDoJogo = {
      theme: 'padrao',
      placedItems: [
        { itemId: 'cama', x: 1, y: 2, rot: 1 },
        { itemId: 'quadro-cortica', x: 3, y: 1, wall: 'right' },
        { itemId: 'luminaria-mesa', x: 0, y: 0, on: 'criado-mudo', slot: 0 },
      ],
      pet: 'pet-gato',
      wallColors: { left: '#ffeedd' },
      floor: 'piso-madeira-clara',
    }
    expect(QuartoSchema.parse(quarto)).toEqual(quarto)
  })

  test('o manifesto só aceita a entrada com nome simples (a régua de quem publica e repassa)', () => {
    const base = { versao: 'v1', versaoContrato: 1, geradoEm: '2026-10-27T15:00:00Z' }
    expect(ManifestoDoClienteSchema.safeParse({ ...base, entrada: 'entrada-abc.js' }).success).toBe(
      true,
    )
    expect(
      ManifestoDoClienteSchema.safeParse({ ...base, entrada: 'assets/entrada-abc.js' }).success,
    ).toBe(false)
    expect(ManifestoDoClienteSchema.safeParse({ ...base, entrada: 'modelo.glb' }).success).toBe(
      false,
    )
    expect(ManifestoDoClienteSchema.safeParse({ ...base, entrada: '../segredo.js' }).success).toBe(
      false,
    )
    expect(
      ManifestoDoClienteSchema.safeParse({ ...base, entrada: 'https://x.com/a.js' }).success,
    ).toBe(false)
  })

  test('acesso do adulto não tem limite', () => {
    expect(
      AcessoSchema.parse({
        liberado: true,
        motivo: null,
        limiteDiarioMinutos: null,
        usadoHojeSegundos: 0,
      }),
    ).toBeTruthy()
  })
})
