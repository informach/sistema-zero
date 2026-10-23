import { STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION } from '@sistemazero/core/studio'
import { createCreationsCloud } from './creations-cloud'

/** A capacidade de leitura pertence ao editor, não ao formato de um projeto específico. */
export function createStudioCloudTransport(
  options: Omit<Parameters<typeof createCreationsCloud>[0], 'tool' | 'maxFormatVersion'>,
) {
  return createCreationsCloud({
    ...options,
    tool: 'studio',
    maxFormatVersion: STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION,
  })
}
