import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path'
import { PASTA_CURSOS } from './caminhos'

/** Publica a saída completa sem truncar um arquivo que o editor esteja lendo no Windows. */
export function gravarArquivo(caminho: string, texto: string): void {
  const destino = resolve(caminho)
  const dentro = relative(PASTA_CURSOS, destino)
  if (isAbsolute(dentro) || dentro.startsWith('..') || resolve(PASTA_CURSOS, dentro) !== destino) {
    throw new Error(`Saída fora da árvore de cursos: ${destino}`)
  }
  // O horário deve indicar uma revisão real, especialmente quando a voz já foi gerada.
  if (existsSync(destino) && readFileSync(destino, 'utf8') === texto) return
  const temporario = resolve(dirname(destino), `.${basename(destino)}.${randomUUID()}.tmp`)
  try {
    writeFileSync(temporario, texto, { encoding: 'utf8', flag: 'wx' })
    renameSync(temporario, destino)
  } finally {
    if (existsSync(temporario)) unlinkSync(temporario)
  }
}
