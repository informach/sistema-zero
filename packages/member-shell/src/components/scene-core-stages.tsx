'use client'

import type { SceneCast, SceneState } from '@sistemazero/core/learning/scene'
import { castText, STAGE_TARGET } from '@sistemazero/core/learning/scene'
import { useId } from 'react'
import { CactusFigure, DinoFigure, TreeFigure } from './exploration-stage'

/**
 * Os palcos das onze cenas do núcleo do Iniciante 2D (15/09/2026).
 *
 * Elas não cabem no palco compartilhado (chão, árvores, pista do Corre Dino) porque cada uma
 * mostra uma coisa que aquele mundo não tem: a régua do quanto se andou num quadro, duas
 * raquetes lado a lado, uma caixa com um número dentro, o mundo maior que a tela, o mapa
 * escrito com letras. Cada uma tem a própria moldura e o próprio enquadramento.
 *
 * ⚠️ O par de comparação continua FIXO nas duas cores de sempre (A azul `scene-a`, B laranja
 * `scene-b`): elas dizem QUAL medida é qual, e não são decoração.
 */

const VIEW = { w: 560, h: 300 } as const

/**
 * ⚠️⚠️ O ELENCO veste o que o PALCO escreve à mão: o `<title>` e a `<desc>` do SVG, os rótulos
 * e o rodapé. É o invariante do full review de 14/09/2026, e ele vale para todo palco novo — a
 * criança de uma turma de nave lia "nave" na faixa e ouvia "o Dino" do leitor de tela, no mesmo
 * desenho. O `Moldura` aplica sozinho; texto solto dentro do SVG precisa do `castText` à mão.
 */
function Moldura({
  children,
  titulo,
  descricao,
  rodape,
  cast,
}: {
  children: React.ReactNode
  titulo: string
  descricao: string
  rodape?: string
  cast?: SceneCast
}) {
  const id = useId()
  return (
    <div className="overflow-hidden rounded-2xl border border-primary/15 bg-scene-ground">
      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        className="block w-full"
        role="img"
        aria-labelledby={`${id}-t ${id}-d`}
      >
        <title id={`${id}-t`}>{castText(titulo, cast)}</title>
        <desc id={`${id}-d`}>{castText(descricao, cast)}</desc>
        {children}
      </svg>
      {rodape && (
        <p className="px-3 pb-2 text-center text-xs text-scene-ink-soft">
          {castText(rodape, cast)}
        </p>
      )}
    </div>
  )
}

/** A velocidade: o quanto ele anda em CADA quadro, com o fantasma de onde estava. */
export function VelocityStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { x, y, fromX, fromY, vx, vy } = state.drive
  const px = 40 + x
  const py = 30 + y * 0.8
  const fx = 40 + fromX
  const fy = 30 + fromY * 0.8
  return (
    <Moldura
      cast={cast}
      titulo="A pista, com o Dino e o rastro do último quadro"
      descricao={`Velocidade ${vx} para o lado e ${vy} para baixo. O Dino está em x ${Math.round(x)}, y ${Math.round(y)}, e no quadro anterior estava em ${Math.round(fromX)}, ${Math.round(fromY)}.`}
      rodape="A linha mostra o quanto ele andou no último passo do relógio."
    >
      <path className="fill-scene-grass" d={`M0 250H${VIEW.w}V${VIEW.h}H0Z`} />
      <path className="stroke-scene-line" d={`M0 250H${VIEW.w}`} strokeWidth="2" />
      {[0, 120, 240, 360, 480].map((v) => (
        <g key={v}>
          <path className="stroke-scene-rule" d={`M${40 + v} 250v8`} strokeWidth="1.5" />
          <text
            className="fill-scene-ink-soft"
            x={40 + v}
            y={274}
            textAnchor="middle"
            fontSize="11"
          >
            {v}
          </text>
        </g>
      ))}
      {(fromX !== x || fromY !== y) && (
        <>
          <g className="text-scene-ink-soft">
            <DinoFigure x={fx} y={fy + 26} ghost />
          </g>
          {/* ⚠️ A linha do passo vai do fantasma até ele, nos DOIS eixos: só horizontal, um
              movimento vertical não deixava rastro nenhum e a cena parecia travada. */}
          <path
            className="stroke-scene-a"
            d={`M${fx} ${fy}L${px} ${py}`}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      )}
      <g className="text-primary">
        <DinoFigure x={px} y={py + 26} />
      </g>
    </Moldura>
  )
}

