import type { PensaMission } from '@sistemazero/core/pensa'
import type { ReactNode } from 'react'
import { CheckIcon, ListIcon, SparkleIcon } from './icons'

export type ListenSection = 'objective' | 'rule' | 'check' | 'setup'
export type RenderListen = (section: ListenSection, itemId?: string) => ReactNode

/**
 * O que a missão pede, nas palavras do Canvas: o que você vai criar, como deve funcionar e como
 * conferir. É leitura do contrato funcional (objetivo, regras, preparação e conferências); nunca
 * passos de blocos. `tiles` é a próxima missão do projeto; `rows`, a missão aberta.
 */
export function MissionBrief({
  mission,
  extensionName,
  variant,
  renderListen,
}: {
  mission: PensaMission
  extensionName?: string | null
  variant: 'tiles' | 'rows'
  renderListen?: RenderListen
}) {
  const setup =
    mission.kind === 'setup' ? (
      <>
        {extensionName ? (
          <p>
            <strong>{extensionName}</strong>
          </p>
        ) : null}
        <p>{mission.setup.recommendation}</p>
        {renderListen?.('setup')}
      </>
    ) : null
  // A arte se descreve pelo jeito que fica; as outras missões, pelo jeito que funcionam.
  const rulesTitle = mission.kind === 'asset' ? 'Como deve ser' : 'Como deve funcionar'
  const rules = mission.rules.length ? (
    <ul className="pz-brief__list">
      {mission.rules.map((rule) => (
        <li key={rule.id}>
          <p>{rule.text}</p>
          {renderListen?.('rule', rule.id)}
        </li>
      ))}
    </ul>
  ) : null
  const checks = (
    <ul className="pz-brief__checks">
      {mission.checks.map((check) => (
        <li key={check.id}>
          <p>{check.action}</p>
          <p>
            <strong>Pronto quando</strong> {check.expected}
          </p>
          {renderListen?.('check', check.id)}
        </li>
      ))}
    </ul>
  )
  if (variant === 'tiles') {
    return (
      <div className="pz-brief pz-brief--tiles">
        <section className="pz-brief__tile" aria-label="O que você vai criar">
          <h3>O que você vai criar</h3>
          <p>{mission.objective}</p>
          {renderListen?.('objective')}
        </section>
        {setup ? (
          <section className="pz-brief__tile" aria-label="Ferramentas para este jogo">
            <h3>Ferramentas para este jogo</h3>
            {setup}
          </section>
        ) : null}
        {rules ? (
          <section className="pz-brief__tile" aria-label={rulesTitle}>
            <h3>{rulesTitle}</h3>
            {rules}
          </section>
        ) : null}
        <section className="pz-brief__tile is-check" aria-label="Como conferir">
          <h3>Como conferir</h3>
          {checks}
        </section>
      </div>
    )
  }
  return (
    <div className="pz-brief pz-brief--rows">
      <section className="pz-brief__row" aria-label="O que você vai criar">
        <span className="pz-brief__icon is-yellow" aria-hidden="true">
          <SparkleIcon size={20} />
        </span>
        <div>
          <h3>O que você vai criar</h3>
          <p>{mission.objective}</p>
          {renderListen?.('objective')}
        </div>
      </section>
      {setup ? (
        <section className="pz-brief__row" aria-label="Ferramentas para este jogo">
          <span className="pz-brief__icon is-blue" aria-hidden="true">
            <ListIcon size={20} />
          </span>
          <div>
            <h3>Ferramentas para este jogo</h3>
            {setup}
          </div>
        </section>
      ) : null}
      {rules ? (
        <section className="pz-brief__row" aria-label={rulesTitle}>
          <span className="pz-brief__icon is-blue" aria-hidden="true">
            <ListIcon size={20} />
          </span>
          <div>
            <h3>{rulesTitle}</h3>
            {rules}
          </div>
        </section>
      ) : null}
      <section className="pz-brief__row is-check" aria-label="Como conferir">
        <span className="pz-brief__icon is-white" aria-hidden="true">
          <CheckIcon size={20} />
        </span>
        <div>
          <h3>Como conferir</h3>
          {checks}
        </div>
      </section>
    </div>
  )
}
