import type { SceneAction, SceneState } from '@sistemazero/core/learning/scene'
import { jardimSpriteRect, jardimSvgUrl } from '@sistemazero/studio/arte'
import { SCENE_VIEW, SceneCanvas } from './scene-canvas'
export function TwoHidingPlaces({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch?: (action: SceneAction) => void
}) {
  const found = state.match.gardenFound ?? []
  const onTap = (id: number) => dispatch?.({ type: 'touch-hiding-place', id: id as 0 | 1 })
  const pairs = [
    { animal: 'coelho', cover: 'arbusto', x: 175 },
    { animal: 'raposa', cover: 'pedras', x: 385 },
  ] as const
  return (
    <SceneCanvas
      view={SCENE_VIEW}
      mundo="jardim"
      titulo="Dois esconderijos, a mesma regra"
      descricao="Toque em um esconderijo e acompanhe escolhido."
      overlay={
        <div className="absolute inset-x-0 top-0" style={{ aspectRatio: '560 / 300' }}>
          {pairs.map((p, id) => {
            const box = jardimSpriteRect(p.cover, p.x, 251)
            return (
              <button
                type="button"
                disabled={!dispatch}
                key={p.cover}
                aria-label={
                  found.includes(id)
                    ? `Tocar de novo no lugar de ${p.animal}`
                    : `Tocar ${id ? 'nas pedras' : 'no arbusto'}`
                }
                className="absolute cursor-pointer rounded-[50%] focus-visible:outline-4 focus-visible:outline-primary"
                style={{
                  left: (box.x / 560) * 100 + '%',
                  top: (box.y / 300) * 100 + '%',
                  width: (box.w / 560) * 100 + '%',
                  height: (box.h / 300) * 100 + '%',
                }}
                onClick={() => onTap(id)}
              />
            )
          })}
        </div>
      }
    >
      <image
        data-fundo="jardim"
        href={jardimSvgUrl('jardim', { cobrir: true })}
        width="560"
        height="300"
        preserveAspectRatio="xMidYMid slice"
      />
      {pairs.map((p, id) => {
        const a = jardimSpriteRect(p.animal, p.x, 238),
          b = jardimSpriteRect(p.cover, p.x, 251)
        return (
          <g key={p.cover}>
            <image href={jardimSvgUrl(p.animal)} x={a.x} y={a.y} width={a.w} height={a.h} />
            {!found.includes(id) && (
              <image href={jardimSvgUrl(p.cover)} x={b.x} y={b.y} width={b.w} height={b.h} />
            )}
          </g>
        )
      })}
    </SceneCanvas>
  )
}
