import type { ProjectAsset } from '#core'
import { decodeProjectAsset } from '../core/assetBinary'
import { isCourseModelStub, resolveCourseModels } from '../core/courseModels'

/**
 * As miniaturas dos modelos 3D do projeto (pedido de 23/11/2026: no seletor do bloco e na aba
 * "Modelos 3D" só aparecia o 📦, e a criança escolhia pelo nome). O modelo é desenhado uma vez, na
 * hora em que alguém pede, num quadro pequeno do three.js, e a imagem fica guardada na memória da
 * página: nada muda no formato do projeto, e vale para todo modelo que já existe.
 *
 * - Um desenho por vez (fila), num único quadro WebGL compartilhado: abrir o seletor com muitos
 *   modelos não abre muitos contextos de WebGL nem trava a página de uma vez.
 * - A mesma chave (id + conteúdo) nunca é desenhada duas vezes; a memória guarda as últimas 64.
 * - Modelo dos cursos (a referência compacta) é resolvido antes de desenhar.
 * - Sem WebGL (ou se o arquivo não abrir), a resposta é `null` e quem pediu segue com o 📦.
 */
export type DesenharMiniatura = (dataUrl: string) => Promise<string | null>

export const TAMANHO_DA_MINIATURA = 96
const GUARDADAS = 64

/** A chave da miniatura: o id e o conteúdo (um arquivo trocado no mesmo id desenha de novo). */
export function chaveDaMiniatura(asset: Pick<ProjectAsset, 'id' | 'dataUrl'>): string {
  const d = asset.dataUrl
  return `${asset.id}:${d.length}:${d.slice(-48)}`
}

export function criarMiniaturas(desenhar: DesenharMiniatura) {
  const promessas = new Map<string, Promise<string | null>>()
  const prontas = new Map<string, string | null>()
  let fila: Promise<unknown> = Promise.resolve()
  let geracao = 0

  function guardar(chave: string, valor: string | null) {
    prontas.delete(chave)
    prontas.set(chave, valor)
    while (prontas.size > GUARDADAS) {
      const velha = prontas.keys().next().value as string
      prontas.delete(velha)
      promessas.delete(velha)
    }
  }

  return {
    /** A miniatura já desenhada (`undefined`: ainda não pedida ou desenhando). */
    pronta(asset: Pick<ProjectAsset, 'id' | 'kind' | 'dataUrl'>): string | null | undefined {
      return asset.kind === 'model3d' ? prontas.get(chaveDaMiniatura(asset)) : null
    },
    /** A miniatura do modelo (data URL PNG), ou `null` quando não dá para desenhar. */
    pedir(asset: Pick<ProjectAsset, 'id' | 'kind' | 'dataUrl'>): Promise<string | null> {
      if (asset.kind !== 'model3d') return Promise.resolve(null)
      const chave = chaveDaMiniatura(asset)
      const existente = promessas.get(chave)
      if (existente) return existente
      const nascida = geracao
      const promessa = fila
        .then(async () => {
          const dataUrl = isCourseModelStub(asset)
            ? (await resolveCourseModels([asset as ProjectAsset]))[0]?.dataUrl
            : asset.dataUrl
          if (!dataUrl || isCourseModelStub({ dataUrl })) return null
          return desenhar(dataUrl)
        })
        .catch(() => null)
        .then((valor) => {
          if (geracao === nascida) guardar(chave, valor)
          return valor
        })
      fila = promessa
      promessas.set(chave, promessa)
      return promessa
    },
    /** Esquece todas as miniaturas (o desenho em voo não volta a ser guardado). */
    esquecer() {
      geracao++
      promessas.clear()
      prontas.clear()
    },
  }
}

/**
 * Onde o modelo caiu no primeiro desenho, pelos pixels (RGBA lido do WebGL, a linha de BAIXO
 * primeiro): o quadrado do recorte (de cima para baixo, com 8% de margem de cada lado), `'vazio'`
 * se nada apareceu e `'borda'` se o modelo encosta na beirada (pode ter ficado algo de fora).
 *
 * O enquadramento sai do desenho, não da caixa calculada antes dele: num personagem espelhado com
 * ossos (o espelho do Molda) a caixa e o desenho não batem, e a miniatura saía minúscula num canto.
 */
export function recorteDoDesenho(
  px: Uint8Array,
  lado: number,
): { x: number; y: number; lado: number } | 'vazio' | 'borda' {
  let x0 = lado,
    y0 = lado,
    x1 = -1,
    y1 = -1
  for (let y = 0; y < lado; y++)
    for (let x = 0; x < lado; x++)
      if ((px[(y * lado + x) * 4 + 3] ?? 0) > 8) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  if (x1 < 0) return 'vazio'
  if (x0 === 0 || y0 === 0 || x1 === lado - 1 || y1 === lado - 1) return 'borda'
  const topo = lado - 1 - y1,
    base = lado - 1 - y0
  const recorte = Math.max(Math.max(x1 - x0 + 1, base - topo + 1) / 0.84, 4)
  return {
    x: (x0 + x1 + 1) / 2 - recorte / 2,
    y: (topo + base + 1) / 2 - recorte / 2,
    lado: recorte,
  }
}

/** O desenho de verdade: o three.js e o leitor de GLB chegam só quando a primeira miniatura é pedida. */
let renderizador: {
  render(cena: unknown, camera: unknown): void
  getContext(): WebGL2RenderingContext
  domElement: HTMLCanvasElement
} | null = null

