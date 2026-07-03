import type { Project } from '#core'
import { useProjectStore } from '../state/projectStore'

/**
 * Importa um SNAPSHOT de projeto (o JSON jogável do Mural / `.szproject.json`)
 * como um projeto NOVO no armazenamento local do viewer — o "Fazer a minha
 * versão" (remix) do host. Reusa o `importProjectFromJSON` do projectStore
 * (id novo + saneamento pelos MESMOS tetos do load; descartes viram warnings).
 *
 * ⚠️ O host chama `setStudioStorageNamespace(viewerId)` ANTES — o remix nasce
 * na lista do PERFIL certo. `name` sobrepõe o nome do snapshot (ex.: "Remix
 * de <título>").
 */
export async function importProjectSnapshot(
  raw: unknown,
  opts?: { name?: string },
): Promise<{ project: Project; warnings: string[] }> {
  const value =
    opts?.name && raw && typeof raw === 'object' && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>), name: opts.name }
      : raw
  return useProjectStore.getState().importProjectFromJSON(value)
}
