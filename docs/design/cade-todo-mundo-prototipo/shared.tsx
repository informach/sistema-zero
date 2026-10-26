import {
  SCENE_VIEW,
  SceneCanvas,
  Texto,
} from '../../../packages/member-shell/src/components/scene-canvas'
import {
  JARDIM_PARES,
  jardimSpriteRect,
  jardimSvgUrl,
} from '../../../packages/studio/src/arte/jardim-assets'

export function PrototypeMascot({ className = 'size-16 sm:size-20' }: { className?: string }) {
  return (
    <img
      src="__ZAPPY_SPEAKING__"
      width={80}
      height={80}
      alt=""
      aria-hidden
      draggable={false}
      className={'shrink-0 select-none object-contain ' + className}
    />
  )
}

export function PrototypeQuizScene({
  questionId,
  result = false,
}: {
  questionId: string
  result?: boolean
}) {
  if (!questionId.startsWith('p-')) return null
  const n = Number(questionId.slice(2)) - 1
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
              key={i}
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
              fill="var(--kids-ouro)"
              stroke="var(--kids-ouro-fg)"
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
              fill="var(--kids-ouro-fg)"
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
