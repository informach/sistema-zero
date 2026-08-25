import { describe, expect, it } from 'bun:test'
import {
  emptyPaletteLibrary,
  MAX_REMOVED_MARKS,
  MAX_SAVED_PALETTES,
  mergePaletteLibraries,
  type PaletteLibrary,
  paletteLibraryContentKey,
  sanitizePaletteLibrary,
} from './paletteLibrary'

function palette(id: string, updatedAt: number, color = '#123456') {
  return {
    id,
    updatedAt,
    name: `Paleta ${id}`,
    colors: ['', color, ...Array.from({ length: 14 }, () => '')],
  }
}

function libraryOf(
  palettes: ReturnType<typeof palette>[],
  removed: Array<{ id: string; removedAt: number }> = [],
  updatedAt = Math.max(0, ...palettes.map((p) => p.updatedAt), ...removed.map((m) => m.removedAt)),
): PaletteLibrary {
  return { version: 1, updatedAt, palettes, removed }
}

describe('sanitizePaletteLibrary', () => {
  it('registro válido round-trippa; paleta sem cor pintável cai', () => {
    const lib = libraryOf([palette('a', 5)], [], 10)
    lib.palettes.push({ ...palette('b', 6), colors: ['', 'lixo'] })
    const out = sanitizePaletteLibrary(lib)
    expect(out?.palettes.map((p) => p.id)).toEqual(['a'])
    expect(out?.updatedAt).toBe(10)
    // A paleta que sobrou está na forma canônica (16 posições).
    expect(out?.palettes[0]?.colors).toHaveLength(16)
  })

  it('forma irreconhecível → null; biblioteca VAZIA é válida; registro ANTIGO lê removed []', () => {
    expect(sanitizePaletteLibrary(null)).toBeNull()
    expect(sanitizePaletteLibrary({ updatedAt: 1 })).toBeNull()
    expect(sanitizePaletteLibrary(emptyPaletteLibrary())?.palettes).toEqual([])
    // Registro gravado ANTES das lápides (sem o campo) lê como [].
    const old = sanitizePaletteLibrary({ version: 1, updatedAt: 2, palettes: [palette('a', 1)] })
    expect(old?.removed).toEqual([])
    expect(old?.palettes).toHaveLength(1)
  })

  it('deduplica id de forma determinística e não descarta paletas sincronizadas acima do teto de criação', () => {
    const lots = Array.from({ length: MAX_SAVED_PALETTES + 5 }, (_, i) => palette(`p${i}`, i))
    const out = sanitizePaletteLibrary({ version: 1, updatedAt: 0, palettes: lots })
    expect(out?.palettes).toHaveLength(MAX_SAVED_PALETTES + 5)
    const dup = sanitizePaletteLibrary(
      libraryOf([palette('mesmo', 1, '#111111'), palette('mesmo', 2, '#222222')]),
    )
    expect(dup?.palettes).toHaveLength(1)
    expect(dup?.palettes[0]?.colors[1]).toBe('#222222')
  })

  it('valida a coleção inteira antes de selecionar entradas válidas', () => {
    const invalid = Array.from({ length: MAX_SAVED_PALETTES }, (_, i) => ({ id: `bad-${i}` }))
    const out = sanitizePaletteLibrary({
      version: 1,
      updatedAt: 10,
      palettes: [...invalid, palette('valida', 10)],
    })
    expect(out?.palettes.map((item) => item.id)).toEqual(['valida'])
  })

  it('lápides: dedupe pelo removedAt maior, cap, e lápide vencida por edição posterior CAI', () => {
    const out = sanitizePaletteLibrary(
      libraryOf(
        // 'viva' foi editada DEPOIS da lápide dela: sobrevive e a lápide sai.
        [palette('viva', 20)],
        [
          { id: 'viva', removedAt: 10 },
          { id: 'x', removedAt: 5 },
          { id: 'x', removedAt: 8 },
        ],
      ),
    )
    expect(out?.palettes.map((p) => p.id)).toEqual(['viva'])
    expect(out?.removed).toEqual([{ id: 'x', removedAt: 8 }])
    // E o cap: mais lápides que o teto → as mais antigas caem.
    const marks = Array.from({ length: MAX_REMOVED_MARKS + 10 }, (_, i) => ({
      id: `m${i}`,
      removedAt: i,
    }))
    const capped = sanitizePaletteLibrary(libraryOf([], marks))
    expect(capped?.removed).toHaveLength(MAX_REMOVED_MARKS)
    expect(capped?.removed[0]?.removedAt).toBe(MAX_REMOVED_MARKS + 9)
  })
})

