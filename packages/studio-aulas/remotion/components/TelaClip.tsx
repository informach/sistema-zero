import { AbsoluteFill, OffthreadVideo, staticFile } from 'remotion'

// Coloca o vídeo da tela do Estúdio, cortado no ponto de início desta cena
// (o vídeo é contínuo; cada cena de prática mostra a sua faixa). A composição
// tem a mesma resolução da gravação, então as coordenadas dos balões batem 1:1.
export const TelaClip: React.FC<{
  src: string
  inicioS: number
  fps: number
  largura: number
  altura: number
}> = ({ src, inicioS, fps, largura, altura }) => (
  <AbsoluteFill style={{ backgroundColor: '#fef9ef' }}>
    <OffthreadVideo
      src={staticFile(src)}
      startFrom={Math.round(inicioS * fps)}
      style={{ width: largura, height: altura, objectFit: 'cover' }}
    />
  </AbsoluteFill>
)
