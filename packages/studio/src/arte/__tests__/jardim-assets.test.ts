import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  JARDIM_ASSETS,
  JARDIM_BICHOS,
  JARDIM_CAIXAS,
  JARDIM_ESCONDERIJOS,
  JARDIM_SPRITE_Y,
  jardimSpriteRect,
  jardimSvg,
  jardimSvgUrl,
  jardimTipo,
} from '../jardim-assets'
import { JARDIM_FOLHA_VIEWBOX, JARDIM_QUADROS, lerQuadrosDaFolha } from '../jardim-quadros'

describe('a arte do jardim', () => {
  test('por padrão o SVG cabe inteiro na caixa (a raiz não declara encaixe)', () => {
    expect(jardimSvg('jardim')).not.toContain('preserveAspectRatio')
    expect(jardimSvg('jardim')).toContain('viewBox="0 0 640 360"')
  })

  test('com `cobrir`, a RAIZ do SVG leva o "slice": é ela quem manda quando um <image> a aponta', () => {
    expect(jardimSvg('jardim', { cobrir: true })).toMatch(
      /^<svg [^>]*preserveAspectRatio="xMidYMid slice">/,
    )
    expect(decodeURIComponent(jardimSvgUrl('jardim', { cobrir: true }))).toContain(
      'preserveAspectRatio="xMidYMid slice"',
    )
    // Os sprites não mudam: quem cobre é só quem pede.
    expect(jardimSvg('coelho')).not.toContain('preserveAspectRatio')
  })
})

describe('uma caixa só por tipo: trocar a imagem não deforma nem muda o lugar', () => {
  test('todo sprite é bicho ou esconderijo, e nenhum é os dois', () => {
    const sprites = Object.keys(JARDIM_ASSETS).filter((n) => n !== 'jardim')
    const listados: string[] = [...JARDIM_BICHOS, ...JARDIM_ESCONDERIJOS]
    expect(listados.sort()).toEqual(sprites.sort())
    expect(new Set([...JARDIM_BICHOS, ...JARDIM_ESCONDERIJOS]).size).toBe(sprites.length)
    for (const b of JARDIM_BICHOS) expect(jardimTipo(b)).toBe('bicho')
    for (const e of JARDIM_ESCONDERIJOS) expect(jardimTipo(e)).toBe('esconderijo')
  })

  test('nenhum bicho tem largura ou altura diferente dos outros; o mesmo nos esconderijos', () => {
    // ⚠️ A largura e a altura ficam guardadas no bloco que cria o sprite. Um tamanho diferente
    // aqui faria o desenho trocado pela criança sair esticado.
    const tamanhos = (nomes: readonly string[]) =>
      new Set(
        nomes.map((n) => {
          const a = JARDIM_ASSETS[n as keyof typeof JARDIM_ASSETS]
          return `${a.width}x${a.height}`
        }),
      )
    expect([...tamanhos(JARDIM_BICHOS)]).toEqual([
      `${JARDIM_CAIXAS.bicho.width}x${JARDIM_CAIXAS.bicho.height}`,
    ])
    expect([...tamanhos(JARDIM_ESCONDERIJOS)]).toEqual([
      `${JARDIM_CAIXAS.esconderijo.width}x${JARDIM_CAIXAS.esconderijo.height}`,
    ])
    expect(JARDIM_CAIXAS).toEqual({
      bicho: { width: 72, height: 87 },
      esconderijo: { width: 161, height: 144 },
    })
  })

  test('o desenho nunca é esticado: o viewBox tem a mesma proporção da caixa', () => {
    for (const nome of [...JARDIM_BICHOS, ...JARDIM_ESCONDERIJOS]) {
      const { width, height, viewBox } = JARDIM_ASSETS[nome]
      const [, , vw, vh] = viewBox.split(' ').map(Number) as [number, number, number, number]
      expect(Math.abs(vw / vh / (width / height) - 1), nome).toBeLessThan(0.001)
    }
  })

  test('um Y por tipo: todo bicho no mesmo Y, todo esconderijo em outro', () => {
    expect(JARDIM_SPRITE_Y).toEqual({ bicho: 181, esconderijo: 137 })
    for (const b of JARDIM_BICHOS)
      expect(jardimSpriteRect(b, 137)).toEqual({ x: 101, y: 181, w: 72, h: 87 })
    for (const e of JARDIM_ESCONDERIJOS)
      expect(jardimSpriteRect(e, 137)).toEqual({ x: 56.5, y: 137, w: 161, h: 144 })
    // Com a base dada, quem manda é a base (as cenas que apoiam o sprite no chão).
    expect(jardimSpriteRect('gato', 280, 238)).toEqual({ x: 244, y: 151, w: 72, h: 87 })
  })
})

describe('a folha de desenhos é a fonte', () => {
  const folha = readFileSync(resolve(import.meta.dir, '../jardim-spritesheet.svg'), 'utf8')
  const quadros = lerQuadrosDaFolha(folha)

  test('cada sprite é exatamente o quadro dele na folha (rode o gerador ao mexer nela)', () => {
    expect(folha).toContain(`viewBox="${JARDIM_FOLHA_VIEWBOX}"`)
    expect(quadros.size).toBe(Object.keys(JARDIM_QUADROS).length)
    expect(Object.keys(JARDIM_QUADROS).sort()).toEqual(
      [...JARDIM_BICHOS, ...JARDIM_ESCONDERIJOS].sort(),
    )
    for (const [nome, { x, y }] of Object.entries(JARDIM_QUADROS)) {
      const corpo: string = JARDIM_ASSETS[nome as keyof typeof JARDIM_QUADROS].body
      expect(corpo, nome).toBe(quadros.get(`${x},${y}`) as string)
    }
  })

  test('os seis desenhos de antes continuam na primeira linha, na mesma ordem', () => {
    // O projeto do curso confere esses seis quadros pela posição na folha do Pinta.
    const primeiraLinha = Object.entries(JARDIM_QUADROS)
      .filter(([, q]) => q.y === 0)
      .sort(([, a], [, b]) => a.x - b.x)
      .map(([nome]) => nome)
    expect(primeiraLinha).toEqual(['coruja', 'pedras', 'arbusto', 'flores', 'raposa', 'coelho'])
  })
})
