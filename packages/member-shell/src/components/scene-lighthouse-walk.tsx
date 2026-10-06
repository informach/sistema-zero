'use client'

import {
  LIGHTHOUSE_WALK,
  LIGHTHOUSE_WALK_SPEEDS,
  lighthouseWalkOut,
  type SceneAction,
  type SceneCenarioId,
  type SceneState,
  sceneCenario,
  sceneStepLabel,
  sceneStepSeconds,
} from '@sistemazero/core/learning/scene'
import { FAROL_HITBOXES, FAROL_LAYOUT, farolSvgUrl } from '@sistemazero/studio/arte'
import { useId } from 'react'
import { SceneButton } from './exploration-stage'
import { ALTURA_NA_CENA, ArteSvg, FundoDoCenario, larguraNaCena } from './scene-arte'
import { Chave, Escolha } from './scene-bench'
import { SceneCanvas, Texto } from './scene-canvas'
import { useSceneCenario } from './scene-cenario-context'
import { type PassoDaRegra, RegraDoJogo } from './scene-farol'

/**
 * O andar quadro a quadro (`lighthouse-walk`, Dia 1 do Desafio, 05/10/2026). A mesma cena serve ao
 * Farol (o personagem) e à Nave (`cenario: 'nave'`, a nave).
 *
 * ⭐ O palco é o JOGO: o mapa do Farol (ou o espaço da Nave) sem outros sprites, e a figura andando
 * para a direita. Duas coisas a mais, as duas do próprio assunto:
 * - a BORDA da tela e a faixa "fora da tela" à direita dela. O que passa da borda continua desenhado
 *   ali, esmaecido e com o contorno tracejado: é como a criança VÊ "parte dele saiu";
 * - uma marquinha por quadro sob a figura (as últimas `MARCAS_VISIVEIS`) e, entre as duas últimas, o
 *   passo do quadro ("+3", "+1", "+0"). O número é o que se lê no celular, onde 1 e 3 de distância
 *   viram 0,6 e 1,8 px.
 *
 * ⚠️ A figura NÃO é do elenco: é o sprite do projeto (o `personagem` do Farol, a nave da arte do Jogo
 * 2D). Por isso nenhum `data-figure` aqui, e `SCENE_ROLES['lighthouse-walk']` é vazio.
 * ⚠️ Sem `.sz-scene-anda`: o salto de um quadro É a lição. Com a transição de 450 ms a figura
 * escorregava atrasada do número da faixa e das marcas.
 */

/** A faixa de fora da tela, à direita da borda: cabe a figura inteira saindo (64) e a folga. */
const FORA = 96
const VIEW = { w: FAROL_LAYOUT.palco.w + FORA, h: FAROL_LAYOUT.palco.h } as const
/**
 * O recorte do celular (`viewEstreito`): a faixa do caminho, do começo da andada até a faixa de fora.
 * Com o mapa inteiro num palco de ~300 px a figura tinha 28 px; aqui ela cresce ~40%. ⚠️ A borda da
 * direita e a faixa de fora continuam inteiras: são o assunto da cena.
 */
const VIEW_ESTREITO = { x: 150, y: 44, w: VIEW.w - 150, h: 232 } as const
/**
 * A linha em que a figura anda: com o y 128 os pés do personagem passam pela areia, pela ponte e pela
 * ilha antes da borda (o y 141 do começo do jogo passava logo abaixo da ponte, pela água).
 */
const CAMINHO_Y = 128
const CAIXA = LIGHTHOUSE_WALK.hero
/** As marcas dos quadros: traços sob a figura. Só as últimas, altas e grossas o bastante para o celular. */
const MARCAS_VISIVEIS = 10
const MARCA = { de: CAMINHO_Y + CAIXA + 3, ate: CAMINHO_Y + CAIXA + 17 } as const
/** A opacidade da parte que passou da borda: com o contorno tracejado, ela se lê sobre a faixa. */
const FANTASMA = 0.6

