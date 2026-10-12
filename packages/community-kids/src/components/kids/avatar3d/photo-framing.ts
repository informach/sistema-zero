import type { Box3, PerspectiveCamera } from 'three'

const FOV = 45
/** Quanto do QUADRADO central a região fotografada ocupa (o resto é folga em volta). */
const FILL = 0.8
/** O retrato pega a cabeça e o começo dos ombros: a parte de cima do personagem. */
export const PORTRAIT_SHARE = 0.45

/**
 * Aponta a câmera da foto do avatar (12/10/2026). A imagem do avatar é o QUADRADO central do
 * canvas, recortado depois. A região fotografada, o corpo inteiro ("Tirar foto") ou a cabeça
 * com o começo dos ombros ("Salvar"), ocupa 80% da altura desse quadrado, de frente.
 *
 * ⚠️ O personagem TEM PROFUNDIDADE (nariz, cabelo, aba do chapéu e poses inclinadas ficam À
 * FRENTE do centro): o ponto mais perto da câmera é ampliado pela perspectiva. Por isso a
 * distância é medida do PLANO DA FRENTE (`box.max.z`), não do centro: assim a folga vale de
 * verdade. O retrato antigo usava uma distância fixa a partir do centro e, num canvas mais alto
 * que largo (celular), cortava o topo de um cabelo alto.
 */
export function framePhoto(
  cam: PerspectiveCamera,
  box: Box3,
  canvas: { width: number; height: number },
  portrait: boolean,
): void {
  const h = Math.max(0.001, box.max.y - box.min.y)
  const cw = Math.max(1, canvas.width)
  const ch = Math.max(1, canvas.height)
  const square = Math.min(cw, ch)
  const region = portrait ? h * PORTRAIT_SHARE : h
  const centerY = box.max.y - region / 2
  const cx = (box.min.x + box.max.x) / 2
  const cz = (box.min.z + box.max.z) / 2
  // A altura visível do canvas inteiro precisa ser `region / FILL` vezes a fração do quadrado.
  const dist = (region * ch) / (2 * Math.tan((FOV * Math.PI) / 360) * FILL * square)
  cam.fov = FOV
  cam.aspect = cw / ch
  cam.position.set(cx, centerY, box.max.z + dist)
  cam.lookAt(cx, centerY, cz)
  cam.updateMatrixWorld()
  cam.updateProjectionMatrix()
}
