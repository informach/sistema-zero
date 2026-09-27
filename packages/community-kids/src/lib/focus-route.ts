import { isEmbeddedAppPath } from './embedded-app-path'
import { isLessonPath } from './lesson-path'

/**
 * Telas de FOCO que **não** são apps embarcados: o menu da esquerda nasce recolhido e ganha o
 * botão de mostrar, mas o conteúdo segue no regime normal de faixas.
 *
 * ⚠️⚠️ **A distinção é load-bearing, e o motivo é a ALTURA.** O regime dos apps embarcados
 * (`MainContainer`) trava a altura na janela com `overflow-hidden`, porque lá quem rola são as
 * áreas internas do app. O Quarto ROLA a página inteira (as bandejas de móveis são longas), então
 * entrar naquela lista cortaria as bandejas sem nenhum caminho de rolagem — o mesmo defeito que
 * obrigou a existir o `ToolRouteRecado` para os recados das rotas de ferramenta.
 */
export const FOCUS_ONLY_PREFIXES = ['/quarto'] as const

/**
 * `true` nas telas de foco que não travam a altura, INCLUSIVE sub-rotas. Mesma comparação de
 * segmento inteiro do `isEmbeddedAppPath` (`/quartinho` não é o Quarto).
 */
export function isFocusOnlyPath(pathname: string | null | undefined): boolean {
  const path = pathname ?? ''
  return FOCUS_ONLY_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

/**
 * `true` em toda tela onde o menu da esquerda começa recolhido e o botão de mostrar é oferecido:
 * a página de aula, os apps de criação embarcados (incluído o configurador de avatar) e as telas
 * de foco de altura livre. É a régua ÚNICA do `FocusModeProvider` — o `MainContainer` continua
 * perguntando só pelo `isEmbeddedAppPath`, que é outra coisa.
 */
export function isFocusRoutePath(pathname: string | null | undefined): boolean {
  return isLessonPath(pathname) || isEmbeddedAppPath(pathname) || isFocusOnlyPath(pathname)
}
