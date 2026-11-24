import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { TEXTO_MAXIMO_DO_MATERIAL } from './materiais-sem-texto'

/** Criança assiste ao vídeo, não lê (22/11/2026): nenhum material de curso infantil leva texto para ler. */
const raiz = resolve(import.meta.dirname, '../../aulas-interativas')

function manifestos(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? manifestos(resolve(pasta, e.name))
      : e.name.endsWith('.manifesto.json')
        ? [resolve(pasta, e.name)]
        : [],
  )
}

// Os cursos dos pais são para adultos: os resumos em texto deles ficam.
const infantis = manifestos(raiz).filter((f) => relative(raiz, f).split(sep)[0] !== 'pais')

type Item = { id: string; kind: string; markdown?: string }
type Bloco = { key: string; content?: { kind?: string; items?: Item[] } }

describe('materiais dos cursos infantis', () => {
  test('há manifestos infantis para conferir', () => {
    expect(infantis.length).toBeGreaterThan(20)
  })

  test.each(
    infantis.map((f) => [relative(raiz, f), f]),
  )('%s: o material não leva texto para ler', (_nome, arquivo) => {
    const m = JSON.parse(readFileSync(arquivo, 'utf8')) as { blocks: Bloco[] }
    const longos = m.blocks.flatMap((b) =>
      b.content?.kind === 'materials'
        ? (b.content.items ?? [])
            .filter(
              (i) => i.kind === 'text' && (i.markdown ?? '').length > TEXTO_MAXIMO_DO_MATERIAL,
            )
            .map((i) => `${b.key}/${i.id}: ${(i.markdown ?? '').length} caracteres`)
        : [],
    )
    expect(longos).toEqual([])
  })
})