/** As duas raquetes: a do acontecimento e a da pergunta contínua. */
export function HoldVsPressStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { pressX, holdX, holding, presses } = state.input
  const faixa = (y: number, x: number, rotulo: string, cor: string) => (
    <g>
      <path className="stroke-scene-line" d={`M30 ${y + 30}H530`} strokeWidth="2" />
      <text className="fill-scene-ink-soft" x={30} y={y - 6} fontSize="12" fontWeight="600">
        {rotulo}
      </text>
      <rect className={cor} x={30 + x} y={y} width="18" height="30" rx="4" />
    </g>
  )
  return (
    <Moldura
      cast={cast}
      titulo="Duas raquetes, dois jeitos de ligar a tecla"
      descricao={`A de cima andou ${presses} passo(s) por aperto; a de baixo está em ${Math.round(holdX)} e a tecla está ${holding ? 'segurada' : 'solta'}.`}
      rodape="Em cima, o acontecimento. Embaixo, a pergunta que vale enquanto a tecla estiver apertada."
    >
      {faixa(60, pressX, 'Quando apertar a tecla', 'fill-scene-a')}
      {faixa(180, holdX, 'Enquanto a tecla estiver apertada', 'fill-scene-b')}
      {holding && (
        <text
          className="fill-scene-alert"
          x={530}
          y={174}
          textAnchor="end"
          fontSize="12"
          fontWeight="700"
        >
          segurando
        </text>
      )}
    </Moldura>
  )
}

/** A caixa com um número dentro, e a tela do jogo ao lado. */
export function VariableStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { value, shown, changes } = state.box
  return (
    <Moldura
      cast={cast}
      titulo="A caixa do placar e a tela do jogo"
      descricao={`A caixa guarda ${value}. A tela ${shown ? `mostra ${value}` : 'não mostra nada'}.`}
      rodape="A caixa é o que o jogo GUARDA. A tela é o que ele MOSTRA."
    >
      <g>
        <rect
          className="fill-scene-grass stroke-scene-a"
          x={40}
          y={70}
          width="180"
          height="140"
          rx="16"
          strokeWidth="3"
        />
        <text className="fill-scene-ink-soft" x={130} y={100} textAnchor="middle" fontSize="13">
          pontos
        </text>
        <text
          className="fill-scene-ink"
          x={130}
          y={165}
          textAnchor="middle"
          fontSize="58"
          fontWeight="700"
        >
          {value}
        </text>
        <text className="fill-scene-ink-soft" x={130} y={196} textAnchor="middle" fontSize="11">
          {changes} mudança(s)
        </text>
      </g>
      <path className="stroke-scene-rule" d="M250 140h50" strokeWidth="2" strokeDasharray="5 4" />
      <g>
        <rect
          className="fill-scene-sky stroke-scene-line"
          x={320}
          y={70}
          width="200"
          height="140"
          rx="10"
          strokeWidth="2"
        />
        <text className="fill-scene-ink-soft" x={420} y={60} textAnchor="middle" fontSize="12">
          a tela do jogo
        </text>
        {shown ? (
          <text className="fill-scene-b" x={340} y={105} fontSize="24" fontWeight="700">
            {value}
          </text>
        ) : (
          <text className="fill-scene-ink-soft" x={420} y={145} textAnchor="middle" fontSize="13">
            nada na tela
          </text>
        )}
        <g className="text-primary">
          <DinoFigure x={420} y={195} />
        </g>
      </g>
    </Moldura>
  )
}

