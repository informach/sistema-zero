'use client'

import type { SceneCast, SceneState } from '@sistemazero/core/learning/scene'
import { facesAVista, PICK_BOXES } from '@sistemazero/core/learning/scene'
import { CactusFigure, DinoFigure } from './exploration-stage'
// ⚠️ O `VIEW` vem do canvas: os desenhos leem o enquadramento (`VIEW.w`, `VIEW.h`) para
// encostar no chão e na borda, então ele e o `viewBox` do SVG têm de ser o MESMO número.
import { SceneCanvas, SCENE_VIEW as VIEW } from './scene-canvas'

/**
 * Os palcos das dez cenas do motor, do 3D e do ateliê (15/09/2026).
 *
 * As 35 anteriores moram todas numa tela 2D. Estas mostram o que aparece quando o jogo cresce —
 * dois contadores que discordam, três cérebros lado a lado, duas máquinas correndo o mesmo jogo,
 * a conta da colisão escrita à vista — e a porta do 3D, que é onde a trilha mais perde criança.
 *
 * ⚠️ O 3D aqui é DESENHADO, não renderizado: uma projeção isométrica à mão em SVG. Puxar uma
 * biblioteca 3D para dentro do player de aula custaria o peso dela em toda cena, e o que estas
 * quatro cenas precisam mostrar (o eixo que falta, a câmera que decide o que se vê, os pontos
 * por baixo da roupa, a reta que para na primeira caixa) cabe inteiro num cubo e numa sombra.
 *
 * ⚠️ O par de comparação segue FIXO nas duas cores de sempre (A azul `scene-a`, B laranja
 * `scene-b`): elas dizem QUAL medida é qual, e não são decoração.
 */

/** Um número grande com rótulo — o molde dos contadores que estas cenas comparam. */
function Contador({
  x,
  label,
  value,
  tom,
}: {
  x: number
  label: string
  value: string
  tom: string
}) {
  return (
    <g>
      <text className="fill-scene-ink-soft" x={x} y={44} textAnchor="middle" fontSize="12">
        {label}
      </text>
      <text className={tom} x={x} y={92} textAnchor="middle" fontSize="46" fontWeight="700">
        {value}
      </text>
    </g>
  )
}

/**
 * A projeção do espaço em três eixos.
 *
 * ⚠️ O y do 3D cresce para CIMA — é a cena inteira, então a conta é `-y` aqui e em nenhum outro
 * lugar. O z afasta na diagonal, que é o que dá a impressão de profundidade sem perspectiva.
 */
const CHAO = { x: 280, y: 210 } as const
function projetar(x: number, y: number, z: number) {
  return { px: CHAO.x + x * 0.9 - z * 0.42, py: CHAO.y - y * 0.9 - z * 0.3 }
}

/** O nascedouro: os vivos contra os criados desde o começo. */
export function PoolStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { alive, created, recycling } = state.nursery
  return (
    <SceneCanvas
      cast={cast}
      titulo="Os dois contadores do nascedouro"
      descricao={`${alive} vivo(s) agora e ${created} criado(s) desde o começo. Reciclagem ${recycling ? 'ligada' : 'desligada'}.`}
      rodape="Um conta o que existe; o outro conta o que já foi feito."
    >
      <Contador x={150} label="vivos agora" value={String(alive)} tom="fill-scene-a" />
      <Contador
        x={410}
        label="criados desde o começo"
        value={String(created)}
        tom={created > 3 && !recycling ? 'fill-scene-alert' : 'fill-scene-b'}
      />
      <path className="stroke-scene-line" d="M280 30v90" strokeWidth="1.5" />
      <path className="fill-scene-grass" d={`M0 250H${VIEW.w}V${VIEW.h}H0Z`} />
      {Array.from({ length: Math.min(alive, 6) }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: são N iguais em fila, sem identidade.
        <CactusFigure key={`vivo-${i + 1}`} x={120 + i * 60} y={250} />
      ))}
      {recycling && (
        <>
          <path
            className="stroke-scene-a"
            d="M120 268q140 40 280 0"
            strokeWidth="3"
            fill="none"
            strokeDasharray="6 5"
          />
          <text className="fill-scene-a" x={280} y={292} textAnchor="middle" fontSize="12">
            o mesmo corpo volta
          </text>
        </>
      )}
    </SceneCanvas>
  )
}

