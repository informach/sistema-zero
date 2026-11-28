/**
 * Os pacotes de "A Vila e a Floresta" para fora do Pinta: o que vai dentro de cada ZIP e o que dá
 * para conferir sem navegador, sem Tiled e sem Godot. O que estes testes NÃO fazem está dito em
 * `docs/pinta-cenarios/homologacao.md`: ninguém aqui abre o Phaser num navegador nem roda o Godot.
 */
import { describe, expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { encodePintaRegionLayers } from '@sistemazero/core/creations'
import {
  type PintaRegionSceneWire,
  readPintaRegionScene,
} from '@sistemazero/core/studio/pinta-region-scene'
import { strFromU8, unzipSync } from 'fflate'
import { PHASER_SHA256, PHASER_VERSION } from '../../scripts/generate-phaser'
import { vilaEFloresta } from '../../scripts/homologacao/fixture'
import { nativeImageOf } from '../../scripts/homologacao/generate'
import { createTilemapAsset, createTilesetAsset } from '../core/project'
import { prepareMapRegions } from '../tiles/regionMap'
import { createMapSet } from '../tiles/sets'
import { parseGodotText, validateAtlasCoordinates, validateGodotProject } from './godot/textFormat'
import { importPintaJson } from './projectJson'
import { buildScenePackage, type ScenePackageTarget, scenePackageBlob } from './scenePackage'
import { TiledSceneCompatibilityError } from './tiled/export'

function shearedArt() {
  const ts = createTilesetAsset({ name: 'Peças', tileSize: 16 })
  ts.tiles = [ts.tiles[0]!]
  ts.tiles[0]!.data.fill(1)
  const source = createTilemapAsset({ name: 'Original', tilesetId: ts.id, cols: 2, rows: 2 })
  source.layers.push({
    id: 'art',
    name: 'Art',
    kind: 'objects',
    visible: true,
    objects: [
      {
        id: 'child',
        name: 'Child',
        type: '',
        x: 6,
        y: 4,
        width: 4,
        height: 4,
        rotation: 45,
        shape: 'art',
        art: { assetId: ts.id, tile: 0 },
        properties: {},
      },
    ],
  })
  const set = createMapSet(source, { col: 0, row: 0, cols: 1, rows: 1 }, 16, 'Conjunto')
  const root = createTilemapAsset({ name: 'Shear', tilesetId: ts.id, cols: 8, rows: 8 })
  root.layers.push({
    id: 'objects',
    name: 'Objects',
    kind: 'objects',
    visible: true,
    objects: [
      {
        id: 'copy',
        name: 'Copy',
        type: '',
        x: 32,
        y: 32,
        width: 32,
        height: 48,
        flipX: true,
        shape: 'set',
        setId: set.id,
        properties: {},
      },
    ],
  })
  return { root, assets: [root, set, ts] }
}

it('Pygame and Godot retain affine art and explicitly report omitted incompatible Tiled supplements', async () => {
  const { root, assets } = shearedArt()
  for (const target of ['pygame', 'godot'] as const) {
    const files = await buildScenePackage(root, assets, target, { imageOf: nativeImageOf })
    expect(
      Object.keys(files).some(
        (path) => path.endsWith('mapa.json') || path.endsWith('.tmx') || path.endsWith('.tsx'),
      ),
    ).toBe(false)
    expect(files['COMPATIBILIDADE-TILED.txt']).toContain('cisalhamento')
    expect(files['LEIA-ME.txt']).toContain('COMPATIBILIDADE-TILED.txt')
    const scene = JSON.parse(files['maps.json'] as string)[root.id] as PintaRegionSceneWire
    expect(
      scene.sets?.[0]?.layers.flatMap((l) => (l.kind === 'objects' ? l.objects : []))[0]?.rotation,
    ).toBe(45)
    expect(importPintaJson(files['desenhos.pinta.json'] as string).assets.length).toBe(3)
    expect(files[target === 'pygame' ? 'main.py' : 'project.godot']).toBeDefined()
    expect(files['mapas/mapa-0/images/tiles-0.png']).toBeInstanceOf(Uint8Array)
  }
  for (const target of ['tiled'] as const)
    await expect(
      buildScenePackage(root, assets, target, { imageOf: nativeImageOf }),
    ).rejects.toBeInstanceOf(TiledSceneCompatibilityError)
})

it('o Phaser regional segue sem o suplemento do Tiled, como Pygame e Godot, e registra a omissão', async () => {
  const { root, assets } = shearedArt()
  const prepared = prepareMapRegions(root)
  if (!prepared.ok) throw new Error('O mapa de teste devia virar regiões.')
  const regional = prepared.map,
    inventory = [regional, ...assets.filter((asset) => asset.id !== root.id)]
  for (const target of ['phaser', 'pygame', 'godot'] as const) {
    const files = await buildScenePackage(regional, inventory, target, { imageOf: nativeImageOf })
    expect(
      Object.keys(files).some(
        (path) => path.endsWith('mapa.json') || path.endsWith('.tmx') || path.endsWith('.tsx'),
      ),
    ).toBe(false)
    const report = files['COMPATIBILIDADE-TILED.txt'] as string
    expect(report).toContain('cisalhamento')
    expect(report).toContain(
      target === 'phaser'
        ? 'O jogo em index.html usa o cenário completo de maps.json.'
        : `Consulte o cenário completo em ${target === 'pygame' ? 'cenario.png' : 'maps.json'}.`,
    )
    expect(JSON.parse(files['maps.json'] as string)[regional.id]).toBeDefined()
    expect(files['start.json']).toBe(JSON.stringify(regional.id))
    if (target === 'phaser') expect(files['main.js']).toBeDefined()
  }
  await expect(
    buildScenePackage(regional, inventory, 'tiled', { imageOf: nativeImageOf }),
  ).rejects.toBeInstanceOf(TiledSceneCompatibilityError)
})

const pygame = [process.env.PYTHON, 'python3', 'python'].find(
  (name) => name && spawnSync(name, ['-I', '-c', 'import pygame']).status === 0,
)
it.skipIf(!pygame)(
  'the portable Pygame package actually renders the sheared child footprint',
  async () => {
    const { root, assets } = shearedArt(),
      files = await buildScenePackage(root, assets, 'pygame', { imageOf: nativeImageOf }),
      folder = await mkdtemp(join(tmpdir(), 'pinta-affine-'))
    try {
      for (const [path, contents] of Object.entries(files)) {
        await mkdir(dirname(join(folder, path)), { recursive: true })
        await writeFile(join(folder, path), contents)
      }
      const script = `import sys\nsys.path.insert(0,sys.argv[1])\nimport pygame\nfrom pinta_cenario import carregar_cenario\npygame.init()\npygame.display.set_mode((128,128))\nscreen=pygame.Surface((128,128),pygame.SRCALPHA)\nfrom pathlib import Path\nwith carregar_cenario(Path(sys.argv[1]) / 'cenario.png') as m: m.desenhar(screen,(0,0))\nassert screen.get_at((52,52)).a>0,'center of affine art missing'\nassert screen.get_at((47,45)).a==0,'bounding rectangle was painted instead of sheared image'\nassert screen.get_at((57,59)).a==0,'bounding rectangle was painted instead of sheared image'\npygame.quit()\n`
      const result = spawnSync(pygame!, ['-I', '-c', script, folder], {
        encoding: 'utf8',
        env: {
          ...process.env,
          SDL_VIDEODRIVER: 'dummy',
          SDL_AUDIODRIVER: 'dummy',
          PYGAME_HIDE_SUPPORT_PROMPT: '1',
        },
      })
      expect(result.status, result.stderr).toBe(0)
    } finally {
      await rm(folder, { recursive: true, force: true })
    }
  },
)

/** O Python desta máquina (`PYTHON`, `python3` ou `python`), ou null quando não há nenhum. */
const python =
  [process.env.PYTHON, 'python3', 'python'].find(
    (name) => name && spawnSync(name, ['-I', '-c', 'import py_compile']).status === 0,
  ) ?? null

/** O pacote como a criança recebe: montado, zipado e aberto de novo. */
async function pacote(target: ScenePackageTarget) {
  const { map, assets } = vilaEFloresta(),
    files = await buildScenePackage(map, assets, target, { imageOf: nativeImageOf }),
    blob = await scenePackageBlob(files),
    zip = unzipSync(new Uint8Array(await blob.arrayBuffer()))
  expect(blob.type).toBe('application/zip')
  expect(Object.keys(zip).sort()).toEqual(Object.keys(files).sort())
  const text = (name: string) => {
    const entry = zip[name]
    if (!entry) throw new Error(`falta ${name} no ZIP`)
    return strFromU8(entry)
  }
  const scenes = JSON.parse(text('maps.json')) as Record<string, PintaRegionSceneWire>
  return { files, zip, text, scenes, names: Object.keys(zip).sort() }
}
const COMUNS = [
  'COMPATIBILIDADE-TILED.txt',
  'LEIA-ME.txt',
  'desenhos.pinta.json',
  'mapas/mapa-0/images/art-0.png',
  'mapas/mapa-0/images/tiles-0.png',
  'mapas/mapa-0/images/tiles-1.png',
  'mapas/mapa-0/mapa.json',
  'mapas/mapa-0/mapa.tmx',
  'mapas/mapa-0/tiles-0.tsx',
  'mapas/mapa-0/tiles-1.tsx',
  'mapas/mapa-0/tiles-2.tsx',
  'mapas/mapa-1/images/tiles-0.png',
  'mapas/mapa-1/mapa.json',
  'mapas/mapa-1/mapa.tmx',
  'mapas/mapa-1/tiles-0.tsx',
  'maps.json',
  'start.json',
]
/** Endereço de internet num texto do pacote (o `xmlns` de um SVG embutido não é uma busca). */
const enderecos = (source: string) =>
  [...source.matchAll(/(?:https?:)?\/\/[\w.-]+\.[a-z]{2,}[^\s"'<>)]*/gi)].map((m) => m[0])
/** Toda cena do pacote passa no esquema, e toda imagem que ela cita veio no ZIP como PNG. */
function conferirCenas(
  scenes: Record<string, PintaRegionSceneWire>,
  zip: Record<string, Uint8Array>,
) {
  expect(Object.keys(scenes)).toEqual(['vila-e-floresta', 'cabana'])
  for (const scene of Object.values(scenes)) {
    expect(readPintaRegionScene(JSON.stringify(scene))).not.toBeNull()
    for (const item of [...scene.tilesets, ...(scene.art ?? [])]) {
      expect(item.image).toMatch(/^mapas\/mapa-\d\/images\/(tiles|art)-\d+\.png$/)
      expect([...(zip[item.image] ?? []).slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47])
    }
  }
}

describe('pacote Tiled', () => {
  it('traz mapas, folhas, imagens, o backup editável e mais nada', async () => {
    const { names, text, scenes, zip } = await pacote('tiled')
    expect(names).toEqual(COMUNS)
    conferirCenas(scenes, zip)
    expect(JSON.parse(text('start.json'))).toBe('vila-e-floresta')
    const backup = importPintaJson(text('desenhos.pinta.json'))
    expect(backup.warnings).toEqual([])
    expect(backup.assets.map((a): string => a.kind).sort()).toEqual([
      'map-set',
      'pixel-sprite',
      'tilemap',
      'tilemap',
      'tileset',
      'tileset',
    ])
  })
})

describe('pacote Phaser', () => {
  it('o ZIP tem a página, o jogo, o Phaser fixado e a licença', async () => {
    const { names, text, scenes, zip } = await pacote('phaser')
    expect(names).toEqual(
      [...COMUNS, 'PHASER-LICENSE.txt', 'index.html', 'main.js', 'phaser.min.js'].sort(),
    )
    conferirCenas(scenes, zip)
    // O arquivo do Phaser é o da versão e do SHA-256 fixados em scripts/generate-phaser.ts.
    expect(createHash('sha256').update(text('phaser.min.js')).digest('hex')).toBe(PHASER_SHA256)
    expect(text('phaser.min.js')).toContain(PHASER_VERSION)
    expect(text('PHASER-LICENSE.txt')).toContain('Copyright (c) 2024 Richard Davey')
    expect(text('PHASER-LICENSE.txt')).toContain('Permission is hereby granted, free of charge')
    expect(text('LEIA-ME.txt')).toContain(`Phaser ${PHASER_VERSION}`)
  })
  it('a página e o jogo não pedem nada da internet', async () => {
    const { text, names } = await pacote('phaser'),
      html = text('index.html')
    expect(enderecos(html)).toEqual([])
    expect(
      enderecos(text('main.js')).every((url) =>
        /^https?:\/\/json-schema\.org\/draft(?:\/|-)/.test(url),
      ),
    ).toBe(true)
    // Tudo o que a página carrega é arquivo do próprio pacote.
    const carregados = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]!)
    expect(carregados).toEqual(['phaser.min.js', 'main.js'])
    for (const arquivo of carregados) expect(names).toContain(arquivo)
    expect(html).not.toMatch(/<link|@import|url\(/)
  })
  it('as cenas embutidas no main.js são as do maps.json e apontam para imagens do pacote', async () => {
    const { text, scenes, names } = await pacote('phaser'),
      main = text('main.js')
    expect(main).toContain('maps.json')
    expect(main).toContain('start.json')
    expect(Object.keys(scenes)).toEqual(['vila-e-floresta', 'cabana'])
    expect(names).toContain('maps.json')
    expect(names).toContain('start.json')
    // O JavaScript do jogo (sem o Phaser) é sintaticamente válido.
    expect(() => new Function(main)).not.toThrow()
  })
})

describe('projeto Pygame portátil', () => {
  it('o ZIP tem o módulo, o exemplo e os requisitos', async () => {
    const { names, text, scenes, zip } = await pacote('pygame')
    expect(names).toEqual(
      [...COMUNS, 'cenario.png', 'main.py', 'pinta_cenario.py', 'requirements.txt'].sort(),
    )
    conferirCenas(scenes, zip)
    expect(text('requirements.txt')).toBe('pygame-ce==2.5.8\n')
  })
  // No CI o Python é obrigatório; numa máquina sem Python o caso aparece como pulado.
  it.skipIf(!python && !process.env.CI)(
    'todo .py do projeto compila no Python (py_compile)',
    async () => {
      const { names, zip } = await pacote('pygame')
      const pasta = await mkdtemp(join(tmpdir(), 'pinta-pygame-'))
      try {
        const fontes = names.filter((n) => n.endsWith('.py'))
        expect(fontes).toEqual(['main.py', 'pinta_cenario.py'])
        for (const nome of fontes) {
          await mkdir(dirname(join(pasta, nome)), { recursive: true })
          await writeFile(join(pasta, nome), zip[nome]!)
        }
        const resultado = spawnSync(
          python ?? 'python3',
          ['-I', '-m', 'py_compile', ...fontes.map((n) => join(pasta, n))],
          { encoding: 'utf8' },
        )
        expect(resultado.error).toBeUndefined()
        expect(resultado.stderr).toBe('')
        expect(resultado.status).toBe(0)
      } finally {
        await rm(pasta, { recursive: true, force: true })
      }
    },
  )
  it('o Python só lê arquivos que estão no pacote', async () => {
    const { names, text } = await pacote('pygame')
    for (const fonte of ['main.py', 'pinta_cenario.py']) {
      const source = text(fonte)
      expect(
        enderecos(source).every((url) => /^https?:\/\/json-schema\.org\/draft(?:\/|-)/.test(url)),
      ).toBe(true)
      // Arquivos citados por nome no código.
      const citados = [...source.matchAll(/'([\w./-]+\.(?:json|png|py|txt))'/g)].map((m) => m[1]!)
      if (fonte === 'main.py') for (const arquivo of citados) expect(names).toContain(arquivo)
      for (const modulo of source.matchAll(/^(?:from|import) ([\w.]+)/gm))
        expect([
          'argparse',
          'json',
          'math',
          'pathlib',
          'pygame',
          'pinta_cenario',
          'base64',
          'binascii',
          'struct',
          'zlib',
          'sys',
          'io',
          're',
          'codecs',
          'array',
          'types',
          'collections',
          'time',
          'weakref',
          'os',
        ]).toContain(modulo[1]!)
    }
    expect(text('main.py')).toContain('cenario.png')
    expect(text('pinta_cenario.py')).toContain('def carregar_cenario')
  })
})

describe('projeto Godot', () => {
  it('o ZIP tem o projeto, a cena e o script; os textos passam na conferência', async () => {
    const { names, zip, text, scenes } = await pacote('godot')
    expect(names).toEqual([...COMUNS, 'main.tscn', 'pinta.gd', 'project.godot'].sort())
    conferirCenas(scenes, zip)
    const files = Object.fromEntries(
      Object.entries(zip).map(([name, bytes]) => [
        name,
        /\.(png)$/.test(name) ? bytes : strFromU8(bytes),
      ]),
    )
    expect(validateGodotProject(files)).toEqual([])
    const cena = parseGodotText(text('main.tscn'))
    expect(cena.sections.map((s) => s.tag)).toEqual(['', 'gd_scene', 'ext_resource', 'node'])
    expect(cena.sections[2]?.attributes).toEqual({
      type: 'Script',
      path: 'res://pinta.gd',
      id: '1',
    })
    expect(cena.sections[3]?.values.script).toBe('ExtResource("1")')
    expect(text('pinta.gd').startsWith('extends Node2D\n')).toBe(true)
  })
  it('toda peça que o script pede ao atlas existe na folha e cabe na imagem', async () => {
    const { zip, scenes } = await pacote('godot')
    expect(validateAtlasCoordinates(scenes, zip)).toEqual([])
    // A conferência enxerga o erro: uma peça além da folha e uma imagem menor que a folha.
    const [nome, cena] = Object.entries(scenes)[0]!
    const decoded = readPintaRegionScene(JSON.stringify(cena))!
    const camada = decoded.layers.find((layer) => layer.kind === 'tiles')!
    if (camada.kind !== 'tiles') throw Error('Camada ausente')
    const folha = cena.tilesets.find((sheet) => sheet.id === camada.tilesetId)!
    const chunk = camada.cells.chunks[0]!
    const cells = chunk.cells.slice()
    cells[0] = folha.count
    const grid = encodePintaRegionLayers(
      [{ ...camada.cells, chunks: [{ ...chunk, cells }, ...camada.cells.chunks.slice(1)] }],
      { ...decoded.origin, cols: decoded.cols, rows: decoded.rows },
    )![0]!
    const quebrada: PintaRegionSceneWire = {
      ...cena,
      layers: cena.layers.map((layer) =>
        layer.id === camada.id ? { ...layer, cells: grid } : layer,
      ),
    }
    expect(validateAtlasCoordinates({ [nome]: quebrada }, zip).length).toBeGreaterThan(0)
    const larga: PintaRegionSceneWire = {
      ...cena,
      tilesets: cena.tilesets.map((sheet) =>
        sheet === folha ? { ...sheet, columns: 1024 } : sheet,
      ),
    }
    expect(validateAtlasCoordinates({ [nome]: larga }, zip).length).toBeGreaterThan(0)
  })
  it('a conferência dos textos pega recurso não declarado, arquivo ausente e seção malformada', () => {
    const base = {
      'project.godot': 'config_version=5\n[application]\nrun/main_scene="res://main.tscn"\n',
      'main.tscn':
        '[gd_scene load_steps=2 format=3]\n[ext_resource type="Script" path="res://pinta.gd" id="1"]\n[node name="A" type="Node2D"]\nscript = ExtResource("1")\n',
      'pinta.gd': 'extends Node2D\n',
    }
    expect(validateGodotProject(base)).toEqual([])
    expect(
      validateGodotProject({
        ...base,
        'main.tscn': base['main.tscn'].replace('ExtResource("1")', 'ExtResource("2")'),
      }),
    ).toEqual(['main.tscn: ExtResource("2") não foi declarado.'])
    expect(
      validateGodotProject({ ...base, 'main.tscn': `${base['main.tscn']}x = SubResource("s1")\n` }),
    ).toEqual(['main.tscn: SubResource("s1") não foi declarado.'])
    const { 'pinta.gd': _script, ...semScript } = base
    expect(validateGodotProject(semScript)).toEqual(['main.tscn: falta o arquivo res://pinta.gd'])
    expect(
      validateGodotProject({
        ...base,
        'main.tscn': base['main.tscn'].replace('load_steps=2', 'load_steps=5'),
      }),
    ).toEqual(['main.tscn: load_steps=5, mas há 1 recursos (esperado 2).'])
    expect(
      validateGodotProject({
        ...base,
        'project.godot': 'config_version=5\n[application\nrun/main_scene="res://main.tscn"\n',
      }),
    ).toContain('project.godot: linha 2: cabeçalho de seção malformado: [application')
    expect(
      validateGodotProject({
        ...base,
        'project.godot': 'config_version=5\n[application]\nrun/main_scene="res://outra.tscn"\n',
      }),
    ).toContain('project.godot: falta o arquivo res://outra.tscn')
    expect(
      validateGodotProject({
        ...base,
        'pinta.gd': 'extends Node2D\nvar x = load("res://sumiu.png")\n',
      }),
    ).toEqual(['pinta.gd: falta o arquivo res://sumiu.png'])
    expect(validateGodotProject({})).toEqual(['falta o project.godot'])
  })
})
