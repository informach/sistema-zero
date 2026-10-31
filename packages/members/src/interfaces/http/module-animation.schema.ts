import { ModuleAnimationSchema } from '@sistemazero/core/course/module-animation'
import { ValidationError } from '@sistemazero/core/errors'
import { t } from 'elysia'

/** Preserve the object until the canonical media guard has checked every key and URL. */
export const moduleAnimationInputSchema = () =>
  t
    .Transform(t.Unknown())
    .Decode((value) => {
      if (value === null) return null
      const parsed = ModuleAnimationSchema.safeParse(value)
      if (!parsed.success)
        throw new ValidationError('A referência da animação do módulo é inválida.')
      return parsed.data
    })
    .Encode((value) => value)
