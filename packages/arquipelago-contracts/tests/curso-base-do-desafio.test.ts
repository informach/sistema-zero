import { expect, test } from 'bun:test'
import { POSTO_DA_LINGUAGEM, postoDoCursoBase } from '../src/desafios'
import { ilha } from '../src/ilhas'

test('nas ilhas, o desafio fora dos blocos pede o curso-base do posto da ilha (A3)', () => {
  expect(postoDoCursoBase('python', 'recife')).toBe(ilha('recife').posto)
  expect(postoDoCursoBase('texto', 'vale-dos-dinos')).toBe(ilha('vale-dos-dinos').posto)
  expect(postoDoCursoBase('pro', 'nuvens')).toBe(ilha('nuvens').posto)
  expect(postoDoCursoBase('blocos', 'bosque')).toBeNull()
})

test('no Farol, cada linguagem pede o curso-base de onde ela começa (A29)', () => {
  expect(postoDoCursoBase('python', 'farol')).toBe('explorer')
  expect(postoDoCursoBase('texto', 'farol')).toBe('architect')
  expect(postoDoCursoBase('pro', 'farol')).toBe('champion')
  expect(postoDoCursoBase('blocos', 'farol')).toBeNull()
  // As linguagens começam nas ilhas desses postos: Recife, Vale e Nuvens.
  expect(POSTO_DA_LINGUAGEM.python).toBe(ilha('recife').posto)
  expect(POSTO_DA_LINGUAGEM.texto).toBe(ilha('vale-dos-dinos').posto)
  expect(POSTO_DA_LINGUAGEM.pro).toBe(ilha('nuvens').posto)
})