const BRAIN_LABEL: Record<string, string> = {
  parado: 'parado',
  mirar: 'mirando',
  atirar: 'atirando',
  recarregar: 'recarregando',
}

/** Três personagens, cada um com o próprio estado. */
export function EntityStateStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const estados = state.brains.states
  return (
    <SceneCanvas
      cast={cast}
      titulo="Os três personagens e o estado de cada um"
      descricao={estados.map((e, i) => `${i + 1}º ${BRAIN_LABEL[e] ?? e}`).join(', ')}
      rodape="O estado não é do jogo: é de cada um."
    >
      <path className="fill-scene-grass" d={`M0 240H${VIEW.w}V${VIEW.h}H0Z`} />
      {estados.map((estado, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: são três cérebros fixos, 1º ao 3º.
        <g key={`cerebro-${i + 1}`}>
          <rect
            className={estado === 'parado' ? 'fill-scene-grid' : 'fill-scene-a-wash'}
            x={40 + i * 170}
            y={40}
            width={150}
            height={72}
            rx={14}
          />
          <text
            className="fill-scene-ink-soft"
            x={115 + i * 170}
            y={66}
            textAnchor="middle"
            fontSize="12"
          >
            {i + 1}º cérebro
          </text>
          <text
            className={estado === 'parado' ? 'fill-scene-ink-soft' : 'fill-scene-a'}
            x={115 + i * 170}
            y={94}
            textAnchor="middle"
            fontSize="18"
            fontWeight="700"
          >
            {BRAIN_LABEL[estado] ?? estado}
          </text>
          <path
            className="stroke-scene-line"
            d={`M${115 + i * 170} 112v46`}
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <g className={estado === 'parado' ? 'text-scene-ink-soft' : 'text-primary'}>
            <DinoFigure x={115 + i * 170} y={240} />
          </g>
        </g>
      ))}
    </SceneCanvas>
  )
}

/** Duas máquinas com o mesmo jogo: uma rápida e uma devagar. */
export function DeltaTimeStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { mode, fastX, slowX } = state.machines
  const junto = Math.abs(fastX - slowX) < 1
  return (
    <SceneCanvas
      cast={cast}
      titulo="O mesmo jogo em duas máquinas"
      descricao={`Contando ${mode === 'frames' ? 'quadros' : 'segundos'}: a rápida está em ${Math.round(fastX)} e a devagar em ${Math.round(slowX)}.`}
      rodape={junto ? 'As duas estão no mesmo lugar.' : 'As duas se afastaram.'}
    >
      {[
        { y: 90, label: 'computador rápido', x: fastX, tom: 'text-scene-a' },
        { y: 210, label: 'computador devagar', x: slowX, tom: 'text-scene-b-ink' },
      ].map((pista) => (
        <g key={pista.label}>
          <text className="fill-scene-ink-soft" x={30} y={pista.y - 42} fontSize="12">
            {pista.label}
          </text>
          <path
            className="stroke-scene-line"
            d={`M30 ${pista.y + 4}H${VIEW.w - 30}`}
            strokeWidth="2"
          />
          <path
            className="stroke-scene-rule"
            d={`M${VIEW.w - 60} ${pista.y - 30}v38`}
            strokeWidth="2"
            strokeDasharray="5 4"
          />
          <g className={pista.tom}>
            <DinoFigure x={Math.min(30 + pista.x, VIEW.w - 40)} y={pista.y} />
          </g>
        </g>
      ))}
      <text
        className="fill-scene-ink-soft"
        x={VIEW.w - 60}
        y={40}
        textAnchor="middle"
        fontSize="11"
      >
        chegada
      </text>
    </SceneCanvas>
  )
}