/**
 * O CORPO da figura dentro da caixa de 64, em unidades do palco. "Parte passando da borda" é o corpo
 * que cruza, e não a caixa: o personagem tem margem transparente (o corpo vai de 16 a 46 na largura,
 * `FAROL_HITBOXES`), e com 2 da caixa para fora nada do desenho tinha saído. A nave ocupa a largura
 * toda, ancorada no chão da caixa.
 */
type Corpo = { esquerda: number; direita: number; topo: number; base: number }
const HB = FAROL_HITBOXES.personagem ?? { x: 0, y: 0, w: 1, h: 1 }
const CORPO_DO_PERSONAGEM: Corpo = {
  esquerda: HB.x * CAIXA,
  direita: (HB.x + HB.w) * CAIXA,
  topo: HB.y * CAIXA,
  base: (HB.y + HB.h) * CAIXA,
}
/** A nave cabe na caixa de 64 (a régua do motor), centrada e ancorada no chão dela. */
const ESCALA_DA_NAVE = Math.min(CAIXA / larguraNaCena('nave'), CAIXA / ALTURA_NA_CENA.nave)
const LARGURA_DA_NAVE = larguraNaCena('nave') * ESCALA_DA_NAVE
const CORPO_DA_NAVE: Corpo = {
  esquerda: (CAIXA - LARGURA_DA_NAVE) / 2,
  direita: (CAIXA + LARGURA_DA_NAVE) / 2,
  topo: CAIXA - ALTURA_NA_CENA.nave * ESCALA_DA_NAVE,
  base: CAIXA,
}

/** Onde a figura está em relação à tela, pelo CORPO (o leitor de tela e os testes leem isto). */
function ondeEsta(x: number, corpo: Corpo): 'dentro' | 'parte' | 'fora' {
  if (x + corpo.esquerda >= LIGHTHOUSE_WALK.screen) return 'fora'
  return x + corpo.direita > LIGHTHOUSE_WALK.screen ? 'parte' : 'dentro'
}

/** É o Farol ou a Nave? O campo `cenario` da atividade; sem ele, o Farol (o mundo fixo da cena). */
const ehNave = (cenario: SceneCenarioId | undefined) =>
  sceneCenario(undefined, 'lighthouse-walk', cenario) === 'nave'

