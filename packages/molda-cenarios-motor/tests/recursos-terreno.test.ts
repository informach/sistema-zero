import { expect, test } from 'bun:test'
import {
  AMOSTRAS_DA_PECA,
  type BaseDeTerreno,
  codificarPecaDeAlturas,
  codificarPecaDePintura,
  codificarRecursoDeBuracos,
  criarPinturaDeChao,
  digestDosBytes,
} from '@sistemazero/molda-cenarios-core/v2'
import { carregarPecasDeTerreno } from '../src/recursos-terreno'

const base = (digests: string[]): BaseDeTerreno => ({
  tipo: 'terreno',
  origem: { x: 0, z: 0 },
  passo: 1,
  colunas: 512,
  linhas: 64,
  min: 0,
  max: 255,
  fundo: 0,
  pecas: digests.map((digest, coluna) => ({ coluna, linha: 0, digest })),
})
const arquivo = (valor = 0) =>
  codificarPecaDeAlturas(new Float64Array(AMOSTRAS_DA_PECA).fill(valor), 0, 255)

test('carregamento confere hash, formato e intervalo; arquivos repetidos são lidos uma vez', async () => {
  const bytes = arquivo(),
    digest = await digestDosBytes(bytes)
  let chamadas = 0
  const b = base([digest, digest])
  const dados = await carregarPecasDeTerreno(
    b,
    async () => {
      chamadas++
      return bytes.buffer
    },
    new AbortController().signal,
  )
  expect(chamadas).toBe(1)
  expect(dados.size).toBe(1)
  const reutilizados = await carregarPecasDeTerreno(
    b,
    async () => {
      throw new Error('Não deveria reler')
    },
    new AbortController().signal,
    dados,
  )
  expect(reutilizados.get(digest)).toBe(dados.get(digest))
  const intervaloDoCache = await carregarPecasDeTerreno(
    { ...b, max: 100 },
    async () => {
      throw new Error('Não deveria ler')
    },
    new AbortController().signal,
    dados,
  ).catch((e: unknown) => e)
  expect(intervaloDoCache).toBeInstanceOf(Error)
  const trocado = await carregarPecasDeTerreno(
    b,
    async () => arquivo(1).buffer,
    new AbortController().signal,
  ).catch((e: unknown) => e)
  expect(trocado).toBeInstanceOf(Error)
  const intervalo = await carregarPecasDeTerreno(
    { ...b, max: 100 },
    async () => bytes.buffer,
    new AbortController().signal,
  ).catch((e: unknown) => e)
  expect(intervalo).toBeInstanceOf(Error)
  const versaoErrada = bytes.slice()
  versaoErrada[4] = 2
  const versao = await carregarPecasDeTerreno(
    base([await digestDosBytes(versaoErrada)]),
    async () => versaoErrada.buffer,
    new AbortController().signal,
  ).catch((e: unknown) => e)
  expect(versao).toBeInstanceOf(Error)
})

test('carrega pintura e buracos uma vez por hash e recusa papel ou quantidade de camadas divergente', async () => {
  const pintura = codificarPecaDePintura(criarPinturaDeChao({ colunas: 64, linhas: 64 }, 8), 0, 0),
    buracos = codificarRecursoDeBuracos(new Uint8Array(512)),
    dp = await digestDosBytes(pintura),
    db = await digestDosBytes(buracos)
  const b: BaseDeTerreno = {
    ...base([]),
    colunas: 64,
    solo: {
      camadas: Array.from({ length: 8 }, (_, i) => ({
        id: `c${i}`,
        nome: `Solo ${i}`,
        cor: '#ffffff',
      })),
      pecas: [{ coluna: 0, linha: 0, digest: dp }],
    },
    buracos: [{ coluna: 0, linha: 0, digest: db }],
  }
  let chamadas = 0
  const carregar = async (d: string) => {
    chamadas++
    return (d === dp ? pintura : buracos).buffer
  }
  const recursos = await carregarPecasDeTerreno(b, carregar, new AbortController().signal)
  expect(chamadas).toBe(2)
  expect(recursos.get(dp)?.tipo).toBe('pintura')
  expect(recursos.get(db)?.tipo).toBe('buracos')
  await expect(
    carregarPecasDeTerreno(
      { ...b, buracos: [{ coluna: 0, linha: 0, digest: dp }] },
      carregar,
      new AbortController().signal,
      recursos,
    ),
  ).rejects.toThrow('corresponde')
  await expect(
    carregarPecasDeTerreno(
      { ...b, solo: { ...b.solo!, camadas: b.solo!.camadas.slice(0, 7) } },
      carregar,
      new AbortController().signal,
      recursos,
    ),
  ).rejects.toThrow('corresponde')
})

test('leituras são limitadas a quatro e cancelamento interrompe a fila', async () => {
  const arquivos = await Promise.all(
    Array.from({ length: 8 }, async (_, i) => {
      const bytes = arquivo(i)
      return { bytes, digest: await digestDosBytes(bytes) }
    }),
  )
  const b = base(arquivos.map((a) => a.digest))
  let lendo = 0,
    maximo = 0,
    chamadas = 0
  const dados = await carregarPecasDeTerreno(
    b,
    async (digest) => {
      chamadas++
      lendo++
      maximo = Math.max(maximo, lendo)
      await Bun.sleep(1)
      lendo--
      return arquivos.find((a) => a.digest === digest)!.bytes.buffer
    },
    new AbortController().signal,
  )
  expect(maximo).toBe(4)
  expect(chamadas).toBe(8)
  expect(dados.size).toBe(8)
  const controle = new AbortController()
  chamadas = 0
  const falha = await carregarPecasDeTerreno(
    b,
    async (digest) => {
      chamadas++
      controle.abort(new Error('Sessão encerrada'))
      return arquivos.find((a) => a.digest === digest)!.bytes.buffer
    },
    controle.signal,
  ).catch((e: unknown) => e)
  expect(falha).toBeInstanceOf(Error)
  expect(chamadas).toBe(1)
})
