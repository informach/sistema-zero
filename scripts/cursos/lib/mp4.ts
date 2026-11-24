/**
 * A duração de um MP4 lida do próprio arquivo (a caixa `mvhd` dentro de `moov`), sem ffmpeg:
 * assim a troca de vídeo roda em qualquer computador. Lê só os cabeçalhos das caixas e a `moov`.
 */
import { closeSync, fstatSync, openSync, readSync } from 'node:fs'

function ler(fd: number, posicao: number, tamanho: number): Buffer {
  const b = Buffer.alloc(tamanho)
  const n = readSync(fd, b, 0, tamanho, posicao)
  if (n !== tamanho) throw new Error('MP4 truncado')
  return b
}

/** As caixas filhas entre `inicio` e `fim`: tipo, onde começa o conteúdo e onde termina. */
function caixas(fd: number, inicio: number, fim: number) {
  const lista: { tipo: string; conteudo: number; fim: number }[] = []
  let pos = inicio
  while (pos + 8 <= fim) {
    const cab = ler(fd, pos, 8)
    let tamanho = cab.readUInt32BE(0)
    const tipo = cab.toString('latin1', 4, 8)
    let cabecalho = 8
    if (tamanho === 1) {
      tamanho = Number(ler(fd, pos + 8, 8).readBigUInt64BE(0))
      cabecalho = 16
    } else if (tamanho === 0) tamanho = fim - pos
    if (tamanho < cabecalho || pos + tamanho > fim) throw new Error(`Caixa ${tipo} inválida`)
    lista.push({ tipo, conteudo: pos + cabecalho, fim: pos + tamanho })
    pos += tamanho
  }
  return lista
}

export function duracaoDoMp4(arquivo: string): number {
  const fd = openSync(arquivo, 'r')
  try {
    const moov = caixas(fd, 0, fstatSync(fd).size).find((c) => c.tipo === 'moov')
    if (!moov) throw new Error(`Sem moov: ${arquivo}`)
    const mvhd = caixas(fd, moov.conteudo, moov.fim).find((c) => c.tipo === 'mvhd')
    if (!mvhd) throw new Error(`Sem mvhd: ${arquivo}`)
    const versao = ler(fd, mvhd.conteudo, 1)[0]
    if (versao === 1) {
      const b = ler(fd, mvhd.conteudo + 20, 12)
      return Number(b.readBigUInt64BE(4)) / b.readUInt32BE(0)
    }
    const b = ler(fd, mvhd.conteudo + 12, 8)
    return b.readUInt32BE(4) / b.readUInt32BE(0)
  } finally {
    closeSync(fd)
  }
}
