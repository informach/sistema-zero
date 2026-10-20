import type { ReactNode } from 'react'
import { HostBackLink, HostMenuButton, usePensaHostChrome } from '../hostChrome'
import { ArrowLeftIcon } from '../icons'
import { PensaMark } from '../ui'

/**
 * O topo das telas do planner (Canvas): [menu do host] [voltar] [ladrilho âmbar] título, e à
 * direita o que a tela pedir (ideias, trilha ZERO, ações do projeto). Rola com o conteúdo.
 */
export function ScreenHeader({
  title,
  titleAs = 'h1',
  back,
  hostBack = false,
  actions,
  kicker,
  size = 'md',
}: {
  title: ReactNode
  titleAs?: 'h1' | 'strong'
  /** O voltar do próprio planner. Sem ele, a tela mostra o voltar do host (`hostBack`). */
  back?: { label: string; onClick(): void; disabled?: boolean }
  hostBack?: boolean
  actions?: ReactNode
  kicker?: ReactNode
  size?: 'md' | 'lg'
}) {
  const chrome = usePensaHostChrome()
  const Title = titleAs
  return (
    <header className={`pz-head pz-head--${size}`}>
      <div className="pz-head__lead">
        {chrome?.menu ? <HostMenuButton menu={chrome.menu} /> : null}
        {back ? (
          <button
            type="button"
            className="pz-btn pz-btn--card pz-btn--square"
            aria-label={back.label}
            disabled={back.disabled}
            onClick={back.onClick}
          >
            <ArrowLeftIcon size={20} />
          </button>
        ) : hostBack && chrome?.back ? (
          <HostBackLink back={chrome.back} />
        ) : null}
        <PensaMark size={size === 'lg' ? 'lg' : 'md'} />
        <div className="pz-head__title">
          {kicker ? <span className="pz-head__kicker">{kicker}</span> : null}
          <Title className={`pz-title ${size === 'lg' ? 'pz-title--hero' : 'pz-title--head'}`}>
            {title}
          </Title>
        </div>
      </div>
      {actions ? <div className="pz-head__actions">{actions}</div> : null}
    </header>
  )
}