describe('mergePaletteLibraries — nuvem ↔ local por id + updatedAt', () => {
  it('o updatedAt maior vence por paleta; só-remotas entram no fim', () => {
    const local = libraryOf([palette('a', 5, '#111111'), palette('b', 9, '#222222')], [], 100)
    const remote = libraryOf([palette('a', 7, '#aaaaaa'), palette('c', 3, '#cccccc')], [], 120)
    const merged = mergePaletteLibraries(local, remote)
    expect(merged.updatedAt).toBe(120)
    expect(merged.palettes.map((p) => [p.id, p.colors[1]])).toEqual([
      ['a', '#aaaaaa'],
      ['b', '#222222'],
      ['c', '#cccccc'],
    ])
  })

  it('empate de updatedAt: o conteúdo canônico vence em qualquer ordem', () => {
    const merged = mergePaletteLibraries(
      libraryOf([palette('a', 5, '#111111')], [], 1),
      libraryOf([palette('a', 5, '#999999')], [], 1),
    )
    const reversed = mergePaletteLibraries(
      libraryOf([palette('a', 5, '#999999')], [], 1),
      libraryOf([palette('a', 5, '#111111')], [], 1),
    )
    expect(merged).toEqual(reversed)
    expect(merged.palettes[0]?.colors[1]).toBe('#999999')
  })

  it('🚨 a LÁPIDE mata a cópia do outro lado: exclusão vale por mera reconciliação', () => {
    // O aparelho B ainda tem p1 (updatedAt 5); o A excluiu (lápide em 50) e a
    // nuvem desceu SEM p1 + a lápide. Antes das lápides, o merge ressuscitava
    // p1 da cópia local de B — era o achado ALTO do full review 25/08.
    const localB = libraryOf([palette('p1', 5), palette('p2', 8)])
    const remote = libraryOf([palette('p2', 8)], [{ id: 'p1', removedAt: 50 }])
    const merged = mergePaletteLibraries(localB, remote)
    expect(merged.palettes.map((p) => p.id)).toEqual(['p2'])
    // A lápide FICA (para matar outras cópias que ainda apareçam).
    expect(merged.removed).toEqual([{ id: 'p1', removedAt: 50 }])
  })

  it('edição POSTERIOR à lápide ressuscita a paleta (e a lápide perdedora sai)', () => {
    const local = libraryOf([palette('p1', 90, '#00ff00')])
    const remote = libraryOf([], [{ id: 'p1', removedAt: 50 }])
    const merged = mergePaletteLibraries(local, remote)
    expect(merged.palettes.map((p) => p.id)).toEqual(['p1'])
    expect(merged.removed).toEqual([])
  })

  it('é comutativo mesmo acima do teto local e em empate de timestamp', () => {
    const left = libraryOf([
      ...Array.from({ length: MAX_SAVED_PALETTES }, (_, i) => palette(`l-${i}`, i + 1)),
      palette('empate', 100, '#111111'),
    ])
    const right = libraryOf([
      ...Array.from({ length: MAX_SAVED_PALETTES }, (_, i) => palette(`r-${i}`, i + 1)),
      palette('empate', 100, '#999999'),
    ])

    const leftRight = mergePaletteLibraries(left, right)
    const rightLeft = mergePaletteLibraries(right, left)

    expect(leftRight).toEqual(rightLeft)
    expect(leftRight.palettes).toHaveLength(MAX_SAVED_PALETTES * 2 + 1)
  })

  it('lápide vence a paleta no mesmo timestamp', () => {
    const merged = mergePaletteLibraries(
      libraryOf([palette('apagada', 50)]),
      libraryOf([], [{ id: 'apagada', removedAt: 50 }]),
    )
    expect(merged.palettes).toEqual([])
    expect(merged.removed).toEqual([{ id: 'apagada', removedAt: 50 }])
  })
})

describe('paletteLibraryContentKey — comparação insensível à ordem', () => {
  it('mesmo conteúdo em ordens diferentes = MESMA chave (mata o pingue-pongue)', () => {
    const a = libraryOf([palette('x', 1, '#111111'), palette('y', 2, '#222222')])
    const b = libraryOf([palette('y', 2, '#222222'), palette('x', 1, '#111111')])
    expect(paletteLibraryContentKey(a)).toBe(paletteLibraryContentKey(b))
    // E conteúdo diferente = chave diferente (anti-vácuo).
    const c = libraryOf([palette('x', 1, '#111111')])
    expect(paletteLibraryContentKey(a)).not.toBe(paletteLibraryContentKey(c))
    // Lápides também entram na chave.
    const d = libraryOf([palette('x', 1, '#111111')], [{ id: 'z', removedAt: 9 }])
    expect(paletteLibraryContentKey(c)).not.toBe(paletteLibraryContentKey(d))
  })

  it('ordem das CHAVES do objeto não muda a chave (sanitize × escritor local)', () => {
    // O remoto sempre chega reconstruído pelo sanitize (uma ordem de chaves);
    // o local vem de quem o escreveu (outra). Mesmo conteúdo tem que dar a
    // MESMA chave, senão o "mudou vs remoto" mente e o upload vira eco.
    const base = palette('x', 1, '#111111')
    const reordered = {
      colors: [...base.colors],
      name: base.name,
      updatedAt: base.updatedAt,
      id: base.id,
    }
    const viaSanitize = libraryOf([base])
    const viaEscritor = { ...libraryOf([]), palettes: [reordered] }
    expect(paletteLibraryContentKey(viaEscritor)).toBe(paletteLibraryContentKey(viaSanitize))
    // Anti-vácuo: mudar um VALOR (não a ordem) muda a chave.
    const outroNome = { ...libraryOf([]), palettes: [{ ...reordered, name: 'Outro' }] }
    expect(paletteLibraryContentKey(outroNome)).not.toBe(paletteLibraryContentKey(viaSanitize))
  })
})
