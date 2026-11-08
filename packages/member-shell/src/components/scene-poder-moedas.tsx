'use client'
/**
 * Tela livre do Poder "Moedas no caminho" (08/11/2026, proposta "Experiências do Faísca" aprovada). O personagem ANDA pelo caminho: passar numa
 * moeda é pegar (sai o "Encostar na moeda 1…6"), sair de perto é afastar e chegar ao baú é tentar
 * abrir. O sumiço da moeda é um interruptor, e o que o baú pergunta é uma peça que se troca ("pelo
 * menos 5" × "exatamente 5"). A cada moeda, "+1" pula no placar do jogo.
 */
import { COIN_COUNTER, discoveryGuidance, discoverySpeech } from '@sistemazero/core/learning/scene'
import { FAROL_LAYOUT } from '@sistemazero/studio/arte'
import { useEffect, useRef, useState } from 'react'
import { SONS } from '../lib/scene-sons'
import { CoinCounterStage, MOEDAS_DA_CENA } from './scene-coin-counter'
import {
  BotaoGrande,
  type Cartao,
  type FotoDe,
  Frame,
  Interruptor,
  Modulo,
  semNoSeuJogo,
  useFotinhos,
} from './scene-discovery-frame'
import {
  CaderninhoDe,
  cartoesDaAtividade,
  ModuloAndar,
  Troca,
  useChegada,
  useMapaLivre,
} from './scene-faisca-livre'

const CARTOES: Cartao[] = [
  {
    id: 'each-adds',
    emoji: '🪙',
    pergunta: 'O que muda ao pegar uma moeda?',
    descoberta: 'o número ganha 1.',
  },
  {
    id: 'kept',
    emoji: '🚶',
    pergunta: 'Longe das moedas, o número continua?',
    descoberta: 'continua guardado.',
  },
  {
    id: 'no-double',
    emoji: '👻',
    pergunta: 'E passar de novo onde já pegou?',
    descoberta: 'a moeda sumiu: não conta outra vez.',
  },
  {
    id: 'counts-again',
    emoji: '✨',
    pergunta: 'E se a moeda não sumir?',
    descoberta: 'a mesma moeda conta de novo.',
  },
  {
    id: 'below-goal',
    emoji: '🔒',
    pergunta: 'Com menos de 5, o baú abre?',
    descoberta: 'não: fica fechado.',
  },
  {
    id: 'compare-rules',
    emoji: '⚖️',
    pergunta: 'Com 6 moedas, "pelo menos 5" e "exatamente 5" dão igual?',
    descoberta: '"pelo menos 5" abre; "exatamente 5" não.',
  },
]
const fotoDe: FotoDe = (antes, depois, acao) => {
  const a = antes.coins.moedas
  const d = depois.coins.moedas
  if (acao.type === 'touch-coin')
    return d > a
      ? { titulo: `Moeda ${acao.coin + 1}`, texto: `moedas ${a} → ${d}` }
      : { titulo: `Moeda ${acao.coin + 1} de novo`, texto: `já tinha sumido: continua ${d}` }
  if (acao.type === 'try-chest')
    return {
      titulo: `Baú com ${d} (${depois.coins.rule === 'at-least' ? 'pelo menos 5' : 'exatamente 5'})`,
      texto: depois.coins.chest === 'open' ? 'abriu!' : 'ficou fechado',
    }
  return null
}

const ALVOS = {
  ...Object.fromEntries(MOEDAS_DA_CENA.map((m, i) => [`m${i}`, { x: m.x + 12, y: m.y + 12 }])),
  bau: { x: 52, y: 294 },
} as Record<string, { x: number; y: number }>
const INICIO = { x: FAROL_LAYOUT.personagem.x, y: FAROL_LAYOUT.personagem.y }

