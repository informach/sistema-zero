import { describe, expect, it } from 'bun:test'
import { parse } from '@babel/parser'
import type { JSStatement } from '#ir'
import { generateJS, generateJSWithMap } from '../../generators/js'
import { parseJS } from '../../parsers/js'
import { canvas3DInternalCodeRanges } from '../canvas3dMacroCodec'

const n = (value: number) => ({ type: 'num' as const, value })
const color = (value: string) => ({ type: 'color' as const, value })

const particles: JSStatement = {
  type: 'particlesSetup',
  particles: 'particulas',
  scene: 'cena',
  count: n(500),
  size: n(0.1),
  spread: n(20),
  color: color('#ffffff'),
}

describe('Canvas 3D — codec semântico dos macros', () => {
  it('restaura o macro íntegro e mantém a geração determinística sem IDs efêmeros', () => {
    const first = generateJS({ statements: [particles] })
    const parsed = parseJS(first)
    const second = generateJS({ statements: parsed })

    expect(parsed.map((statement) => statement.type)).toEqual(['importStar', 'particlesSetup'])
    expect(second).toBe(first)
    expect(first).not.toContain('%22__id%22')
  })

  it('não confia no metadado quando o JavaScript expandido foi editado', () => {
    const generated = generateJS({ statements: [particles] })
    const edited = generated.replace('Math.min(20000', 'Math.min(19999')
    const parsed = parseJS(edited)

    expect(parsed.some((statement) => statement.type === 'particlesSetup')).toBe(false)
    expect(parsed.length).toBeGreaterThan(3)
  })

  it('reserva auxiliares contra nomes do aluno e o JavaScript real continua parseável', () => {
    const collisions: JSStatement[] = [
      { type: 'var', name: 'particulasQuantidade', value: n(1), kind: 'const' },
      { type: 'var', name: 'particulasGeometria', value: n(1), kind: 'const' },
      { type: 'var', name: 'particulasIndice', value: n(1), kind: 'const' },
      particles,
    ]
    const code = generateJS({ statements: collisions })

    expect(() => parse(code, { sourceType: 'module' })).not.toThrow()
    expect(code).toContain('particulasQuantidade_2')
    expect(code).toContain('particulasGeometria_2')
    expect(code).toContain('particulasIndice_2')
  })

  it('remove o kernel gerado do código→blocos sem perder o bloco de física', () => {
    const code = generateJS({
      statements: [
        {
          type: 'physicsLiteSetup',
          world: 'fisica',
          heightFunction: 'alturaChao',
          gravity: n(-22),
          maxSubSteps: n(3),
        },
      ],
    })
    const parsed = parseJS(code)

    expect(parsed.map((statement) => statement.type)).toEqual(['importStar', 'physicsLiteSetup'])
    expect(JSON.stringify(parsed)).not.toContain('createSZPhysicsLite')
  })

  it('separa o kernel e os metadados internos do código didático da Ponte', () => {
    const physics = generateJS({
      statements: [
        {
          type: 'physicsLiteSetup',
          world: 'fisica',
          heightFunction: 'alturaChao',
          gravity: n(-22),
          maxSubSteps: n(3),
        },
      ],
    })
    const runtime = canvas3DInternalCodeRanges(physics).find((range) => range.kind === 'runtime')
    expect(runtime).toBeDefined()
    expect((runtime?.endLine ?? 0) - (runtime?.startLine ?? 0)).toBeGreaterThan(700)

    const particleCode = generateJS({ statements: [particles] })
    const metadata = canvas3DInternalCodeRanges(particleCode).filter(
      (range) => range.kind === 'metadata',
    )
    expect(metadata).toHaveLength(2)
    const visibleRecipeLine =
      particleCode.split('\n').findIndex((line) => line.includes('new THREE.BufferGeometry')) + 1
    expect(
      metadata.some(
        (range) => visibleRecipeLine >= range.startLine && visibleRecipeLine <= range.endLine,
      ),
    ).toBe(false)
    expect(
      canvas3DInternalCodeRanges(
        'const texto = "/*__SZ_CANVAS3D_RUNTIME__não é um marcador de linha";',
      ),
    ).toEqual([])
  })

  it('mantém o source map alinhado depois dos cabeçalhos semânticos', () => {
    const { code, map } = generateJSWithMap({
      statements: [
        {
          type: 'physicsLiteCollisionEvent',
          world: 'fisica',
          bodyParam: 'corpo',
          colliderParam: 'outro',
          __id: 'evento',
          body: [
            {
              type: 'consoleLog',
              value: { type: 'var', name: 'outro' },
              __id: 'mensagem',
            },
          ],
        },
      ],
    })
    const consoleLine =
      code.split('\n').findIndex((line) => line.includes('console.log(outro)')) + 1
    const macroLine =
      code.split('\n').findIndex((line) => line.includes('__SZ_CANVAS3D_MACRO__')) + 1

    const entries = map.build()
    expect(entries.mensagem?.startLine).toBe(consoleLine)
    expect(entries.evento?.startLine).toBe(macroLine)
    expect(entries.evento?.endLine).toBeGreaterThanOrEqual(consoleLine)
  })
})
