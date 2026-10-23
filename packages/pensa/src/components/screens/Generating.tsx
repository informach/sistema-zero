import type { PensaOperationView } from '@sistemazero/core/pensa'
import { usePensaUi } from '../context'
import { CheckIcon } from '../icons'
import { Mascot } from '../ui'
import { ScreenHeader } from './ScreenHeader'

const STEPS = ['As partes do jogo', 'A ordem das missões', 'A oficina de cada missão'] as const

/** Em qual dos três passos a operação está, pela fase que o servidor informa. */
export function planningStep(step: PensaOperationView['step']): number {
  if (step === 'outline' || step === 'missions') return 1
  if (step === 'review' || step === 'copy' || step === 'commit') return 2
  return 0
}

/** A fala da criança, no balão azul da direita. */
export function YouSaid({ text }: { text: string }) {
  return (
    <div className="pz-you">
      <span className="pz-you__who">Você</span>
      <p>{text}</p>
    </div>
  )
}

/** Montando o plano (Canvas "O Zappy montando o plano"): a espera com o Zappy pensando. */
export function Generating({
  name,
  userText,
  operation,
  busy,
  onBack,
  onCancel,
}: {
  name: string
  userText: string | null
  operation: PensaOperationView
  busy: boolean
  onBack(): void
  onCancel(): void
}) {
  const { kids, readOnly } = usePensaUi()
  const current = planningStep(operation.step)
  return (
    <div className="pz-screen">
      <ScreenHeader
        titleAs="strong"
        title={name}
        back={{ label: 'Voltar aos meus jogos', onClick: onBack }}
      />
      <div className="pz-column pz-column--860">
        {userText ? <YouSaid text={userText} /> : null}
        <section className="pz-card pz-thinking" aria-live="polite">
          <Mascot pose="thinking" size={170} alt="O Zappy pensando" className="pz-anim-bounce" />
          <div className="pz-thinking__body">
            <span className="pz-says__who">Zappy</span>
            <h1 className="pz-title pz-title--lead">
              {kids
                ? 'Estou montando o plano do seu jogo'
                : 'O Zappy está montando o plano do seu jogo'}
            </h1>
            <ul className="pz-steps">
              {STEPS.map((label, index) => {
                const state = index < current ? 'done' : index === current ? 'now' : 'next'
                return (
                  <li key={label} className={`pz-step is-${state}`}>
                    <span className="pz-step__mark" aria-hidden="true">
                      {state === 'done' ? <CheckIcon size={16} strokeWidth={3.2} /> : null}
                    </span>
                    {label}
                    <span className="pz-sr-only">
                      {state === 'done' ? ', pronto' : state === 'now' ? ', agora' : ''}
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="pz-small">
              Pode sair desta tela. A sua ideia fica guardada no seu jogo, e o plano continua quando
              você voltar.
            </p>
            {!readOnly ? (
              <button
                type="button"
                className="pz-btn pz-btn--card pz-self-start"
                disabled={busy}
                onClick={onCancel}
              >
                Parar
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