/** A torre e os três invasores: quem já foi olhado, e quem foi escolhido. */
export function GroupLoopStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { distances, looked, chosen, auto } = state.hunt
  return (
    <Moldura
      cast={cast}
      titulo="A torre e os três invasores do grupo"
      descricao={`Distâncias ${distances.join(', ')}. Olhados: ${looked.length} de 3. Escolhido: ${chosen || 'nenhum'}.`}
      rodape="A torre só sabe quem está mais perto depois de olhar todos."
    >
      <path className="fill-scene-grass" d={`M0 240H${VIEW.w}V${VIEW.h}H0Z`} />
      <g>
        <path className="fill-scene-bark" d="M50 240V150h40v90Z" />
        <path className="fill-scene-leaf-dark" d="M40 150h60l-30-30Z" />
      </g>
      {distances.map((d, i) => {
        const id = i + 1
        const x = 110 + d * 1.6
        return (
          <g key={id}>
            {(looked.includes(id) || auto) && (
              <path
                className="stroke-scene-a"
                d={`M90 200H${x}`}
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            )}
            <CactusFigure x={x} y={240} />
            <text
              className={chosen === id ? 'fill-scene-alert' : 'fill-scene-ink-soft'}
              x={x}
              y={262}
              textAnchor="middle"
              fontSize="12"
              fontWeight={chosen === id ? 700 : 400}
            >
              {d}
            </text>
            {chosen === id && (
              <circle
                className="stroke-scene-alert"
                cx={x}
                cy={215}
                r="26"
                fill="none"
                strokeWidth="3"
              />
            )}
          </g>
        )
      })}
    </Moldura>
  )
}

/** A ficha do tipo, e a fila que nasceu dela. */
export function EnemyTypeStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { speed, life, born } = state.blueprint
  return (
    <Moldura
      cast={cast}
      titulo="A ficha do inimigo e os que nasceram dela"
      descricao={`Ficha com velocidade ${speed} e vida ${life}; ${born} inimigo(s) nascido(s).`}
      rodape="Todos leem a MESMA ficha: mudar um número muda todos."
    >
      <g>
        <rect
          className="fill-scene-grass stroke-scene-a"
          x={30}
          y={60}
          width="170"
          height="130"
          rx="14"
          strokeWidth="3"
        />
        <text
          className="fill-scene-ink-soft"
          x={115}
          y={86}
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
        >
          a ficha do inimigo
        </text>
        <text className="fill-scene-ink" x={50} y={125} fontSize="15">
          velocidade
        </text>
        <text
          className="fill-scene-a"
          x={180}
          y={125}
          textAnchor="end"
          fontSize="20"
          fontWeight="700"
        >
          {speed}
        </text>
        <text className="fill-scene-ink" x={50} y={165} fontSize="15">
          vida
        </text>
        <text
          className="fill-scene-b"
          x={180}
          y={165}
          textAnchor="end"
          fontSize="20"
          fontWeight="700"
        >
          {life}
        </text>
      </g>
      <path className="fill-scene-grass" d={`M0 240H${VIEW.w}V${VIEW.h}H0Z`} />
      {Array.from({ length: Math.min(born, 6) }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: são N iguais em fila, sem identidade.
        <g key={`inimigo-${i + 1}`}>
          <CactusFigure x={250 + i * 52} y={240} />
          <text className="fill-scene-a" x={250 + i * 52} y={262} textAnchor="middle" fontSize="11">
            {speed}
          </text>
        </g>
      ))}
      {born === 0 && (
        <text className="fill-scene-ink-soft" x={380} y={160} textAnchor="middle" fontSize="13">
          ninguém nasceu ainda
        </text>
      )}
    </Moldura>
  )
}

