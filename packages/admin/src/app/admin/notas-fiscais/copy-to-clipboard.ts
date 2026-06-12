'use client'

import { toast } from 'sonner'

/** Copia `value` p/ a área de transferência com feedback via toast. */
export async function copyToClipboard(value: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copiado.`)
  } catch {
    toast.error('Não foi possível copiar.')
  }
}
