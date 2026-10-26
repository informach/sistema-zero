import type { SceneState } from '@sistemazero/core/learning/scene'
import { farolSvgUrl } from '@sistemazero/studio/arte'
import { ArrowDown, Footprints, Hand, KeyRound, MessageCircle, NotebookPen } from 'lucide-react'
import { useId } from 'react'
import { SceneCanvas } from './scene-canvas'

/** Coordinates belong to the renderer, not to this lesson's vocabulary. */
export function WalkPicture({ state, command = true }: { state: SceneState; command?: boolean }) {
  const id = useId(),
    w = state.walk,
    initial = 208,
    previous = w.trail.at(-2) ?? w.x,
    next = w.x + (w.arrow && command ? w.speed : 0)
  const changed = previous !== w.x,
    viewStart = Math.max(180, w.x - 65)
  const span = Math.max(120, next - initial + 20),
    overview = (position: number) => 40 + ((position - initial) / span) * 380
  const snapshots = [
    { label: 'No início', x: initial, frame: 0 },
    { label: 'Quadro anterior', x: previous, frame: Math.max(0, w.frame - 1) },
    { label: 'Agora', x: w.x, frame: w.frame },
  ]
  return (
    <div className="walk-picture">
      <div className="walk-close-label">
        Veja o passo de perto <span>A faixa abaixo guarda o início.</span>
      </div>
      <SceneCanvas
        view={{ x: viewStart, y: 105, w: 180, h: 115 }}
        mundo="farol"
        titulo="O personagem e o próximo passo"
        descricao={
          changed
            ? 'O personagem andou. A marca cinza mostra onde estava antes; o contorno indica onde ficará no próximo quadro.'
            : 'O personagem está parado. O contorno indica onde ficará no próximo quadro.'
        }
      >
        <defs>
          <pattern id={id} width="480" height="360" patternUnits="userSpaceOnUse">
            <image href={farolSvgUrl('praia-tropical')} width="480" height="360" />
          </pattern>
        </defs>
        <rect x={viewStart} y="105" width="180" height="115" fill={`url(#${id})`} />
        {initial >= viewStart - 45 && (
          <g data-walk-origin="">
            <image
              href={farolSvgUrl('aventureiro')}
              x={initial}
              y="128"
              width="64"
              height="64"
              opacity=".18"
            />
            <line
              x1={initial + 32}
              x2={initial + 32}
              y1="190"
              y2="209"
              stroke="#8a5c00"
              strokeWidth="2"
            />
          </g>
        )}
        <line
          x1={viewStart + 8}
          y1="194"
          x2={viewStart + 172}
          y2="194"
          stroke="#143d35"
          strokeWidth=".8"
          opacity=".3"
        />
        {changed && (
          <image
            href={farolSvgUrl('aventureiro')}
            x={previous}
            y="128"
            width="64"
            height="64"
            opacity=".3"
          />
        )}
        <line
          data-walk-previous={previous}
          x1={previous + 32}
          x2={previous + 32}
          y1="193"
          y2="201"
          stroke="#496879"
          strokeWidth="1.8"
        />
        <rect
          data-walk-next={next}
          x={next + 16}
          y="135"
          width="31"
          height="58"
          rx="7"
          fill="none"
          stroke="#5232a2"
          strokeWidth="1.3"
          strokeDasharray="2 2"
        />
        <image
          data-walk-hero={w.x}
          href={farolSvgUrl('aventureiro')}
          x={w.x}
          y="128"
          width="64"
          height="64"
        />
        <line
          x1={w.x + 32}
          x2={w.x + 32}
          y1="194"
          y2="205"
          stroke="var(--color-primary)"
          strokeWidth="2"
        />
      </SceneCanvas>
      <div className="walk-legend">
        <span data-tone="start">● Início</span>
        <span data-tone="previous">● Lugar anterior</span>
        <span data-tone="current">● Agora</span>
        <span data-tone="next">┄ Próximo quadro</span>
      </div>
      <div className="walk-frame-result">
        <strong>
          {w.frame === 0
            ? 'Avance quantos quadros quiser.'
            : changed
              ? 'Ele andou mais um pouco. Compare com o lugar inicial.'
              : 'Passou um quadro e ele ficou no mesmo lugar.'}
        </strong>
      </div>
      <div className="walk-overview">
        <strong>Percurso desde o início</strong>
        <svg
          viewBox="0 0 480 105"
          role="img"
          aria-label="O início permanece à esquerda; a marca azul mostra onde o personagem chegou."
        >
          <line x1="40" x2="440" y1="53" y2="53" stroke="#cad4df" strokeWidth="5" />
          <line
            x1="40"
            x2={overview(w.x)}
            y1="53"
            y2="53"
            stroke="var(--color-primary)"
            strokeWidth="5"
          />
          <rect data-start-anchor="208" x="38" y="30" width="4" height="40" fill="#8a5c00" />
          <text x="40" y="23" textAnchor="middle" fontSize="16" fontWeight="800" fill="#805500">
            Início
          </text>
          <line
            x1={overview(previous)}
            x2={overview(previous)}
            y1="34"
            y2="62"
            stroke="#496879"
            strokeWidth="3"
          />
          <circle cx={overview(w.x)} cy="53" r="8" fill="var(--color-primary)" />
          <text
            x={overview(w.x)}
            y="93"
            textAnchor="middle"
            fontSize="16"
            fontWeight="800"
            fill="var(--color-foreground)"
          >
            Agora
          </text>
          <circle
            cx={overview(next)}
            cy="53"
            r="12"
            fill="none"
            stroke="#5232a2"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        </svg>
      </div>
      <div
        className="walk-film"
        role="group"
        aria-label="Compare o início, o quadro anterior e o atual"
      >
        {snapshots.map((s, i) => (
          <div className="walk-film-frame" key={s.label} data-current={i === 2}>
            <span>
              {s.label}
              <small>Quadro {s.frame}</small>
            </span>
            <svg viewBox={`${i === 0 ? initial - 28 : viewStart} 120 180 83`} aria-hidden="true">
              <line
                x1={initial + 32}
                x2={initial + 32}
                y1="121"
                y2="191"
                stroke="#8a5c00"
                strokeDasharray="3 3"
              />
              <image href={farolSvgUrl('aventureiro')} x={s.x} y="121" width="64" height="64" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MovementRule({
  held,
  frame,
  command,
  boundary = false,
  limited = false,
}: {
  held: boolean
  frame: number
  command: boolean
  boundary?: boolean
  limited?: boolean
}) {
  return (
    <figure className="sz-scene-regra movement-rule" data-held={held}>
      <figcaption className="sz-scene-regra-titulo">Regra do jogo</figcaption>
      <div className="movement-event">
        A cada quadro do jogo{' '}
        <span key={frame} className={frame ? 'frame-pulse' : ''}>
          {frame ? '↻' : '○'}
        </span>
      </div>
      {command ? (
        <div className="movement-command" data-held={held}>
          <Footprints size={21} />
          <span>
            Mover sprite <b>personagem</b> em 4 direções, com setas, velocidade 3
          </span>
        </div>
      ) : (
        <div className="movement-empty">Ainda não há um comando para mover o personagem.</div>
      )}
      {boundary &&
        (limited ? (
          <div className="movement-limit" data-on="true">
            ✓ Manter o personagem dentro da tela <small>Bloco na regra</small>
          </div>
        ) : (
          <p className="sz-discovery-small">A regra ainda não tem o bloco de limite.</p>
        ))}
      <p className="sz-discovery-small">
        {command
          ? 'Este bloco consulta as teclas a cada quadro. Apertar ou soltar uma tecla não retira o bloco.'
          : 'Apertar uma tecla não coloca um comando aqui.'}
      </p>
    </figure>
  )
}

export function EdgeComparison({ result, correct }: { result: boolean; correct: boolean }) {
  return (
    <div className="edge-comparison">
      <p>Veja a borda de pertinho</p>
      <div className="edge-zoom" data-out={result && !correct}>
        <span className="edge-inside">Dentro da tela</span>
        <div className="edge-hero">
          <img src={farolSvgUrl('aventureiro')} alt="Personagem junto à borda" />
        </div>
        <div className="edge-line" />
        <span className="edge-outside">Fora</span>
      </div>
      <strong>
        {!result
          ? 'O personagem começa junto à borda.'
          : correct
            ? 'Moveu → o limite trouxe de volta. Ficou dentro.'
            : 'Conferiu → moveu depois. Passou da borda.'}
      </strong>
    </div>
  )
}

export function OrderRule({ correct }: { correct: boolean }) {
  const actions = correct
    ? ['Mover o personagem', 'Manter dentro da tela']
    : ['Manter dentro da tela', 'Mover o personagem']
  return (
    <figure className="sz-scene-regra order-rule">
      <figcaption className="sz-scene-regra-titulo">A ordem que você escolheu</figcaption>
      <div className="movement-event">A cada quadro do jogo</div>
      {actions.map((text, i) => (
        <div key={text}>
          <div className="order-action">
            <b>{i + 1}</b>
            {text}
          </div>
          {i === 0 && <ArrowDown size={18} />}
        </div>
      ))}
    </figure>
  )
}

export function MemoryRule({
  remember,
  collected,
  saved,
}: {
  remember: boolean
  collected: boolean
  saved: boolean
}) {
  const touched = collected
  return (
    <figure className="sz-scene-regra memory-rule">
      <figcaption className="sz-scene-regra-titulo">O que o encontro faz</figcaption>
      <div className="movement-event">
        <KeyRound size={17} /> Encostar na chave
      </div>
      <div className="memory-actions">
        <div data-lit={touched}>
          <KeyRound size={20} />
          <span>Retirar a chave</span>
        </div>
        {remember ? (
          <div data-lit={saved}>
            <NotebookPen size={20} />
            <span>
              Guardar a coleta<small>Ação na regra</small>
            </span>
          </div>
        ) : (
          <div data-off="true">
            <NotebookPen size={20} />
            <span>Sem ação de guardar</span>
          </div>
        )}
        <div data-lit={touched}>
          <MessageCircle size={20} />
          <span>Mostrar o aviso</span>
        </div>
      </div>
    </figure>
  )
}
export function DoorRule({ checked }: { checked: boolean | null }) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">A regra da porta</figcaption>
      <div className="movement-event">
        <Hand size={17} /> Testar a porta
      </div>
      <div className="door-question">
        <NotebookPen size={20} />
        <strong>temChave é verdadeiro?</strong>
      </div>
      <div className="door-forks">
        <div data-selected={checked === true} data-muted={checked === false}>
          <span>Sim · então</span>
          <img src={farolSvgUrl('farol-listrado-aceso')} alt="" />
          <strong>Acender o farol</strong>
          <small>
            {checked === true
              ? '✓ escolhido'
              : checked === false
                ? 'Não foi usado'
                : 'Aguardando teste'}
          </small>
        </div>
        <div data-selected={checked === false} data-muted={checked === true}>
          <span>Não · senão</span>
          <MessageCircle size={34} />
          <strong>Avisar: falta a chave</strong>
          <small>
            {checked === false
              ? '✓ escolhido'
              : checked === true
                ? 'Não foi usado'
                : 'Aguardando teste'}
          </small>
        </div>
      </div>
    </figure>
  )
}
