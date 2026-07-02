import { interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { PlanoBalao } from '../../src/steps/07-montagem/plano'

// Balões/anotações ancorados às coordenadas capturadas na gravação. O tamanho é
// PROPORCIONAL ao bloco (a altura `h` do alvo reflete o zoom atual): bloco grande
// → balão e letra grandes; bloco pequeno → balão pequeno. Cada balão vem com um
// ANEL de destaque no ponto exato do que está sendo falado.
export const Baloes: React.FC<{ baloes: PlanoBalao[]; fps: number }> = ({ baloes, fps }) => (
  <>
    {baloes.map((b) => {
      const from = Math.round(b.apareceS * fps)
      const dur = Math.max(1, Math.round((b.escondeS - b.apareceS) * fps))
      return (
        <Sequence key={`${b.cenaId}-${b.apareceS}-${b.texto}`} from={from} durationInFrames={dur}>
          <Balao balao={b} />
        </Sequence>
      )
    })}
  </>
)

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

const Balao: React.FC<{ balao: PlanoBalao }> = ({ balao }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames, width } = useVideoConfig()
  const entra = spring({ frame, fps, config: { damping: 15, mass: 0.7 } })
  const sai = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const pulso = 1 + 0.06 * Math.sin((frame / 12) * Math.PI)

  // Escala tudo pela altura do alvo (que já reflete o zoom do bloco).
  const fontSize = clamp(Math.round(balao.h * 0.46), 18, 44)
  const padV = Math.round(fontSize * 0.45)
  const padH = Math.round(fontSize * 0.7)
  const maxWidth = clamp(Math.round(balao.w * 1.15), 220, 560)
  const raio = clamp(Math.round(balao.h * 0.18), 10, 26)
  const borda = clamp(Math.round(balao.h * 0.05), 3, 7)
  const tail = Math.round(fontSize * 0.5)

  const cx = balao.x + balao.w / 2
  const acima = balao.y > 150 // tem espaço em cima? (quase sempre)
  const left = clamp(cx, 16 + maxWidth / 2, width - 16 - maxWidth / 2)
  const top = acima ? balao.y - 14 : balao.y + balao.h + 14

  return (
    <>
      {/* Anel de destaque no alvo exato */}
      <div
        style={{
          position: 'absolute',
          left: balao.x - borda * 2,
          top: balao.y - borda * 2,
          width: balao.w + borda * 4,
          height: balao.h + borda * 4,
          border: `${borda}px solid #f59e0b`,
          borderRadius: raio,
          boxShadow: '0 0 0 4px rgba(245,158,11,.28), 0 0 26px rgba(245,158,11,.5)',
          transform: `scale(${entra * pulso})`,
          transformOrigin: 'center',
          opacity: sai,
        }}
      />
      {/* Balão de texto */}
      <div
        style={{
          position: 'absolute',
          left,
          top,
          maxWidth,
          transform: `translate(-50%, ${acima ? '-100%' : '0'}) scale(${entra})`,
          transformOrigin: acima ? 'center bottom' : 'center top',
          opacity: sai,
        }}
      >
        <div
          style={{
            position: 'relative',
            background: '#111827',
            color: '#fff',
            fontFamily: 'Baloo 2, Nunito, system-ui, sans-serif',
            fontSize,
            fontWeight: 800,
            lineHeight: 1.18,
            textAlign: 'center',
            padding: `${padV}px ${padH}px`,
            borderRadius: raio + 4,
            boxShadow: '0 10px 30px rgba(0,0,0,.4)',
          }}
        >
          {balao.texto}
          {/* Rabinho apontando para o alvo */}
          <span
            style={{
              position: 'absolute',
              left: '50%',
              marginLeft: -tail,
              ...(acima ? { bottom: -tail } : { top: -tail }),
              width: 0,
              height: 0,
              borderLeft: `${tail}px solid transparent`,
              borderRight: `${tail}px solid transparent`,
              ...(acima
                ? { borderTop: `${tail}px solid #111827` }
                : { borderBottom: `${tail}px solid #111827` }),
            }}
          />
        </div>
      </div>
    </>
  )
}
