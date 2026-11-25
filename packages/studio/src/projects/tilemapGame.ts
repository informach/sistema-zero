import type { PintaRegionScene } from '@sistemazero/core/studio/pinta-region-scene'
import type { PintaRegionalMarker } from '@sistemazero/core/studio/pinta-regional-marker'
import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'
import {
  sceneObjectIntersectsBox,
  sceneVisitColliders,
} from '@sistemazero/core/studio/pinta-scene-geometry'
import { ulid } from 'ulid'
import { buildWorkspaceStateFromIR } from '#blockly'
import { generateProjectFiles } from '#generators'
import { normalizeSZIR, type SZIR } from '#ir'
import { OFFICIAL_CATALOG } from '#official-extensions'
import { admitPintaRegionalMaterial } from '../core/pintaRegionalMaterial'
import {
  createEmptyProject,
  normalizeAssetName,
  type Project,
  type ProjectAsset,
  type ProjectTilemapMeta,
  sanitizeTilemapMeta,
} from '../core/project'
import { sanitizeSceneMeta } from '../core/projectAssets'
import { persistProject } from '../state/persistence'
import { captureProjectStorageScope, getProjectStorageScope } from '../state/projectStorageRuntime'

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
  regional?: PintaRegionalMarker
  maps?: Array<Omit<TilemapGamePayload, 'maps'>>
  id?: string
  libRevision?: number
  scene?: unknown
  name: string
  dataUrl: string
  width: number
  height: number
  /** ProjectTilemapMeta-like — re-sanitizado aqui (dedup/tetos). */
  tilemap?: unknown
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
  const size = Math.max(8, meta.tileSize - 4)
  const move = platformer
    ? { type: 'g2d:platformerWithTerrain' as const, spriteVar: 'jogador', speed: 4, jump: 11 }
    : { type: 'g2d:topDown' as const, spriteVar: 'jogador', speed: 3 }
  const js: SZIR['js'] = [
    { type: 'g2d:createTileMapFromAsset', varName: 'mapa', image: mapName },
    ...(frontName
      ? [{ type: 'g2d:createTileMapFromAsset' as const, varName: 'mapaFrente', image: frontName }]
      : []),
    {
      type: 'g2d:createWorldFromTileMap',
      varName: 'mundo',
      mapVar: 'mapa',
      size: meta.tileSize,
    },
    ...(frontName
      ? [
          {
            type: 'g2d:placeTileMap' as const,
            mapVar: 'mapaFrente',
            x: 0,
            y: 0,
            size: meta.tileSize,
          },
        ]
      : []),
    {
      type: 'g2d:configureWorldCamera',
      worldVar: 'mundo',
      horizontal: 'free',
      vertical: 'free',
      deadZoneX: 0,
      deadZoneY: 0,
    },
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
        ...(platformer ? [{ type: 'g2d:applyGravity' as const, spriteVar: 'jogador' }] : []),
        move,
        { type: 'g2d:collideWorld', spriteVar: 'jogador', worldVar: 'mundo' },
        { type: 'g2d:followCameraInWorld', spriteVar: 'jogador', worldVar: 'mundo' },
        { type: 'g2d:drawWorld', ctxVar: 'ctx', worldVar: 'mundo' },
        { type: 'g2d:drawSprite', spriteVar: 'jogador', ctxVar: 'ctx' },
        // A frente (copa de árvore/telhado) desenha DEPOIS do jogador.
        ...(frontName
          ? [
              {
                type: 'g2d:drawPreparedTileMap' as const,
                mapVar: 'mapaFrente',
                ctxVar: 'ctx',
              },
            ]
          : []),
      ],
    },
  ]
  return {
    html: [
      {
        type: 'canvas',
        id: 'tela',
        width: VIEWPORT_W,
        height: VIEWPORT_H,
        children: [
          {
            type: 'text',
            text: 'Explore o cenário usando as setas.',
          },
        ],
      },
    ],
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
  if (payload.scene !== undefined) {
    const scene = sanitizeSceneMeta(payload.scene)
    if (!scene) return null
    const mapName = normalizeAssetName(payload.name) ?? 'meu-mapa'
    const ir = buildSceneIR(mapName, scene)
    const asset: ProjectAsset = {
      id: ulid(),
      name: mapName,
      kind: 'image',
      source: 'library',
      dataUrl: payload.dataUrl,
      width: payload.width,
      height: payload.height,
      scene,
      ...(payload.id ? { libId: `personal:${payload.id}`, libOrigin: 'pinta' as const } : {}),
      ...(payload.libRevision ? { libRevision: payload.libRevision } : {}),
    }
    const assets = [asset]
    if ((payload.maps?.length ?? 0) > 15) return null
    for (const extra of payload.maps ?? []) {
      const scene = sanitizeSceneMeta(extra.scene),
        name = normalizeAssetName(extra.name)
      if (!scene || !name || assets.some((a) => a.name === name)) return null
      assets.push({
        id: ulid(),
        name,
        kind: 'image',
        source: 'library',
        dataUrl: extra.dataUrl,
        width: extra.width,
        height: extra.height,
        scene,
        ...(extra.id ? { libId: `personal:${extra.id}`, libOrigin: 'pinta' as const } : {}),
        ...(extra.libRevision ? { libRevision: extra.libRevision } : {}),
      })
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

function buildSceneIR(image: string, scene: PintaScene | PintaRegionScene): SZIR {
  const str = (value: string) => ({ type: 'str' as const, value }),
    variable = (name: string) => ({ type: 'var' as const, name }),
    // O ponto de início e o tamanho do mundo são LIDOS do cenário quando o jogo roda
    // ("início do cenário", "tamanho do cenário"). Número fixo aqui congelaria o mapa de hoje
    // no programa: a criança mudaria o início no Pinta e o jogo começaria no lugar antigo.
    fromScene = (method: 'mapSpawn' | 'mapSize', axis: string) => ({
      type: 'g2d:sceneValue' as const,
      method,
      args: [str('mapa'), str(axis)],
    })
  const world = {
    x: 0,
    y: 0,
    width: scene.cols * scene.tileSize,
    height: scene.rows * scene.tileSize,
  }
  // The opt-in scene uses actual visible pieces, including transformed sets.
  // Keep the previous generation rule for scenes 1/2 and existing game programs.
  const platformer =
    scene.version === 4
      ? scene.layers.some(
          (layer) =>
            layer.kind === 'tiles' &&
            layer.visible &&
            layer.cells.chunks.some((chunk) =>
              chunk.cells.some(
                (cell) =>
                  cell >= 0 &&
                  scene.tilesets
                    .find((tileset) => tileset.id === layer.tilesetId)
                    ?.platform.includes(cell & 4095),
              ),
            ),
        )
      : scene.version === 3
        ? sceneVisitColliders(scene, world, 'platform', (tile) =>
            sceneObjectIntersectsBox(tile, world),
          )
        : scene.layers.some(
            (l) =>
              l.kind === 'tiles' &&
              l.visible &&
              l.cells.some(
                (c) =>
                  c >= 0 &&
                  scene.tilesets.find((t) => t.id === l.tilesetId)?.platform.includes(c & 4095),
              ),
          )
  const old = buildIR(
    image,
    null,
    {
      tileSize: scene.tileSize,
      cols: scene.cols,
      rows: scene.rows,
      grid: '',
      solid: [],
      tileset: { dataUrl: '', width: 0, height: 0 },
    },
    false,
  )
  old.js = [
    { type: 'g2d:sceneCommand', method: 'createMapScene', args: [str('mapa'), str(image)] },
    {
      type: 'g2d:createWorld',
      varName: 'mundo',
      width: fromScene('mapSize', 'width'),
      height: fromScene('mapSize', 'height'),
    },
    {
      type: 'g2d:configureWorldCamera',
      worldVar: 'mundo',
      horizontal: 'free',
      vertical: 'free',
      deadZoneX: 0,
      deadZoneY: 0,
    },
    {
      type: 'g2d:createSprite',
      varName: 'jogador',
      x: fromScene('mapSpawn', 'x'),
      y: fromScene('mapSpawn', 'y'),
      w: Math.max(6, scene.tileSize - 4),
      h: Math.max(6, scene.tileSize - 4),
      color: '#4ade80',
    },
    {
      type: 'g2d:sceneEvent',
      method: 'mapArea',
      args: [str('mapa'), variable('jogador'), str('door')],
      parameter: 'porta',
      body: [
        {
          type: 'g2d:sceneCommand',
          method: 'useMapDoor',
          args: [str('mapa'), variable('jogador'), variable('porta')],
        },
        {
          type: 'memberSet',
          object: variable('mundo'),
          name: 'width',
          value: fromScene('mapSize', 'width'),
        },
        {
          type: 'memberSet',
          object: variable('mundo'),
          name: 'height',
          value: fromScene('mapSize', 'height'),
        },
      ],
    },
    {
      type: 'g2d:updateEachFrame',
      body: [
        { type: 'g2d:clear' },
        ...(platformer
          ? [
              { type: 'g2d:applyGravity' as const, spriteVar: 'jogador' },
              {
                type: 'g2d:platformerWithTerrain' as const,
                spriteVar: 'jogador',
                speed: 4,
                jump: 11,
              },
            ]
          : [{ type: 'g2d:topDown' as const, spriteVar: 'jogador', speed: 3 }]),
        {
          type: 'g2d:sceneCommand',
          method: 'collideMapScene',
          args: [variable('jogador'), str('mapa')],
        },
        { type: 'g2d:followCameraInWorld', spriteVar: 'jogador', worldVar: 'mundo' },
        { type: 'g2d:sceneCommand', method: 'drawMapScene', args: [str('mapa'), str('back')] },
        { type: 'g2d:drawSprite', spriteVar: 'jogador', ctxVar: 'ctx' },
        { type: 'g2d:sceneCommand', method: 'drawMapScene', args: [str('mapa'), str('front')] },
      ],
    },
  ]
  return old
}

/**
 * Monta E PERSISTE o projeto-jogo a partir do mapa do Pinta. Devolve o `Project`
 * (o host navega para ele) ou `null` se o mapa não veio válido. ⚠️ o host deve
 * fornecer o namespace do perfil que iniciou a captura. Chamadas antigas sem opções
 * conservam o perfil ativo no início, inclusive durante a admissão assíncrona do PNG.
 */
export async function buildTilemapGameProject(
  payload: TilemapGamePayload,
  options: { namespace?: string; signal?: AbortSignal } = {},
): Promise<Project | null> {
  const scope =
    options.namespace === undefined
      ? captureProjectStorageScope()
      : getProjectStorageScope(options.namespace)
  const { signal } = options
  signal?.throwIfAborted()
  const captured = { ...payload }
  let project: Project | null
  if (captured.regional) {
    const admitted = await admitPintaRegionalMaterial(
      {
        ...captured,
        sourceId: captured.id ?? captured.regional.sourceId,
      },
      signal,
    )
    signal?.throwIfAborted()
    const root = admitted.world.maps.get(admitted.world.rootId)
    if (!root) return null
    const name = normalizeAssetName(captured.name) ?? 'meu-mapa'
    const ir = normalizeSZIR(buildSceneIR(name, root.data.scene))
    project = {
      ...createEmptyProject(ulid(), name),
      ir,
      blocksState: buildWorkspaceStateFromIR(ir),
      files: generateProjectFiles({ ir, projectName: name }),
      assets: [
        {
          id: ulid(),
          name,
          kind: 'image',
          source: 'library',
          dataUrl: admitted.dataUrl,
          width: root.width,
          height: root.height,
          regional: admitted.regional,
          libId: `personal:${admitted.world.rootId}`,
          libOrigin: 'pinta',
          ...(captured.libRevision === undefined ? {} : { libRevision: captured.libRevision }),
        },
      ],
      installedExtensions: [{ id: 'game-2d', version: gameTwoDVersion(), installedAt: Date.now() }],
    }
  } else project = assembleTilemapGameProject(captured)
  if (!project) return null
  signal?.throwIfAborted()
  await persistProject(project, {}, scope)
  return project
}
