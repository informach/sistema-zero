/**
 * O projeto modular da etapa 3 do plano (Pro em escala): 60 arquivos TypeScript que se importam
 * de verdade, em cinco camadas (núcleo, entidades, sistemas, cenas e interface), para a análise do
 * editor trabalhar com dependências entre arquivos e não com 60 ilhas. Determinístico: o mesmo
 * texto em toda execução, para as medidas compararem antes e depois.
 */

const CORE = [
  'vector',
  'random',
  'config',
  'events',
  'timer',
  'math',
  'color',
  'input',
  'audio',
  'storage',
] as const
const ENTITY_COUNT = 20
const SYSTEMS = [
  'movement',
  'collision',
  'spawn',
  'score',
  'health',
  'animation',
  'camera',
  'particles',
  'sound',
  'save',
  'pickup',
  'enemyBrain',
  'wave',
  'combo',
  'cleanup',
] as const
const SCENES = [
  'title',
  'level1',
  'level2',
  'level3',
  'boss',
  'pause',
  'shop',
  'credits',
  'gameOver',
] as const
const UI = ['hud', 'menu', 'dialog', 'theme'] as const

const entityName = (index: number) => `enemy${String(index).padStart(2, '0')}`
const className = (name: string) => name[0].toUpperCase() + name.slice(1)

function coreFile(name: (typeof CORE)[number], index: number): string {
  const other = CORE[(index + 1) % CORE.length]
  const lines = [
    index === 0 ? '' : "import { Vector } from './vector'",
    other === 'vector' || index === 0 ? '' : `import { ${other}Version } from './${other}'`,
    '',
    `export const ${name}Version = ${index + 1}`,
    '',
  ]
  if (name === 'vector') {
    lines.push(
      'export class Vector {',
      '  constructor(public x = 0, public y = 0) {}',
      '  add(other: Vector): Vector {',
      '    return new Vector(this.x + other.x, this.y + other.y)',
      '  }',
      '  scale(factor: number): Vector {',
      '    return new Vector(this.x * factor, this.y * factor)',
      '  }',
      '  length(): number {',
      '    return Math.hypot(this.x, this.y)',
      '  }',
      '}',
      '',
    )
  } else {
    lines.push(
      `export interface ${className(name)}State {`,
      '  position: Vector',
      '  enabled: boolean',
      '  ticks: number',
      '}',
      '',
      `export function create${className(name)}(): ${className(name)}State {`,
      '  return { position: new Vector(), enabled: true, ticks: 0 }',
      '}',
      '',
      `export function step${className(name)}(state: ${className(name)}State, dt: number): ${className(name)}State {`,
      `  const factor = dt * ${other === 'vector' ? 1 : `${other}Version`}`,
      '  return { ...state, position: state.position.add(new Vector(factor, factor)), ticks: state.ticks + 1 }',
      '}',
      '',
    )
  }
  for (let helper = 0; helper < 12; helper++) {
    lines.push(
      `/** Ajudante ${helper} de ${name}: conta quantas vezes o quadro pediu esta parte. */`,
      `export function ${name}Helper${helper}(value: number): number {`,
      `  return value * ${helper + 1} + ${name}Version`,
      '}',
      '',
    )
  }
  return lines.filter((line, position, all) => line || all[position - 1]).join('\n')
}

function baseFile(): string {
  return [
    "import { Vector } from '../core/vector'",
    "import { configVersion } from '../core/config'",
    '',
    'export abstract class Entity {',
    '  position = new Vector()',
    '  velocity = new Vector()',
    '  alive = true',
    '  constructor(public readonly name: string) {}',
    '  update(dt: number): void {',
    '    this.position = this.position.add(this.velocity.scale(dt * configVersion))',
    '  }',
    '  abstract points(): number',
    '}',
    '',
  ].join('\n')
}

function entityFile(index: number): string {
  const name = entityName(index)
  const core = CORE[index % CORE.length]
  const lines = [
    "import { Vector } from '../core/vector'",
    core === 'vector' ? '' : `import { ${core}Helper${index % 12} } from '../core/${core}'`,
    "import { Entity } from './base'",
    '',
    `export class ${className(name)} extends Entity {`,
    `  speed = ${index + 2}`,
    `  constructor() {`,
    `    super('${name}')`,
    `    this.velocity = new Vector(${index % 5}, ${(index * 3) % 7})`,
    '  }',
    '  points(): number {',
    core === 'vector'
      ? `    return this.speed * ${index + 1}`
      : `    return ${core}Helper${index % 12}(this.speed)`,
    '  }',
    '}',
    '',
  ]
  for (let behaviour = 0; behaviour < 10; behaviour++) {
    lines.push(
      `export function ${name}Behaviour${behaviour}(entity: ${className(name)}, dt: number): void {`,
      `  if (!entity.alive) return`,
      `  entity.speed = Math.min(${30 + behaviour}, entity.speed + dt * ${behaviour + 1})`,
      '  entity.update(dt)',
      '}',
      '',
    )
  }
  return lines.filter((line, position, all) => line || all[position - 1]).join('\n')
}

