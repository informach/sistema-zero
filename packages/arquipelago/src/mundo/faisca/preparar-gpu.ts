import {
  type Camera,
  type Material,
  type Object3D,
  type Scene,
  type Texture,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'

/** Prepara as variantes reais da cena (instâncias, pele e luzes), antes de liberar a exploração. */
export async function prepararGpuDaFaisca(
  gl: WebGLRenderer,
  cena: Scene,
  camera: Camera,
  opcoes: { cenaMutavel?: boolean; alvo?: Scene } = {},
) {
  const texturas = new Set<Texture>()
  cena.traverse((objeto: Object3D) => {
    const renderizavel = objeto as Object3D & {
      material?: Material | Material[]
      morphTexture?: Texture | null
    }
    if (renderizavel.morphTexture) texturas.add(renderizavel.morphTexture)
    const materiais = renderizavel.material
    for (const material of Array.isArray(materiais) ? materiais : materiais ? [materiais] : [])
      for (const valor of Object.values(material)) {
        const textura = valor as Texture | null
        if (textura?.isTexture) texturas.add(textura)
      }
  })
  for (const textura of texturas) gl.initTexture(textura)
  // No editor, materiais podem ser substituídos pelo próximo gesto ou desmontagem.
  // compileAsync mantém uma consulta posterior a esses materiais e não oferece cancelamento.
  // A compilação síncrona e o primeiro render terminam na mesma tarefa, antes de liberar a revisão.
  if (opcoes.cenaMutavel) gl.compile(cena, camera, opcoes.alvo)
  else await gl.compileAsync(cena, camera, opcoes.alvo)
}

/**
 * Um desenho fora da tela (1 × 1) da cena do jogo com a cena nova anexada por um instante.
 * O `compile` do three lê o estado de recorte do último quadro, então as cópias com planos de
 * recorte (a região da ilha, a janela de detalhe) e os materiais do jogo com a contagem nova de
 * luzes só ganhariam programa no primeiro quadro da troca. Desenhar aqui compila tudo isso
 * antes, ainda com a cena antiga na tela.
 */
export function aquecerNoArranjoFinal(
  gl: WebGLRenderer,
  alvo: Scene,
  nova: Object3D,
  camera: Camera,
) {
  if (nova.parent) throw Error('A cena nova já está na cena do jogo.')
  const destino = new WebGLRenderTarget(1, 1),
    anterior = gl.getRenderTarget(),
    autoLimpar = gl.autoClear
  alvo.add(nova)
  try {
    gl.setRenderTarget(destino)
    gl.autoClear = true
    gl.render(alvo, camera)
  } finally {
    gl.setRenderTarget(anterior)
    gl.autoClear = autoLimpar
    nova.removeFromParent()
    destino.dispose()
  }
}
