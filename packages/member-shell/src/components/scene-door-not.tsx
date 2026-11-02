'use client'

import { discoveryGuidance, lighthouseDoorAnswer } from '@sistemazero/core/learning/scene'
import { SceneCenarioProvider } from './scene-cenario-context'
import { Frame, SceneButton, useDiscovery } from './scene-discovery-frame'
import { LighthouseKeyStage } from './scene-lighthouse-key'
import { DicaLivre } from './scene-livre/atelie-comum'

/**
 * "A pergunta com o não" (A Ilha do Farol, aula 3, parte 3, 02/11/2026).
 *
 * ⭐⭐ Só a IDEIA: a mesma porta do farol, e a pergunta pode ser "a porta está trancada?" ou "a porta
 * não está trancada?". Sem a chave a porta está trancada (o cadeado no palco diz). A porta faz o que a
 * resposta mandar: sim abre, não fica fechada. Nada de bloco, Se, então, senão nem variável: a
 * montagem da parte seguinte liga a ideia ao bloco não ("Se não ganhou").
 *
 * A figura embaixo do palco é a tabela das quatro situações (com ou sem a chave, com ou sem o não):
 * cada uma fica com "Teste para descobrir" até a criança testá-la. As falas são as `door-not-*` do
 * `discovery-guidance.ts`; o botão em destaque é o gesto que a fala de agora pede.
 */
const PERGUNTAS = [
  { not: false, texto: 'A porta está trancada?' },
  { not: true, texto: 'A porta não está trancada?' },
] as const
const CHAVES = [
  { hasKey: true, chave: 'with-key', rotulo: 'Com a chave (destrancada)' },
  { hasKey: false, chave: 'without-key', rotulo: 'Sem a chave (trancada)' },
] as const

export function PortaDoNao() {
  const context = useDiscovery()
  const { state, dispatch, activity } = context
  const l = state.lighthouse
  const not = l.not === true
  const seen = new Set(state.evidence.discoveries)
  const metas = activity.setup?.goals ?? []
  const casos = CHAVES.filter((c) => metas.length === 0 || metas.includes(`not-flips-${c.chave}`))
  const completed = casos.map((c) => seen.has(`not-flips-${c.chave}`))
  const fala = discoveryGuidance(activity, state).id
  // O botão em destaque é o gesto que a fala `door-not-*` pede.
  const pedeTestar = fala === 'door-not-start' || fala === 'door-not-try'
  const pedeNao = /^door-not-(plain|not)-/.test(fala)
  const pedeChave = fala === 'door-not-other-with' || fala === 'door-not-other-without'
  return (
    <Frame
      title="A pergunta com o não"
      kind="porta-do-nao"
      activity={activity}
      state={state}
      text={context.instruction}
      goals={casos.map((c) =>
        c.hasKey
          ? 'Com a chave, compare as duas perguntas.'
          : 'Sem a chave, compare as duas perguntas.',
      )}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => dispatch({ type: 'reset' })}
      // A faixa de sempre da porta diz temChave: aqui a situação é dita com as palavras da ideia.
      hud={
        <div className="walk-hud" data-porta-hud="">
          <strong>{l.hasKey ? '🔓 Porta destrancada' : '🔒 Porta trancada'}</strong>
          <span>
            {l.hasKey ? 'O personagem está com a chave' : 'O personagem está sem a chave'}
          </span>
        </div>
      }
      stage={
        <SceneCenarioProvider cenario="farol">
          <LighthouseKeyStage state={state} tranca />
        </SceneCenarioProvider>
      }
    >
      <figure className="sz-scene-regra door-rule" data-porta-do-nao="">
        <figcaption className="sz-scene-regra-titulo">A pergunta da porta</figcaption>
        <p className="door-question" aria-live="polite">
          <strong data-nao={not}>
            {not ? 'A porta não está trancada?' : 'A porta está trancada?'}
          </strong>
        </p>
        <p className="sz-discovery-small">
          A resposta sim abre a porta. A resposta não deixa a porta fechada.
        </p>
        <table className="w-full text-sm" data-tabela-do-nao="">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Situação</span>
              </th>
              {PERGUNTAS.map((p) => (
                <th key={p.texto} scope="col">
                  {p.texto}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHAVES.map((c) => (
              <tr key={c.chave}>
                <th scope="row">{c.rotulo}</th>
                {PERGUNTAS.map((p) => {
                  const visto = seen.has(`asked-${p.not ? 'not-locked' : 'locked'}-${c.chave}`)
                  // A resposta é a régua do motor: sem o não, sim quando está trancada.
                  const sim = lighthouseDoorAnswer(c.hasKey, p.not)
                  const agora = l.hasKey === c.hasKey && not === p.not
                  return (
                    <td
                      key={p.texto}
                      data-current={agora || undefined}
                      data-visto={visto}
                      data-resposta={visto ? (sim ? 'sim' : 'nao') : undefined}
                    >
                      {visto
                        ? sim
                          ? 'Sim: a porta abriu'
                          : 'Não: a porta ficou fechada'
                        : 'Teste para descobrir'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
      <div className="sz-discovery-controls free-controls" role="group" aria-label="A porta">
        <SceneButton
          tom={pedeChave ? 'gesto' : 'ferramenta'}
          aria-pressed={l.hasKey}
          onClick={() => dispatch({ type: 'key-state', hasKey: !l.hasKey })}
        >
          {l.hasKey ? 'Tirar a chave do personagem' : 'Dar a chave ao personagem'}
        </SceneButton>
        <SceneButton
          tom={pedeNao ? 'gesto' : not ? 'ligado' : 'ferramenta'}
          aria-pressed={not}
          onClick={() => dispatch({ type: 'door-question', not: !not })}
        >
          {not ? 'Tirar o não da pergunta' : 'Pôr o não na pergunta'}
        </SceneButton>
        <SceneButton
          tom={pedeTestar ? 'gesto' : 'ferramenta'}
          onClick={() => dispatch({ type: 'try-lighthouse-door' })}
        >
          Testar a porta
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        Dar ou tirar a chave e pôr ou tirar o não preparam uma situação. A resposta da porta só
        aparece quando você testa a porta.
      </p>
      <DicaLivre />
    </Frame>
  )
}
