import { useCallback, useState } from 'react'
import { PANEL_COPY } from '../../core/panelCopy'
import type { PanelDisclosure } from './Panel'

/**
 * Uma coluna de painéis que sabem recolher, com o estado num lugar só.
 *
 * O redesenho hierarquiza por FREQUÊNCIA e DIFICULDADE: o que a criança mexe toda hora e
 * entende sozinha nasce aberto; o que é raro ou abstrato nasce recolhido, a um toque de
 * distância. Quem decide isso é quem monta a coluna, painel a painel, porque só ali se sabe
 * o que é comum naquela tela.
 *
 * ⚠️ Recolher NUNCA desmonta (ver `Panel`): o corpo fica com o atributo `hidden`. Então o
 * estado de um formulário sobrevive a recolher e reabrir, e o inventário da oficina continua
 * provando que nada some.
 */
export function usePanelGroup(openByDefault: readonly string[]) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(openByDefault))
  const toggle = useCallback((id: string, next: boolean) => {
    setOpen((current) => {
      const copy = new Set(current)
      if (next) copy.add(id)
      else copy.delete(id)
      return copy
    })
  }, [])
  /**
   * O `title` entra nos rótulos do chevron: numa coluna de seis painéis, seis botões
   * chamados "Mostrar" não distinguem nada para quem ouve a tela.
   */
  const disclosureFor = useCallback(
    (id: string, title: string): PanelDisclosure => ({
      open: open.has(id),
      onOpenChange: (next) => toggle(id, next),
      expandLabel: PANEL_COPY.expand(title),
      collapseLabel: PANEL_COPY.collapse(title),
    }),
    [open, toggle],
  )
  return { open, toggle, disclosureFor }
}