/** O mundo inteiro em miniatura, com a janela da tela andando por cima. */
export function CameraStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { heroX, follow } = state.view
  const escala = 500 / 1200
  const janelaX = follow ? Math.max(0, Math.min(1200 - STAGE_TARGET.width, heroX - 240)) : 0
  const dentro = heroX >= janelaX && heroX <= janelaX + STAGE_TARGET.width
  return (
    <Moldura
      cast={cast}
      titulo="O mundo do jogo e a janela da tela"
      descricao={`O herói está em ${heroX} de um mundo de 1200. A janela mostra de ${Math.round(janelaX)} a ${Math.round(janelaX + STAGE_TARGET.width)}.`}
      rodape="A faixa de baixo é o mundo inteiro. O retângulo é o pedaço que cabe na tela."
    >
      <text className="fill-scene-ink-soft" x={30} y={40} fontSize="12" fontWeight="600">
        o que a criança vê na tela
      </text>
      <rect
        className="fill-scene-sky stroke-scene-line"
        x={30}
        y={50}
        width="500"
        height="110"
        rx="10"
        strokeWidth="2"
      />
      {dentro ? (
        <g className="text-primary">
          <DinoFigure x={30 + (heroX - janelaX) * (500 / STAGE_TARGET.width)} y={150} />
        </g>
      ) : (
        <text
          className="fill-scene-alert"
          x={280}
          y={110}
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
        >
          o herói não está na tela
        </text>
      )}
      <text className="fill-scene-ink-soft" x={30} y={205} fontSize="12" fontWeight="600">
        o mundo inteiro
      </text>
      <rect
        className="fill-scene-grass stroke-scene-line"
        x={30}
        y={215}
        width="500"
        height="50"
        rx="8"
        strokeWidth="2"
      />
      <rect
        className="stroke-scene-b"
        x={30 + janelaX * escala}
        y={215}
        width={STAGE_TARGET.width * escala}
        height="50"
        fill="none"
        strokeWidth="3"
        strokeDasharray="6 4"
      />
      <circle className="fill-scene-a" cx={30 + heroX * escala} cy={240} r="7" />
    </Moldura>
  )
}

/** As duas perguntas sobre o contato, com a vida caindo de um jeito ou de outro. */
export function ContactStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { distance, mode, damage } = state.hit
  const encostando = distance <= 40
  return (
    <Moldura
      cast={cast}
      titulo="O Dino, o cacto e a vida"
      descricao={`Distância ${distance}. A pergunta é ${mode === 'ask' ? 'contínua' : 'por acontecimento'}. Vida perdida: ${damage}.`}
      rodape={
        mode === 'ask'
          ? 'Está encostando? — o jogo pergunta em todo quadro.'
          : 'Acabou de encostar — o jogo espera o instante da batida.'
      }
    >
      <path className="fill-scene-grass" d={`M0 220H${VIEW.w}V${VIEW.h}H0Z`} />
      <g className="text-primary">
        <DinoFigure x={150} y={220} />
      </g>
      <CactusFigure x={190 + distance} y={220} />
      {encostando && (
        <circle
          className="fill-scene-alert-wash stroke-scene-alert"
          cx={175}
          cy={190}
          r="30"
          strokeWidth="3"
        />
      )}
      <g>
        <text className="fill-scene-ink-soft" x={30} y={50} fontSize="12" fontWeight="600">
          vida
        </text>
        {Array.from({ length: 6 }, (_, i) => (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: são seis quadradinhos fixos de vida.
            key={`vida-${i + 1}`}
            className={i < 6 - damage ? 'fill-scene-a' : 'fill-scene-grid'}
            x={30 + i * 26}
            y={60}
            width="20"
            height="20"
            rx="4"
          />
        ))}
      </g>
      <text
        className="fill-scene-ink"
        x={530}
        y={74}
        textAnchor="end"
        fontSize="13"
        fontWeight="600"
      >
        {mode === 'ask' ? 'está encostando?' : 'acabou de encostar'}
      </text>
    </Moldura>
  )
}

