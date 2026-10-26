import { JARDIM_PARES, jardimSpriteRect, jardimSvgUrl } from '@sistemazero/studio/arte'
import { SCENE_VIEW, SceneCanvas, Texto } from './scene-canvas'
export function GardenQuizScene({
  scene,
  result = false,
}: {
  scene: 'garden-touch' | 'garden-count' | 'garden-repeat'
  result?: boolean
}) {
  const n = ['garden-touch', 'garden-count', 'garden-repeat'].indexOf(scene)
  const found = result ? (n === 0 ? [1] : n === 1 ? [0, 2] : [0]) : n === 0 ? [] : [0]
  const score = n === 0 ? null : result && n === 1 ? 2 : 1
  return (
    <div className="mx-auto w-full max-w-sm my-3" data-quiz-scene={result ? 'result' : 'question'}>
      <SceneCanvas
        view={SCENE_VIEW}
        mundo="jardim"
        titulo={result ? 'Resultado do teste' : 'Antes dos toques'}
        descricao={
          result ? 'Observe o resultado da regra.' : 'Observe os esconderijos antes de responder.'
        }
      >
        <image
          data-fundo="jardim"
          href={jardimSvgUrl('jardim', { cobrir: true })}
          width="560"
          height="300"
          preserveAspectRatio="xMidYMid slice"
        />
        {JARDIM_PARES.map((p, i) => {
          const name = found.includes(i) ? p.personagem : p.esconderijo
          const box = jardimSpriteRect(name, p.centroX)
          return (
            <image
              key={p.personagem}
              href={jardimSvgUrl(name)}
              x={box.x * 0.875}
              y={box.y * 0.875 - 7.5}
              width={box.w * 0.875}
              height={box.h * 0.875}
            />
          )
        })}
        {score !== null && (
          <>
            <rect
              x="190"
              y="12"
              width="180"
              height="75"
              rx="18"
              fill="#fff9df"
              stroke="#2d6655"
              strokeWidth="3"
            />
            <Texto x="280" y="38" textAnchor="middle" tamanho={18} fontWeight="700" fill="#173844">
              Achados
            </Texto>
            <Texto x="280" y="72" textAnchor="middle" tamanho={32} fontWeight="800" fill="#173844">
              {score}
            </Texto>
          </>
        )}
        {!result && (
          <g>
            <circle
              cx={
                n === 0
                  ? JARDIM_PARES[1].centroX * 0.875
                  : n === 2
                    ? JARDIM_PARES[0].centroX * 0.875
                    : 75
              }
              cy={n === 1 ? 135 : 160}
              r="22"
              fill="var(--kids-ouro, var(--color-primary))"
              stroke="var(--kids-ouro-fg, var(--color-primary-foreground))"
              strokeWidth="2"
            />
            <Texto
              x={
                n === 0
                  ? JARDIM_PARES[1].centroX * 0.875
                  : n === 2
                    ? JARDIM_PARES[0].centroX * 0.875
                    : 75
              }
              y={n === 1 ? 145 : 170}
              textAnchor="middle"
              tamanho={28}
              fontWeight="800"
              fill="var(--kids-ouro-fg, var(--color-primary-foreground))"
            >
              ↓
            </Texto>
          </g>
        )}
      </SceneCanvas>
      {!result && n === 1 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Sequência: toque no jardim vazio → toque nas flores.
        </p>
      )}
    </div>
  )
}