export function MoedasLivre() {
  const p = useFotinhos({ fotoDe })
  const c = p.state.coins
  const f = (id: string) => p.state.evidence.discoveries.includes(id)
  const raiz = useRef<HTMLDivElement>(null)
  const andar = useMapaLivre({ inicio: INICIO })
  const perto = useChegada(
    andar.pos,
    ALVOS,
    26,
    (alvo) => {
      if (alvo === 'bau') p.dispatch({ type: 'try-chest' })
      else p.dispatch({ type: 'touch-coin', coin: Number(alvo.slice(1)) as 0 })
    },
    () => p.dispatch({ type: 'leave-coin' }),
  )
  // O "+1" pula no placar do jogo, e cada coisa tem o seu som.
  const [salto, setSalto] = useState<{ n: number; mais: boolean } | null>(null)
  const ultimo = useRef(c.adds)
  useEffect(() => {
    if (c.adds > ultimo.current) {
      SONS.ponto()
      setSalto({ n: c.adds, mais: true })
      const t = setTimeout(() => setSalto(null), 1100)
      ultimo.current = c.adds
      return () => clearTimeout(t)
    }
    ultimo.current = c.adds
  }, [c.adds])
  const bau = useRef(c.chest)
  useEffect(() => {
    if (c.at === 'chest') c.chest === 'open' ? SONS.abre() : SONS.tranca()
    bau.current = c.chest
  }, [c.at, c.chest])
  const jogarDeNovo = () => {
    andar.voltar()
    p.dispatch({ type: 'restart-coins' })
  }
  // A fala vem do motor (as frases que o Admin grava com a voz do Zappy).
  const fala = discoveryGuidance(p.activity, p.state)?.text ?? ''
  return (
    <Frame
      raiz={raiz}
      title="O contador de moedas"
      kind="moedas"
      activity={p.activity}
      state={p.state}
      text={fala}
      reset={() => {
        andar.voltar()
        p.dispatch({ type: 'reset' })
      }}
      cartoes={cartoesDaAtividade(CARTOES, p.activity)}
      fotos={p.fotos}
      ideia={discoverySpeech('coin-idea')}
      ponte={semNoSeuJogo(discoverySpeech('coin-bridge'))}
      stage={
        <CoinCounterStage state={p.state} heroi={{ ...andar.pos, esquerda: andar.esquerda }} />
      }
      noPalco={
        salto ? (
          <span
            key={salto.n}
            className="sz-discovery-salto sz-discovery-livre-salto-moeda"
            data-mais
          >
            +1
          </span>
        ) : null
      }
      controles={
        <>
          <Modulo titulo="A regra do baú" icone="🧩" largo>
            <Troca
              rotulo="O baú pergunta"
              antes="Tem"
              depois="5 moedas?"
              opcoes={[
                { v: 'at-least', peca: <>pelo menos</>, aria: 'Pelo menos 5 moedas' },
                { v: 'equals', peca: <>exatamente</>, aria: 'Exatamente 5 moedas' },
              ]}
              valor={c.rule}
              pulsar={
                f('below-goal') && !f('compare-rules') && c.moedas > COIN_COUNTER.goal
                  ? c.rule === 'at-least'
                    ? 'equals'
                    : 'at-least'
                  : null
              }
              onChange={(v) => {
                SONS.encaixe()
                p.dispatch({ type: 'chest-rule', rule: v })
                // Parado no baú, ele pergunta de novo na hora, com a pergunta nova.
                if (perto === 'bau') p.dispatch({ type: 'try-chest' })
              }}
            />
          </Modulo>
          <ModuloAndar raiz={raiz} andar={andar} mao={c.adds === 0 && p.fotos.length === 0} />
          <Modulo titulo="Depois de pegar" icone="✨" dica="Ligado, a moeda some do caminho.">
            <Interruptor
              ligado={c.disappear}
              rotulo="Some ao pegar?"
              estado={(on) => (on ? 'Sumiço ligado' : 'Sumiço desligado')}
              pulsar={f('kept') && !f('counts-again') && c.disappear && f('no-double')}
              onClick={() => p.dispatch({ type: 'coin-disappears', enabled: !c.disappear })}
            />
          </Modulo>
          <Modulo titulo="O jogo guarda" icone="📓" dica="O baú olha aqui.">
            <CaderninhoDe linhas={[{ pergunta: 'Quantas moedas?', resposta: String(c.moedas) }]} />
          </Modulo>
          <Modulo titulo="Partida" icone="🔄" dica="As moedas voltam e o número vai a 0.">
            <BotaoGrande
              pulsar={f('kept') && !f('below-goal') && c.moedas >= COIN_COUNTER.goal}
              onClick={jogarDeNovo}
            >
              <span aria-hidden>🔄</span> Jogar de novo
            </BotaoGrande>
          </Modulo>
        </>
      }
    />
  )
}