/** A arma, a recarga e os tiros que saíram. */
export function CooldownStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { seconds, ready, shots, refused } = state.weapon
  const cheio = seconds > 0 ? 1 - ready / seconds : 1
  return (
    <Moldura
      cast={cast}
      titulo="A arma, a barra de recarga e os tiros"
      descricao={`Recarga de ${seconds}s. ${shots} tiro(s) e ${refused} pedido(s) recusado(s).`}
      rodape="A barra é o relógio de dentro da arma: enquanto ela não enche, o pedido não vira tiro."
    >
      <g className="text-primary">
        <DinoFigure x={70} y={180} />
      </g>
      {Array.from({ length: Math.min(shots, 8) }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: são N tiros iguais em fila.
        <circle key={`tiro-${i + 1}`} className="fill-scene-b" cx={130 + i * 50} cy={150} r="9" />
      ))}
      <g>
        <text className="fill-scene-ink-soft" x={30} y={230} fontSize="12" fontWeight="600">
          recarga
        </text>
        <rect className="fill-scene-grid" x={30} y={240} width="500" height="18" rx="9" />
        <rect className="fill-scene-a" x={30} y={240} width={500 * cheio} height="18" rx="9" />
      </g>
      {refused > 0 && (
        <text
          className="fill-scene-alert"
          x={530}
          y={230}
          textAnchor="end"
          fontSize="12"
          fontWeight="700"
        >
          {refused} pedido(s) na espera
        </text>
      )}
    </Moldura>
  )
}

/** A seta do atirador até o alvo, e o tiro. */
export function AimStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { targetX, targetY, chasing, shotX, shotY } = state.sight
  const ox = 60
  const oy = 150
  const tx = 40 + targetX
  const ty = 30 + targetY * 0.8
  return (
    <Moldura
      cast={cast}
      titulo="O atirador, a seta e o alvo"
      descricao={`O alvo está em ${targetX}, ${targetY}. A mira está ${chasing ? 'ligada' : 'desligada'}.`}
      rodape="A seta é a direção: ela sai do atirador e termina no alvo."
    >
      <defs>
        <marker id="ponta" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path className="fill-scene-a" d="M0 0L8 4L0 8Z" />
        </marker>
      </defs>
      <path
        className="stroke-scene-a"
        d={`M${ox} ${oy}L${tx} ${ty}`}
        strokeWidth="3"
        markerEnd="url(#ponta)"
      />
      {!chasing && (
        <path
          className="stroke-scene-ink-soft"
          d={`M${ox} ${oy}H${VIEW.w - 30}`}
          strokeWidth="2"
          strokeDasharray="6 5"
        />
      )}
      <g className="text-primary">
        <DinoFigure x={ox} y={oy + 26} />
      </g>
      <circle className="fill-scene-b" cx={tx} cy={ty} r="14" />
      <circle className="fill-scene-ground" cx={tx} cy={ty} r="6" />
      {chasing && (shotX !== 0 || shotY !== 0) && (
        <circle className="fill-scene-alert" cx={40 + shotX} cy={30 + shotY * 0.8} r="7" />
      )}
    </Moldura>
  )
}

