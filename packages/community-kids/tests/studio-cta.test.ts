import { describe, expect, test } from 'bun:test'
import { canOpenFreeStudio } from '../src/lib/studio-cta'

/**
 * Regressão de um clique morto REAL introduzido no lote do horizonte: o estado "Você está
 * em dia!" oferecia "Criar um jogo meu" checando só a POSSE do produto. Uma Faísca com o
 * Estúdio comprado e o catálogo vazio entra nesse estado — e o botão a mandava para a tela
 * de Estúdio bloqueado pela carreira.
 */
describe('canOpenFreeStudio', () => {
  test('sem o produto, nunca', () => {
    expect(canOpenFreeStudio(false, 'coder', undefined)).toBe(false)
    expect(canOpenFreeStudio(false, 'god', undefined)).toBe(false)
  })

  test('⭐ com o produto mas ainda Faísca, NÃO (o Estúdio livre abre no Construtor)', () => {
    expect(canOpenFreeStudio(true, 'noob', undefined)).toBe(false)
  })

  test('com o produto e do Construtor para cima, sim', () => {
    expect(canOpenFreeStudio(true, 'coder', undefined)).toBe(true)
    expect(canOpenFreeStudio(true, 'god', undefined)).toBe(true)
  })

  test('nível desconhecido/ausente é tratado como Faísca (fail-closed)', () => {
    expect(canOpenFreeStudio(true, undefined, undefined)).toBe(false)
    expect(canOpenFreeStudio(true, 'inexistente', undefined)).toBe(false)
  })

  test('a EQUIPE abre mesmo sem carreira (passe livre de QA)', () => {
    expect(canOpenFreeStudio(true, 'noob', 'staff')).toBe(true)
  })
})