/** A colisão escrita à mão: dois círculos, a distância entre os centros e a soma dos raios. */
export function CircleCollisionStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { distance, a, b } = state.circles
  const soma = a + b
  const encostando = distance <= soma
  const ax = 140
  const bx = Math.min(ax + distance, VIEW.w - 60)
  const cy = 140
  return (
    <SceneCanvas
      cast={cast}
      titulo="Os dois círculos da colisão"
      descricao={`Distância entre os centros ${Math.round(distance)}, soma dos raios ${soma}: ${encostando ? 'é uma batida' : 'ainda não é uma batida'}.`}
      rodape="A batida não é quando os desenhos parecem encostar: é quando a conta bate."
    >
      <circle className="fill-scene-a-wash stroke-scene-a" cx={ax} cy={cy} r={a} strokeWidth="2" />
      <circle
        className="fill-scene-b-wash stroke-scene-b"
        cx={bx}
        cy={cy}
        r={b}
        strokeWidth="2"
        fillOpacity={0.5}
      />
      <circle className="fill-scene-a" cx={ax} cy={cy} r="4" />
      <circle className="fill-scene-b" cx={bx} cy={cy} r="4" />
      <path
        className={encostando ? 'stroke-scene-alert' : 'stroke-scene-rule'}
        d={`M${ax} ${cy}H${bx}`}
        strokeWidth="3"
      />
      <text
        className="fill-scene-ink-soft"
        x={(ax + bx) / 2}
        y={cy - 14}
        textAnchor="middle"
        fontSize="13"
        fontWeight="600"
      >
        {Math.round(distance)}
      </text>
      <path className="stroke-scene-a" d={`M60 240H${60 + a}`} strokeWidth="6" />
      <path className="stroke-scene-b" d={`M${60 + a} 240H${60 + soma}`} strokeWidth="6" />
      <text className="fill-scene-ink-soft" x={60} y={268} fontSize="12">
        soma dos raios: {soma}
      </text>
      {encostando && (
        <text
          className="fill-scene-alert"
          x={VIEW.w - 30}
          y={268}
          textAnchor="end"
          fontSize="13"
          fontWeight="700"
        >
          bateu
        </text>
      )}
    </SceneCanvas>
  )
}

/** O espaço em três eixos, com a sombra no chão. ⚠️ Aqui o y cresce para CIMA. */
export function AxisZStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { x, y, z } = state.space
  const alto = projetar(x, y, z)
  const chao = projetar(x, 0, z)
  return (
    <SceneCanvas
      cast={cast}
      titulo="O objeto no espaço, com a sombra dele no chão"
      descricao={`x ${x}, y ${y}, z ${z}. ${y > 0 ? 'Ele está no ar.' : 'Ele está no chão.'}`}
      rodape="A sombra no chão diz onde ele está; a altura é o y."
    >
      <path className="fill-scene-grid" d="M120 150 480 150 560 270 40 270Z" fillOpacity={0.5} />
      {[
        { d: `M${CHAO.x} ${CHAO.y}l120 -56`, nome: 'x', dx: 128, dy: -62 },
        { d: `M${CHAO.x} ${CHAO.y}l0 -110`, nome: 'y', dx: 6, dy: -118 },
        { d: `M${CHAO.x} ${CHAO.y}l-100 -46`, nome: 'z', dx: -112, dy: -52 },
      ].map((eixo) => (
        <g key={eixo.nome}>
          <path className="stroke-scene-rule" d={eixo.d} strokeWidth="2" />
          <text
            className="fill-scene-ink-soft"
            x={CHAO.x + eixo.dx}
            y={CHAO.y + eixo.dy}
            fontSize="13"
            fontWeight="700"
          >
            {eixo.nome}
          </text>
        </g>
      ))}
      <ellipse
        className="fill-scene-ink-soft"
        cx={chao.px}
        cy={chao.py}
        rx="26"
        ry="10"
        opacity={0.3}
      />
      {y > 0 && (
        <path
          className="stroke-scene-line"
          d={`M${alto.px} ${alto.py}V${chao.py}`}
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
      )}
      <rect
        className="fill-scene-a stroke-scene-a"
        x={alto.px - 22}
        y={alto.py - 22}
        width="44"
        height="44"
        rx="8"
        strokeWidth="2"
      />
    </SceneCanvas>
  )
}