/** Os dois caminhos lado a lado: o reto e a diagonal. */
export function DiagonalStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { dx, dy, even, distance, best } = state.walkPad
  const seta = (x: number, y: number, ligada: boolean, rotacao: number) => (
    <g transform={`translate(${x} ${y}) rotate(${rotacao})`}>
      <rect
        className={ligada ? 'fill-scene-a' : 'fill-scene-grid'}
        x={-16}
        y={-16}
        width="32"
        height="32"
        rx="6"
      />
      <path className="fill-scene-ground" d="M0 -8L7 4H-7Z" />
    </g>
  )
  return (
    <Moldura
      cast={cast}
      titulo="As setas e o quanto ele andou"
      descricao={`Setas ${dx}, ${dy}. Andou ${distance} no último passo; o maior passo foi ${best}.`}
      rodape="Cada seta dá um passo. Duas setas ao mesmo tempo dão dois — e é isso que a correção acerta."
    >
      {seta(120, 90, dy === -1, 0)}
      {seta(120, 170, dy === 1, 180)}
      {seta(70, 130, dx === -1, 270)}
      {seta(170, 130, dx === 1, 90)}
      <text className="fill-scene-ink-soft" x={120} y={225} textAnchor="middle" fontSize="12">
        as setas
      </text>
      <g>
        <text className="fill-scene-ink-soft" x={280} y={70} fontSize="12" fontWeight="600">
          o passo deste quadro
        </text>
        <rect className="fill-scene-grid" x={280} y={82} width="240" height="22" rx="11" />
        <rect
          className="fill-scene-b"
          x={280}
          y={82}
          width={Math.min(240, distance * 2.4)}
          height="22"
          rx="11"
        />
        <text className="fill-scene-ink" x={280} y={130} fontSize="20" fontWeight="700">
          {distance}
        </text>
        <text className="fill-scene-ink-soft" x={280} y={165} fontSize="13">
          maior passo até agora: {best}
        </text>
        <text
          className={even ? 'fill-scene-a' : 'fill-scene-alert'}
          x={280}
          y={200}
          fontSize="13"
          fontWeight="600"
        >
          {even ? 'correção ligada' : 'sem correção'}
        </text>
      </g>
    </Moldura>
  )
}

/** O mapa escrito em letras, e o desenho que nasce dele. */
export function TilemapStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { rows } = state.grid
  const casa = 34
  return (
    <Moldura
      cast={cast}
      titulo="O mapa escrito com letras e o desenho que nasce dele"
      descricao={`Seis linhas de dez casas. A linha do meio está escrita ${rows[3] ?? ''}.`}
      rodape='"." é vazio, "#" é bloco e "o" é moeda. O desenho vem das letras.'
    >
      <text className="fill-scene-ink-soft" x={30} y={30} fontSize="12" fontWeight="600">
        o texto
      </text>
      {rows.map((linha, i) => (
        <text
          // A linha é identificada pela POSIÇÃO no mapa, que é o que ela é.
          // biome-ignore lint/suspicious/noArrayIndexKey: o mapa tem seis linhas fixas.
          key={`linha-${i}`}
          className="fill-scene-ink"
          x={30}
          y={60 + i * 26}
          fontSize="19"
          fontFamily="ui-monospace, monospace"
          letterSpacing="4"
        >
          {linha}
        </text>
      ))}
      <text className="fill-scene-ink-soft" x={230} y={30} fontSize="12" fontWeight="600">
        o desenho
      </text>
      {rows.map((linha, i) =>
        [...linha].map((tile, j) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a grade é fixa, 6 por 10.
          <g key={`casa-${i}-${j}`}>
            {tile === '#' && (
              <rect
                className="fill-scene-bark"
                x={230 + j * casa}
                y={40 + i * casa}
                width={casa - 2}
                height={casa - 2}
                rx="3"
              />
            )}
            {tile === 'o' && (
              <circle
                className="fill-scene-b"
                cx={230 + j * casa + casa / 2 - 1}
                cy={40 + i * casa + casa / 2 - 1}
                r={casa / 4}
              />
            )}
            {tile === '.' && (
              <rect
                className="fill-scene-grid"
                x={230 + j * casa + casa / 2 - 2}
                y={40 + i * casa + casa / 2 - 2}
                width="3"
                height="3"
              />
            )}
          </g>
        )),
      )}
    </Moldura>
  )
}

/** Uma árvore para o palco não ficar vazio quando a cena pede um mundo. */
export const CenarioSimples = TreeFigure
