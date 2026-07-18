import { ulid } from 'ulid'
import { buildWorkspaceStateFromIR } from '#blockly'
import { generateProjectFiles } from '#generators'
import type { SZIR } from '#ir'
import { OFFICIAL_CATALOG } from '#official-extensions'
import {
  createEmptyProject,
  normalizeAssetName,
  type Project,
  type ProjectAsset,
  type ProjectTilemapMeta,
  sanitizeTilemapMeta,
} from '../core/project'
import { persistProject } from '../state/persistence'

/**
 * "Jogar meu mapa" (lote MapperMate F4): a criança desenha o mapa no Pinta e o
 * Estúdio monta um PROJETO-JOGO COMPLETO e jogável — jogador + colisão + câmera
 * já montados em blocos (game-2d). Equivalente ao export "jogo pronto" do
 * MapperMate, mas em blocos que a criança pode editar.
 *
 * Heurística de mecânica: mapa que COLOCA uma peça plataforma (one-way) na
 * grade → PLATAFORMA (gravidade + pulo, mostra o recurso da Fase 2); senão →
 * TOP-DOWN (anda livre, estilo RPG). ⚠️ olha o USO na grade, não só a DECLARAÇÃO
 * no tileset — senão um mapa top-down cujo tileset (ex.: de template) apenas
 * DEFINE uma peça plataforma cairia em gravidade sem motivo. Uma camada "da
 * frente" (payload.tilemapFront) vira um 2º tilemap desenhado DEPOIS do jogador
 * (copa de árvore por cima).
 */

/** Subconjunto do `PintaExportedAsset` que o host repassa (sem acoplar tipos). */
export interface TilemapGamePayload {
  name: string
  dataUrl: string
  width: number
  height: number
  /** ProjectTilemapMeta-like — re-sanitizado aqui (dedup/tetos). */
  tilemap: unknown
  tilemapFront?: unknown
}

const VIEWPORT_W = 480
const VIEWPORT_H = 360

/**
 * A grade USA alguma das peças `indices`? Grade no formato do Estúdio: linhas
 * separadas por `;`, células por espaço, `.` = vazio. Base da heurística de
 * mecânica (plataforma só quando a peça one-way está de fato COLOCADA).
 */
function gridUsesAny(grid: string, indices: readonly number[]): boolean {
  if (indices.length === 0) return false
  const wanted = new Set(indices)
  for (const token of grid.split(/[;\s]+/)) {
    if (token === '' || token === '.') continue
    const n = Number.parseInt(token, 10)
    if (Number.isInteger(n) && wanted.has(n)) return true
  }
  return false
}

function gameTwoDVersion(): string {
  return OFFICIAL_CATALOG.find((c) => c.manifest.id === 'game-2d')?.manifest.version ?? '0.0.0'
}

function tilemapAsset(
  name: string,
  dataUrl: string,
  w: number,
  h: number,
  meta: ProjectTilemapMeta,
): ProjectAsset {
  return {
    id: ulid(),
    name,
    kind: 'image',
    source: 'library',
    dataUrl,
    width: w,
    height: h,
    tilemap: meta,
  }
}

function buildIR(
  mapName: string,
  frontName: string | null,
  meta: ProjectTilemapMeta,
  platformer: boolean,
): SZIR {
  const worldW = meta.cols * meta.tileSize
  const worldH = meta.rows * meta.tileSize
  const size = Math.max(8, meta.tileSize - 4)
  const move = platformer
    ? { type: 'g2d:platformer' as const, spriteVar: 'jogador', ctxVar: 'ctx', speed: 4, jump: 11 }
    : { type: 'g2d:topDown' as const, spriteVar: 'jogador', speed: 3 }
  const js: SZIR['js'] = [
    { type: 'g2d:createTileMapFromAsset', varName: 'mapa', image: mapName },
    ...(frontName
      ? [{ type: 'g2d:createTileMapFromAsset' as const, varName: 'mapaFrente', image: frontName }]
      : []),
    {
      type: 'g2d:createSprite',
      varName: 'jogador',
      x: meta.tileSize,
      y: meta.tileSize,
      w: size,
      h: size,
      color: '#4ade80',
    },
    {
      type: 'g2d:updateEachFrame',
      body: [
        { type: 'g2d:clear' },
        { type: 'g2d:drawTileMap', mapVar: 'mapa', ctxVar: 'ctx', x: 0, y: 0 },
        move,
        { type: 'g2d:tileMapCollide', spriteVar: 'jogador', mapVar: 'mapa' },
        { type: 'g2d:cameraFollow', spriteVar: 'jogador', worldW, worldH },
        { type: 'g2d:drawSprite', spriteVar: 'jogador', ctxVar: 'ctx' },
        // A frente (copa de árvore/telhado) desenha DEPOIS do jogador.
        ...(frontName
          ? [{ type: 'g2d:drawTileMap' as const, mapVar: 'mapaFrente', ctxVar: 'ctx', x: 0, y: 0 }]
          : []),
      ],
    },
  ]
  return {
    html: [{ type: 'canvas', id: 'tela', width: VIEWPORT_W, height: VIEWPORT_H }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0b1020',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      { selector: 'canvas', declarations: { background: '#11172a' } },
    ],
    js,
    extensions: [{ extensionId: 'game-2d' }],
  }
}

/**
 * MONTA o projeto-jogo (sem persistir) — testável. `null` se o mapa não veio
 * válido (sem grade/folha).
 */
export function assembleTilemapGameProject(payload: TilemapGamePayload): Project | null {
  const bgMeta = sanitizeTilemapMeta(payload.tilemap)
  if (!bgMeta) return null
  const frontMeta = payload.tilemapFront ? sanitizeTilemapMeta(payload.tilemapFront) : undefined
  const mapName = normalizeAssetName(payload.name) ?? 'meu-mapa'
  const frontName = frontMeta ? `${mapName}-frente` : null
  const platformer = !!bgMeta.platform?.length && gridUsesAny(bgMeta.grid, bgMeta.platform)

  const ir = buildIR(mapName, frontName, bgMeta, platformer)
  const assets: ProjectAsset[] = [
    tilemapAsset(mapName, payload.dataUrl, payload.width, payload.height, bgMeta),
  ]
  if (frontName && frontMeta) {
    assets.push(tilemapAsset(frontName, payload.dataUrl, payload.width, payload.height, frontMeta))
  }

  return {
    ...createEmptyProject(ulid(), mapName),
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: mapName }),
    assets,
    installedExtensions: [{ id: 'game-2d', version: gameTwoDVersion(), installedAt: Date.now() }],
  }
}

/**
 * Monta E PERSISTE o projeto-jogo a partir do mapa do Pinta. Devolve o `Project`
 * (o host navega para ele) ou `null` se o mapa não veio válido. ⚠️ o host deve
 * chamar `setStudioStorageNamespace(viewerId)` ANTES (persiste no IndexedDB do
 * perfil).
 */
export async function buildTilemapGameProject(
  payload: TilemapGamePayload,
): Promise<Project | null> {
  const project = assembleTilemapGameProject(payload)
  if (!project) return null
  await persistProject(project)
  return project
}
