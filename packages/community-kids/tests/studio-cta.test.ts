import { describe, expect, test } from 'bun:test'
import { canOpenFreeStudio } from '../src/lib/studio-cta'

const blocos = (blocks: string[]) => ({ status: 200, body: { blocks } })
const COM_BLOCO = blocos(['sz_g2d_setup_stage'])

/**
 * Regressão de dois cliques mortos REAIS:
 * - o estado "Você está em dia!" oferecia "Criar um jogo meu" checando só a POSSE do produto,
 *   e uma Faísca com o Estúdio comprado caía na tela de Estúdio bloqueado pela jornada;
 * - desde 02/10/2026 os blocos conquistados são a paleta inteira, então um Construtor sem
 *   nenhum bloco também cairia na porta trancada do `/estudio`.
 */
describe('canOpenFreeStudio', () => {
  test('sem o produto, nunca', () => {
    expect(canOpenFreeStudio(false, 'coder', undefined, COM_BLOCO)).toBe(false)
    expect(canOpenFreeStudio(false, 'god', undefined, COM_BLOCO)).toBe(false)
  })

  test('⭐ com o produto mas ainda Faísca, NÃO (o Estúdio livre abre no Construtor)', () => {
    expect(canOpenFreeStudio(true, 'noob', undefined, COM_BLOCO)).toBe(false)
  })

  test('com o produto, do Construtor para cima e com bloco conquistado, sim', () => {
    expect(canOpenFreeStudio(true, 'coder', undefined, COM_BLOCO)).toBe(true)
    expect(canOpenFreeStudio(true, 'god', undefined, COM_BLOCO)).toBe(true)
  })

  test('⭐ sem NENHUM bloco conquistado, não: o /estudio estaria trancado', () => {
    expect(canOpenFreeStudio(true, 'coder', undefined, blocos([]))).toBe(false)
    expect(canOpenFreeStudio(true, 'god', 'customer', blocos([]))).toBe(false)
  })

  test('a lista que não chegou NÃO esconde o atalho (o /estudio diz "tente de novo")', () => {
    expect(canOpenFreeStudio(true, 'coder', undefined, null)).toBe(true)
    expect(canOpenFreeStudio(true, 'coder', undefined, { status: 502, body: null })).toBe(true)
    // …mas nunca destranca a Faísca.
    expect(canOpenFreeStudio(true, 'noob', undefined, null)).toBe(false)
  })

  test('nível desconhecido/ausente é tratado como Faísca (fail-closed)', () => {
    expect(canOpenFreeStudio(true, undefined, undefined, COM_BLOCO)).toBe(false)
    expect(canOpenFreeStudio(true, 'inexistente', undefined, COM_BLOCO)).toBe(false)
  })

  test('a EQUIPE abre mesmo sem jornada e sem curso (passe livre de QA)', () => {
    expect(canOpenFreeStudio(true, 'noob', 'staff', blocos([]))).toBe(true)
  })
})
