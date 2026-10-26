import type { LevelState } from '@/lib/course-levels'

interface Stop {
  label: string
  state: LevelState
}

const STATE_WORDS: Record<LevelState, string> = {
  done: 'concluído',
  current: 'em andamento',
  upcoming: 'a seguir',
}

/**
 * O caminho da trilha no cartão de Cursos (direção de arte de 18/10/2026): uma parada por nível que
 * TEM curso (nunca promete nível futuro), verde quando concluído, na cor de ação quando é o atual.
 * Desenho em `viewBox` fixo; as cores são os tokens da paleta, que seguem a cor da pessoa. ⚠️ Sem
 * texto dentro do desenho: escalado, ele ficava abaixo da menor letra (15 px); os nomes dos níveis estão nos
 * chips do cartão e na descrição do `aria-label`.
 */
export function TrackPath({ stops }: { stops: Stop[] }) {
  const points = stops.map((_, index) => {
    const t = stops.length === 1 ? 0 : index / (stops.length - 1)
    return { x: 70 + t * 400, y: 250 - t * 170 }
  })
  const curve = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const mid = (from.x + to.x) / 2
    return `C ${mid} ${from.y}, ${mid} ${to.y}, ${to.x} ${to.y}`
  }
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) return null
  const full = [
    `M ${first.x} ${first.y}`,
    ...points.slice(1).map((point, index) => curve(points[index] ?? first, point)),
    curve(last, { x: 590, y: 40 }),
  ].join(' ')
  // O trecho já andado: até a parada atual, ou o caminho inteiro quando a trilha está feita.
  const currentIndex = stops.findIndex((stop) => stop.state === 'current')
  const reached = stops.every((stop) => stop.state === 'done')
    ? full
    : currentIndex > 0
      ? [
          `M ${first.x} ${first.y}`,
          ...points
            .slice(1, currentIndex + 1)
            .map((point, index) => curve(points[index] ?? first, point)),
        ].join(' ')
      : null
  const description = `Caminho da trilha com ${stops.length} ${stops.length === 1 ? 'parada' : 'paradas'}: ${stops
    .map((stop) => `${stop.label}, ${STATE_WORDS[stop.state]}`)
    .join('; ')}`

  return (
    <svg
      viewBox="0 0 600 320"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={description}
      className="absolute inset-0 block h-full w-full"
    >
      <rect width="600" height="320" className="fill-(--topo)" />
      <path
        d={full}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        className="stroke-(--topo-borda)"
      />
      {reached ? (
        <path
          d={reached}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          className="stroke-(--sz-community-action-light)"
        />
      ) : null}
      {stops.map((stop, index) => {
        const point = points[index] ?? first
        return (
          <g key={stop.label}>
            {stop.state === 'done' ? (
              <>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="26"
                  strokeWidth="3"
                  className="fill-(--pen-sucesso) stroke-white"
                />
                <path
                  d={`M ${point.x - 11} ${point.y} l 8 8 l 15 -16`}
                  fill="none"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="stroke-white"
                />
              </>
            ) : stop.state === 'current' ? (
              <>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="26"
                  strokeWidth="3"
                  className="fill-primary stroke-white"
                />
                <circle cx={point.x} cy={point.y} r="8" className="fill-white" />
              </>
            ) : (
              <circle cx={point.x} cy={point.y} r="20" className="fill-(--topo-borda)" />
            )}
          </g>
        )
      })}
    </svg>
  )
}