function systemFile(name: (typeof SYSTEMS)[number], index: number): string {
  const first = entityName(index % ENTITY_COUNT)
  const second = entityName((index + 7) % ENTITY_COUNT)
  const core = CORE[(index + 3) % CORE.length]
  const lines = [
    "import type { Entity } from '../entities/base'",
    `import { ${className(first)} } from '../entities/${first}'`,
    `import { ${className(second)}, ${second}Behaviour${index % 10} } from '../entities/${second}'`,
    `import { ${core}Version } from '../core/${core}'`,
    '',
    `export class ${className(name)}System {`,
    '  private readonly entities: Entity[] = []',
    '  add(entity: Entity): void {',
    '    this.entities.push(entity)',
    '  }',
    '  update(dt: number): number {',
    '    let total = 0',
    '    for (const entity of this.entities) {',
    '      entity.update(dt)',
    `      total += entity.points() * ${core}Version`,
    '    }',
    '    return total',
    '  }',
    '}',
    '',
    `export function seed${className(name)}(system: ${className(name)}System): void {`,
    `  system.add(new ${className(first)}())`,
    `  const second = new ${className(second)}()`,
    `  ${second}Behaviour${index % 10}(second, 1 / 60)`,
    '  system.add(second)',
    '}',
    '',
  ]
  return lines.join('\n')
}

function sceneFile(name: (typeof SCENES)[number], index: number): string {
  const a = SYSTEMS[index % SYSTEMS.length]
  const b = SYSTEMS[(index + 5) % SYSTEMS.length]
  const c = SYSTEMS[(index + 10) % SYSTEMS.length]
  return [
    ...[a, b, c].map(
      (system) =>
        `import { ${className(system)}System, seed${className(system)} } from '../systems/${system}'`,
    ),
    "import { theme } from '../ui/theme'",
    '',
    `export class ${className(name)}Scene {`,
    ...[a, b, c].map((system) => `  readonly ${system} = new ${className(system)}System()`),
    '  constructor() {',
    ...[a, b, c].map((system) => `    seed${className(system)}(this.${system})`),
    '  }',
    '  update(dt: number): number {',
    `    return this.${a}.update(dt) + this.${b}.update(dt) + this.${c}.update(dt)`,
    '  }',
    '  background(): string {',
    `    return theme.colors[${index % 4}]`,
    '  }',
    '}',
    '',
  ].join('\n')
}

function uiFile(name: (typeof UI)[number]): string {
  if (name === 'theme')
    return [
      "import { colorVersion } from '../core/color'",
      '',
      'export const theme = {',
      "  colors: ['#13294b', '#4cc9f0', '#f72585', '#ffd166'],",
      '  version: colorVersion,',
      '}',
      '',
    ].join('\n')
  return [
    "import { theme } from './theme'",
    "import { storageVersion } from '../core/storage'",
    '',
    `export function draw${className(name)}(context: CanvasRenderingContext2D, value: number): void {`,
    '  context.fillStyle = theme.colors[1]',
    `  context.fillText(\`${name} \${value + storageVersion}\`, 12, 24)`,
    '}',
    '',
  ].join('\n')
}

function mainFile(): string {
  return [
    ...SCENES.map((scene) => `import { ${className(scene)}Scene } from './scenes/${scene}'`),
    "import { drawHud } from './ui/hud'",
    "import { drawMenu } from './ui/menu'",
    "import { drawDialog } from './ui/dialog'",
    '',
    `const scenes = [${SCENES.map((scene) => `new ${className(scene)}Scene()`).join(', ')}]`,
    'let current = 0',
    'let score = 0',
    '',
    'export function frame(context: CanvasRenderingContext2D, dt: number): void {',
    '  score += scenes[current].update(dt)',
    '  drawHud(context, score)',
    '  if (score > 1000) drawMenu(context, current)',
    '  if (score > 5000) drawDialog(context, score)',
    '}',
    '',
    'export function nextScene(): void {',
    '  current = (current + 1) % scenes.length',
    '}',
    '',
  ].join('\n')
}

/** Os 60 arquivos do projeto modular, por caminho. */
export function modularProjectFiles(): Record<string, string> {
  const files: Record<string, string> = { 'src/main.ts': mainFile() }
  CORE.forEach((name, index) => {
    files[`src/core/${name}.ts`] = coreFile(name, index)
  })
  files['src/entities/base.ts'] = baseFile()
  for (let index = 0; index < ENTITY_COUNT; index++)
    files[`src/entities/${entityName(index)}.ts`] = entityFile(index)
  SYSTEMS.forEach((name, index) => {
    files[`src/systems/${name}.ts`] = systemFile(name, index)
  })
  SCENES.forEach((name, index) => {
    files[`src/scenes/${name}.ts`] = sceneFile(name, index)
  })
  for (const name of UI) files[`src/ui/${name}.ts`] = uiFile(name)
  return files
}