/** As cores das três faces do cubo — o que a criança conta para saber de onde a câmera olha. */
const FACES = ['fill-scene-a', 'fill-scene-b', 'fill-scene-grass'] as const

/** O cubo visto de onde a câmera está: gire e conte as cores. */
export function Camera3dStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { yaw, pitch } = state.orbit
  // ⚠️ A contagem vem do CORE (`facesÀVista`, reexportada): esta era a TERCEIRA cópia da mesma
  // régua, e é a única que DESENHA o número na tela — se ela divergisse, o palco mostraria um
  // cubo com duas cores embaixo de uma faixa dizendo três.
  const vistas = facesAVista(yaw, pitch)
  const cima = pitch === 2
  const topo = FACES[(yaw + (cima ? 0 : 1)) % 3] ?? FACES[0]
  const frente = FACES[yaw % 3] ?? FACES[0]
  const lado = FACES[(yaw + 2) % 3] ?? FACES[0]
  return (
    <SceneCanvas
      cast={cast}
      titulo="O cubo de três cores, visto de onde a câmera está"
      descricao={`Volta ${yaw} de 8, altura ${pitch === 0 ? 'por baixo' : pitch === 1 ? 'no meio' : 'por cima'}. Daqui aparecem ${vistas} cor(es).`}
      rodape="Cada face tem uma cor. Conte quantas aparecem daqui."
    >
      <path className="fill-scene-grid" d="M120 200 440 200 520 280 40 280Z" fillOpacity={0.4} />
      {vistas === 1 ? (
        <rect className={frente} x={220} y={80} width={120} height={120} rx="6" />
      ) : (
        <>
          <path className={frente} d="M220 110 300 80 300 200 220 230Z" />
          <path className={lado} d="M300 80 380 110 380 230 300 200Z" />
          {vistas === 3 && <path className={topo} d="M220 110 300 80 380 110 300 140Z" />}
        </>
      )}
      <g className="text-scene-ink-soft">
        <path
          className="stroke-scene-rule"
          d={`M${60} ${cima ? 70 : pitch === 0 ? 250 : 160}l60 ${cima ? 40 : pitch === 0 ? -40 : 0}`}
          strokeWidth="2"
          strokeDasharray="5 4"
        />
        <text
          className="fill-scene-ink-soft"
          x={40}
          y={cima ? 60 : pitch === 0 ? 268 : 154}
          fontSize="12"
        >
          câmera
        </text>
      </g>
      <text
        className="fill-scene-ink-soft"
        x={VIEW.w - 30}
        y={40}
        textAnchor="end"
        fontSize="13"
        fontWeight="700"
      >
        {vistas} cor(es) à vista
      </text>
    </SceneCanvas>
  )
}

