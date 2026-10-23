import { PENSA_LIMITS } from '@sistemazero/core/pensa'
import { type ReactNode, useState } from 'react'
import type { Composer } from '../ChatPanel'
import { usePensaUi } from '../context'
import { Chip, CreditsChip, Mascot, ZeroTrail } from '../ui'
import { ScreenHeader } from './ScreenHeader'

/**
 * Sementes para quem chega sem ideia pronta (só no Kids). São exemplos estáticos: escolher um só
 * preenche a caixa, e a criança edita e manda quando quiser. Nada é enviado sozinho.
 */
export const IDEA_SEEDS = [
  {
    title: 'Pegar o que cai do céu',
    text: 'Uma cesta que se mexe e pega frutas antes do chão.',
    idea: 'Uma cesta anda para os lados e pega as frutas que caem do céu. Cada fruta vale um ponto. Se três frutas caírem no chão, o jogo acaba.',
  },
  {
    title: 'Corrida com obstáculos',
    text: 'Um personagem pula pedras e ganha velocidade.',
    idea: 'Um dinossauro corre sozinho e pula as pedras quando eu aperto espaço. Ele fica mais rápido com o tempo. Se bater numa pedra, recomeça.',
  },
  {
    title: 'Memória com cartas',
    text: 'Ache os pares virando duas cartas por vez.',
    idea: 'Um jogo de memória com doze cartas de animais. Eu viro duas cartas. Se forem iguais, ficam abertas. Quando achar todos os pares, aparece a vitória.',
  },
] as const

/**
 * Nova ideia (Canvas "Nova ideia"): a trilha ZERO, o Zappy pedindo a ideia, a caixa com exemplo
 * e o lembrete de que dá para falar, e as sementes. Também serve ao jogo que ainda não tem plano.
 */
export function NewIdea({
  title,
  composer,
  exhausted,
  exhaustedCard,
  busy,
  onBack,
}: {
  /** O nome do jogo quando ele já existe e ainda não tem plano. */
  title: string | null
  composer: Composer
  exhausted: boolean
  exhaustedCard: ReactNode
  busy: boolean
  onBack: () => void
}) {
  const { adapter, kids, copy, readOnly } = usePensaUi()
  const [seed, setSeed] = useState<number | null>(null)
  const tooLong = composer.text.length > PENSA_LIMITS.messageChars
  const voice = readOnly
    ? null
    : adapter.renderVoiceInput?.({
        value: composer.text,
        onChange: composer.setText,
        onBusyChange: composer.setVoiceBusy,
        disabled: busy,
        textareaId: composer.inputId,
      })
  return (
    <div className="pz-screen pz-new">
      <ScreenHeader
        titleAs="strong"
        title={title ?? 'Nova ideia de jogo'}
        back={{ label: 'Voltar aos meus jogos', onClick: onBack, disabled: composer.voiceBusy }}
        actions={<CreditsChip />}
      />
      <div className="pz-column pz-column--900">
        <ZeroTrail stage="z" variant="full" />
        <div className="pz-zappy-says">
          <Mascot pose="speaking" size={150} alt="O Zappy falando" />
          <div className="pz-card pz-says">
            <span className="pz-says__who">Zappy</span>
            <h1 className="pz-title pz-title--lead">{copy.greeting}</h1>
            <p>{copy.greetingText}</p>
          </div>
        </div>
        <form
          className="pz-card pz-idea-form"
          onSubmit={(event) => {
            event.preventDefault()
            composer.onSend()
          }}
        >
          <label htmlFor={composer.inputId} className="pz-label">
            Sua ideia
          </label>
          <textarea
            id={composer.inputId}
            ref={composer.textareaRef}
            className="pz-input pz-textarea"
            rows={5}
            placeholder="Ex.: um gato pula de telhado em telhado e pega peixes antes de a lua sumir. Se cair, volta para o começo."
            value={composer.text}
            disabled={composer.voiceBusy || readOnly}
            onChange={(event) => {
              composer.setText(event.target.value)
              setSeed(null)
            }}
          />
          {tooLong ? (
            <p role="status" className="pz-small">
              O seu texto tem {composer.text.length} caracteres. Cada mensagem pode ter até 4.000;
              guarde uma parte para mandar depois.
            </p>
          ) : null}
          <div className="pz-idea-form__foot">
            <div className="pz-idea-form__voice">
              {voice}
              <span className="pz-small">
                {voice ? 'Escreva do seu jeito ou fale pelo microfone.' : 'Escreva do seu jeito.'}
              </span>
            </div>
            {exhausted ? null : (
              <button
                type="submit"
                className="pz-btn pz-btn--action pz-btn--lg"
                disabled={composer.blocked || !composer.text.trim() || tooLong}
                title={readOnly ? copy.readOnlyHint : undefined}
              >
                Organizar meu jogo
              </button>
            )}
          </div>
        </form>
        {exhausted ? exhaustedCard : null}
        {kids && !readOnly ? (
          <section className="pz-seeds" aria-labelledby="pz-seeds-title">
            <h2 id="pz-seeds-title" className="pz-title pz-title--sm">
              Para começar sem ideia pronta
            </h2>
            <div className="pz-seeds__grid">
              {IDEA_SEEDS.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  className={`pz-seed${seed === index ? ' is-on' : ''}`}
                  aria-pressed={seed === index}
                  onClick={() => {
                    composer.setText(item.idea)
                    setSeed(index)
                    composer.textareaRef.current?.focus()
                  }}
                >
                  <span className="pz-seed__no" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="pz-seed__text">
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {readOnly ? <Chip tone="neutral">{copy.readOnlyHint}</Chip> : null}
      </div>
    </div>
  )
}