export function LighthouseWalkStage({ state }: { state: SceneState }) {
  const id = useId()
  const cenario = useSceneCenario(undefined, 'lighthouse-walk')
  const nave = cenario === 'nave'
  const { walk } = state
  const corpo = nave ? CORPO_DA_NAVE : CORPO_DO_PERSONAGEM
  const onde = ondeEsta(walk.x, corpo)
  const quem = nave
    ? { nome: 'A nave', inteiro: 'inteira', dele: 'da nave' }
    : { nome: 'O personagem', inteiro: 'inteiro', dele: 'do personagem' }
  /**
   * ⚠️ A `<desc>` diz o DESENHO, e não repete a frase da situação (quadro, x e seta moram nela e nos
   * ladrilhos): o leitor de tela ouviria a mesma frase duas vezes.
   */
  const descricao = `${
    onde === 'fora'
      ? `${quem.nome} passou ${quem.inteiro} da borda da direita e aparece na faixa de fora da tela, esmaecid${nave ? 'a' : 'o'}.`
      : onde === 'parte'
        ? `Parte ${quem.dele} já passou da borda da direita e aparece esmaecida na faixa de fora.`
        : `${quem.nome} está ${quem.inteiro} dentro da tela, antes da borda da direita.`
  }${walk.trail.length > 1 ? ' Embaixo, uma marca para cada um dos últimos quadros.' : ''}`
  const marcas = walk.trail.slice(-MARCAS_VISIVEIS)
  const ultimo = marcas.at(-1) ?? walk.x
  const penultimo = marcas.at(-2)
  const passo = penultimo === undefined ? null : ultimo - penultimo
  const corDaMarca = nave ? '#e3edff' : '#143d35'
  /**
   * As marcas, o passo e a figura. Desenhados DUAS vezes: inteiros dentro da tela, e esmaecidos na
   * faixa de fora (`comDados` só na primeira, para os `data-*` do palco não saírem em dobro).
   */
  const desenho = (comDados: boolean) => (
    <>
      <g data-rastro={comDados ? walk.trail.length : undefined} aria-hidden>
        {marcas.map((x, i) => (
          <line
            // biome-ignore lint/suspicious/noArrayIndexKey: uma marca por quadro, na ordem
            key={i}
            data-marca={comDados ? x : undefined}
            x1={x + CAIXA / 2}
            x2={x + CAIXA / 2}
            y1={MARCA.de}
            y2={MARCA.ate}
            stroke={corDaMarca}
            strokeWidth={2.4}
            strokeLinecap="round"
            opacity={0.3 + (0.7 * (i + 1)) / marcas.length}
          />
        ))}
      </g>
      {/* O passo sai UMA vez, sempre do lado de dentro da borda: partido pela borda, o "+3" virava
          um "‹3" metade inteiro e metade esmaecido. */}
      {passo !== null && comDados && (
        <Texto
          data-passo={passo}
          x={Math.min((penultimo ?? ultimo) + CAIXA / 2 + passo / 2, LIGHTHOUSE_WALK.screen - 16)}
          y={MARCA.ate + 15}
          textAnchor="middle"
          tamanho={13}
          fontWeight="800"
          fill={corDaMarca}
        >
          {`+${passo}`}
        </Texto>
      )}
      {nave ? (
        <g
          data-personagem={comDados ? onde : undefined}
          data-x={comDados ? walk.x : undefined}
          transform={`translate(${walk.x + CAIXA / 2} ${CAMINHO_Y + CAIXA}) scale(${ESCALA_DA_NAVE})`}
        >
          <ArteSvg nome="nave" />
        </g>
      ) : (
        <image
          data-personagem={comDados ? onde : undefined}
          data-x={comDados ? walk.x : undefined}
          href={farolSvgUrl('personagem')}
          x={walk.x}
          y={CAMINHO_Y}
          width={CAIXA}
          height={CAIXA}
        />
      )}
    </>
  )
  return (
    <SceneCanvas
      view={VIEW}
      viewEstreito={VIEW_ESTREITO}
      mundo={cenario}
      titulo={
        nave
          ? 'A nave se movendo quadro a quadro, com a borda da tela'
          : 'O personagem andando no mapa do Farol, com a borda da tela'
      }
      descricao={descricao}
    >
      {(palco) => {
        // Os dois rótulos da faixa de fora descem junto com o recorte do celular.
        const topo = palco.view.y ?? 0
        const linha = palco.letra(14)
        return (
          <>
            <defs>
              <clipPath id={`${id}-tela`}>
                <rect width={LIGHTHOUSE_WALK.screen} height={VIEW.h} />
              </clipPath>
              <clipPath id={`${id}-fora`}>
                <rect x={LIGHTHOUSE_WALK.screen} width={FORA} height={VIEW.h} />
              </clipPath>
            </defs>
            {nave ? (
              <FundoDoCenario
                cenario="nave"
                w={LIGHTHOUSE_WALK.screen}
                h={VIEW.h}
                chao={VIEW.h}
                detalhe="calmo"
              />
            ) : (
              <image
                data-fundo="farol"
                href={farolSvgUrl('cenario')}
                width={FAROL_LAYOUT.palco.w}
                height={VIEW.h}
              />
            )}
            {/* A faixa de FORA da tela: o jogo não desenha nada aqui. */}
            <rect
              data-fora-da-tela=""
              className="fill-scene-b-wash"
              x={LIGHTHOUSE_WALK.screen}
              y={0}
              width={FORA}
              height={VIEW.h}
            />
            <g clipPath={`url(#${id}-tela)`}>{desenho(true)}</g>
            {/* ⭐ A parte que passou da borda continua desenhada, ESMAECIDA, com o contorno do corpo
                tracejado na tinta da faixa (o contorno é que dá os 3:1 de gráfico sobre ela). */}
            <g data-fantasma="" clipPath={`url(#${id}-fora)`}>
              <g opacity={FANTASMA}>{desenho(false)}</g>
              {onde !== 'dentro' && (
                <rect
                  data-contorno-fantasma=""
                  className="stroke-scene-b-ink"
                  x={walk.x + corpo.esquerda}
                  y={CAMINHO_Y + corpo.topo}
                  width={corpo.direita - corpo.esquerda}
                  height={corpo.base - corpo.topo}
                  rx={6}
                  fill="none"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                />
              )}
            </g>
            {/* A BORDA da tela: a linha que o limite não deixa a figura atravessar. */}
            <line
              data-borda-da-tela=""
              className="stroke-scene-ink"
              x1={LIGHTHOUSE_WALK.screen}
              x2={LIGHTHOUSE_WALK.screen}
              y1={0}
              y2={VIEW.h}
              strokeWidth={3}
            />
            <Texto
              className="fill-scene-b-ink"
              x={LIGHTHOUSE_WALK.screen + FORA / 2}
              y={topo + linha + 6}
              textAnchor="middle"
              tamanho={14}
              fontWeight="700"
            >
              fora
            </Texto>
            <Texto
              className="fill-scene-b-ink"
              x={LIGHTHOUSE_WALK.screen + FORA / 2}
              y={topo + linha * 2.2 + 6}
              textAnchor="middle"
              tamanho={14}
              fontWeight="700"
            >
              da tela
            </Texto>
          </>
        )
      }}
    </SceneCanvas>
  )
}