/** O modelo com e sem o raio-X: os pontos ligados por baixo da roupa. */
export function MeshStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { wire, yaw } = state.model
  // ⚠️ Girar ESTREITA o modelo, como um objeto girando em volta do próprio eixo: um deslocamento
  // lateral não mudaria nada do que se vê dele, contra o que a legenda promete.
  const largura = 0.45 + 0.55 * Math.abs(Math.cos((yaw / 8) * Math.PI * 2))
  const giro = (yaw % 8) * 6 - 21
  const pontos = [
    [280, 70],
    [210, 130],
    [350, 130],
    [200, 210],
    [360, 210],
    [280, 250],
  ] as const
  return (
    <SceneCanvas
      cast={cast}
      titulo={wire ? 'O modelo em pontos e linhas' : 'O modelo com a textura'}
      descricao={
        wire
          ? 'Com o raio-X ligado, o modelo é um monte de pontos ligados por linhas.'
          : 'Com o raio-X desligado, a textura cobre os pontos.'
      }
      rodape="Os pontos existem sempre: a roupa só os cobre."
    >
      <g transform={`translate(${280 + giro} 0) scale(${largura.toFixed(3)} 1) translate(-280 0)`}>
        <path
          className={wire ? 'fill-none stroke-scene-a' : 'fill-scene-b-wash stroke-scene-b'}
          d="M280 70 210 130 200 210 280 250 360 210 350 130Z"
          strokeWidth="2"
        />
        {wire && (
          <>
            <path
              className="stroke-scene-a"
              d="M280 70 200 210M280 70 360 210M210 130 350 130M210 130 280 250M350 130 280 250M200 210 360 210"
              strokeWidth="1.5"
            />
            {pontos.map(([px, py]) => (
              <circle key={`ponto-${px}-${py}`} className="fill-scene-a" cx={px} cy={py} r="5" />
            ))}
          </>
        )}
        {!wire && (
          <>
            <circle className="fill-scene-ink-soft" cx={255} cy={150} r="7" />
            <circle className="fill-scene-ink-soft" cx={305} cy={150} r="7" />
            <path
              className="stroke-scene-ink-soft"
              d="M250 190q30 22 60 0"
              strokeWidth="3"
              fill="none"
            />
          </>
        )}
      </g>
      <text className="fill-scene-ink-soft" x={30} y={280} fontSize="12">
        {wire ? 'raio-X ligado' : 'raio-X desligado'}
      </text>
    </SceneCanvas>
  )
}

/**
 * As três caixas do 3D com a reta da mira — ela para na primeira que encontra.
 *
 * ⚠️⚠️ Os retângulos vêm do MOTOR (`PICK_BOXES`), e a ordem de desenho é a ordem de
 * PROFUNDIDADE: a reta primeiro, depois a de trás, e a da frente por último. É isso que faz a
 * tela mostrar o que a cena ensina — a reta some atrás da caixa da frente em vez de atravessar
 * ela. Enquanto as três eram disjuntas e desenhadas em outra ordem, o palco demonstrava o
 * contrário exato do próprio rodapé.
 */
const CAMERA = { x: 30, y: 275 } as const

export function PickRayStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { x, y, hit } = state.ray
  const caixa = (c: (typeof PICK_BOXES)[keyof typeof PICK_BOXES]) => (
    <g key={c.id}>
      <rect
        className={
          hit === c.id ? 'fill-scene-a stroke-scene-a' : 'fill-scene-grid stroke-scene-line'
        }
        x={c.x}
        y={c.y}
        width={c.w}
        height={c.h}
        rx="8"
        strokeWidth="2"
      />
      <text
        className="fill-scene-ink-soft"
        x={c.x + c.w / 2}
        y={c.y + c.h / 2 + 5}
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
      >
        {c.id}
      </text>
    </g>
  )
  return (
    <SceneCanvas
      cast={cast}
      titulo="As caixas e a reta da mira"
      descricao={
        hit
          ? `A reta saiu da câmera e parou na caixa ${hit}.`
          : 'A mira está apontando para o vazio.'
      }
      rodape="A reta não atravessa: ela para na primeira coisa do caminho."
    >
      <path
        className="stroke-scene-rule"
        d={`M${CAMERA.x} ${CAMERA.y}L${x} ${y}`}
        strokeWidth="2"
        strokeDasharray="6 5"
      />
      {caixa(PICK_BOXES.sozinha)}
      {caixa(PICK_BOXES.atras)}
      {caixa(PICK_BOXES.frente)}
      <circle
        className={hit ? 'fill-scene-alert' : 'fill-scene-ink-soft'}
        cx={x}
        cy={y}
        r="7"
        fillOpacity={0.8}
      />
      <text className="fill-scene-ink-soft" x={CAMERA.x - 10} y={293} fontSize="12">
        câmera
      </text>
    </SceneCanvas>
  )
}

