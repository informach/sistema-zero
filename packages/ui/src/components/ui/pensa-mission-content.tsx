'use client'

import type { PensaMission } from '@sistemazero/core/pensa'
import type { ReactNode } from 'react'

type RenderListen = (
  section: 'objective' | 'rule' | 'check' | 'setup',
  itemId?: string,
) => ReactNode

/**
 * The same functional brief in Pensa and every workshop. No progress or routing policy.
 *
 * `variant="card"` (default) is the plain reading used by the Pensa planner. `variant="panel"`
 * is the mission panel inside Estúdio, Pinta and Molda: "O que você vai criar", a "Para esta
 * missão" group where each workshop adds its own controls (`children`), and "Como conferir" in
 * its own box. Both read the same canonical mission.
 */
export function PensaMissionContent({
  mission,
  extensionName,
  renderListen,
  variant = 'card',
  children,
}: {
  mission: PensaMission
  extensionName?: string
  renderListen?: RenderListen
  variant?: 'card' | 'panel'
  children?: ReactNode
}) {
  if (variant === 'panel')
    return (
      <PanelContent mission={mission} extensionName={extensionName} renderListen={renderListen}>
        {children}
      </PanelContent>
    )
  return (
    <div className="sz-tool-mission-content">
      <section aria-label="O que vou criar">
        <h3>O que vou criar</h3>
        <p>{mission.objective}</p>
        {renderListen?.('objective')}
      </section>
      {mission.kind === 'setup' ? (
        <section aria-label="Ferramentas para este jogo">
          <h3>Ferramentas para este jogo</h3>
          {extensionName ? (
            <p>
              <strong>{extensionName}</strong>
            </p>
          ) : null}
          <p>{mission.setup.recommendation}</p>
          {renderListen?.('setup')}
        </section>
      ) : null}
      {mission.rules.length ? (
        <section aria-label="Como essa parte deve funcionar">
          <h3>Como essa parte deve funcionar</h3>
          <ul>
            {mission.rules.map((rule) => (
              <li key={rule.id}>
                <p>{rule.text}</p>
                {renderListen?.('rule', rule.id)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section aria-label="Como conferir">
        <h3>Como conferir</h3>
        <ul>
          {mission.checks.map((check) => (
            <li key={check.id}>
              <p>{check.action}</p>
              <p>
                <strong>Pronto quando: </strong>
                {check.expected}
              </p>
              {renderListen?.('check', check.id)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function PanelContent({
  mission,
  extensionName,
  renderListen,
  children,
}: {
  mission: PensaMission
  extensionName?: string
  renderListen?: RenderListen
  children?: ReactNode
}) {
  // Art is described by how it looks; the other missions by how the part behaves.
  const rulesTitle = mission.kind === 'asset' ? 'Como deve ser' : 'Como deve funcionar'
  const hasGroup = mission.kind === 'setup' || mission.rules.length > 0 || Boolean(children)
  return (
    <div className="sz-tool-mission-content sz-tool-mission-content--panel">
      <section className="sz-tool-mission-content__block" aria-label="O que você vai criar">
        <h3>O que você vai criar</h3>
        <p>{mission.objective}</p>
        {renderListen?.('objective')}
      </section>
      {hasGroup ? (
        <section className="sz-tool-mission-content__group" aria-label="Para esta missão">
          <h3>Para esta missão</h3>
          {mission.kind === 'setup' ? (
            <div className="sz-tool-mission-content__item">
              <h4>Ferramentas para este jogo</h4>
              {extensionName ? (
                <p>
                  <strong>{extensionName}</strong>
                </p>
              ) : null}
              <p>{mission.setup.recommendation}</p>
              {renderListen?.('setup')}
            </div>
          ) : null}
          {mission.rules.length ? (
            <div className="sz-tool-mission-content__item">
              <h4>{rulesTitle}</h4>
              <ul>
                {mission.rules.map((rule) => (
                  <li key={rule.id}>
                    <p>{rule.text}</p>
                    {renderListen?.('rule', rule.id)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {children}
        </section>
      ) : null}
      <section className="sz-tool-mission-content__check" aria-label="Como conferir">
        <h3>Como conferir</h3>
        <ul>
          {mission.checks.map((check) => (
            <li key={check.id}>
              <p>
                <span>{check.action}</span> <strong>Pronto quando:</strong>{' '}
                <span>{check.expected}</span>
              </p>
              {renderListen?.('check', check.id)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
