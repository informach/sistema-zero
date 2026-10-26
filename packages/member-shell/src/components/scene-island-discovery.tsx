'use client'
import { ISLAND_ORIGIN } from '@sistemazero/core/learning/scene'
import { useState } from 'react'
import { Frame, Note, SceneButton, useDiscovery } from './scene-discovery-frame'
import { IslandWorld } from './scene-island-world'

export function IslandDiscovery() {
  const [ready, setReady] = useState(false)
  const m = useDiscovery(),
    p = m.state.island3d!
  const seen = (id: string) => m.state.evidence.discoveries.includes(id)
  const allIds =
    p.mode === 'view'
      ? ['other-view', 'same-place']
      : p.mode === 'position'
        ? ['axis-x', 'axis-y', 'axis-z']
        : ['contact-apart', 'contact-touch']
  const allGoals =
    p.mode === 'view'
      ? [
          'Compare a vista de frente com outra vista.',
          'Responda o que mudou quando a chave apareceu.',
        ]
      : p.mode === 'position'
        ? ['Aumente e diminua x.', 'Aumente e diminua y.', 'Aumente e diminua z.']
        : [
            'Teste uma situação com os objetos separados.',
            'Teste uma situação com os objetos encostando.',
          ]
  const ids = allIds.filter((id) => !m.activity.setup?.goals || m.activity.setup.goals.includes(id))
  const goals = ids.map((id) => allGoals[allIds.indexOf(id)]!)
  const completed = ids.map(seen),
    done = completed.filter(Boolean).length
  const nextAxis = (['x', 'z', 'y'] as const).find(
    (a) => ids.includes(`axis-${a}`) && !seen(`axis-${a}`),
  )
  const axis = (a: 'x' | 'y' | 'z', value: number) =>
    m.dispatch({
      type: 'island-axis',
      axis: a,
      value: Math.max(a === 'y' ? 0 : -4, Math.min(4, value)),
    })
  return (
    <Frame
      activity={m.activity}
      state={m.state}
      kind="ilha"
      title="A ilha em 3D"
      text={m.instruction}
      goals={goals}
      done={done}
      completed={completed}
      reset={() => m.dispatch({ type: 'reset' })}
      hud={
        <strong>
          {p.mode === 'view'
            ? 'A mesma ilha, três pontos de vista'
            : p.mode === 'position'
              ? 'x e z no chão · y na altura'
              : 'A imagem e o contato'}
        </strong>
      }
      stage={<IslandWorld state={p} onReady={setReady} />}
      after={
        <Note label={p.mode === 'contact' && p.tested !== null ? 'Último teste' : 'Observe'}>
          {p.tested !== null
            ? p.tested
              ? 'As áreas se encontram: há contato.'
              : 'As áreas estão separadas: não há contato.'
            : m.state.caption ||
              (p.mode === 'view'
                ? 'Procure a chave em outra vista.'
                : p.mode === 'position'
                  ? 'A marca dourada guarda o lugar inicial. O pontilhado mostra a altura.'
                  : 'Mude a vista para conferir a altura. Depois teste o encontro.')}
        </Note>
      }
    >
      <fieldset disabled={!ready} className="sz-island-inputs">
        <fieldset className="sz-discovery-controls" aria-label="Ponto de vista">
          {(
            [
              ['front', 'Ver de frente'],
              ['side', 'Ver de lado'],
              ['top', 'Ver de cima'],
            ] as const
          ).map(([view, label]) => (
            <SceneButton
              key={view}
              tom={
                p.mode === 'view' && !seen('other-view') && view === 'side'
                  ? 'gesto'
                  : p.view === view
                    ? 'ligado'
                    : 'ferramenta'
              }
              aria-pressed={p.view === view}
              onClick={() => m.dispatch({ type: 'island-view', view })}
            >
              {label}
            </SceneButton>
          ))}
        </fieldset>
        {p.mode === 'view' ? (
          <fieldset className="sz-discovery-controls">
            <legend>Quando a chave apareceu, o que mudou?</legend>
            <SceneButton
              tom="ferramenta"
              aria-pressed={p.answer === 'camera'}
              onClick={() => m.dispatch({ type: 'island-answer', answer: 'camera' })}
            >
              O lugar de onde olhamos
            </SceneButton>
            <SceneButton
              tom="ferramenta"
              aria-pressed={p.answer === 'key'}
              onClick={() => m.dispatch({ type: 'island-answer', answer: 'key' })}
            >
              O lugar da chave
            </SceneButton>
          </fieldset>
        ) : (
          <>
            <strong>Posição da chave</strong>
            {(['x', 'z', 'y'] as const).map((a) => (
              <fieldset key={a} className="sz-island-axis">
                <legend>
                  {a.toUpperCase()} ·{' '}
                  {a === 'y'
                    ? 'Altura'
                    : a === 'x'
                      ? 'Uma direção do chão'
                      : 'Outra direção do chão'}
                </legend>
                <SceneButton
                  tom={
                    p.mode === 'position' && nextAxis === a && p.directions.includes(`${a}+`)
                      ? 'gesto'
                      : 'ferramenta'
                  }
                  aria-label={`Diminuir ${a}`}
                  onClick={() => axis(a, p.key[a] - 0.5)}
                >
                  −
                </SceneButton>
                <input
                  aria-label={`Posição ${a}`}
                  type="range"
                  min={a === 'y' ? 0 : -4}
                  max={4}
                  step={0.5}
                  value={p.key[a]}
                  onChange={(e) => axis(a, e.target.valueAsNumber)}
                />
                <SceneButton
                  tom={
                    p.mode === 'position' && nextAxis === a && !p.directions.includes(`${a}+`)
                      ? 'gesto'
                      : 'ferramenta'
                  }
                  aria-label={`Aumentar ${a}`}
                  onClick={() => axis(a, p.key[a] + 0.5)}
                >
                  +
                </SceneButton>
                <input
                  aria-label={`Valor ${a}`}
                  type="number"
                  min={a === 'y' ? 0 : -4}
                  max={4}
                  step={0.5}
                  value={p.key[a]}
                  onChange={(e) => {
                    if (Number.isFinite(e.target.valueAsNumber)) axis(a, e.target.valueAsNumber)
                  }}
                />
              </fieldset>
            ))}
            {p.mode === 'position' && (
              <p className="sz-discovery-free-hint">
                Lugar inicial: x {ISLAND_ORIGIN.x}, y {ISLAND_ORIGIN.y}, z {ISLAND_ORIGIN.z}. Mude
                um valor e compare.
              </p>
            )}
            {p.mode === 'contact' && (
              <>
                <fieldset className="sz-discovery-controls">
                  <legend>Mover o personagem no chão</legend>
                  {(['x', 'z'] as const).flatMap((a) =>
                    [-1, 1].map((d) => (
                      <SceneButton
                        key={a + d}
                        onClick={() =>
                          m.dispatch({
                            type: 'island-hero',
                            axis: a,
                            value: Math.max(-4, Math.min(4, p.hero[a] + d * 0.5)),
                          })
                        }
                      >
                        {a.toUpperCase()} {d < 0 ? '−' : '+'}
                      </SceneButton>
                    )),
                  )}
                </fieldset>
                <p>
                  Personagem: x {p.hero.x}, z {p.hero.z}. Os botões mudam o lugar para este teste.
                </p>
                <SceneButton tom="gesto" onClick={() => m.dispatch({ type: 'island-test' })}>
                  Testar o encontro
                </SceneButton>
                <SceneButton
                  aria-pressed={p.bounds}
                  onClick={() => m.dispatch({ type: 'island-bounds', visible: !p.bounds })}
                >
                  {p.bounds ? 'Esconder áreas de contato' : 'Mostrar onde encosta'}
                </SceneButton>
              </>
            )}
          </>
        )}
        <SceneButton onClick={() => m.dispatch({ type: 'island-restart' })}>
          Voltar à posição inicial
        </SceneButton>
      </fieldset>
      <p className="sz-discovery-free-hint">
        Experimente na ordem que quiser. As descobertas continuam marcadas e você pode continuar
        depois de concluir.
      </p>
    </Frame>
  )
}
