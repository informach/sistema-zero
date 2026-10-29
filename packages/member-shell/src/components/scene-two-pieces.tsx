'use client'

import type { SceneAction, SceneState } from '@sistemazero/core/learning/scene'
import { FAROL_LAYOUT, farolSvgUrl } from '@sistemazero/studio/arte'
import { SceneButton } from './exploration-stage'
import { SceneCanvas, Texto } from './scene-canvas'
import { AVISOS_DO_FAROL, AvisoDoFarol, PalavraDoBloco, RegraDoJogo } from './scene-farol'

/**
 * Os lugares do jogo do Poder "O segredo da cabana", os MESMOS do projeto que a criança monta
 * (`docs/aulas-interativas-tecnico/qa/cabana-projeto.ts`, `EMBLEMA_2D` e `CABANA_2D`): a chave no
 * gramado de cima (a do Farol), o emblema no de baixo e a cabana no canto, debaixo do começo.
 */
export const EMBLEMA_DA_CENA = { x: 196, y: 276, w: 32 } as const
export const CABANA_DA_CENA = { x: 4, y: 236, w: 96 } as const
/** As frases do aviso do jogo da Cabana (as do projeto). */
export const AVISOS_DA_CABANA = {
  inicio: 'Ache a chave e o emblema para abrir a cabana.',
  chave: AVISOS_DO_FAROL.coleta,
  emblema: 'Você pegou o emblema!',
  abriu: 'A cabana abriu! Você tinha as duas peças.',
  falta: 'A cabana pede a chave e o emblema.',
} as const

type Pecas = SceneState['pieces']

/** Onde o personagem fica: numa peça, na porta da cabana, ou no começo. */
function lugarDoPersonagem(at: Pecas['at']) {
  const hero = FAROL_LAYOUT.personagem
  const chave = FAROL_LAYOUT.chave
  if (at === 'key') return { x: chave.x - 16, y: chave.y - 14 }
  if (at === 'emblem') return { x: EMBLEMA_DA_CENA.x - 16, y: EMBLEMA_DA_CENA.y - 26 }
  if (at === 'door') return { x: CABANA_DA_CENA.x + 20, y: CABANA_DA_CENA.y + 32 }
  return { x: hero.x, y: hero.y }
}

export function avisoDaCabana(p: Pecas) {
  if (p.at === 'door') return p.door === 'open' ? AVISOS_DA_CABANA.abriu : AVISOS_DA_CABANA.falta
  if (p.at === 'key') return AVISOS_DA_CABANA.chave
  if (p.at === 'emblem') return AVISOS_DA_CABANA.emblema
  return AVISOS_DA_CABANA.inicio
}

/** A resposta da pergunta da cabana com a regra escolhida ("e" ou "ou"). */
export function respostaDaCabana(p: Pecas) {
  return p.rule === 'and' ? p.temChave && p.temEmblema : p.temChave || p.temEmblema
}

const sim = (v: boolean) => (v ? 'verdadeiro' : 'falso')

/**
 * O palco é o JOGO: a praia do Farol, a chave, o emblema, a cabana, o personagem e o aviso. As
 * peças guardadas aparecem no canto, nas duas casinhas do que o personagem leva.
 */
export function TwoPiecesStage({ state }: { state: SceneState }) {
  const p = state.pieces
  const hero = FAROL_LAYOUT.personagem
  const chave = FAROL_LAYOUT.chave
  const lugar = lugarDoPersonagem(p.at)
  const aviso = avisoDaCabana(p)
  return (
    <SceneCanvas
      view={FAROL_LAYOUT.palco}
      mundo="farol"
      titulo="A porta com duas peças"
      descricao={`temChave é ${sim(p.temChave)} e temEmblema é ${sim(p.temEmblema)}. A cabana está ${p.door === 'open' ? 'aberta' : 'fechada'}. O aviso do jogo diz: ${aviso}`}
    >
      <image
        data-fundo="farol"
        href={farolSvgUrl('praia-tropical')}
        width={FAROL_LAYOUT.palco.w}
        height={FAROL_LAYOUT.palco.h}
      />
      <image
        href={farolSvgUrl('farol-listrado-apagado')}
        x={FAROL_LAYOUT.farol.x}
        y={FAROL_LAYOUT.farol.y}
        width={FAROL_LAYOUT.farol.w}
        height={FAROL_LAYOUT.farol.h}
      />
      <image
        data-cabana={p.door}
        href={farolSvgUrl(p.door === 'open' ? 'cabana-aberta' : 'cabana-fechada')}
        x={CABANA_DA_CENA.x}
        y={CABANA_DA_CENA.y}
        width={CABANA_DA_CENA.w}
        height={CABANA_DA_CENA.w}
      />
      {/* As peças saem do chão subindo e sumindo (`.sz-scene-anda`), como a moeda das Moedas. */}
      <g
        className="sz-scene-anda"
        data-peca="chave"
        data-no-chao={p.temChave ? 'nao' : 'sim'}
        style={{
          opacity: p.temChave ? 0 : 1,
          transform: p.temChave ? 'translate(0px, -14px)' : 'translate(0px, 0px)',
        }}
      >
        <image
          href={farolSvgUrl('chave-dourada')}
          x={chave.x}
          y={chave.y}
          width={chave.w}
          height={chave.h}
        />
      </g>
      <g
        className="sz-scene-anda"
        data-peca="emblema"
        data-no-chao={p.temEmblema ? 'nao' : 'sim'}
        style={{
          opacity: p.temEmblema ? 0 : 1,
          transform: p.temEmblema ? 'translate(0px, -14px)' : 'translate(0px, 0px)',
        }}
      >
        <image
          href={farolSvgUrl('emblema')}
          x={EMBLEMA_DA_CENA.x}
          y={EMBLEMA_DA_CENA.y}
          width={EMBLEMA_DA_CENA.w}
          height={EMBLEMA_DA_CENA.w}
        />
      </g>
      <g
        className="sz-scene-anda"
        data-personagem={p.at === null ? 'comeco' : p.at === 'door' ? 'cabana' : p.at}
        style={{ transform: `translate(${lugar.x}px, ${lugar.y}px)` }}
      >
        <image href={farolSvgUrl('aventureiro')} width={hero.w} height={hero.h} />
      </g>
      <AvisoDoFarol texto={aviso} />
      {/* O que o personagem leva: uma casinha por peça, vazia até pegar. */}
      <g data-leva="">
        <Texto
          x="12"
          y="53"
          tamanho={14}
          fill="#143d35"
          fontWeight="700"
          dominantBaseline="central"
        >
          Leva:
        </Texto>
        {(
          [
            ['chave-dourada', p.temChave, 60],
            ['emblema', p.temEmblema, 90],
          ] as const
        ).map(([arte, tem, x]) => (
          <g key={arte} data-casinha={arte} data-tem={tem ? 'sim' : 'nao'}>
            <rect
              x={x}
              y="41"
              width="26"
              height="26"
              rx="6"
              fill="#fff8e1"
              stroke="#143d35"
              strokeDasharray={tem ? undefined : '4 3'}
            />
            {tem && <image href={farolSvgUrl(arte)} x={x + 3} y={44} width={20} height={20} />}
          </g>
        ))}
      </g>
    </SceneCanvas>
  )
}