/** As metas que pedem a escolha da velocidade, as do limite, e as que se veem quadro a quadro. */
const METAS_DA_VELOCIDADE = ['step-speed-3', 'step-speed-1']
const METAS_DO_LIMITE = ['left-the-screen', 'stayed-inside']
const METAS_DE_PASSO = ['still-without-arrow', 'moves-each-frame', ...METAS_DA_VELOCIDADE]

/**
 * Os blocos do Estúdio que a regra espelha, com os rótulos de VERDADE de cada projeto
 * (`REFERENCIA-BLOCOS-JOGO-2D.json`): o Farol move o `personagem` nas 4 direções
 * (`sz_g2d_top_down`); a Nave move a `nave` com as setas ← → (`sz_g2d_arrows_x`). Os dois limitam com
 * `sz_g2d_clamp_to_screen`.
 */
const BLOCOS = {
  farol: {
    mover: (v: number) => `Mover sprite personagem em 4 direções com setas, velocidade ${v}`,
    limite: 'Manter o sprite personagem dentro da tela',
    saiu: 'O personagem saiu da tela.',
  },
  nave: {
    mover: (v: number) => `Mover o sprite nave com as setas <- -> (velocidade ${v})`,
    limite: 'Manter o sprite nave dentro da tela',
    saiu: 'A nave saiu da tela.',
  },
} as const

/**
 * A bancada: a regra nos blocos do Dia 1, as chaves e os botões do tempo.
 *
 * ⭐ Os controles aparecem POR CASO (`goals`, as metas da atividade): a velocidade só no caso que
 * compara 3 e 1, e "Manter dentro da tela" (com o terceiro bloco da regra) só no caso do limite.
 * ⭐ O azul cheio segue a META QUE FALTA: o "Avançar 1 quadro" enquanto falta uma meta que se vê
 * quadro a quadro (as do andar e da velocidade), o "Rodar" no caso do limite, e o "Recomeçar" quando a
 * figura saiu da tela sem o limite (aí o Rodar FECHA, com a nota dizendo o caminho).
 * ⚠️ Os rótulos são citados pelos roteiros letra por letra (`catalog.ts`): mudar um aqui é mudar
 * uma fala gravada.
 * ⚠️ O "Rodar" é o relógio do PLAYER (`onRunning`), o mesmo ▶ de toda cena: quem o para sozinho é
 * `sceneClockShouldStop` do core.
 * ⚠️ `.sz-scene-quebra` (scene.css): os rótulos QUEBRAM linha. "Segurar a seta para a direita:
 * desligado" tem 273 px fixos e estourava a bancada num celular de 390.
 */
