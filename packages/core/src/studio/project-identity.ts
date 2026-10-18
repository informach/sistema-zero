import { z } from 'zod'
import { isStudioProjectId } from './project-format'

export const StudioProjectIdSchema = z.string().refine(isStudioProjectId, {
  message: 'O identificador do projeto tem formato ou tamanho incompatível.',
})