/**
 * A bancada: a regra da cabana (como a criança monta), a pergunta com as respostas de agora e os
 * gestos. ⚠️ Os rótulos ("Pegar a chave", "Pegar o emblema", "Encostar na cabana", "e", "ou",
 * "Recomeçar a partida") são os que os pedidos e as pistas do catálogo citam.
 */
export function TwoPiecesControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const p = state.pieces
  const palavra = p.rule === 'and' ? 'e' : 'ou'
  const resposta = respostaDaCabana(p)
  // A marca vem da TENTATIVA: com o personagem longe da cabana, as duas respostas ficam neutras.
  const ramo = (valor: boolean) =>
    p.at !== 'door' ? undefined : resposta === valor ? 'escolhido' : 'ignorado'
  return (
    <div className="space-y-3">
      <RegraDoJogo
        titulo="A regra da cabana"
        passos={[
          {
            id: 'evento',
            bloco: 'evento',
            texto: 'Quando o personagem começar a encostar na cabana',
          },
          {
            id: 'se',
            bloco: 'programa',
            nivel: 1,
            texto: (
              <>
                <PalavraDoBloco>se</PalavraDoBloco> temChave{' '}
                <PalavraDoBloco>{palavra}</PalavraDoBloco> temEmblema
              </>
            ),
          },
          {
            id: 'entao',
            bloco: 'jogo',
            nivel: 2,
            estado: ramo(true),
            texto: (
              <>
                <PalavraDoBloco>então</PalavraDoBloco> abrir a cabana
              </>
            ),
          },
          {
            id: 'senao',
            bloco: 'programa',
            nivel: 2,
            estado: ramo(false),
            texto: (
              <>
                <PalavraDoBloco>senão</PalavraDoBloco> avisar que a cabana pede a chave e o emblema
              </>
            ),
          },
        ]}
      />
      <p className="text-sm font-semibold" data-pergunta={resposta ? 'verdadeiro' : 'falso'}>
        A pergunta agora: temChave ({sim(p.temChave)}) {palavra} temEmblema ({sim(p.temEmblema)}) →{' '}
        <strong>{sim(resposta)}</strong>
      </p>
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="mb-1 text-sm font-bold">O bloco que junta as duas perguntas</legend>
        <SceneButton
          tom={p.rule === 'and' ? 'gesto' : 'ferramenta'}
          aria-pressed={p.rule === 'and'}
          onClick={() => dispatch({ type: 'cabin-rule', rule: 'and' })}
        >
          e
        </SceneButton>
        <SceneButton
          tom={p.rule === 'or' ? 'gesto' : 'ferramenta'}
          aria-pressed={p.rule === 'or'}
          onClick={() => dispatch({ type: 'cabin-rule', rule: 'or' })}
        >
          ou
        </SceneButton>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <SceneButton
          fechado={p.temChave}
          onClick={() => dispatch({ type: 'take-piece', piece: 'key' })}
        >
          Pegar a chave
        </SceneButton>
        <SceneButton
          fechado={p.temEmblema}
          onClick={() => dispatch({ type: 'take-piece', piece: 'emblem' })}
        >
          Pegar o emblema
        </SceneButton>
        <SceneButton tom="gesto" onClick={() => dispatch({ type: 'try-cabin' })}>
          Encostar na cabana
        </SceneButton>
        <SceneButton onClick={() => dispatch({ type: 'restart-cabin' })}>
          Recomeçar a partida
        </SceneButton>
      </div>
    </div>
  )
}
