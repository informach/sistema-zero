'use client'
/**
 * Tela livre da Ilha do Farol, aula 3: "O que muda com o não?" (08/11/2026, proposta "Experiências
 * do Faísca" aprovada).
 *
 * A experiência acontece na ilha 3D do jogo do curso (`IlhaDoJogo`, `scene-ilha-porta.tsx`): o
 * personagem ANDA, pega a chave no chão e a porta do farol pergunta quando ele chega nela (saem
 * "Dar a chave ao personagem" e "Testar a porta"). O "não" é uma PEÇA que encaixa na pergunta da
 * porta ("A porta [não] está trancada?"). Com o personagem no farol, trocar a peça faz a porta
 * responder de novo na hora (o motor limpa a tentativa, e a tela pergunta outra vez).
 *
 * A porta OBEDECE à resposta: o balão diz a resposta e o que ela faz por causa dela ("SIM! Então eu
 * abro."). Sem o "não", ela abre sem a chave, e o Zappy aponta a surpresa.
 */
import {
  discoveryGuidance,
  discoverySpeech,
  lighthouseDoorAnswer,
} from '@sistemazero/core/learning/scene'
import { useEffect, useRef, useState } from 'react'
import { SONS } from '../lib/scene-sons'
import {
  BotaoGrande,
  Caderninho,
  type Cartao,
  type FotoDe,
  Frame,
  Modulo,
  semNoSeuJogo,
  useFotinhos,
} from './scene-discovery-frame'
import { cartoesDaAtividade, Encaixe, ModuloAndar } from './scene-faisca-livre'
import {
  AVISOS,
  type BalaoDaIlha,
  CHAVE,
  dist,
  ENCOSTA_CHAVE,
  ENCOSTA_FAROL,
  FAROL,
  IlhaDoJogo,
  INICIO,
  LONGE_DO_FAROL,
  PERTO_DO_FAROL,
  useAndar3D,
} from './scene-ilha-porta'

const CARTOES: Cartao[] = [
  {
    id: 'not-flips-without-key',
    emoji: '🔒',
    pergunta: 'Sem a chave: o "não" muda a resposta da porta?',
    descoberta: 'muda: o que era sim vira não.',
  },
  {
    id: 'not-flips-with-key',
    emoji: '🔑',
    pergunta: 'E com a chave?',
    descoberta: 'também: o "não" troca a resposta de novo.',
  },
]
const sn = (b: boolean) => (b ? 'SIM' : 'NÃO')
const pergunta = (not: boolean) => `A porta ${not ? 'não ' : ''}está trancada?`
const fotoDe: FotoDe = (_antes, depois, acao) => {
  const l = depois.lighthouse
  if (acao.type !== 'try-lighthouse-door') return null
  const resposta = lighthouseDoorAnswer(l.hasKey, l.not === true)
  return {
    titulo: `${l.hasKey ? 'Com' : 'Sem'} a chave · "${pergunta(l.not === true)}"`,
    texto: `resposta ${sn(resposta)} → ${l.door === 'open' ? 'o farol acendeu' : 'ficou apagado'}`,
  }
}

