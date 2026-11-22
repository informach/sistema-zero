const lockName = (namespace: string, id: string) =>
  `pinta:edicao:${JSON.stringify([namespace, id])}`

export async function holdPintaEditorLock(namespace: string, id: string): Promise<() => void> {
  if (typeof navigator === 'undefined' || !navigator.locks) return () => {}
  let release = () => {}
  const hold = new Promise<void>((resolve) => {
    release = resolve
  })
  await new Promise<void>((resolve, reject) => {
    void navigator.locks
      .request(lockName(namespace, id), { mode: 'shared' }, async () => {
        resolve()
        await hold
      })
      .catch(reject)
  })
  return release
}

/** A whole delta is kept out until every affected editor can stay closed through the commit. */
export async function withClosedPintaEditors(
  namespace: string,
  ids: readonly string[],
  write: () => Promise<boolean>,
): Promise<boolean> {
  if (!ids.length) return write()
  if (typeof navigator === 'undefined' || !navigator.locks) return false
  const lockKeys = [...new Set(ids)].sort().map((id) => lockName(namespace, id))
  const acquire = (index: number): Promise<boolean> => {
    const key = lockKeys[index]
    if (!key) return write()
    return navigator.locks.request(key, { ifAvailable: true }, (lock) =>
      lock ? acquire(index + 1) : false,
    )
  }
  return acquire(0)
}
