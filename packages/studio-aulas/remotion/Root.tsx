import { Composition } from 'remotion'
import type { Plano } from '../src/steps/07-montagem/plano'
import { AulaComposition } from './AulaComposition'

const PLANO_VAZIO: Plano = {
  slug: '',
  titulo: '',
  fps: 30,
  largura: 1280,
  altura: 720,
  chroma: '#00b140',
  cenas: [],
}

// A composição "Aula" é dirigida 100% pelo plano (out/montagem.json), passado ao
// render por --props. calculateMetadata roda no Node e resolve a duração total a
// partir das durações já calculadas de cada cena — nada é medido em runtime.
export const RemotionRoot: React.FC = () => (
  <Composition
    id="Aula"
    component={AulaComposition}
    defaultProps={PLANO_VAZIO}
    fps={30}
    width={1280}
    height={720}
    durationInFrames={30}
    calculateMetadata={({ props }) => {
      const total = props.cenas.reduce((s, c) => s + c.duracaoS, 0)
      return {
        durationInFrames: Math.max(1, Math.round(total * props.fps)),
        fps: props.fps,
        width: props.largura,
        height: props.altura,
      }
    }}
  />
)
