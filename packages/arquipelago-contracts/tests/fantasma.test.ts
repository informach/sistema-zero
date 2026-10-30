import { expect, test } from 'bun:test'
import {
  CORPO_DO_FANTASMA_MAX_BYTES,
  DURACAO_MAXIMA_DO_FANTASMA_MS,
  FANTASMA_MAX_BYTES,
  FantasmaSchema,
  GuardarFantasmaSchema,
  LeituraDoFantasmaSchema,
  PERCURSOS,
} from '../src'

const base = {
  versao: 1,
  percurso: 'bosque-copas',
  tempoMs: 100,
  passoMs: 100,
  amostras: [
    [0, 100, 0, 0],
    [100, 100, 0, 65535],
  ],
}

test('contrato aceita cada percurso real e o comando não recebe identidade, nome ou prêmio', () => {
  for (const percurso of PERCURSOS)
    expect(FantasmaSchema.safeParse({ ...base, percurso }).success).toBe(true)
  const comando = { versao: 1, revisaoBase: 1, fantasma: base }
  expect(GuardarFantasmaSchema.safeParse(comando).success).toBe(true)
  for (const extra of ['jogadorId', 'publico', 'nome', 'moedas'])
    expect(GuardarFantasmaSchema.safeParse({ ...comando, [extra]: 'não confiável' }).success).toBe(
      false,
    )
  for (const revisaoBase of [0, -1, 1.5, Number.POSITIVE_INFINITY])
    expect(GuardarFantasmaSchema.safeParse({ ...comando, revisaoBase }).success).toBe(false)
})

test('quantidade de amostras corresponde ao tempo, inclusive último trecho parcial', () => {
  expect(FantasmaSchema.safeParse({ ...base, tempoMs: 99 }).success).toBe(true)
  for (const tempoMs of [0, 101, 300001, Number.NaN])
    expect(FantasmaSchema.safeParse({ ...base, tempoMs }).success).toBe(false)
  for (const amostras of [[], [[0, 0, 0, 0]], [...base.amostras, [0, 0, 0, 0]]])
    expect(FantasmaSchema.safeParse({ ...base, amostras }).success).toBe(false)
})

test('cinco minutos com valores extremos cabem no teto do artefato e do comando', () => {
  const longo = {
    ...base,
    tempoMs: DURACAO_MAXIMA_DO_FANTASMA_MS,
    amostras: Array.from({ length: 3001 }, () => [-50000, -50000, -50000, 65535]),
  }
  expect(FantasmaSchema.safeParse(longo).success).toBe(true)
  expect(new TextEncoder().encode(JSON.stringify(longo)).byteLength).toBeLessThanOrEqual(
    FANTASMA_MAX_BYTES,
  )
  const comando = { versao: 1, revisaoBase: Number.MAX_SAFE_INTEGER, fantasma: longo }
  expect(new TextEncoder().encode(JSON.stringify(comando)).byteLength).toBeLessThanOrEqual(
    CORPO_DO_FANTASMA_MAX_BYTES,
  )
  expect(
    LeituraDoFantasmaSchema.safeParse({ versao: 1, situacao: 'disponivel', fantasma: longo })
      .success,
  ).toBe(true)
})

test('coordenadas, giro, versão, chaves desconhecidas e respostas sem trajeto são estritos', () => {
  for (const amostra of [
    [50001, 0, 0, 0],
    [0, 0, 0, -1],
    [0, 0, 0, 65536],
    [0.5, 0, 0, 0],
    [0, 0, Number.NaN, 0],
  ])
    expect(
      FantasmaSchema.safeParse({ ...base, amostras: [amostra, base.amostras[1]] }).success,
    ).toBe(false)
  expect(FantasmaSchema.safeParse({ ...base, versao: 2 }).success).toBe(false)
  expect(FantasmaSchema.safeParse({ ...base, nome: 'Pessoa' }).success).toBe(false)
  expect(LeituraDoFantasmaSchema.safeParse({ versao: 1, situacao: 'ausente' }).success).toBe(true)
  expect(
    LeituraDoFantasmaSchema.safeParse({ versao: 1, situacao: 'ausente', fantasma: base }).success,
  ).toBe(false)
})
