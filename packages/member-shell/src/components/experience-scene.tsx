'use client'

import {
  actorFigure,
  castText,
  cenarioTemChao,
  PARADA_DO_SALTO,
  type SceneActivity,
  type SceneState,
  type SceneTrial,
  sceneAreaPercent,
  sceneCenario,
  sceneContact,
  sceneDrawingsGap,
  sceneFromTrial,
  sceneTrial,
  TOPO_DO_SALTO,
} from '@sistemazero/core/learning/scene'
import { useId, useRef, useState } from 'react'
import { FundoDoCenario } from './scene-arte'
import {
  ESCALA_ESTREITA,
  LarguraConhecidaDaCena,
  SceneCanvas,
  Texto,
  useLarguraMedida,
} from './scene-canvas'
import { ActorFigure } from './scene-figures'

/** Quanto de palco o salto tem, do chão (300) até embaixo do selo (60). */
const ALTURA_DO_PALCO = 240
/** Onde o Dino pula. */
const DINO_X = 255
/** O enquadramento do laboratório. */
const VIEW_DO_LABORATORIO = { w: 640, h: 360 } as const
/**
 * O recorte da `hitbox` no estreito: de um pouco antes do Dino (260) até o cacto mais longe (260 + 260 +
 * a figura), e do selo até a legenda da comparação.
 */
const BATIDA_DE_PERTO = { x: 180, y: 20, w: 390, h: 336 } as const
/** O `gap-3` entre as duas cenas da comparação guardada. */
const VAO_DA_COMPARACAO = 12

