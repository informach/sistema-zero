/**
 * Quem toca as células do mapa precisa saber que a célula guarda a peça E os bits de espelho
 * (`cell.ts`). Esta lista é a dos arquivos já conferidos, com o que cada um faz com a célula. Um
 * arquivo novo que leia células reprova aqui até alguém decidir: ele lê o índice da peça (então
 * usa `cellTile`) ou só move e compara células inteiras?
 *
 * A varredura procura três jeitos de chegar na célula:
 * - indexar: `cells[`;
 * - percorrer sem colchete: `.cells.forEach(`, `.cells.map(`, `for (... of x.cells)` e parecidos;
 * - decodificar na mão: a máscara `& 4095` ou o deslocamento `>> 12`, que só o `cell.ts` deveria
 *   escrever (vale também para código de outra linguagem embutido em texto).
 */
import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC = join(import.meta.dir, '..')

const CONFERIDOS: Record<string, string> = {
  'tiles/automapping/book.ts':
    'confere as células completas de padrões importados pelo validador comum de índices e transformações',
  'tiles/automapping/engine.ts':
    'lê o mapa pelos leitores comuns e compara ou aplica o valor completo capturado no exemplo, incluindo espelhos',
  'tiles/objectScatterStroke.ts':
    'percorre posições distintas de amostragem, não valores de peças; limites vêm do leitor comum, sem acessar os buffers autorais ou decodificar bits',
  'tiles/regionMap.ts':
    'valida células densas inteiras antes de converter e soma chunks por camada; delega conversão e edição às operações comuns preservando flags',
  'tiles/mapCellReader.ts':
    'lê células inteiras por origem/extensão e visita apenas o recorte ocupado, preservando bits e orçamento sem decodificar índices',
  'tiles/regionCells.ts':
    'acessa e copia células inteiras em chunks autorais, preserva flags e valida edições por isValidCell; não decodifica índices',
  'state/localChunkStorage.ts':
    'move e compara células inteiras entre buffers densos e chunks físicos, preserva flags e valida valores por isValidCell',
  'state/localRegionChunkStorage.ts':
    'compara e transporta células inteiras nos chunks físicos 3 sem decodificar bits; o leitor nativo regional confere índices, flags, preenchimento e orçamento antes de admitir o documento',
  'state/localRegionEditing.ts':
    'indexa os buffers inteiros dos chunks por chave física para comparar a base confirmada com a edição e recortar o diretório; não lê índices nem decodifica flags',
  'export/godot/physics.ts':
    'GDScript usa a máscara de CELL_MAX_TILES para consultar sólidos; o contorno retangular da peça é simétrico aos flips e recebe a base afim da camada/conjunto',
  'export/godot/project.ts':
    'o projeto GDScript extrai a peça com máscara 4095 e conserva os três bits nos flags nativos do TileMapLayer',
  'export/godot/regions.ts':
    'o leitor GDScript valida os cabeçalhos antes de decodificar, confere o índice com CELL_MAX_TILES e entrega células inteiras ao render e à física',
  'export/godot/regionWork.ts':
    'só conta células ocupadas (valor inteiro >= 0) dos chunks já admitidos para orçar as cópias dos conjuntos; não decodifica índice nem flags',
  'tiles/sets.ts': 'recorta e expande células inteiras, conservando os bits de giro',
  'tiles/tilemapOps.ts':
    'pinta, apaga, preenche e cresce movendo células inteiras; achatar e a peça do topo leem por cellTile',
  'tiles/tilesetOps.ts': 'remapeia o índice por cellTile e conserva os bits com withCellTile',
  'tiles/mapCellEdits.ts':
    'valida o orçamento e referências pelo helper de cell.ts; copia e compara células densas inteiras e delega regiões ao escritor atômico, preservando flags',
  'core/assetResize.ts': 'copia células inteiras para a grade nova',
  'export/studioGrid.ts': 'lê o achatado, que já é índice de peça',
  'export/regionBackupSize.ts':
    'Core confere descritores e o buffer fixo antes do payload; o medidor lê índices por cellTile e delega a codificação integral dos chunks ao Core, preservando flags e reusando resumos numéricos por identidade',
  'export/pythonSceneRegions.ts':
    'codec Python privado consulta células i16 inteiras e preserva todos os bits; valida preenchimento, limites e base64 canônico, sem extrair índice de peça; cabeçalhos e orçamento vêm do contrato regional do Core',
  'testing/regionPlatformPng.ts':
    'fixture escreve a célula canônica inteira 0 em um chunk novo e delega a admissão/codificação ao Core; não lê índices nem decodifica flags',
  'export/portableImageRender.ts': 'lê o índice por cellTile',
  'templates/art.ts': 'monta células a partir de índices de peça da arte em texto',
  'core/project.ts':
    'valida cada célula por isValidCell + cellTile ao ler, e procura peça acima do teto antigo no valor cru (bits de giro também passam do teto, de propósito)',
  'core/projectedDocument.ts':
    'confere referências por cellTile ou pintaHexCellTile depois de admitir a grade. A codificação mantém células e flags inteiros',
  'tiles/cellCodec.ts': 'compacta corridas de células inteiras',
  'export/tiled/export.ts':
    'percorre células inteiras; o gid sai de cellTile e cellFlags (cellToGid) e o giro de cellMatrix',
  'export/tiled/import.ts':
    'confere referências da cena importada por cellTile antes de restaurar a contagem do atlas; não recorta peças novas usadas no Tiled',
  'export/tiled/regionGrid.ts':
    'grava células inteiras retornadas por gidCell em chunks assinados e usa o encoder canônico para preservar os bits',
  'export/phaser/regionPlayer.generated.ts':
    'pacote gerado inclui os leitores de região, a geometria do Core e o compositor existente; as células inteiras são lidas sob demanda',
  'export/sceneDrawing.ts': 'percorre as células da cena e lê o índice por cellTile',
  'components/editor/mapTools/mapLevels.ts':
    'só pergunta se alguma célula está virada, por cellFlags',
  'templates/builders.ts':
    'confere o valor cru de cada célula do modelo contra a quantidade de peças; modelo com peça virada reprova alto na montagem, não passa calado',
  // Os três abaixo têm `cells` de FOLHA de sprites (retângulos da imagem), não células de mapa.
  'export/png.ts': 'células da folha de sprites, não do mapa',
  'export/vectorSheet.ts': 'células da folha vetorial, não do mapa',
  'tiles/sheetCanvas.ts': 'células da folha de peças, não do mapa',
}

