/**
 * Persistência EM MEMÓRIA — o `persistence: 'none'` do bloco de aula.
 *
 * ⭐ Ela existe para que "não guardar nada no navegador" NÃO signifique "desligar o salvamento".
 * O host (o bloco da aula) é quem persiste, no backend, e ele só descobre que há o que salvar
 * porque o editor confirma a revisão: o autosave roda, `savedAsset` avança, o selo "Salvo"
 * aparece e o `onChange` dispara. Um adapter que não faz nada e resolve na hora mantém esse fio
 * inteiro; arrancar a persistência o cortaria em silêncio, e o desenho da criança nunca chegaria
 * ao professor.
 *
 * ⚠️ Sem teto de tamanho de propósito: o limite de uma entrega é do SERVIDOR (o corpo da rota),
 * não do navegador. O teto de 32 MiB do `createPintaPersistence` protege o IndexedDB do perfil,
 * que aqui não é tocado.
 */
import type { PintaAsset } from '../core/project'
import type { PintaPersistence } from './persistence'

export function createMemoryPersistence(seed: readonly PintaAsset[] = []): PintaPersistence {
  const assets = new Map<string, PintaAsset>(seed.map((asset) => [asset.id, asset]))

  const persistAssets = async (incoming: readonly PintaAsset[]): Promise<void> => {
    for (const asset of incoming) assets.set(asset.id, asset)
  }

  return {
    persistAsset: (asset) => persistAssets([asset]),
    persistAssets,
    async deleteAsset(id) {
      assets.delete(id)
    },
    async loadAssetById(id) {
      return assets.get(id) ?? null
    },
    async listAllAssets() {
      return [...assets.values()].sort((a, b) => b.updatedAt - a.updatedAt)
    },
  }
}
