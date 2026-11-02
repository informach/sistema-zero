'use client'

import {
  lighthouseWalkGone,
  lighthouseWalkMaxX,
  lighthouseWalkOutSeenX,
} from '@sistemazero/core/learning/scene'
import { SceneCenarioProvider } from './scene-cenario-context'
import { Frame, Note, SceneButton, useDiscovery } from './scene-discovery-frame'
import { LighthouseWalkStage } from './scene-lighthouse-walk'
import {
  BotoesDoRitmo,
  PARADO_ATE_PAUSAR,
  SeloDoQuadro,
  SetaDeSegurar,
  TiraDeQuadros,
  useRitmoDosQuadros,
} from './scene-walk-camera-lenta'

/**
 * "A beirada da tela" (Farol, Dia 1, parte `limite`, 01/11/2026).
 *
 * ⭐⭐ Como a câmera lenta, só a IDEIA: a tela é uma janela, e em cada quadro, depois do passinho, o
 * jogo confere se o personagem passou da beirada e, se passou, puxa de volta. Isso é o limite da
 * tela. Nada de bloco, regra, comando nem ordem dos blocos (decisão dela): a ordem aparece DENTRO de
 * cada quadro, na tira ("passou → voltou") e na frase do quadro de agora. A montagem (parte 6) liga
 * a ideia ao bloco Manter o sprite dentro da tela, logo abaixo do movimento.
 *
 * O palco é o do limite (`LighthouseWalkStage`: a borda, a faixa "fora da tela" e o fantasma do que
 * passou dela). O ritmo, a seta, o selo e a tira são os da câmera lenta.
 */
export function WalkNaBeirada() {
  const context = useDiscovery()
  const { state, dispatch, activity } = context
  const w = state.walk
  const seen = new Set(state.evidence.discoveries)
  const completed = [
    seen.has('left-the-screen'),
    seen.has('came-back-inside'),
    seen.has('stayed-inside'),
  ]
  const goals = [
    'Leve o personagem até a beirada com o limite desligado.',
    'Ligue o limite com o personagem fora da tela.',
    'Segure a seta na beirada com o limite ligado.',
  ]
  const saiu = lighthouseWalkGone(w)
  // "Fora" é a régua do `left-the-screen` (metade da caixa além da borda), a mesma do motor e do Zappy.
  const fora = w.x >= lighthouseWalkOutSeenX()
  // Sem o limite, sair inteiro da tela pausa (e rodar de novo volta ao início); com o limite ligado,
  // rodar de novo o traz de volta. Parado muito tempo sem a seta: pausa. ⚠️ Com a seta também, num
  // teto maior: o leitor de tela alterna a seta, e na beirada com o limite ela nunca soltaria.
  const parado = PARADO_ATE_PAUSAR[w.pace ?? 'lenta']
  const paradoDemais = (!w.arrow && w.idle >= parado) || w.idle >= parado * 3
  const ritmoDosQuadros = useRitmoDosQuadros({
    pararQuando: (saiu && !w.keepInside) || paradoDemais,
    reiniciarAoRodar: saiu && !w.keepInside,
  })
  const { rodando, ritmo, rodar, parar } = ritmoDosQuadros
  // O que o limite fez no quadro de agora: segurou na beirada (o passinho ia levar além) ou trouxe
  // de volta quem estava fora. Nada de "passinho" quando ele já estava fora sem a seta.
  const alcance = w.frame > 0 ? (w.reach?.at(-1) ?? w.x) : w.x
  const quadroAnterior = w.trail.at(-2) ?? w.x
  const agora =
    alcance === w.x ? null : quadroAnterior >= lighthouseWalkOutSeenX() ? 'voltou' : 'segurou'
  const todas = completed.every(Boolean)
  // O botão em destaque é o que o Zappy pede (`border-*` em `discovery-guidance.ts`).
  const pedeLigar =
    !w.keepInside &&
    !todas &&
    (fora || (seen.has('left-the-screen') && seen.has('came-back-inside')))
  const pedeDesligar = w.keepInside && !todas && seen.has('stayed-inside')
  // Do meio da tela até a beirada, a velocidade de verdade (em câmera lenta seriam uns 40 s); perto
  // da beirada (uns 10 passinhos), a câmera lenta, para ver cada quadro.
  const perto = w.x >= lighthouseWalkMaxX() - 10 * w.speed
  const pedeReal =
    !todas &&
    !fora &&
    !pedeLigar &&
    !pedeDesligar &&
    !(rodando && ritmo === 'real') &&
    (!w.keepInside || !perto)
  const pedeLenta =
    w.keepInside && !seen.has('stayed-inside') && perto && !(rodando && ritmo === 'lenta')
  return (
    <Frame
      title="A beirada da tela"
      kind="limite"
      activity={activity}
      state={state}
      text={context.instruction}
      goals={goals}
      done={completed.filter(Boolean).length}
      completed={completed}
      reset={() => {
        parar()
        dispatch({ type: 'reset' })
      }}
      hud={<SeloDoQuadro ritmo={ritmo} />}
      stage={
        <SceneCenarioProvider cenario="farol">
          <LighthouseWalkStage state={state} semPasso />
        </SceneCenarioProvider>
      }
      after={
        saiu && !w.keepInside ? (
          <Note label="Fora da tela" tone="gold">
            Ele saiu da janela do jogo. Ligue o limite da tela ou clique em Voltar ao início.
          </Note>
        ) : undefined
      }
    >
      <TiraDeQuadros />
      <p className="slow-quadro-agora" data-puxou={agora !== null} aria-live="polite">
        {agora === 'segurou'
          ? 'Neste quadro: o passinho ia levar ele para fora; depois o jogo conferiu a beirada e segurou ele dentro.'
          : agora === 'voltou'
            ? 'Neste quadro: ele estava fora; o jogo conferiu a beirada e puxou de volta para dentro.'
            : w.keepInside
              ? 'O limite está ligado: depois de cada passinho, o jogo confere a beirada.'
              : 'O limite está desligado.'}
      </p>
      <div className="sz-discovery-controls free-controls" role="group" aria-label="Limite da tela">
        <SceneButton
          tom={pedeLigar || pedeDesligar ? 'gesto' : w.keepInside ? 'ligado' : 'ferramenta'}
          onClick={() => {
            const ligar = !w.keepInside
            dispatch({ type: 'keep-on-screen', enabled: ligar })
            // Ligar com ele fora e os quadros parados: em câmera lenta, o próximo quadro o traz de
            // volta (sem voltar ao início, que apagaria o que ela quer ver).
            if (ligar && !rodando && w.x > lighthouseWalkMaxX())
              rodar('lenta', { reiniciar: false })
          }}
        >
          {w.keepInside ? 'Desligar o limite da tela' : 'Ligar o limite da tela'}
        </SceneButton>
      </div>
      <SetaDeSegurar
        pedida={false}
        aoSegurar={() => {
          // Segurar com o jogo pausado põe os quadros para passar: a seta sozinha não anda sem eles.
          if (!rodando) rodar(ritmo)
        }}
      />
      <BotoesDoRitmo {...ritmoDosQuadros} pedeLenta={pedeLenta} pedeReal={pedeReal} />
    </Frame>
  )
}
