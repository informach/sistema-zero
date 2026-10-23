'use client'

import { toast } from 'sonner'

/** Copia `value` p/ a área de transferência com feedback via toast. */
export async function copyToClipboard(value: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`Copiado: ${label}.`)
  } catch {
    toast.error('Não deu para copiar. Selecione o texto e copie à mão.')
  }
}
