import { OffthreadVideo, staticFile } from 'remotion'
import type { LayoutCena } from '../../src/steps/07-montagem/plano'

// Avatar (HeyGen) sobre o cenário.
//   avatar-cheio: grande, centralizado embaixo (apresentação/fecho)
//   teoria/pratica: "cantinho" redondo (picture-in-picture)
//
// ⚠️ CHROMA: hoje o clipe vem com fundo VERDE (chroma). A remoção do verde é o
// passo de acabamento — a via mais limpa é exportar o avatar TRANSPARENTE no
// HeyGen (webm com alpha), e então o <OffthreadVideo> já compõe sobre o cenário
// sem mais nada. Enquanto isso, o cantinho redondo mascara a maior parte do
// fundo. (Alternativa: um componente de chroma-key em WebGL.)
export const Avatar: React.FC<{
  src: string
  layout: LayoutCena
  chroma: string
  largura: number
  altura: number
}> = ({ src, layout, largura, altura }) => {
  const video = (
    <OffthreadVideo
      src={staticFile(src)}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )

  if (layout === 'avatar-cheio') {
    const h = Math.round(altura * 0.82)
    const w = Math.round(h * 0.75)
    return (
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: (largura - w) / 2,
          width: w,
          height: h,
          overflow: 'hidden',
        }}
      >
        {video}
      </div>
    )
  }

  const d = Math.round(altura * 0.34)
  return (
    <div
      style={{
        position: 'absolute',
        right: 28,
        bottom: 28,
        width: d,
        height: d,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '5px solid #ffffff',
        boxShadow: '0 8px 28px rgba(0,0,0,.35)',
      }}
    >
      {video}
    </div>
  )
}