/** Live view and comparison use the same world coordinates and geometry. */
export function ExperienceScene({
  activity,
  state,
  onDistance,
  onJump,
  compact = false,
}: {
  activity: SceneActivity
  state: SceneState
  onDistance?: (distance: number) => void
  onJump?: (input: 'key' | 'tap') => void
  compact?: boolean
}) {
  const id = useId()
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ pointer: number; distance: number } | null>(null)
  const hitbox = activity.scene === 'hitbox'
  const distance = drag?.distance ?? state.contact.distance
  const contact = sceneContact({ width: state.contact.width, distance })
  const vao = sceneDrawingsGap({ width: state.contact.width, distance })
  const batida = hitbox ? state.evidence.observations.find((o) => o.id === 'contact') : undefined
  const floor = 300
  const heroi = actorFigure(activity.cast, 'hero')
  // ⚠️ Estas quatro cenas MANTÊM a linha do chão no espaço: ela é a régua da altura do salto e o
  // apoio das duas áreas da batida (review do lote 3).
  const mundo = sceneCenario(activity.cast, activity.scene, activity.cenario)
  /**
   * ⚠️⚠️ A ESCALA do salto é da cena (lote 5 do Raio-X). Na `gravity` o Dino sem gravidade sobe até
   * sair por cima do palco em `TOPO_DO_SALTO` (600), e é aí que o player para o ▶; na `impulse` a
   * régua vai até 200, e o salto baixo deixa de ser um risco de 14 px.
   */
  const gravidade = activity.scene === 'gravity'
  const escala = gravidade ? ALTURA_DO_PALCO / TOPO_DO_SALTO : 1.2
  const regua = gravidade ? [0, 100, 200, 300, 400, 500, 600] : [0, 50, 100, 150, 200]
  const rise = Math.min(ALTURA_DO_PALCO + 40, state.flight.y * escala)
  // ⚠️ As marcas usam a MESMA folga do Dino acima da régua (lote 5): o ▶ para quando o Dino passa do
  // alto, a criança liga a gravidade ali, e o ponto mais alto cai logo acima dos 600. Presa na régua,
  // a linha "680 de altura" ficava desenhada em cima do 600.
  const tetoDasMarcas = ALTURA_DO_PALCO + 40
  const picoNaTela = Math.min(tetoDasMarcas, state.flight.peak * escala)
  const antesNaTela = Math.min(tetoDasMarcas, state.flight.before * escala)
  const picoAcimaDoPalco = state.flight.peak * escala > tetoDasMarcas
  // ⚠️ Lá no alto a linha do ponto mais alto passava por cima do selo ("A altura do pulo").
  const inicioDaLinhaDoPico = floor - picoNaTela < 56 ? 176 : 74
  const foraDoPalco = state.flight.y * escala > ALTURA_DO_PALCO
  /**
   * ⚠️ O Dino sem gravidade SEGUE subindo lá em cima (consertos do review da onda A do lote 5): o ▶ para
   * em `PARADA_DO_SALTO` (500), dentro do palco, e um Dino imóvel parecia ter parado de subir. A seta
   * para cima fica no lugar da seta da gravidade, que está desligada.
   */
  const segueSubindo =
    gravidade &&
    state.flight.time !== null &&
    !state.flight.atGravity &&
    state.flight.y >= PARADA_DO_SALTO &&
    !foraDoPalco
  const semGravidadeVisto = state.evidence.discoveries.includes('floating')
  function worldX(clientX: number, clientY: number) {
    const matrix = svg.current?.getScreenCTM()
    if (!matrix) return null
    return new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse()).x
  }
  return (
    /* ⚠⚠ Este era o SEXTO cromo de palco (achado do full review): as quatro cenas de salto e
       colisão desenhavam a própria moldura — na verdade nem isso, um `rounded-2xl` sem borda
       nenhuma —, com `<title>`/`<desc>` próprios. E são justamente as mais usadas do Corre Dino
       (aulas 3, 4 e 10). Hoje passam pelo `SceneCanvas` como as outras 41. */
    <SceneCanvas
      svgRef={svg}
      view={VIEW_DO_LABORATORIO}
      // ⭐ A batida de PERTO no estreito (conserto "letra no celular"): o laboratório inteiro num celular
      // deixava o Dino com ~35px e o "vão" entre os desenhos quase invisível. O recorte vai do Dino até o
      // cacto mais longe que a bancada alcança (distância 260), com o selo e o "BATEU!" dentro.
      viewEstreito={hitbox ? BATIDA_DE_PERTO : undefined}
      cast={activity.cast}
      mundo={mundo}
      interativo={Boolean(onJump || onDistance)}
      estilo={{ touchAction: hitbox && onDistance ? 'none' : 'auto' }}
      titulo={
        hitbox ? 'Áreas de colisão' : gravidade ? 'O pulo e a gravidade' : 'As marcas dos saltos'
      }
      descricao={
        hitbox
          ? `Distância ${distance}. Área do Dino em ${sceneAreaPercent(state.contact.width)}%. ${contact ? 'Bateu.' : 'Ainda não bateu.'}`
          : gravidade
            ? `Gravidade ${state.flight.gravity ? 'ligada, puxando para baixo' : 'desligada'}. O Dino está a ${Math.round(state.flight.y)} de altura${foraDoPalco ? ', acima do alto da tela' : ''}.`
            : `Impulso ${state.flight.force}. ${state.flight.before > 0 ? `A marca de antes está em ${Math.round(state.flight.before)}` : 'Ainda não há marca de antes'}, e a deste salto em ${Math.round(state.flight.peak)}.`
      }
    >
      {(palco) => {
        /**
         * ⚠️⚠️ No estreito (conserto "letra no celular") a régua anda para a direita até caber o maior
         * número na letra de 12px (em 35 o "600" saía cortado na borda), a da `gravity` fica de 200 em
         * 200 (de 100 em 100 os números se encostavam no "o pulo sem gravidade"), e o selo e o nome do
         * caminho pontilhado moram à direita dos números.
         */
        const marcasDaRegua = gravidade && palco.estreito ? [0, 200, 400, 600] : regua
        const numeroDaRegua = palco.estreito
          ? Math.max(35, palco.larguraDoTexto(String(marcasDaRegua.at(-1) ?? 0), 10) + 8)
          : 35
        const tracoDaRegua = numeroDaRegua + 13
        const seloX = !palco.estreito ? 32 : hitbox ? BATIDA_DE_PERTO.x + 12 : tracoDaRegua + 22
        // Os dois rótulos da `impulse` se afastam o bastante para a letra que eles têm.
        const alturaDoRotulo = palco.letra(14)
        const rotulosPerto =
          Math.abs(picoNaTela - antesNaTela) < (palco.estreito ? alturaDoRotulo + 4 : 18)
        const afastar = rotulosPerto ? (palco.estreito ? alturaDoRotulo / 2 + 2 : 11) : 0
        return (
          <>
            <defs>
              <pattern id={`${id}-grid`} width="32" height="32" patternUnits="userSpaceOnUse">
                <circle className="fill-scene-grid" cx="1" cy="1" r="1" />
              </pattern>
              <linearGradient id={`${id}-sky`} x2="0" y2="1">
                {/* ⚠️ `stopColor` é atributo de apresentação: `var()` nele é ignorado pelos
              navegadores, então o token só chega pelo `style`. */}
                <stop style={{ stopColor: 'var(--color-scene-sky)' }} />
                <stop offset="1" style={{ stopColor: 'var(--color-scene-ground)' }} />
              </linearGradient>
            </defs>
            {/* ⚠️ A GRADE e a linha do chão ficam POR CIMA do mundo: é nelas que a criança mede a
              altura do salto, e é para isso que o laboratório existe. */}
            <FundoDoCenario cenario={mundo} w={640} h={360} chao={301} detalhe="calmo" />
            {cenarioTemChao(mundo) && (
              <>
                <rect x="24" y="24" width="592" height="276" fill={`url(#${id}-grid)`} />
                <path className="stroke-scene-ink-soft" d="M24 301H616" strokeWidth="2" />
                <path
                  className="stroke-scene-grid"
                  d="M24 313H616"
                  strokeWidth="9"
                  strokeDasharray="2 9"
                />
              </>
            )}
            {/* ⚠️ Era "OBSERVATÓRIO DE CONTATO" / "OBSERVATÓRIO DO SALTO", em caixa alta e com
          entreletra — vocabulário de adulto no alto do palco de quem tem 9 anos. O selo diz o
          que este lugar MOSTRA, na língua da criança, e sem repetir o título do bloco (que o
          professor escreve e já aparece acima). */}
            <Texto className="fill-scene-ink-soft" x={seloX} y="44" tamanho={13} fontWeight="700">
              {hitbox
                ? 'Onde a batida acontece'
                : gravidade
                  ? 'A altura do pulo'
                  : 'A altura dos saltos'}
            </Texto>
            {!hitbox && (
              <>
                {/* ⚠️⚠️ A régua mede o que CADA cena precisa (lote 5 do Raio-X): na `gravity`, até o topo
              de onde o Dino sai (600); na `impulse`, até 200, onde o salto baixo de impulso 5 não é
              mais um risco de 14 px. */}
                {marcasDaRegua.map((n) => (
                  <g key={n}>
                    <path
                      className="stroke-scene-rule"
                      d={`M${tracoDaRegua} ${floor - n * escala}h12`}
                    />
                    <Texto
                      className="fill-scene-ink-soft"
                      x={numeroDaRegua}
                      y={floor - n * escala + 4}
                      textAnchor="end"
                      tamanho={10}
                    >
                      {n}
                    </Texto>
                  </g>
                ))}
                {gravidade && semGravidadeVisto && (
                  /* ⚠️ O caminho do pulo SEM gravidade fica pontilhado (lote 5): é com ele que a criança
               compara o pulo que sobe, freia e volta. */
                  <g>
                    <path
                      className="stroke-scene-ink-soft"
                      // ⚠️ No estreito o pontilhado para embaixo do selo, que ali mora à direita da régua.
                      d={`M${DINO_X} ${floor - 8}V${palco.estreito ? 56 : 24}`}
                      strokeWidth="2"
                      strokeDasharray="2 8"
                    />
                    {/* ⚠️ No estreito, "sem gravidade", colado à esquerda do pontilhado: a frase inteira na letra
                  de 12px passava da borda esquerda. */}
                    <Texto
                      className="fill-scene-ink-soft"
                      x={palco.estreito ? DINO_X - 14 : DINO_X - 58}
                      y="84"
                      textAnchor="end"
                      tamanho={12}
                    >
                      {palco.estreito ? 'sem gravidade' : 'o pulo sem gravidade'}
                    </Texto>
                  </g>
                )}
                {/* ⚠️ A marca do ponto mais alto só com gravidade (ou depois do pouso): sem gravidade ela
              andava colada no Dino e não marcava nada. */}
                {gravidade &&
                  state.flight.peak > 0 &&
                  (state.flight.atGravity || state.flight.time === null) && (
                    <g>
                      <path
                        className="stroke-scene-b"
                        d={`M${inicioDaLinhaDoPico} ${floor - picoNaTela}H420`}
                        strokeWidth="2"
                        strokeDasharray="5 5"
                      />
                      <Texto
                        className="fill-scene-b-ink"
                        x="428"
                        y={floor - picoNaTela + 4}
                        tamanho={12}
                      >
                        {picoAcimaDoPalco ? '↑ ' : ''}
                        {Math.round(state.flight.peak)} de altura
                      </Texto>
                    </g>
                  )}
                {!gravidade && (
                  /* ⭐⭐ As DUAS marcas ficam (lote 5): a azul é o salto de antes, com o fantasma do Dino no
               topo dele, e a laranja é o salto de agora. O `jump` zerava o pico e a marca de antes
               sumia; a instrução pedia para comparar marcas que a tela nunca mostrou juntas. */
                  <>
                    {state.flight.before > 0 && (
                      <g>
                        <g className="text-scene-ink-soft">
                          <ActorFigure
                            figure={heroi}
                            x={DINO_X - 90}
                            y={floor - antesNaTela}
                            ghost
                          />
                        </g>
                        <path
                          className="stroke-scene-a"
                          d={`M74 ${floor - antesNaTela}H440`}
                          strokeWidth="3"
                          strokeDasharray="7 5"
                        />
                        <Texto
                          className="fill-scene-a"
                          x="448"
                          y={floor - antesNaTela + 5 + afastar}
                          tamanho={14}
                          fontWeight="700"
                        >
                          antes: {Math.round(state.flight.before)}
                        </Texto>
                      </g>
                    )}
                    {state.flight.peak > 0 && (
                      <g>
                        <path
                          className="stroke-scene-b"
                          d={`M74 ${floor - picoNaTela}H440`}
                          strokeWidth="3"
                          strokeDasharray="7 5"
                        />
                        <Texto
                          className="fill-scene-b-ink"
                          x="448"
                          y={floor - picoNaTela + 5 - afastar}
                          tamanho={14}
                          fontWeight="700"
                        >
                          este: {Math.round(state.flight.peak)}
                        </Texto>
                      </g>
                    )}
                  </>
                )}
                <g
                  className="text-primary"
                  style={{ cursor: onJump ? 'pointer' : undefined }}
                  role={onJump ? 'button' : undefined}
                  tabIndex={onJump ? 0 : undefined}
                  // ⚠️ "Fazer o Dino pular" (consertos do review da onda A do lote 5): "Pular com o Dino" soava
                  // como a criança pulando junto.
                  aria-label={onJump ? castText('Fazer o Dino pular', activity.cast) : undefined}
                  onClick={() => onJump?.('tap')}
                  onKeyDown={(e) => {
                    if (onJump && (e.code === 'Space' || e.code === 'Enter')) {
                      e.preventDefault()
                      if (!e.repeat) onJump('key')
                    }
                  }}
                >
                  <ActorFigure figure={heroi} x={DINO_X} y={floor - rise} />
                  {/* ⚠️ A área de toque tem 100 × 100 (consertos do review da onda A do lote 5): com 80 ela dava
                ~39px num celular de 390px, abaixo dos 44 do público infantil. */}
                  {onJump && (
                    <rect
                      x={DINO_X - 55}
                      y={floor - rise - 75}
                      width="100"
                      height="100"
                      rx="12"
                      fill="transparent"
                    />
                  )}
                </g>
                {gravidade && state.flight.gravity && (
                  /* ⭐ A gravidade VISTA (lote 5): a seta de puxão sobre o Dino, sempre que ela está ligada. */
                  <g className="text-scene-a" aria-hidden>
                    <path
                      d={`M${DINO_X + 48} ${floor - rise - 62}v34`}
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M${DINO_X + 38} ${floor - rise - 38}l10 12l10 -12`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )}
                {segueSubindo && (
                  <g className="text-scene-ink" aria-hidden data-segue-subindo="">
                    <path
                      d={`M${DINO_X + 48} ${floor - rise - 24}v-34`}
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M${DINO_X + 38} ${floor - rise - 46}l10 -12l10 12`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )}
                {foraDoPalco && (
                  /* ⚠️ Ao lado do Dino, e não em cima: o Dino parado no alto cobria o número. */
                  <Texto
                    className="fill-scene-ink"
                    x={DINO_X + 44}
                    y="44"
                    textAnchor="start"
                    tamanho={15}
                    fontWeight="700"
                  >
                    ↑ {Math.round(state.flight.y)}
                  </Texto>
                )}
                {state.flight.y > 0 && (
                  <ellipse
                    className="fill-scene-ink-soft"
                    cx={DINO_X - 10}
                    cy="302"
                    rx={Math.max(10, 28 - rise / 14)}
                    ry="4"
                    opacity=".22"
                  />
                )}
              </>
            )}
            {hitbox && (
              <>
                <g className="text-primary">
                  <ActorFigure figure={heroi} x={260} y={floor} />
                </g>
                {/* ⭐ Lote 5 do Raio-X: a MARCA de onde o cacto estava quando bateu pela primeira vez (o
              retrato da meta `contact`). Com ela à vista, "deixe o cacto parado onde bateu" tem um
              lugar para onde olhar. */}
                {batida && (
                  <g>
                    <path
                      className="stroke-scene-alert"
                      d={`M${260 + batida.distance} ${floor - 4}v14`}
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <Texto
                      className="fill-scene-alert"
                      x={260 + batida.distance}
                      y={floor + 26}
                      textAnchor="middle"
                      tamanho={12}
                      fontWeight="600"
                    >
                      onde bateu
                    </Texto>
                  </g>
                )}
                <rect
                  x={260 - state.contact.width / 2}
                  y={floor - 70}
                  width={state.contact.width}
                  height="70"
                  rx="4"
                  className={
                    contact
                      ? 'fill-scene-alert-wash stroke-scene-alert'
                      : 'fill-scene-a-wash stroke-scene-a'
                  }
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
                <g
                  onPointerDown={
                    onDistance
                      ? (event) => {
                          if (event.button !== 0) return
                          event.currentTarget.setPointerCapture(event.pointerId)
                          setDrag({ pointer: event.pointerId, distance: state.contact.distance })
                        }
                      : undefined
                  }
                  onPointerMove={(event) => {
                    if (drag?.pointer !== event.pointerId) return
                    const x = worldX(event.clientX, event.clientY)
                    if (x !== null)
                      setDrag({
                        pointer: event.pointerId,
                        distance: Math.round(Math.max(20, Math.min(260, x - 260))),
                      })
                  }}
                  onPointerUp={(event) => {
                    if (drag?.pointer === event.pointerId) {
                      onDistance?.(drag.distance)
                      setDrag(null)
                    }
                  }}
                  onPointerCancel={() => setDrag(null)}
                  onLostPointerCapture={() => setDrag(null)}
                  style={{ cursor: onDistance ? (drag ? 'grabbing' : 'grab') : undefined }}
                >
                  {drag && (
                    <rect
                      className="fill-scene-grass stroke-scene-line"
                      x={260 + distance - 28}
                      y={floor - 76}
                      width="56"
                      height="80"
                      rx="12"
                      strokeDasharray="4 3"
                    />
                  )}
                  <ActorFigure
                    figure={actorFigure(activity.cast, 'obstacle')}
                    x={260 + distance}
                    y={floor}
                  />
                  <rect
                    className="stroke-scene-bark"
                    x={260 + distance - 18}
                    y={floor - 64}
                    width="36"
                    height="64"
                    rx="3"
                    fill="transparent"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                  <rect
                    x={260 + distance - 28}
                    y={floor - 76}
                    width="56"
                    height="86"
                    fill="transparent"
                  />
                </g>
                {/* ⭐ O VÃO entre os desenhos quando BATEU (lote 5): é a batida injusta à vista, com o número. */}
                {contact && vao > 0 && (
                  <g>
                    <path
                      className="stroke-scene-alert"
                      d={`M${260 + 20} ${floor - 84}H${260 + 20 + vao}M${260 + 20} ${floor - 90}v12M${260 + 20 + vao} ${floor - 90}v12`}
                      strokeWidth="2.5"
                    />
                    <Texto
                      className="fill-scene-alert"
                      x={260 + 20 + vao / 2}
                      y={floor - 96}
                      textAnchor="middle"
                      tamanho={13}
                      fontWeight="700"
                    >
                      vão {Math.round(vao)}
                    </Texto>
                  </g>
                )}
                {/* ⚠️ A língua do JOGO ("BATEU!"), e não "as áreas se tocam": o selo, a faixa e a frase diziam
              a mesma coisa três vezes com palavras de adulto. O rodapé "Arraste o cacto…" saiu: a
              bancada já diz. */}
                <g transform="translate(210 88)">
                  <rect
                    width="220"
                    height="52"
                    rx="26"
                    className={contact ? 'fill-scene-alert-wash' : 'fill-scene-grass'}
                  />
                  <Texto
                    x="110"
                    y="34"
                    textAnchor="middle"
                    className={contact ? 'fill-scene-alert' : 'fill-scene-ink'}
                    tamanho={contact ? 22 : 17}
                    fontWeight="700"
                  >
                    {contact ? 'BATEU!' : 'Ainda não bateu'}
                  </Texto>
                </g>
                {compact && (
                  <Texto
                    className="fill-scene-ink-soft"
                    x="320"
                    y="340"
                    textAnchor="middle"
                    tamanho={13}
                  >
                    Distância {distance} · área {sceneAreaPercent(state.contact.width)}%
                  </Texto>
                )}
              </>
            )}
          </>
        )
      }}
    </SceneCanvas>
  )
}