/**
 * Arquivos que ainda decodificam a célula na mão. Entram na lista para o teste passar, mas cada
 * um é uma pendência com dono: quando o arquivo for corrigido, o terceiro teste abaixo reprova e
 * obriga a tirar a linha daqui. Hoje está vazia: `export/sceneDrawing.ts` passou a ler por
 * `cellTile` e o Python de `export/pygameProject.ts` recebe a máscara das constantes de `cell.ts`.
 */
const PENDENTES: Record<string, string> = {}

const PERMITIDOS: Record<string, string> = { ...CONFERIDOS, ...PENDENTES }

/** Cada jeito de chegar na célula. Um arquivo entra na varredura se casar com qualquer um. */
const ACESSOS: Record<string, RegExp> = {
  indexar: /\bcells2?\s*(\?\?[^)]*\))?\[/,
  percorrer:
    /\.cells2?\s*\??\.\s*(forEach|map|flatMap|reduce|some|every|filter|find|findIndex|entries|values|at|indexOf|includes)\b/,
  'percorrer com for-of': /\bof\s+[\w.?!]+\.cells2?\b/,
  'máscara da peça': /&\s*(4095|0x0?[fF]{3})\b/,
  'deslocamento dos bits de giro': />>>?\s*12\b/,
}

function acessa(texto: string): boolean {
  return Object.values(ACESSOS).some((padrao) => padrao.test(texto))
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
    .filter((path) => acessa(readFileSync(path, 'utf8')))
    .map((path) => relative(SRC, path).replaceAll('\\', '/'))
    // O próprio `cell.ts` só cita o acesso no comentário que explica a regra.
    .filter((path) => path !== 'tiles/cell.ts')
    .sort()

  it('a varredura leu arquivos de verdade', () => {
    expect(comAcesso.length).toBeGreaterThan(4)
    expect(comAcesso).toContain('tiles/tilemapOps.ts')
  })

  it('todo arquivo que lê células está na lista dos conferidos', () => {
    expect(comAcesso.filter((path) => !(path in PERMITIDOS))).toEqual([])
  })

  it('a lista não guarda arquivo que já não lê células', () => {
    expect(Object.keys(PERMITIDOS).filter((path) => !comAcesso.includes(path))).toEqual([])
  })

  it('a varredura pega o acesso sem colchete e a máscara escrita na mão', () => {
    expect(acessa('l.cells.forEach((value) => usar(value))')).toBe(true)
    expect(acessa('camada.cells.map((c) => c)')).toBe(true)
    expect(acessa('for (const c of layer.cells) usar(c)')).toBe(true)
    expect(acessa('const tile = value & 4095')).toBe(true)
    expect(acessa('tile = celula & 0xfff')).toBe(true)
    expect(acessa('const flags = value >> 12')).toBe(true)
    expect(acessa('const total = layer.cells.length')).toBe(false)
    expect(acessa('const copia = new Int16Array(layer.cells)')).toBe(false)
  })

  it('não há pendência: quem decodifica a célula na mão é corrigido, não listado', () => {
    expect(Object.keys(PENDENTES)).toEqual([])
  })

  it('quem lê o índice da peça importa o cell.ts', () => {
    for (const path of [
      'tiles/tilemapOps.ts',
      'tiles/tilesetOps.ts',
      'export/portableImageRender.ts',
      'export/regionBackupSize.ts',
      'export/sceneDrawing.ts',
      'export/tiled/import.ts',
      'export/pygameProject.ts',
      'components/editor/mapTools/mapLevels.ts',
    ])
      expect(readFileSync(join(SRC, path), 'utf8')).toContain("/cell'")
  })
})
