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
/** O enquadramento da foto: `face` = do peito para cima (a foto automática), `body` = a pose inteira. */
export type PhotoFraming = 'face' | 'body'

/**
 * Onde a câmera fica e para onde olha (de frente), para a região caber no quadrado central do
 * canvas com folga. A MESMA conta serve à foto (`framePhoto`) e à prévia da Cabine
 * (`CameraManager`), então a prévia mostra o que vai sair na foto (26/11/2026).
 */
export function photoFrame(
  box: Box3,
  canvas: { width: number; height: number },
  portrait: boolean,
): { position: [number, number, number]; target: [number, number, number] } {
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
  return { position: [cx, centerY, box.max.z + dist], target: [cx, centerY, cz] }
}

export function framePhoto(
  cam: PerspectiveCamera,
  box: Box3,
  canvas: { width: number; height: number },
  portrait: boolean,
): void {
  const { position, target } = photoFrame(box, canvas, portrait)
  cam.fov = FOV
  cam.aspect = Math.max(1, canvas.width) / Math.max(1, canvas.height)
  cam.position.set(...position)
  cam.lookAt(...target)
  cam.updateMatrixWorld()
  cam.updateProjectionMatrix()
}
