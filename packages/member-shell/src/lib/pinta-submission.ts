export interface ConfirmablePintaHandle {
  save(): Promise<boolean>
  getAsset(): unknown
}

export type PreparedPintaSubmission = { ok: false } | { ok: true; asset: unknown }

/** Só captura o asset depois de o armazenamento confirmar a revisão mais recente. */
export async function preparePintaSubmission(
  handle: ConfirmablePintaHandle,
  toWire: (asset: unknown) => unknown,
): Promise<PreparedPintaSubmission> {
  if (!(await handle.save())) return { ok: false }
  return { ok: true, asset: toWire(handle.getAsset()) }
}