export function LighthouseWalkControls({
  state,
  dispatch,
  goals,
  cenario,
  tocando = false,
  onRunning,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
  goals: readonly { id: string; complete?: boolean }[]
  /** O `cenario` declarado na atividade: diz se os blocos da regra são os do Farol ou os da Nave. */
  cenario?: SceneCenarioId
  tocando?: boolean
  onRunning: (ligado: boolean) => void
}) {
  const notaId = useId()
  const { arrow, speed, keepInside } = state.walk
  const blocos = ehNave(cenario) ? BLOCOS.nave : BLOCOS.farol
  const comVelocidade = goals.some((g) => METAS_DA_VELOCIDADE.includes(g.id))
  const comLimite = goals.some((g) => METAS_DO_LIMITE.includes(g.id))
  const faltaPasso = goals.some((g) => METAS_DE_PASSO.includes(g.id) && !g.complete)
  const saiu = lighthouseWalkOut(state) && !tocando
  const destaque = saiu ? 'recomecar' : tocando || !faltaPasso ? 'rodar' : 'avancar'
  const passo = sceneStepSeconds('lighthouse-walk') ?? 1 / 30
  const regra: PassoDaRegra[] = [
    { id: 'evento', bloco: 'evento', texto: 'A cada quadro do jogo' },
    { id: 'mover', bloco: 'jogo', nivel: 1, texto: blocos.mover(speed) },
    ...(comLimite
      ? [
          {
            id: 'limite',
            bloco: 'jogo' as const,
            nivel: 1 as const,
            texto: blocos.limite,
            estado: keepInside ? undefined : ('fora' as const),
          },
        ]
      : []),
  ]
  return (
    <div className="sz-scene-quebra space-y-3">
      <RegraDoJogo titulo="A regra do movimento" passos={regra} />
      <Chave
        label="Segurar a seta para a direita"
        ligado={arrow}
        ligadoTexto="ligado"
        desligadoTexto="desligado"
        onToggle={(held) => dispatch({ type: 'hold-arrow', held })}
      />
      {comVelocidade && (
        <Escolha
          label="Velocidade"
          valor={speed}
          opcoes={LIGHTHOUSE_WALK_SPEEDS.map((v) => ({ id: v, label: `Velocidade ${v}` }))}
          onChange={(v) => dispatch({ type: 'walk-speed', speed: v })}
        />
      )}
      {comLimite && (
        <Chave
          label="Manter dentro da tela"
          ligado={keepInside}
          ligadoTexto="ligado"
          desligadoTexto="desligado"
          onToggle={(enabled) => dispatch({ type: 'keep-on-screen', enabled })}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <SceneButton
          tom={destaque === 'avancar' ? 'gesto' : 'ferramenta'}
          onClick={() => {
            onRunning(false)
            dispatch({ type: 'advance', seconds: passo })
          }}
        >
          {sceneStepLabel('lighthouse-walk')}
        </SceneButton>
        <SceneButton
          tom={destaque === 'rodar' ? 'gesto' : 'ferramenta'}
          fechado={saiu}
          aria-describedby={saiu ? notaId : undefined}
          onClick={() => onRunning(!tocando)}
        >
          {tocando ? 'Parar' : 'Rodar'}
        </SceneButton>
        <SceneButton
          tom={destaque === 'recomecar' ? 'gesto' : 'ferramenta'}
          onClick={() => {
            onRunning(false)
            dispatch({ type: 'restart-walk' })
          }}
        >
          Recomeçar
        </SceneButton>
      </div>
      {saiu && (
        <p id={notaId} className="text-sm text-muted-foreground">
          {blocos.saiu}{' '}
          {comLimite
            ? 'Clique em Recomeçar ou ligue Manter dentro da tela.'
            : 'Clique em Recomeçar.'}
        </p>
      )}
    </div>
  )
}
