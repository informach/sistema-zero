'use client'
/**
 * Tela livre do Poder "A ponte apressada" (08/11/2026, proposta "Experiências do Faísca" aprovada). O personagem ANDA pelo mapa: chegar à alavanca
 * puxa, chegar à ponte tenta atravessar (levantada, não passa; baixada, atravessa e o sino toca). O
 * relógio do jogo anda SOZINHO, um segundo por segundo, como no jogo (sai o "Esperar 1 segundo"). O
 * lugar do relógio é uma peça que se troca ("quando puxa a alavanca" × "quando a partida começa").
 * `ponteAberta` fica para a montagem: o caderninho diz "A ponte está aberta? SIM / NÃO".
 */
import { discoverySpeech, ponteGuidance, TIMED_BRIDGE } from '@sistemazero/core/learning/scene'
import { FAROL_LAYOUT } from '@sistemazero/studio/arte'
import { useEffect, useRef, useState } from 'react'
import { SONS } from '../lib/scene-sons'
import {
  BotaoGrande,
  type Cartao,
  type Foto,
  type FotoDe,
  Frame,
  Modulo,
  semNoSeuJogo,
  useDiscovery,
  useFotinhos,
} from './scene-discovery-frame'
import {
  CaderninhoDe,
  cartoesDaAtividade,
  centro,
  ModuloAndar,
  Troca,
  useChegada,
  useMapaLivre,
} from './scene-faisca-livre'
import {
  ALAVANCA_DA_CENA,
  LAGUINHO_DA_CENA,
  PONTE_DA_CENA,
  TimedBridgeStage,
} from './scene-timed-bridge'

const CARTOES: Cartao[] = [
  {
    id: 'closed-start',
    emoji: '🚧',
    pergunta: 'E se for até a ponte sem puxar a alavanca?',
    descoberta: 'levantada, ela não deixa passar.',
  },
  {
    id: 'lever-opens',
    emoji: '🕹️',
    pergunta: 'O que a alavanca faz?',
    descoberta: 'baixa a ponte.',
  },
  {
    id: 'in-time',
    emoji: '🏃',
    pergunta: 'Dá para atravessar a tempo?',
    descoberta: 'chegando antes do 4, atravessa e o sino toca.',
  },
  {
    id: 'rises-alone',
    emoji: '⏱️',
    pergunta: 'E se o relógio chegar a 4?',
    descoberta: 'a ponte sobe sozinha.',
  },
  {
    id: 'pull-again',
    emoji: '🔁',
    pergunta: 'Depois que subiu, puxar de novo funciona?',
    descoberta: 'puxar de novo baixa outra vez.',
  },
  {
    id: 'timer-place',
    emoji: '🏁',
    pergunta: 'E se o relógio começar com a partida?',
    descoberta: 'ele conta uma vez só: depois, a ponte não sobe mais.',
  },
]
const FOTOS: Record<string, Foto> = {
  'rises-alone': { titulo: 'Relógio chegou a 4', texto: 'a ponte subiu sozinha' },
  'timer-place': { titulo: 'Relógio desde o começo', texto: 'puxou depois: a ponte ficou baixada' },
}
const fotoDe: FotoDe = (antes, depois, acao) => {
  if (acao.type === 'pull-lever' && !antes.bridge.ponteAberta && depois.bridge.ponteAberta)
    return { titulo: 'Alavanca', texto: 'a ponte baixou' }
  if (acao.type === 'touch-bridge')
    return depois.bridge.at === 'stone'
      ? { titulo: 'Ponte baixada', texto: 'atravessou: o sino tocou' }
      : { titulo: 'Ponte levantada', texto: 'não deu para passar' }
  return null
}

/** A água do laguinho: o personagem só chega à pedra do sino pela ponte. */
const AGUA = {
  x0: LAGUINHO_DA_CENA.x - 6,
  x1: LAGUINHO_DA_CENA.x + LAGUINHO_DA_CENA.w + 2,
  y0: LAGUINHO_DA_CENA.y - 6,
  y1: 360,
}
const naAgua = (p: { x: number; y: number }) => {
  const x = p.x + 32
  const y = p.y + 44
  return x > AGUA.x0 && x < AGUA.x1 && y > AGUA.y0 && y < AGUA.y1
}
const ALVOS = {
  alavanca: centro(ALAVANCA_DA_CENA),
  ponte: { x: PONTE_DA_CENA.x + PONTE_DA_CENA.w + 8, y: PONTE_DA_CENA.y + PONTE_DA_CENA.h / 2 },
}
const INICIO = { x: FAROL_LAYOUT.personagem.x, y: FAROL_LAYOUT.personagem.y }
const NA_PEDRA = { x: 96, y: 240 }

