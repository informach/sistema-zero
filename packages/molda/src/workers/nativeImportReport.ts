import * as v from '../scene/validation'

/** Exhaustive producer-code catalogs force new diagnostics to receive a transport decision. */
export function readNativeImportReportCode<T extends string>(
  value: unknown,
  codes: Record<T, true>,
): T {
  v.requireScene(
    typeof value === 'string' && Object.hasOwn(codes, value),
    'issue.code',
    'Código de adaptação desconhecido.',
  )
  return value as T
}

export function readNativeImportReportTarget(
  value: unknown,
  targets: ReadonlySet<string>,
  path: string,
): string {
  const id = v.id(value, path)
  v.requireScene(targets.has(id), path, 'A adaptação aponta para um item que não existe.')
  return id
}
