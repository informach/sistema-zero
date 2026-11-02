'use client'

import { lighthouseWalkGone } from '@sistemazero/core/learning/scene'
import { Frame, Note, SceneButton, useDiscovery } from './scene-discovery-frame'
import { DicaLivre } from './scene-livre/atelie-comum'
import {
  BotoesDoRitmo,
  PARADO_ATE_PAUSAR,
  PalcoEmCameraLenta,
  SeloDoQuadro,
  SetaDeSegurar,
  TiraDeQuadros,
  useQuemAnda,
  useRitmoDosQuadros,
} from './scene-walk-camera-lenta'

/**
 * "O tamanho do passinho" (Nave contra Asteroides, Dia 1, 02/11/2026).
 *
 * ⭐⭐ Só a IDEIA: em cada quadro a nave dá um passinho, e o passinho pode ser pequeno ou grande. Nada
 * de bloco, de "Mover", nem do número da velocidade: a montagem das setas liga a ideia ao número do
 * bloco ("É este número que…"). A comparação fica nas marcas do palco e na tira (trocar o passinho
 * volta ao começo no motor, então as marcas contam um tamanho só) e na figura "Os dois passinhos",
 * em que cada tamanho só aparece DEPOIS de testado.
 *
 * O ritmo, a seta, o selo, a tira e o palco são os da câmera lenta (`scene-walk-camera-lenta.tsx`).
 * As falas são as `stride-*` do `discovery-guidance.ts` (core); o botão em destaque é o que elas pedem.
 */
const PASSINHOS = [
  {
    speed: 1,
    meta: 'step-speed-1',
    rotulo: 'Passinho pequeno',
    descoberta: 'Compare os quadros com o passinho pequeno.',
    resposta: 'Em 6 quadros, 6 passinhos curtinhos: a nave foi só até aqui.',
  },
  {
    speed: 3,
    meta: 'step-speed-3',
    rotulo: 'Passinho grande',
    descoberta: 'Compare os quadros com o passinho grande.',
    resposta: 'Em 6 quadros, 6 passinhos compridos: a nave foi bem mais longe.',
  },
] as const

/** Quantos quadros a figura de comparação desenha, e quantos pontos da figura vale um passo de 1. */
const QUADROS_NA_FIGURA = 6
const ESCALA = 8

