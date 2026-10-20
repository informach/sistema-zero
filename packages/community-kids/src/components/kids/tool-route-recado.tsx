import { type ComponentType, createElement, isValidElement, type ReactElement } from 'react'

/**
 * A caixa do RECADO numa rota de ferramenta (Estúdio, Pinta, Pensa e Molda): o produto que
 * ainda não foi liberado, o posto que falta, o acesso que não deu para conferir.
 *
 * O `MainContainer` trava a altura dessas rotas na janela e corta o que passa
 * (`overflow-hidden`), porque o app delas rola por dentro. O recado não rola por dentro: sem
 * esta caixa, num celular ou numa janela baixa, os botões e a faixa lilás ficavam cortados
 * sem jeito de rolar (full review de 11/09/2026). A caixa rola no lugar da janela.
 *
 * No celular ela repete o que o `<main>` das páginas comuns faz com a barra de abas: desce por
 * baixo dela (`-mb-24`) e reserva o espaço dela (`pb-24`), que a ÚLTIMA faixa devolve e pinta
 * com a própria cor (`last:-mb-24 last:pb-24` da `KidsBand`). Sem o par, sobravam 96px de
 * rolagem à toa, ou a faixa lilás terminava antes da barra.
 */
export const TOOL_ROUTE_RECADO =
  'flex min-h-0 flex-1 flex-col overflow-y-auto -mb-24 pb-24 md:mb-0 md:pb-0'

/**
 * `screen` é a tela do recado: o componente sem props, ou o elemento já montado quando a tela
 * recebe dados da página (o produto bloqueado recebe o posto em que a ferramenta abre).
 */
export function ToolRouteRecado({ screen }: { screen: ComponentType | ReactElement }) {
  return (
    <div className={TOOL_ROUTE_RECADO}>
      {isValidElement(screen) ? screen : createElement(screen)}
    </div>
  )
}
