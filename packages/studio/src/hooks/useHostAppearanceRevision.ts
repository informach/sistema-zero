import { useEffect, useState } from 'react'

/**
 * Revisão da APARÊNCIA DO HOST: sobe a cada mudança de atributo no `<html>` da página que
 * embarca o Estúdio (o `data-tema` do community-kids e da comunidade adulta, a `class` de um
 * next-themes).
 *
 * Existe por causa do Blockly, que pinta com cores LIDAS do CSS em tempo de execução
 * (`blockly/themeColors.ts`): o tema do Estúdio só sabe "claro" e "escuro", e os temas Padrão e
 * Pink do host são os dois "claro", então trocar um pelo outro não passava por nada que mandasse
 * reler a paleta e o canvas ficava com as cores do tema anterior.
 *
 * Observa só os atributos do `<html>`, sem a subárvore: é onde os hosts marcam o tema, e mudança
 * ali é rara (a troca de tema, o `lang`). Quem usa a revisão deve reler e só aplicar se a
 * paleta de fato mudou (o `szThemeFor` já devolve o MESMO objeto para a mesma paleta).
 */
export function useHostAppearanceRevision(): number {
  const [revisao, setRevisao] = useState(0)
  useEffect(() => {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return
    const observador = new MutationObserver(() => setRevisao((n) => n + 1))
    observador.observe(document.documentElement, { attributes: true })
    return () => observador.disconnect()
  }, [])
  return revisao
}
