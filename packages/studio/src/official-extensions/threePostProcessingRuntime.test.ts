import { describe, expect, it } from 'bun:test'
import {
  THREE_POST_PROCESSING_MARKER,
  withThreePostProcessingRuntime,
} from './threePostProcessingRuntime'

describe('withThreePostProcessingRuntime', () => {
  it('injeta uma única cópia dos quatro shaders compartilhados', () => {
    const runtime = withThreePostProcessingRuntime(`antes\n${THREE_POST_PROCESSING_MARKER}\ndepois`)

    expect(runtime).not.toContain(THREE_POST_PROCESSING_MARKER)
    for (const name of ['DOWNSAMPLE_FSH', 'UPSAMPLE_FSH', 'COMPOSITE_FSH', 'FINAL_FSH']) {
      expect(runtime.match(new RegExp(`var ${name}`, 'g'))).toHaveLength(1)
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