export function WalkComPassinho() {
  const context = useDiscovery()
  const { state, dispatch, activity } = context
  const quem = useQuemAnda()
  const w = state.walk
  const seen = new Set(state.evidence.discoveries)
  const metas = activity.setup?.goals ?? []
  const casos = PASSINHOS.filter((p) => metas.length === 0 || metas.includes(p.meta))
  const completed = casos.map((p) => seen.has(p.meta))
  const todas = completed.every(Boolean)
  const saiu = lighthouseWalkGone(w)
  // Sem a seta por uns 10 s, ou fora da tela: pausa.
  const paradoDemais = !w.arrow && w.idle >= PARADO_ATE_PAUSAR[w.pace ?? 'lenta']
  const ritmoDosQuadros = useRitmoDosQuadros({
    pararQuando: saiu || paradoDemais,
    reiniciarAoRodar: saiu,
  })
  const { rodando, ritmo } = ritmoDosQuadros
  // O gesto que a fala `stride-*` pede: testado o passinho de agora, trocar para o outro; senão,
  // a câmera lenta e, com ela rodando, segurar a seta. Tudo visto: sentir na velocidade de verdade.
  const esteVisto = seen.has(w.speed === 1 ? 'step-speed-1' : 'step-speed-3')
  const pedeTrocar = !todas && esteVisto
  const pedeLenta = !todas && !esteVisto && !(rodando && ritmo === 'lenta')
  const pedeSeta = !todas && !esteVisto && rodando && ritmo === 'lenta'
  const pedeReal = todas && !(rodando && ritmo === 'real')
  return (
    <Frame
      title="O tamanho do passinho"
      kind="passinho"
      activity={activity}
      state={state}
      text={context.instruction}
      goals={casos.map((p) => p.descoberta)}
      done={completed.filter(Boolean).length}
      completed={completed}
      reset={() => {
        ritmoDosQuadros.parar()
        dispatch({ type: 'reset' })
      }}
      hud={<SeloDoQuadro ritmo={ritmo} />}
      stage={<PalcoEmCameraLenta />}
      after={
        saiu ? (
          <Note label="Fora da tela" tone="gold">
            {quem.Ele} saiu da tela. Clique em Voltar ao início.
          </Note>
        ) : undefined
      }
    >
      <TiraDeQuadros />
      <div className="slow-ritmo-label">O tamanho do passinho</div>
      <div
        className="sz-discovery-controls free-controls"
        role="group"
        aria-label="O tamanho do passinho"
      >
        {casos.map((p) => {
          const atual = w.speed === p.speed
          return (
            <SceneButton
              key={p.meta}
              tom={pedeTrocar && !atual ? 'gesto' : atual ? 'ligado' : 'ferramenta'}
              aria-current={atual ? 'true' : undefined}
              onClick={() => {
                // Trocar o passinho é um teste novo: o motor volta ao começo (modo livre).
                if (!atual) dispatch({ type: 'walk-speed', speed: p.speed })
              }}
            >
              {p.rotulo}
            </SceneButton>
          )
        })}
      </div>
      <SetaDeSegurar
        pedida={pedeSeta && !w.arrow}
        aoSegurar={() => {
          // Segurar com o jogo pausado põe os quadros para passar: a seta sozinha não anda sem eles.
          if (!rodando) ritmoDosQuadros.rodar(ritmo)
        }}
      />
      <BotoesDoRitmo {...ritmoDosQuadros} pedeLenta={pedeLenta} pedeReal={pedeReal} />
      <DoisPassinhos casos={casos.map((p) => ({ ...p, visto: seen.has(p.meta) }))} />
      <DicaLivre />
    </Frame>
  )
}

/**
 * "Os dois passinhos": o rastro de 6 quadros de cada tamanho, um embaixo do outro e na mesma escala.
 * Cada um fica com "Teste para descobrir" até a criança VER aquele passinho (a meta do motor).
 */
function DoisPassinhos({
  casos,
}: {
  casos: { meta: string; rotulo: string; resposta: string; speed: number; visto: boolean }[]
}) {
  const largura = 3 * QUADROS_NA_FIGURA * ESCALA + 24
  return (
    <figure className="sz-scene-regra door-rule" data-passinhos="">
      <figcaption className="sz-scene-regra-titulo">Os dois passinhos</figcaption>
      <div className="memory-actions">
        {casos.map((caso) => (
          <div key={caso.meta} data-lit={caso.visto} data-passinho={caso.speed}>
            <span>
              {caso.rotulo}
              {caso.visto ? (
                <>
                  <svg
                    viewBox={`0 0 ${largura} 20`}
                    width="100%"
                    height="20"
                    role="img"
                    aria-label={caso.resposta}
                    data-marcas={QUADROS_NA_FIGURA}
                  >
                    <line
                      x1="6"
                      x2="6"
                      y1="2"
                      y2="18"
                      stroke="currentColor"
                      strokeDasharray="2 2"
                      opacity="0.6"
                    />
                    {Array.from({ length: QUADROS_NA_FIGURA }, (_, i) => (
                      <circle
                        // biome-ignore lint/suspicious/noArrayIndexKey: as marcas são fixas e em ordem.
                        key={i}
                        cx={6 + (i + 1) * caso.speed * ESCALA}
                        cy="10"
                        r="2.5"
                        fill="currentColor"
                      />
                    ))}
                  </svg>
                  <small>{caso.resposta}</small>
                </>
              ) : (
                <small>Teste para descobrir</small>
              )}
            </span>
          </div>
        ))}
      </div>
    </figure>
  )
}
