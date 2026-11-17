/**
 * Quem toca `cells[` precisa saber que a célula guarda a peça E os bits de espelho (`cell.ts`).
 * Esta lista é a dos arquivos já conferidos, com o que cada um faz com a célula. Um arquivo novo
 * que indexe células reprova aqui até alguém decidir: ele lê o índice da peça (então usa
 * `cellTile`) ou só move e compara células inteiras?
 */
import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC = join(import.meta.dir, '..')

const CONFERIDOS: Record<string, string> = {
  'tiles/tilemapOps.ts':
    'pinta, apaga, preenche e cresce movendo células inteiras; achatar e a peça do topo leem por cellTile',
  'tiles/tilesetOps.ts': 'remapeia o índice por cellTile e conserva os bits com withCellTile',
  'tiles/mapSelection.ts': 'recorta, apaga e carimba células inteiras; vazio é comparado com -1',
  'tiles/stamp.ts': 'carimba células inteiras',
  'core/assetResize.ts': 'copia células inteiras para a grade nova',
  'export/studioGrid.ts': 'lê o achatado, que já é índice de peça',
  'export/portableImageRender.ts': 'lê o índice por cellTile',
  'templates/art.ts': 'monta células a partir de índices de peça da arte em texto',
  'core/project.ts':
    'valida cada célula por isValidCell + cellTile ao ler, e procura peça acima do teto antigo no valor cru (bits de giro também passam do teto, de propósito)',
  'tiles/cellCodec.ts': 'compacta corridas de células inteiras',
}

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(path)
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : []
  })
}

describe('acesso cru às células do mapa', () => {
  const comAcesso = arquivos(SRC)
    .filter((path) => /\bcells2?\s*(\?\?[^)]*\))?\[/.test(readFileSync(path, 'utf8')))
    .map((path) => relative(SRC, path).replaceAll('\\', '/'))
    // O próprio `cell.ts` só cita o acesso no comentário que explica a regra.
    .filter((path) => path !== 'tiles/cell.ts')
    .sort()

  it('a varredura leu arquivos de verdade', () => {
    expect(comAcesso.length).toBeGreaterThan(4)
    expect(comAcesso).toContain('tiles/tilemapOps.ts')
  })

  it('todo arquivo que indexa células está na lista dos conferidos', () => {
    expect(comAcesso.filter((path) => !(path in CONFERIDOS))).toEqual([])
  })

  it('a lista não guarda arquivo que já não indexa células', () => {
    expect(Object.keys(CONFERIDOS).filter((path) => !comAcesso.includes(path))).toEqual([])
  })

  it('quem lê o índice da peça importa o cell.ts', () => {
    for (const path of [
      'tiles/tilemapOps.ts',
      'tiles/tilesetOps.ts',
      'export/portableImageRender.ts',
    ])
      expect(readFileSync(join(SRC, path), 'utf8')).toContain("/cell'")
  })
})
