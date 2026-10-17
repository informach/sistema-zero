'use client'

import type { PensaMission } from '@sistemazero/core/pensa'
import type { ReactNode } from 'react'

/** The same functional brief in Pensa and every workshop. No progress or routing policy. */
export function PensaMissionContent({
  mission,
  extensionName,
  renderListen,
}: {
  mission: PensaMission
  extensionName?: string
  renderListen?: (section: 'objective' | 'rule' | 'check' | 'setup', itemId?: string) => ReactNode
}) {
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
