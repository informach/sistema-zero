import { FORMA_DA_PEGADA, type TipoDePegada } from '../sistemas/pegadas'

/**
 * O desenho da pegada de cada bicho do Bosque no diário, com as mesmas elipses do rastro no chão
 * (`FORMA_DA_PEGADA`), na cor de terra.
 */
export function Pegada({ bicho, titulo }: { bicho: TipoDePegada; titulo: string }) {
  return (
    <svg viewBox="0 0 64 64" width="56" height="56" role="img" aria-label={titulo} fill="#7a5232">
      {FORMA_DA_PEGADA[bicho].map((e) => (
        <ellipse
          key={`${e.x}-${e.y}`}
          cx={e.x}
          cy={e.y}
          rx={e.rx}
          ry={e.ry}
          transform={e.giro ? `rotate(${e.giro} ${e.x} ${e.y})` : undefined}
        />
      ))}
    </svg>
  )
}
