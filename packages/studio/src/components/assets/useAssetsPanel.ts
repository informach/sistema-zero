import { useUIStore } from '../../state/uiStore'
import type { AssetsPanelProps } from './AssetsPanel'

/**
 * A LIGAÇÃO entre a janela dos materiais e a store — um ponto só, de propósito.
 *
 * ⚠️ Ela já esteve errada: a tira de abas foi ligada ao `openAssetsTab` (a ação das
 * PORTAS do menu, que é interruptor), e clicar na aba JÁ ativa fechava a janela
 * inteira. O conserto morava no `Shell`, e um teste que refizesse a fiação à mão
 * estaria testando a própria cópia — reverter o `Shell` passaria verde. Com o fio
 * aqui, o `Shell` e o teste consomem o MESMO hook, e a regressão volta a morder.
 */
export function useAssetsPanelWiring(): Pick<
  AssetsPanelProps,
  'open' | 'tab' | 'onClose' | 'onTabChange'
> {
  const open = useUIStore((s) => s.showAssets)
  const tab = useUIStore((s) => s.assetsTab)
  const setShowAssets = useUIStore((s) => s.setShowAssets)
  // `setAssetsTab`, NUNCA `openAssetsTab`: a aba só escolhe o que mostrar.
  const onTabChange = useUIStore((s) => s.setAssetsTab)
  return { open, tab, onTabChange, onClose: () => setShowAssets(false) }
}
