'use client'

import {
  discoverySpeech,
  lighthouseWalkGone,
  lighthouseWalkMaxX,
  lighthouseWalkOutSeenX,
} from '@sistemazero/core/learning/scene'
import { useEffect, useRef, useState } from 'react'
import { SONS } from '../lib/scene-sons'
import { SceneCenarioProvider } from './scene-cenario-context'
import {
  type Cartao,
  Filme,
  type Foto,
  Frame,
  Interruptor,
  Modulo,
  semNoSeuJogo,
  useFotinhos,
} from './scene-discovery-frame'
import { PalcoDoAndar } from './scene-farol-palco'
import { LighthouseWalkStage } from './scene-lighthouse-walk'
import {
  ControlesDoAndar,
  FerramentasDoAndar,
  PARADO_ATE_PAUSAR,
  type Ritmo,
  SeloSimples,
  TiraDeQuadros,
  useQuemAnda,
  useRitmoDosQuadros,
  useTiqueDoQuadro,
} from './scene-walk-camera-lenta'

/**
 * "A beirada da tela" (Farol, Dia 1, parte `limite`, 01/11/2026; moldura nova em 08/11/2026).
 *
 * ⭐⭐ Como a câmera lenta, só a IDEIA: a tela é uma janela, e em cada quadro, depois do passinho, o
 * jogo confere se o personagem passou da beirada e, se passou, puxa de volta. Nada de bloco, regra,
 * comando nem ordem dos blocos (decisão dela): a ordem aparece DENTRO de cada quadro, na tira
 * ("passou → voltou") e no 👀 do jogo conferindo a beirada.
 *
 * O palco do Farol é a tela do jogo com a faixa "fora da tela" e a cerca (`PalcoDoAndar fora`); a
 * Nave segue com o palco do limite (`LighthouseWalkStage`). O módulo "Limite da tela" liga e desliga
 * a cerca; a tela abre no Rápido (do meio da tela até a beirada, em Devagar, seriam uns 40 s).
 */
const CARTOES_BEIRADA: Cartao[] = [
  {
    id: 'left-the-screen',
    emoji: '🚪',
    pergunta: 'Sem o limite, até onde dá para andar?',
    descoberta: 'sem limite, sai da tela.',
  },
  {
    id: 'came-back-inside',
    emoji: '🧲',
    pergunta: 'E se ligar o limite com quem saiu lá fora?',
    descoberta: 'no quadro seguinte, o jogo puxa de volta.',
  },
  {
    id: 'stayed-inside',
    emoji: '🧱',
    pergunta: 'Com o limite, o que acontece na beirada?',
    descoberta: 'a cada passinho, o jogo confere e segura dentro.',
  },
]
const FOTOS_BEIRADA: Record<string, Foto> = {
  'left-the-screen': { titulo: 'Limite desligado', texto: 'andou → saiu da tela' },
  'came-back-inside': { titulo: 'Ligou o limite lá fora', texto: 'quadro seguinte → voltou' },
  'stayed-inside': { titulo: 'Limite na beirada', texto: 'cada passinho → ficou dentro' },
}

export function WalkNaBeirada() {
  const p = useFotinhos({ fotoDaDescoberta: FOTOS_BEIRADA })
  const quem = useQuemAnda()
  const w = p.state.walk
  const f = (id: string) => p.state.evidence.discoveries.includes(id)
  const saiu = lighthouseWalkGone(w)
  // Sem o limite, sair inteiro da tela pausa (e rodar de novo volta ao início); com o limite ligado,
  // rodar de novo o traz de volta. Parado muito tempo sem a seta: pausa. ⚠️ Com a seta também, num
  // teto maior: o leitor de tela alterna a seta, e na beirada com o limite ela nunca soltaria.
  const parado = PARADO_ATE_PAUSAR[w.pace ?? 'lenta']
  const paradoDemais = (!w.arrow && w.idle >= parado) || w.idle >= parado * 3
  const ritmo = useRitmoDosQuadros({
    pararQuando: (saiu && !w.keepInside) || paradoDemais,
    reiniciarAoRodar: saiu && !w.keepInside,
  })
  const [escolha, setEscolha] = useState<Ritmo>('real')
  const raiz = useRef<HTMLDivElement>(null)
  const devagar = useTiqueDoQuadro(ritmo)
  // "Fora" é a régua do `left-the-screen` (metade da caixa além da borda), a mesma do motor e do Zappy.
  const fora = w.x >= lighthouseWalkOutSeenX()
  const puxou = w.frame > 0 && (w.reach?.at(-1) ?? w.x) !== w.x
  useEffect(() => {
    if (puxou && devagar && w.frame > 0) SONS.borda()
  }, [w.frame, puxou, devagar])
  const cenario = p.activity.cenario
  const controles = (so?: 'andar' | 'resto') => (
    <ControlesDoAndar
      so={so}
      ritmo={ritmo}
      escolha={escolha}
      setEscolha={setEscolha}
      raiz={raiz}
      mao={w.frame === 0 && !f('left-the-screen')}
      extra={
        <Modulo
          compacto={!quem.nave}
          titulo="Limite da tela"
          icone="🧱"
          dica={`Ligada, a cerca segura ${quem.nome} dentro.`}
        >
          <Interruptor
            ligado={w.keepInside}
            estado={(on) => (on ? 'Cerca ligada' : 'Cerca desligada')}
            pulsar={fora && !w.keepInside}
            onClick={() => {
              const ligar = !w.keepInside
              p.dispatch({ type: 'keep-on-screen', enabled: ligar })
              // Ligar com quem saiu lá fora: em Devagar, o próximo quadro traz de volta (sem
              // voltar ao início, que apagaria o que ela quer ver).
              if (ligar && w.x > lighthouseWalkMaxX()) {
                setEscolha('lenta')
                ritmo.rodar('lenta', { reiniciar: false })
              }
            }}
          />
        </Modulo>
      }
      pedeVelocidade={
        w.keepInside && !f('stayed-inside') && w.x >= lighthouseWalkMaxX() - 10 * w.speed
          ? 'lenta'
          : null
      }
    />
  )
  const filme = (
    <Filme info={<SeloSimples />}>
      <TiraDeQuadros />
    </Filme>
  )
  return (
    <Frame
      // O Farol (Faísca) usa o arranjo de uma tela só; a Nave (Construtor) segue como era.
      arranjo={quem.nave ? undefined : 'faisca'}
      raiz={raiz}
      title="A beirada da tela"
      kind="limite"
      activity={p.activity}
      state={p.state}
      text={p.instruction}
      reset={() => {
        ritmo.parar()
        p.dispatch({ type: 'reset' })
      }}
      cartoes={CARTOES_BEIRADA}
      fotos={p.fotos}
      ideia={discoverySpeech('border-idea', cenario)}
      ponte={semNoSeuJogo(discoverySpeech('border-bridge', cenario))}
      stage={
        quem.nave ? (
          <SceneCenarioProvider cenario={cenario}>
            <LighthouseWalkStage state={p.state} semPasso />
          </SceneCenarioProvider>
        ) : (
          <PalcoDoAndar fora piscar={devagar} />
        )
      }
      abaixoDoPalco={quem.nave ? filme : undefined}
      registro={quem.nave ? undefined : filme}
      ferramentas={<FerramentasDoAndar ritmo={ritmo} />}
      movimento={quem.nave ? undefined : controles('andar')}
      controles={quem.nave ? controles() : controles('resto')}
    />
  )
}