/** A mesma forma com e sem miolo, com e sem contorno. */
export function FillStrokeStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { fill, stroke } = state.ink
  const forma = 'M280 60 400 150 350 250 210 250 160 150Z'
  return (
    <SceneCanvas
      cast={cast}
      titulo="A forma, com miolo e contorno"
      descricao={`Miolo ${fill ? 'pintado' : 'vazio'}, contorno ${stroke ? 'à vista' : 'sem cor'}.`}
      rodape="Preencher e contornar são dois desenhos no mesmo traço."
    >
      <path
        className={`${fill ? 'fill-scene-a' : 'fill-none'} ${stroke ? 'stroke-scene-b' : 'stroke-none'}`}
        d={forma}
        strokeWidth="6"
        strokeLinejoin="round"
      />
      {!fill && !stroke && (
        <text
          className="fill-scene-ink-soft"
          x={280}
          y={160}
          textAnchor="middle"
          fontSize="14"
          fontStyle="italic"
        >
          não sobrou desenho
        </text>
      )}
      <text className="fill-scene-a" x={60} y={282} fontSize="12" fontWeight="600">
        miolo: {fill ? 'pintado' : 'vazio'}
      </text>
      <text
        className="fill-scene-b"
        x={VIEW.w - 60}
        y={282}
        textAnchor="end"
        fontSize="12"
        fontWeight="600"
      >
        contorno: {stroke ? 'à vista' : 'sem cor'}
      </text>
    </SceneCanvas>
  )
}

/** A mesma forma chapada e com sombra, e o lado de onde a luz vem. */
export function ShadingStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { shade, side } = state.light
  const esquerda = side === 'left'
  return (
    <SceneCanvas
      cast={cast}
      titulo="A forma, com e sem sombra"
      descricao={
        shade
          ? `Com a luz vindo da ${esquerda ? 'esquerda' : 'direita'}, a sombra fica do outro lado.`
          : 'Com uma cor só, a forma fica chapada.'
      }
      rodape="A sombra fica do lado contrário ao da luz."
    >
      <circle className="fill-scene-a" cx={280} cy={155} r="86" />
      {shade && (
        <path
          className="fill-scene-ink"
          d={
            esquerda
              ? 'M280 69a86 86 0 0 1 0 172a58 86 0 0 0 0 -172Z'
              : 'M280 69a86 86 0 0 0 0 172a58 86 0 0 1 0 -172Z'
          }
        />
      )}
      <g className="text-scene-b-ink">
        <circle
          className="fill-scene-b"
          cx={esquerda ? 70 : VIEW.w - 70}
          cy={70}
          r="22"
          fillOpacity={0.9}
        />
        {[0, 1, 2, 3].map((i) => (
          <path
            key={`raio-${i + 1}`}
            className="stroke-scene-b"
            d={`M${esquerda ? 92 : VIEW.w - 92} ${60 + i * 12}h${esquerda ? 34 : -34}`}
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
        <text
          className="fill-scene-ink-soft"
          x={esquerda ? 70 : VIEW.w - 70}
          y={112}
          textAnchor="middle"
          fontSize="12"
        >
          a luz
        </text>
      </g>
      <text className="fill-scene-ink-soft" x={280} y={282} textAnchor="middle" fontSize="12">
        {shade ? 'duas cores da mesma cor' : 'uma cor só'}
      </text>
    </SceneCanvas>
  )
}
