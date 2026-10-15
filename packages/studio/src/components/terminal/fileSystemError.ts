/** WebContainer's RPC serializes Error.message but can omit Node's `code`. */
export function fileSystemErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  if ('code' in error && typeof error.code === 'string') return error.code
  if ('message' in error && typeof error.message === 'string')
    return /^(ENOENT|ENOTDIR|EISDIR|EACCES|EPERM|EEXIST): /.exec(error.message)?.[1] ?? null
  return null
}