export const desenharComThree: DesenharMiniatura = async (dataUrl) => {
  if (typeof document === 'undefined') return null
  // O contexto vem antes do three.js: sem WebGL 2 (o único que o three.js de hoje usa), nada é
  // baixado e quem pediu fica com o 📦.
  let novo: { canvas: HTMLCanvasElement; contexto: WebGL2RenderingContext } | null = null
  if (!renderizador) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = TAMANHO_DA_MINIATURA
    const contexto = canvas.getContext('webgl2', {
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    })
    if (!contexto) return null
    novo = { canvas, contexto }
  }
  const [THREE, { GLTFLoader }] = await Promise.all([
    import('three'),
    import('three/addons/loaders/GLTFLoader.js'),
  ])
  if (novo && !renderizador) {
    const { canvas, contexto } = novo
    let r: InstanceType<typeof THREE.WebGLRenderer>
    try {
      r = new THREE.WebGLRenderer({ canvas, context: contexto })
    } catch {
      return null
    }
    r.setPixelRatio(1)
    r.setSize(TAMANHO_DA_MINIATURA, TAMANHO_DA_MINIATURA, false)
    r.setClearColor(0x000000, 0)
    // Contexto perdido (aba em segundo plano por muito tempo): o próximo pedido cria outro.
    canvas.addEventListener('webglcontextlost', () => {
      renderizador = null
    })
    renderizador = r
  }
  const pintor = renderizador
  if (!pintor) return null
  const { bytes } = decodeProjectAsset(dataUrl)
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const gltf = await new GLTFLoader().parseAsync(buffer as ArrayBuffer, '')
  const cena = new THREE.Scene()
  cena.add(new THREE.HemisphereLight(0xffffff, 0x8a96a8, 2.2))
  const sol = new THREE.DirectionalLight(0xffffff, 2.4)
  sol.position.set(3, 5, 4)
  cena.add(sol)
  cena.add(gltf.scene)
  gltf.scene.updateMatrixWorld(true)
  // A caixa de um modelo com ossos lê as matrizes do esqueleto, que o three.js só atualiza ao
  // desenhar. A caixa é só o ponto de partida: o enquadramento final sai dos pixels.
  gltf.scene.traverse((o) => {
    const comOssos = o as { isSkinnedMesh?: boolean; skeleton?: { update(): void } }
    if (comOssos.isSkinnedMesh) comOssos.skeleton?.update()
  })
  try {
    const caixa = new THREE.Box3().setFromObject(gltf.scene, true)
    if (caixa.isEmpty()) return null
    const centro = caixa.getCenter(new THREE.Vector3())
    const raio = Math.max(caixa.getSize(new THREE.Vector3()).length() / 2, 1e-3)
    const camera = new THREE.PerspectiveCamera(35, 1, raio / 100, raio * 20)
    // De frente e um pouco de cima e de lado (três quartos), com a esfera do modelo inteira.
    const direcao = new THREE.Vector3(0.9, 0.7, 1.4).normalize()
    const distancia = raio / Math.sin(THREE.MathUtils.degToRad(35) / 2)
    const gl = pintor.getContext()
    const px = new Uint8Array(TAMANHO_DA_MINIATURA * TAMANHO_DA_MINIATURA * 4)
    // 1º desenho para ver onde o modelo caiu; vazio ou na beirada, afasta e tenta de novo; achado,
    // o 2º desenho recorta nele (o recorte da câmera desenha de novo na resolução inteira).
    for (let tentativa = 0, longe = 1; tentativa < 4; tentativa++, longe *= 2.5) {
      camera.position.copy(centro).addScaledVector(direcao, distancia * longe)
      camera.far = distancia * longe + raio * 20
      camera.lookAt(centro)
      camera.clearViewOffset()
      pintor.render(cena, camera)
      gl.readPixels(0, 0, TAMANHO_DA_MINIATURA, TAMANHO_DA_MINIATURA, gl.RGBA, gl.UNSIGNED_BYTE, px)
      const recorte = recorteDoDesenho(px, TAMANHO_DA_MINIATURA)
      if (typeof recorte === 'string') continue
      camera.setViewOffset(
        TAMANHO_DA_MINIATURA,
        TAMANHO_DA_MINIATURA,
        recorte.x,
        recorte.y,
        recorte.lado,
        recorte.lado,
      )
      pintor.render(cena, camera)
      return pintor.domElement.toDataURL('image/png')
    }
    return null
  } finally {
    gltf.scene.traverse((o) => {
      const malha = o as { geometry?: { dispose(): void }; material?: unknown }
      malha.geometry?.dispose()
      const materiais = Array.isArray(malha.material) ? malha.material : [malha.material]
      for (const m of materiais) {
        if (!m || typeof m !== 'object') continue
        for (const valor of Object.values(m))
          if (valor && typeof valor === 'object' && 'isTexture' in valor) {
            const textura = valor as { dispose(): void; image?: { close?: () => void } }
            textura.image?.close?.()
            textura.dispose()
          }
        ;(m as { dispose?: () => void }).dispose?.()
      }
    })
  }
}

let desenhoAtual: DesenharMiniatura = desenharComThree

/** As miniaturas da página: uma memória só para o seletor do bloco e a aba "Modelos 3D". */
export const miniaturasDosModelos = criarMiniaturas((dataUrl) => desenhoAtual(dataUrl))

/** Só para testes: troca quem desenha (`null` volta ao three.js) e esquece o que foi guardado. */
export function trocarDesenhoDasMiniaturasParaTestes(desenhar: DesenharMiniatura | null): void {
  desenhoAtual = desenhar ?? desenharComThree
  miniaturasDosModelos.esquecer()
}
