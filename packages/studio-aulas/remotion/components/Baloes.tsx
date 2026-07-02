import { interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { PlanoBalao } from '../../src/steps/07-montagem/plano'

// Balões/anotações ancorados às coordenadas capturadas na gravação da tela.
// Os tempos são relativos à cena (a mesma janela em que a tela toca).
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

const Balao: React.FC<{ balao: PlanoBalao }> = ({ balao }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const entra = spring({ frame, fps, config: { damping: 14, mass: 0.6 } })
  const sai = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  // Ancorado à direita do bloco, apontando para ele.
  const left = Math.min(balao.x + balao.w + 16, 980)
  const top = Math.max(balao.y - 10, 8)
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        maxWidth: 260,
        transform: `scale(${entra})`,
        opacity: sai,
        transformOrigin: 'left center',
      }}
    >
      <div
        style={{
          position: 'relative',
          background: '#111827',
          color: '#fff',
          fontFamily: 'Baloo 2, Nunito, system-ui, sans-serif',
          fontSize: 26,
          fontWeight: 700,
          lineHeight: 1.2,
          padding: '12px 16px',
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(0,0,0,.35)',
        }}
      >
        {balao.texto}
        <span
          style={{
            position: 'absolute',
            left: -12,
            top: 20,
            width: 0,
            height: 0,
            borderTop: '10px solid transparent',
            borderBottom: '10px solid transparent',
            borderRight: '14px solid #111827',
          }}
        />
      </div>
    </div>
  )
}
