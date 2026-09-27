import { ObjInputError } from './objInput'

/** Prefix only option errors from a nested options reader; preserve unrelated failures and cause. */
export function objOptionGroup<T>(field: string, read: () => T): T {
  try {
    return read()
  } catch (error) {
    if (
      !(error instanceof ObjInputError) ||
      (error.path !== 'options' && !error.path.startsWith('options.'))
    )
      throw error
    throw new ObjInputError(
      error.reason,
      `options.${field}${error.path.slice('options'.length)}`,
      error.message,
      { cause: error },
    )
  }
}
