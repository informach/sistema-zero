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
import { type PintaScene, PintaSceneSchema } from '@sistemazero/core/studio/pinta-scene'
import { strFromU8, unzipSync } from 'fflate'
import { PHASER_SHA256, PHASER_VERSION } from '../../scripts/generate-phaser'
import { vilaEFloresta } from '../../scripts/homologacao/fixture'
import { nativeImageOf } from '../../scripts/homologacao/generate'
import { parseGodotText, validateAtlasCoordinates, validateGodotProject } from './godot/textFormat'
import { importPintaJson } from './projectJson'
import { buildScenePackage, type ScenePackageTarget, scenePackageBlob } from './scenePackage'

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
  const scenes = JSON.parse(text('maps.json')) as Record<string, PintaScene>
  return { files, zip, text, scenes, names: Object.keys(zip).sort() }
}
const COMUNS = [
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
function conferirCenas(scenes: Record<string, PintaScene>, zip: Record<string, Uint8Array>) {
  expect(Object.keys(scenes)).toEqual(['vila-e-floresta', 'cabana'])
  for (const scene of Object.values(scenes)) {
    expect(PintaSceneSchema.safeParse(scene).success).toBe(true)
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
    expect(enderecos(text('main.js'))).toEqual([])
    // Tudo o que a página carrega é arquivo do próprio pacote.
    const carregados = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]!)
    expect(carregados).toEqual(['phaser.min.js', 'main.js'])
    for (const arquivo of carregados) expect(names).toContain(arquivo)
    expect(html).not.toMatch(/<link|@import|url\(/)
  })
  it('as cenas embutidas no main.js são as do maps.json e apontam para imagens do pacote', async () => {
    const { text, scenes, names } = await pacote('phaser'),
      main = text('main.js')
    const embutido = main.slice('const PINTA_MAPS='.length, main.indexOf(';const PINTA_START='))
    expect(JSON.parse(embutido)).toEqual(scenes)
    expect(main).toContain('const PINTA_START="vila-e-floresta";')
    const tiled = main.match(/const PINTA_TILED="([^"]+)"/)?.[1]
    expect(tiled).toBe('mapas/mapa-0/mapa.json')
    expect(names).toContain(tiled!)
    // O JavaScript do jogo (sem o Phaser) é sintaticamente válido.
    expect(() => new Function(main)).not.toThrow()
  })
})

describe('projeto Pygame portátil', () => {
  it('o ZIP tem o módulo, o exemplo e os requisitos', async () => {
    const { names, text, scenes, zip } = await pacote('pygame')
    expect(names).toEqual([...COMUNS, 'main.py', 'pinta_cenario.py', 'requirements.txt'].sort())
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
      expect(enderecos(source)).toEqual([])
      // Arquivos citados por nome no código.
      const citados = [...source.matchAll(/'([\w./-]+\.(?:json|png|py|txt))'/g)].map((m) => m[1]!)
      for (const arquivo of citados) expect(names).toContain(arquivo)
      for (const modulo of source.matchAll(/^(?:from|import) ([\w.]+)/gm))
        expect(['argparse', 'json', 'math', 'pathlib', 'pygame', 'pinta_cenario']).toContain(
          modulo[1]!,
        )
    }
    expect(text('main.py')).toContain("json.loads((raiz / 'start.json')")
    expect(text('pinta_cenario.py')).toContain("self.raiz / 'maps.json'")
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
    const camada = cena.layers.find((l) => l.kind === 'tiles')
    if (camada?.kind !== 'tiles') throw new Error('sem camada de peças')
    const folha = cena.tilesets.find((t) => t.id === camada.tilesetId)!
    const quebrada: PintaScene = {
      ...cena,
      layers: cena.layers.map((l) =>
        l === camada ? { ...camada, cells: [folha.count, ...camada.cells.slice(1)] } : l,
      ),
    }
    expect(validateAtlasCoordinates({ [nome]: quebrada }, zip)).toEqual([
      `${nome}: a camada ${camada.name} pede a peça ${folha.count}, fora da folha ${folha.name}`,
    ])
    const larga: PintaScene = {
      ...cena,
      tilesets: cena.tilesets.map((t) => (t === folha ? { ...t, columns: 1024 } : t)),
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
