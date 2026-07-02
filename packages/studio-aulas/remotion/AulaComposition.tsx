import { AbsoluteFill, Series } from 'remotion'
import type { Plano } from '../src/steps/07-montagem/plano'
import { Cena } from './components/Cena'

// Enfileira as cenas do plano; cada uma dura `duracaoS * fps` quadros.
export const AulaComposition: React.FC<Plano> = (plano) => (
  <AbsoluteFill style={{ backgroundColor: '#0b0b12' }}>
    <Series>
      {plano.cenas.map((cena) => (
        <Series.Sequence
          key={cena.id}
          durationInFrames={Math.max(1, Math.round(cena.duracaoS * plano.fps))}
        >
          <Cena plano={plano} cena={cena} />
        </Series.Sequence>
      ))}
    </Series>
  </AbsoluteFill>
)
