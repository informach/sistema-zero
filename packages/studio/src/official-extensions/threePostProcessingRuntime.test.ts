import { describe, expect, it } from 'bun:test'
import { gameKit3DRuntime } from './game-3d-advanced/runtime'
import {
  THREE_POST_PROCESSING_MARKER,
  withThreePostProcessingRuntime,
} from './threePostProcessingRuntime'
import { world3DRuntime } from './world-3d/runtime'

const SHADER_NAMES = [
  'QUAD_VSH',
  'COPY_FSH',
  'DOWNSAMPLE_FSH',
  'UPSAMPLE_FSH',
  'COMPOSITE_FSH',
  'FINAL_FSH',
]

const COMPOSER_FUNCTIONS = [
  'makeTarget',
  'quadMaterial',
  'initComposer',
  'quadPass',
  'renderWithComposer',
  'disposeComposer',
]

describe('withThreePostProcessingRuntime', () => {
  it('injeta uma única cópia dos shaders e de toda a infraestrutura do composer', () => {
    const runtime = withThreePostProcessingRuntime(`antes\n${THREE_POST_PROCESSING_MARKER}\ndepois`)

    expect(runtime).not.toContain(THREE_POST_PROCESSING_MARKER)
    for (const name of SHADER_NAMES) {
      expect(runtime.match(new RegExp(`var ${name}`, 'g'))).toHaveLength(1)
    }
    for (const name of COMPOSER_FUNCTIONS) {
      expect(runtime.match(new RegExp(`function ${name}\\(`, 'g'))).toHaveLength(1)
    }
  })

  it('os runtimes consumidores recebem uma única implementação do composer', () => {
    for (const runtime of [gameKit3DRuntime, world3DRuntime]) {
      for (const name of COMPOSER_FUNCTIONS) {
        expect(runtime.match(new RegExp(`function ${name}\\(`, 'g'))).toHaveLength(1)
      }
    }
  })

  it('falha cedo quando o marcador está ausente ou duplicado', () => {
    expect(() => withThreePostProcessingRuntime('sem marcador')).toThrow('sem o marcador')
    expect(() =>
      withThreePostProcessingRuntime(
        `${THREE_POST_PROCESSING_MARKER}\n${THREE_POST_PROCESSING_MARKER}`,
      ),
    ).toThrow('marcador de pós-processamento duplicado')
  })
})
