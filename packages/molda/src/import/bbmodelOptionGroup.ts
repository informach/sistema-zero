import { BbmodelInputError } from './bbmodelInput'

/** Qualify only option diagnostics; source paths and programmer errors keep their identity. */
export function bbmodelOptionGroup<T>(group: string, read: () => T): T {
  try {
    return read()
  } catch (error) {
    if (!(error instanceof BbmodelInputError) || !/^options(?:\.|$)/.test(error.path)) throw error
    throw new BbmodelInputError(
      error.reason,
      `options.${group}${error.path.slice(7)}`,
      error.message,
      { cause: error },
    )
  }
}
