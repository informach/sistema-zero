import { describe, expect, test } from 'bun:test'
import { canOpenFreeStudio } from '../src/lib/studio-cta'
import { kidsView, kidsStaffPreview } from './kids-journey-fixtures'

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
    expect(canOpenFreeStudio(false, kidsView(['studio'], 'coder'), COM_BLOCO)).toBe(false)
    expect(canOpenFreeStudio(false, kidsView(['studio'], 'god'), COM_BLOCO)).toBe(false)
  })

  test('⭐ com o produto mas ainda Faísca, NÃO (o Estúdio livre abre no Construtor)', () => {
    expect(canOpenFreeStudio(true, kidsView([]), COM_BLOCO)).toBe(false)
  })

  test('com o produto, do Construtor para cima e com bloco conquistado, sim', () => {
    expect(canOpenFreeStudio(true, kidsView(['studio'], 'coder'), COM_BLOCO)).toBe(true)
    expect(canOpenFreeStudio(true, kidsView(['studio'], 'god'), COM_BLOCO)).toBe(true)
  })

  test('⭐ sem NENHUM bloco conquistado, não: o /estudio estaria trancado', () => {
    expect(canOpenFreeStudio(true, kidsView(['studio'], 'coder'), blocos([]))).toBe(false)
    expect(canOpenFreeStudio(true, kidsView(['studio'], 'god'), blocos([]))).toBe(false)
  })

  test('a lista que não chegou NÃO esconde o atalho (o /estudio diz "tente de novo")', () => {
    expect(canOpenFreeStudio(true, kidsView(['studio'], 'coder'), null)).toBe(true)
    expect(canOpenFreeStudio(true, kidsView(['studio'], 'coder'), { status: 502, body: null })).toBe(true)
    // …mas nunca destranca a Faísca.
    expect(canOpenFreeStudio(true, kidsView([]), null)).toBe(false)
  })

  test('policy ausente não concede capacidades nem fabrica Faísca', () => {
    expect(canOpenFreeStudio(true, null, COM_BLOCO)).toBe(false)
  })

  test('a prévia explícita da EQUIPE abre sem currículo e sem posto virtual', () => {
    expect(canOpenFreeStudio(true, kidsStaffPreview, blocos([]))).toBe(true)
  })
})


test('custom studio capability controls the shortcut without reading the displayed rank', () => {
  expect(canOpenFreeStudio(true, kidsView(['studio'], 'noob'), COM_BLOCO)).toBe(true)
  expect(canOpenFreeStudio(true, kidsView([], 'god'), COM_BLOCO)).toBe(false)
})
