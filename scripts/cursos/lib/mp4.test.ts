import { afterAll, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { duracaoDoMp4 } from './mp4'

// MP4 mínimos montados à mão: ftyp, mdat e moov com a mvhd (versão 0 e 1, moov no fim como
// sai de muitos editores, e caixa de tamanho 64 bits).
const pasta = mkdtempSync(join(tmpdir(), 'sz-mp4-'))
afterAll(() => rmSync(pasta, { recursive: true, force: true }))

function caixa(tipo: string, conteudo: Buffer, grande = false): Buffer {
  if (!grande) {
    const cab = Buffer.alloc(8)
    cab.writeUInt32BE(8 + conteudo.length, 0)
    cab.write(tipo, 4, 'latin1')
    return Buffer.concat([cab, conteudo])
  }
  const cab = Buffer.alloc(16)
  cab.writeUInt32BE(1, 0)
  cab.write(tipo, 4, 'latin1')
  cab.writeBigUInt64BE(BigInt(16 + conteudo.length), 8)
  return Buffer.concat([cab, conteudo])
}

function mvhd(versao: 0 | 1, escala: number, duracao: number): Buffer {
  const b = Buffer.alloc(versao === 1 ? 32 : 20)
  b[0] = versao
  if (versao === 1) {
    b.writeUInt32BE(escala, 20)
    b.writeBigUInt64BE(BigInt(duracao), 24)
  } else {
    b.writeUInt32BE(escala, 12)
    b.writeUInt32BE(duracao, 16)
  }
  return caixa('mvhd', b)
}

function arquivo(nome: string, ...caixas: Buffer[]): string {
  const caminho = join(pasta, nome)
  writeFileSync(caminho, Buffer.concat(caixas))
  return caminho
}

const ftyp = caixa('ftyp', Buffer.from('isom\0\0\0\0isom', 'latin1'))

test('lê a duração da mvhd versão 0 com a moov no fim', () => {
  const f = arquivo(
    'v0.mp4',
    ftyp,
    caixa('mdat', Buffer.alloc(1000)),
    caixa('moov', mvhd(0, 1000, 86_700)),
  )
  expect(duracaoDoMp4(f)).toBeCloseTo(86.7, 6)
})

test('lê a mvhd versão 1 e caixas de tamanho 64 bits', () => {
  const f = arquivo(
    'v1.mp4',
    ftyp,
    caixa('mdat', Buffer.alloc(64), true),
    caixa('moov', Buffer.concat([caixa('free', Buffer.alloc(4)), mvhd(1, 90_000, 2_276_100)])),
  )
  expect(duracaoDoMp4(f)).toBeCloseTo(25.29, 6)
})

test('recusa arquivo sem moov ou truncado', () => {
  expect(() =>
    duracaoDoMp4(arquivo('sem-moov.mp4', ftyp, caixa('mdat', Buffer.alloc(10)))),
  ).toThrow('Sem moov')
  const truncado = Buffer.concat([ftyp, caixa('moov', mvhd(0, 1000, 5000))]).subarray(
    0,
    ftyp.length + 12,
  )
  writeFileSync(join(pasta, 'truncado.mp4'), truncado)
  expect(() => duracaoDoMp4(join(pasta, 'truncado.mp4'))).toThrow()
})