export function PortaDoNao() {
  const andar3d = useAndar3D(INICIO)
  // Antes de a ilha aparecer, o personagem não anda (andaria às cegas e as descobertas cairiam).
  const [pronto, setPronto] = useState(false)
  const andar = {
    ...andar3d,
    segurar: (d: Parameters<typeof andar3d.segurar>[0]) => {
      if (pronto) andar3d.segurar(d)
    },
  }
  const p = useFotinhos({ fotoDe })
  const l = p.state.lighthouse
  const not = l.not === true
  const f = (id: string) => p.state.evidence.discoveries.includes(id)
  const raiz = useRef<HTMLDivElement>(null)
  const naChave = dist(andar.pos, CHAVE) < ENCOSTA_CHAVE
  const ateOFarol = dist(andar.pos, FAROL)
  const naPorta = ateOFarol < ENCOSTA_FAROL
  const longe = ateOFarol > LONGE_DO_FAROL
  const testou = typeof l.checkedKey === 'boolean'
  const { dispatch } = p
  // Com o farol aceso, a chave fica no chão até jogar de novo (pegar mudaria a pergunta e apagaria o
  // farol, que fica aceso até a partida nova).
  useEffect(() => {
    if (naChave && !l.hasKey && l.door !== 'open') {
      SONS.pegar()
      dispatch({ type: 'key-state', hasKey: true })
    }
  }, [naChave, l.hasKey, l.door, dispatch])
  useEffect(() => {
    if (naPorta && !testou) dispatch({ type: 'try-lighthouse-door' })
  }, [naPorta, testou, dispatch])
  // Longe do farol, a porta se prepara para outra pergunta (aceso, fica aceso até jogar de novo).
  useEffect(() => {
    if (longe && testou && l.door !== 'open') dispatch({ type: 'key-state', hasKey: l.hasKey })
  }, [longe, testou, l.hasKey, l.door, dispatch])
  useEffect(() => {
    if (!testou) return
    l.door === 'open' ? SONS.abre() : SONS.tranca()
  }, [testou, l.door])
  const jogarDeNovo = () => {
    andar.voltar()
    dispatch({ type: 'key-state', hasKey: false })
  }
  const resposta = lighthouseDoorAnswer(l.hasKey, not)
  const balao: BalaoDaIlha | null = testou
    ? {
        // A porta diz a resposta e o que faz por causa dela: obedece ao sim, mesmo trancada.
        texto: `${sn(resposta)}! Então ${l.door === 'open' ? 'eu abro.' : 'fico fechada.'}`,
        tom: l.door === 'open' ? 'sim' : 'nao',
      }
    : ateOFarol < PERTO_DO_FAROL
      ? { texto: pergunta(not), tom: 'pergunta' }
      : null
  const aviso =
    l.door === 'open'
      ? AVISOS.acendeu
      : testou
        ? l.hasKey
          ? AVISOS.apagado
          : AVISOS.falta
        : l.hasKey
          ? AVISOS.coleta
          : AVISOS.inicio
  const chave = l.hasKey ? 'with-key' : 'without-key'
  // A fala vem do motor (as frases que o Admin grava com a voz do Zappy).
  const fala = discoveryGuidance(p.activity, p.state)?.text ?? ''
  return (
    <Frame
      arranjo="faisca"
      aspectoDoPalco={1.1}
      raiz={raiz}
      title="O que muda com o não?"
      kind="porta-do-nao"
      activity={p.activity}
      state={p.state}
      text={fala}
      reset={() => {
        andar.voltar()
        dispatch({ type: 'reset' })
      }}
      cartoes={cartoesDaAtividade(CARTOES, p.activity)}
      fotos={p.fotos}
      ideia={discoverySpeech('door-not-idea')}
      ponte={semNoSeuJogo(discoverySpeech('door-not-bridge'))}
      stage={
        <IlhaDoJogo
          heroi={andar.pos}
          rumo={andar.rumo}
          chaveNoChao={!l.hasKey}
          aceso={l.door === 'open'}
          aviso={aviso}
          balao={balao}
          onPronto={setPronto}
        />
      }
      movimento={
        <ModuloAndar raiz={raiz} andar={andar} mao={p.fotos.length === 0 && !andar.andando} />
      }
      controles={
        <>
          <Modulo titulo="A pergunta da porta" icone="🚪" largo>
            <Encaixe
              rotulo="A pergunta da porta"
              antes="A porta"
              depois="está trancada?"
              peca={<>não</>}
              encaixada={not}
              vazio="···"
              estado={not ? 'Com o não. Toque para tirar.' : 'Toque no não para encaixar.'}
              pulsar={testou && !f(`not-flips-${chave}`)}
              aria={not ? 'Tirar o não da pergunta' : 'Encaixar o não na pergunta'}
              onClick={() => {
                if (!pronto) return
                SONS.encaixe()
                dispatch({ type: 'door-question', not: !not })
              }}
            />
          </Modulo>
          <Modulo compacto titulo="O jogo guarda" icone="📓" dica="A porta olha aqui.">
            <Caderninho sim={l.hasKey} />
          </Modulo>
          <Modulo
            compacto
            titulo="Partida"
            icone="🔄"
            dica="A chave volta para o chão e o farol apaga."
          >
            <BotaoGrande pulsar={f(`not-flips-${chave}`) && l.hasKey} onClick={jogarDeNovo}>
              <span aria-hidden>🔄</span> Jogar de novo
            </BotaoGrande>
          </Modulo>
        </>
      }
    />
  )
}