export function PonteLivre() {
  const base = useDiscovery()
  const p = useFotinhos({ fotoDe, fotoDaDescoberta: FOTOS })
  const b = p.state.bridge
  const f = (id: string) => p.state.evidence.discoveries.includes(id)
  const raiz = useRef<HTMLDivElement>(null)
  const andar = useMapaLivre({ inicio: INICIO, pode: (q) => !naAgua(q) })
  const [rodando, setRodando] = useState(false)
  const atravessou = b.at === 'stone'
  // O relógio do jogo começa no primeiro passo da partida e anda sozinho, até o personagem
  // atravessar (a partida acabou: o sino tocou).
  useEffect(() => {
    if (andar.andando && !rodando) setRodando(true)
  }, [andar.andando, rodando])
  // O segundo só passa enquanto muda alguma coisa (um "depois de" contando, ou a puxada ainda sem 4
  // segundos para comparar): parada, a criança não grava um tique por segundo para sempre. Com a aba
  // escondida o relógio espera. O tique não é gesto (`tempo`), e o `dispatch` do player muda a cada
  // render: por ref, o intervalo não recomeça a cada gesto e o segundo do jogo não estica.
  const precisaDoTempo =
    b.timers.length > 0 || (b.sincePull !== null && b.sincePull < TIMED_BRIDGE.seconds)
  const passar = useRef(base.tempo ?? base.dispatch)
  passar.current = base.tempo ?? base.dispatch
  const pausado = base.movimento?.pausado ?? false
  useEffect(() => {
    if (!rodando || pausado || atravessou || !precisaDoTempo) return
    const t = setInterval(() => {
      if (!document.hidden) passar.current({ type: 'wait-second' })
    }, 1000)
    return () => clearInterval(t)
  }, [rodando, pausado, atravessou, precisaDoTempo])
  const contando = b.timers.length > 0
  // biome-ignore lint/correctness/useExhaustiveDependencies: o tique toca a cada segundo do relógio (`b.clock`).
  useEffect(() => {
    if (contando && rodando) SONS.quadro()
  }, [b.clock, contando, rodando])
  useChegada(andar.pos, ALVOS, 34, (alvo) => {
    if (atravessou) return
    if (alvo === 'alavanca') {
      SONS.encaixe()
      p.dispatch({ type: 'pull-lever' })
    } else p.dispatch({ type: 'touch-bridge' })
  })
  const montou = useRef(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: o personagem vai à pedra só quando atravessa (`andar.ir` muda a cada render).
  useEffect(() => {
    // Ao reabrir a tela já atravessada, o personagem volta à pedra, sem o som da chegada.
    if (atravessou) {
      andar.ir(NA_PEDRA)
      if (montou.current) SONS.abre()
    }
    montou.current = true
  }, [atravessou])
  const subidas = useRef(b.rises)
  useEffect(() => {
    if (b.rises > subidas.current) SONS.tranca()
    subidas.current = b.rises
  }, [b.rises])
  const jogarDeNovo = () => {
    andar.voltar()
    setRodando(false)
    p.dispatch({ type: 'restart-bridge' })
  }
  // A fala vem do motor (as frases que o Admin grava com a voz do Zappy); a tela só diz se o
  // relógio da partida já está rodando, porque ele começa no primeiro passo.
  const fala = discoverySpeech(ponteGuidance(p.state, f, { rodando }))
  return (
    <Frame
      raiz={raiz}
      title="A ponte apressada"
      kind="ponte"
      activity={p.activity}
      state={p.state}
      text={fala}
      reset={() => {
        jogarDeNovo()
        p.dispatch({ type: 'reset' })
      }}
      cartoes={cartoesDaAtividade(CARTOES, p.activity)}
      fotos={p.fotos}
      ideia={discoverySpeech('bridge-idea')}
      ponte={semNoSeuJogo(discoverySpeech('bridge-bridge'))}
      ferramentas={
        rodando && pausado && !atravessou ? (
          <BotaoGrande
            onClick={() => {
              void base.movimento?.retomar()
            }}
          >
            Continuar partida
          </BotaoGrande>
        ) : undefined
      }
      stage={
        <TimedBridgeStage
          state={p.state}
          heroi={atravessou ? undefined : { ...andar.pos, esquerda: andar.esquerda }}
          livre
        />
      }
      movimento={<ModuloAndar raiz={raiz} andar={andar} mao={!rodando && p.fotos.length === 0} />}
      controles={
        <>
          <Modulo titulo="A regra do jogo" icone="🧩" largo>
            <Troca
              rotulo="O relógio começa a contar"
              antes="O relógio começa a contar"
              opcoes={[
                { v: 'lever', peca: <>quando puxa a alavanca</>, aria: 'Quando puxa a alavanca' },
                { v: 'start', peca: <>quando a partida começa</>, aria: 'Quando a partida começa' },
              ]}
              valor={b.place}
              pulsar={f('pull-again') && !f('timer-place') ? 'start' : null}
              onChange={(v) => {
                SONS.encaixe()
                andar.voltar()
                setRodando(false)
                p.dispatch({ type: 'timer-place', place: v })
              }}
            />
          </Modulo>
          <Modulo titulo="O jogo guarda" icone="📓" dica="A ponte olha aqui.">
            <CaderninhoDe
              linhas={[
                {
                  pergunta: 'A ponte está aberta?',
                  resposta: b.ponteAberta ? 'SIM' : 'NÃO',
                  sim: b.ponteAberta,
                },
              ]}
            />
          </Modulo>
          <Modulo titulo="Partida" icone="🔄" dica="A ponte sobe e o relógio para.">
            <BotaoGrande pulsar={atravessou} onClick={jogarDeNovo}>
              <span aria-hidden>🔄</span> Jogar de novo
            </BotaoGrande>
          </Modulo>
        </>
      }
    />
  )
}
