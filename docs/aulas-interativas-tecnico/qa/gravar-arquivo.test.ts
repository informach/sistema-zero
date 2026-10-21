import { expect, test } from 'bun:test'
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  statSync,
  unlinkSync,
  utimesSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { PASTA_CURSOS } from './caminhos'
import { gravarArquivo } from './gravar-arquivo'

test('regenerar conteúdo idêntico preserva o horário da revisão usada na gravação', () => {
  const pasta = mkdtempSync(resolve(PASTA_CURSOS, '.teste-gravacao-'))
  const arquivo = resolve(pasta, 'fala.txt')
  try {
    gravarArquivo(arquivo, 'A fala aprovada.\n')
    const data = new Date('2026-01-01T00:00:00Z')
    utimesSync(arquivo, data, data)
    const antes = statSync(arquivo).mtimeMs
    gravarArquivo(arquivo, 'A fala aprovada.\n')
    expect(statSync(arquivo).mtimeMs).toBe(antes)
    gravarArquivo(arquivo, 'Uma nova revisão da fala.\n')
    expect(readFileSync(arquivo, 'utf8')).toBe('Uma nova revisão da fala.\n')
    expect(statSync(arquivo).mtimeMs).toBeGreaterThan(antes)
    expect(readdirSync(pasta)).toEqual(['fala.txt'])
    expect(() => gravarArquivo(resolve(PASTA_CURSOS, '../fora.txt'), 'Não gravar')).toThrow(
      'fora da árvore',
    )
  } finally {
    unlinkSync(arquivo)
    rmdirSync(pasta)
  }
})
