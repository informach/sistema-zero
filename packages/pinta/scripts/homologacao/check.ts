/**
 * A homologação que roda sozinha: gera "A Vila e a Floresta" numa pasta TEMPORÁRIA (nunca em
 * `output/`) e confere o que dá para conferir sem navegador e sem os programas de fora.
 *
 *   bun scripts/homologacao/check.ts [--exigir-pygame]
 *
 * Sai com erro em qualquer diferença. O ensaio com pygame de verdade só roda quando o pygame-ce
 * está instalado; sem ele a linha sai como "não realizado" (com `--exigir-pygame`, vira erro).
 * GODOT=<executável> também confere o projeto no motor real; --exigir-godot torna isso obrigatório.
 * Tiled (programa) e navegador NÃO são executados aqui.
 */
import { spawnSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { checkPhaser, PHASER_VERSION } from '../generate-phaser'
import { generateHomologation } from './generate'
import { verifyTiledPackage } from './verify-tiled'

GlobalRegistrator.register()
const python = process.env.PYTHON ?? 'python3'
const repo = resolve(import.meta.dirname, '../../../..')
const temp = await mkdtemp(join(tmpdir(), 'pinta-homologacao-'))
const problems: string[] = []
const done = (line: string) => console.log(`ok             ${line}`)
const run = (args: string[]) => spawnSync(python, args, { encoding: 'utf8' })
try {
  const packages = await generateHomologation(temp)
  done(`pacotes gerados em pasta temporária: ${Object.keys(packages).join(', ')}`)

  const tiled = await verifyTiledPackage(join(temp, 'tiled'))
  problems.push(...tiled)
  if (!tiled.length) done('Tiled: JSON e TMX de cada mapa voltam iguais pelo importador do Pinta')

  const phaser = await checkPhaser()
  problems.push(...phaser)
  if (!phaser.length) done(`Phaser ${PHASER_VERSION}: hash e licença do arquivo embutido`)

  const sources = Object.keys(packages.pygame).filter((name) => name.endsWith('.py'))
  const compiled = run([
    '-I',
    '-m',
    'py_compile',
    ...sources.map((name) => join(temp, 'pygame', name)),
  ])
  if (compiled.status !== 0)
    problems.push(`Pygame: py_compile falhou: ${compiled.stderr || compiled.error}`)
  else done(`Pygame: py_compile de ${sources.join(', ')}`)

  if (run(['-I', '-c', 'import pygame']).status === 0) {
    const scene = run([
      '-I',
      '-B',
      join(repo, 'packages/studio/scripts/python/test-pinta-scene-package.py'),
      temp,
    ])
    if (scene.status !== 0)
      problems.push(`Pygame: test-pinta-scene-package.py falhou:\n${scene.stdout}${scene.stderr}`)
    else done(`Pygame de verdade: ${scene.stdout.trim()}`)
  } else if (process.argv.includes('--exigir-pygame'))
    problems.push('Pygame: o pygame-ce não está instalado e a conferência foi exigida.')
  else
    console.log(
      'não realizado  Pygame de verdade (test-pinta-scene-package.py): o pygame-ce não está instalado',
    )
  if (process.env.GODOT) {
    const invokeGodot = (args: string[]) =>
      spawnSync(process.env.GODOT!, args, { encoding: 'utf8', timeout: 30_000, windowsHide: true })
    const imported = invokeGodot(['--headless', '--path', join(temp, 'godot'), '--import'])
    const tested =
      imported.status === 0
        ? invokeGodot([
            '--headless',
            '--path',
            join(temp, 'godot'),
            '--script',
            join(repo, 'packages/pinta/scripts/homologacao/test-godot.gd'),
            '--quit-after',
            '180',
          ])
        : imported
    const output = `${imported.stdout ?? ''}${imported.stderr ?? ''}${tested.stdout ?? ''}${tested.stderr ?? ''}`
    if (tested.status !== 0 || /(?:SCRIPT ERROR|ERROR):/.test(output))
      problems.push(`Godot real: ${tested.error ?? ''}\n${output}`)
    else done(`Godot real: ${tested.stdout.trim()}`)
  } else if (process.argv.includes('--exigir-godot'))
    problems.push('Godot: configure GODOT com o executável da versão-alvo.')
  else console.log('não realizado  Godot real: GODOT não foi configurado')
  console.log('não realizado  Tiled (programa) e navegador: este script não os executa')
} finally {
  await rm(temp, { recursive: true, force: true })
}
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
