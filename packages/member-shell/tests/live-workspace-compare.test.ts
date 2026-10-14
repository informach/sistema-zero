import { describe, expect, test } from 'bun:test'
import { LiveRequestError } from '../src/lib/live/client'
import { isTransientLiveFailure, sameLiveProject } from '../src/lib/live/workspace-compare'

describe('o projeto da oficina comparado como o Postgres o devolve', () => {
  // O `jsonb` reordena as chaves (medido no ensaio de 14/10/2026: o servidor devolveu
  // `id, ir, mode, name, files…` para um projeto que o Estúdio montou como `formatVersion, …, id`).
  const local = {
    formatVersion: 2,
    id: 'p1',
    name: 'Esconde-esconde',
    files: { 'index.html': '<p></p>', 'style.css': '', 'script.js': '' },
    ir: { version: 2, html: [], css: [], behavior: { start: [], events: [], loops: [] } },
  }
  const fromJsonb = {
    id: 'p1',
    ir: { css: [], html: [], version: 2, behavior: { loops: [], start: [], events: [] } },
    name: 'Esconde-esconde',
    files: { 'script.js': '', 'style.css': '', 'index.html': '<p></p>' },
    formatVersion: 2,
  }
  test('a mesma coisa em outra ordem é o MESMO projeto (antes virava "rascunho preservado")', () => {
    expect(JSON.stringify(local) === JSON.stringify(fromJsonb)).toBe(false)
    expect(sameLiveProject(local, fromJsonb)).toBe(true)
  })
  test('uma mudança de verdade continua sendo diferença', () => {
    expect(sameLiveProject(local, { ...fromJsonb, name: 'Outro nome' })).toBe(false)
    expect(
      sameLiveProject(local, { ...fromJsonb, files: { ...fromJsonb.files, 'script.js': 'x' } }),
    ).toBe(false)
  })
  test('a ordem dos itens de uma lista importa (blocos em outra ordem são outro programa)', () => {
    expect(sameLiveProject({ a: [1, 2] }, { a: [2, 1] })).toBe(false)
  })
})

describe('falha passageira × recusa do servidor', () => {
  test('rede, tempo esgotado e servidor fora: tentar de novo', () => {
    expect(isTransientLiveFailure(new TypeError('Failed to fetch'))).toBe(true)
    expect(isTransientLiveFailure(new LiveRequestError('sem rede', 'LIVE_NETWORK', 0))).toBe(true)
    expect(isTransientLiveFailure(new LiveRequestError('fora', 'LIVE_UNAVAILABLE', 503))).toBe(true)
    expect(isTransientLiveFailure(new LiveRequestError('calma', 'RATE', 429))).toBe(true)
  })
  test('conflito, autoria trocada e acesso negado: recuperar com a criança', () => {
    expect(isTransientLiveFailure(new LiveRequestError('mudou', 'LIVE_CONFLICT', 409))).toBe(false)
    expect(isTransientLiveFailure(new LiveRequestError('não', 'LIVE_ACCESS_DENIED', 403))).toBe(
      false,
    )
  })
})
