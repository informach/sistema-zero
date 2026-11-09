'use client'
/**
 * Tela livre do Poder "O segredo da cabana" (08/11/2026, proposta "Experiências do Faísca" aprovada). O personagem ANDA: passar na chave ou no
 * emblema é pegar (sai o "Pegar a chave / o emblema"), chegar à porta é a cabana perguntar. A
 * pergunta da cabana aparece inteira, com a peça do meio que se troca ("e" × "ou"). `temChave` e
 * `temEmblema` ficam para a montagem: o caderninho tem duas linhas.
 */
import { discoveryGuidance, discoverySpeech } from '@sistemazero/core/learning/scene'
import { FAROL_LAYOUT } from '@sistemazero/studio/arte'
import { useEffect, useRef } from 'react'
import { SONS } from '../lib/scene-sons'
import {
  BotaoGrande,
  type Cartao,
  type FotoDe,
  Frame,
  Modulo,
  semNoSeuJogo,
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
import { CABANA_DA_CENA, EMBLEMA_DA_CENA, TwoPiecesStage } from './scene-two-pieces'

const CARTOES: Cartao[] = [
  {
    id: 'none-closed',
    emoji: '🚪',
    pergunta: 'Sem nenhuma peça, a cabana abre?',
    descoberta: 'não: fica fechada.',
  },
  {
    id: 'one-closed',
    emoji: '🔑',
    pergunta: 'E com uma peça só?',
    descoberta: 'com "e", uma só não basta.',
  },
  { id: 'both-open', emoji: '🛡️', pergunta: 'E com as duas?', descoberta: 'a cabana abre!' },
  {
    id: 'any-order',
    emoji: '🔀',
    pergunta: 'Importa qual peça pegar primeiro?',
    descoberta: 'não: em qualquer ordem, abre.',
  },
  {
    id: 'and-vs-or',
    emoji: '🧩',
    pergunta: 'E se trocar o "e" pelo "ou"?',
    descoberta: 'com "ou", uma peça só já abre.',
  },
]
const sn = (b: boolean) => (b ? 'SIM' : 'NÃO')
const fotoDe: FotoDe = (antes, depois, acao) => {
  const d = depois.pieces
  if (acao.type === 'try-cabin') {
    const pecas = Number(d.temChave) + Number(d.temEmblema)
    return {
      titulo: `Com ${pecas === 0 ? 'nenhuma peça' : pecas === 1 ? 'uma peça' : 'as duas'} ("${d.rule === 'and' ? 'e' : 'ou'}")`,
      texto: d.door === 'open' ? 'a cabana abriu' : 'ficou fechada',
    }
  }
  void antes
  return null
}
const ALVOS = {
  key: centro(FAROL_LAYOUT.chave),
  emblem: centro(EMBLEMA_DA_CENA),
  door: { x: CABANA_DA_CENA.x + 52, y: CABANA_DA_CENA.y + 80 },
}
const INICIO = { x: FAROL_LAYOUT.personagem.x + 120, y: FAROL_LAYOUT.personagem.y }

export function CabanaLivre() {
  const p = useFotinhos({ fotoDe })
  const k = p.state.pieces
  const f = (id: string) => p.state.evidence.discoveries.includes(id)
  const raiz = useRef<HTMLDivElement>(null)
  const andar = useMapaLivre({ inicio: INICIO })
  const perto = useChegada(andar.pos, ALVOS, 30, (alvo) => {
    if (alvo === 'door') p.dispatch({ type: 'try-cabin' })
    else if (alvo === 'key' ? !k.temChave : !k.temEmblema) {
      SONS.pegar()
      p.dispatch({ type: 'take-piece', piece: alvo })
    }
  })
  // A porta soa quando o personagem chega nela ou a resposta muda (trocar "e" por "ou" parado ali).
  const porta = useRef({ at: k.at, door: k.door })
  useEffect(() => {
    const antes = porta.current
    if (k.at === 'door' && (antes.at !== 'door' || antes.door !== k.door))
      k.door === 'open' ? SONS.abre() : SONS.tranca()
    porta.current = { at: k.at, door: k.door }
  }, [k.at, k.door])
  const jogarDeNovo = () => {
    andar.voltar()
    p.dispatch({ type: 'restart-cabin' })
  }
  const pecas = Number(k.temChave) + Number(k.temEmblema)
  // A fala vem do motor (as frases que o Admin grava com a voz do Zappy).
  const fala = discoveryGuidance(p.activity, p.state)?.text ?? ''
  return (
    <Frame
      arranjo="faisca"
      raiz={raiz}
      title="A porta com duas peças"
      kind="cabana"
      activity={p.activity}
      state={p.state}
      text={fala}
      reset={() => {
        andar.voltar()
        p.dispatch({ type: 'reset' })
      }}
      cartoes={cartoesDaAtividade(CARTOES, p.activity)}
      fotos={p.fotos}
      ideia={discoverySpeech('cabin-idea')}
      ponte={semNoSeuJogo(discoverySpeech('cabin-bridge'))}
      stage={<TwoPiecesStage state={p.state} heroi={{ ...andar.pos, esquerda: andar.esquerda }} />}
      movimento={
        <ModuloAndar raiz={raiz} andar={andar} mao={p.fotos.length === 0 && !andar.andando} />
      }
      controles={
        <>
          <Modulo titulo="A pergunta da cabana" icone="🚪" largo>
            <Troca
              rotulo="A cabana pergunta"
              antes="Tem a chave"
              depois="tem o emblema?"
              opcoes={[
                { v: 'and', peca: <>e</>, aria: 'Tem a chave e tem o emblema' },
                { v: 'or', peca: <>ou</>, aria: 'Tem a chave ou tem o emblema' },
              ]}
              valor={k.rule}
              pulsar={f('any-order') && !f('and-vs-or') ? 'or' : null}
              onChange={(v) => {
                SONS.encaixe()
                p.dispatch({ type: 'cabin-rule', rule: v })
                // Parado na porta, a cabana pergunta de novo na hora, com a pergunta nova.
                if (perto === 'door') p.dispatch({ type: 'try-cabin' })
              }}
            />
          </Modulo>
          <Modulo compacto titulo="O jogo guarda" icone="📓" dica="A cabana olha aqui.">
            <CaderninhoDe
              linhas={[
                { pergunta: 'Tem a chave?', resposta: sn(k.temChave), sim: k.temChave },
                { pergunta: 'Tem o emblema?', resposta: sn(k.temEmblema), sim: k.temEmblema },
              ]}
            />
          </Modulo>
          <Modulo compacto titulo="Partida" icone="🔄" dica="As peças voltam ao chão.">
            <BotaoGrande
              pulsar={
                k.door === 'open' ||
                (k.at === 'door' && f('none-closed') && pecas > 0 && !f('both-open'))
              }
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