export function ExperienceComparison({
  activity,
  trials,
  current,
}: {
  activity: SceneActivity
  trials: SceneTrial[]
  current: SceneState
}) {
  const [selected, setSelected] = useState(1)
  /**
   * ⚠️⚠️ Lado a lado só quando as duas cenas cabem sem ficar estreitas (conserto "letra no celular"). O
   * `sm:` olha a janela: no computador, com a cena na coluna de 600px, cada laboratório de 640 unidades
   * ficava com ~256px (escala 0,4) e a letra de 5px. Empilhadas, as duas têm o tamanho do palco de cima.
   */
  const raiz = useRef<HTMLDivElement>(null)
  const largura = useLarguraMedida(raiz)
  const ladoALado = (largura - VAO_DA_COMPARACAO) / 2 - 2 >= VIEW_DO_LABORATORIO.w * ESCALA_ESTREITA
  // A moldura de cada cena tem 1px de borda de cada lado.
  const larguraDeCada = (ladoALado ? (largura - VAO_DA_COMPARACAO) / 2 : largura) - 2
  const trial = trials[Math.min(selected, trials.length - 1)]
  return (
    <div ref={raiz} className="space-y-3">
      {!trials.length || !trial ? (
        <p className="py-4 text-sm text-muted-foreground">
          Guarde uma experiência para comparar no mesmo tamanho.
        </p>
      ) : (
        <>
          {trials.length > 1 && (
            <div className="flex gap-2">
              {trials.map((t, i) => (
                <button
                  key={t.label}
                  type="button"
                  aria-pressed={selected === i}
                  onClick={() => setSelected(i)}
                  className="min-h-11 rounded-xl border border-border px-3 text-sm"
                >
                  {i === 0 ? 'Anterior' : 'Mais recente'}
                </button>
              ))}
            </div>
          )}
          <div className={`grid gap-3 ${ladoALado ? 'grid-cols-2' : ''}`}>
            {[
              {
                label: 'Experiência guardada',
                state: sceneFromTrial(activity, trial),
              },
              // ⚠️ "Agora" passa pelo MESMO retrato: depois de um salto o que interessa comparar são
              // as condições daquele voo, não as que estão nos controles neste instante.
              { label: 'Agora', state: sceneFromTrial(activity, sceneTrial(current, '')) },
            ].map((item) => (
              <figure
                key={item.label}
                className="min-w-0 space-y-2"
                data-parte-da-cena={Math.round(larguraDeCada)}
              >
                <figcaption className="text-sm font-semibold">{item.label}</figcaption>
                <LarguraConhecidaDaCena.Provider value={larguraDeCada}>
                  <ExperienceScene activity={activity} state={item.state} compact />
                </LarguraConhecidaDaCena.Provider>
              </figure>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
