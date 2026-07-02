import { AbsoluteFill, Img, staticFile } from 'remotion'

// Fundo da cena: imagem do cenário quando existir (o plano só aponta o caminho se
// o arquivo foi copiado para out/cenarios), senão um gradiente de cortesia por
// variante (A = abertura/fecho, B = meio da aula).
const GRADIENTES = {
  a: 'linear-gradient(135deg,#1b2a4a,#0b1220)',
  b: 'linear-gradient(135deg,#12243a,#0a1a12)',
} as const

export const Cenario: React.FC<{ src?: string; variante: 'a' | 'b' }> = ({ src, variante }) => {
  if (src) {
    return (
      <AbsoluteFill>
        <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
    )
  }
  return <AbsoluteFill style={{ backgroundImage: GRADIENTES[variante] }} />
}
