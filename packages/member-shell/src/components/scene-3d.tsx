/**
 * ⭐⭐ A RÉGUA DO 3D das cenas de aula (lote 5 do Raio-X, 16/09/2026): uma projeção só, usada pelas
 * quatro cenas da porta do 3D (`axis-z`, `camera-3d`, `mesh`, `pick-ray`).
 *
 * ⚠️⚠️ O 3D continua DESENHADO, não renderizado: puxar uma biblioteca 3D para o player de aula custaria
 * o peso dela em toda cena. O que mudou é que o desenho passou a ser GEOMETRIA de verdade. Antes cada
 * palco inventava a sua ilusão, e as quatro mentiam do mesmo jeito: o "cubo" da câmera trocava de cor
 * sem coerência e parecia um livro aberto, o objeto do eixo z era um quadrado chapado que subia na tela
 * tanto com o z quanto com o y, o "modelo 3D" era um adesivo que achatava ao girar, e a reta da mira
 * cruzava a caixa de trás antes de chegar na da frente. Aqui um cubo é um cubo convexo com faces
 * de verdade (só as viradas para quem olha aparecem), longe é menor, e a sombra fica sempre no chão.
 *
 * ⚠️ As convenções do Estúdio (Jogo 3D), para a imagem da cena ser a imagem da ferramenta:
 * - o y cresce para CIMA;
 * - o z NEGATIVO é o FUNDO (decisão da dona no lote 5: é o kit Desvie, onde o inimigo nasce em z −20 e
 *   vem para a câmera, os blocos genéricos e o three.js). Os kits Travessia e Corrida guardam uma grade
 *   própria por dentro (o "para a frente" deles é a linha), e não mostram o z para a criança;
 * - os eixos nas cores do AxesHelper: x vermelho, y verde, z azul.
 *
 * Nada aqui desenha texto que a criança lê: é só a conta e as peças de SVG que as cenas montam.
 */

export interface Ponto3 {
  x: number
  y: number
  z: number
}

/** Um ponto já na tela: onde desenhar, o quanto encolher e a que distância do olho ele está. */
export interface NaTela {
  px: number
  py: number
  /** O quanto o tamanho encolhe (ou cresce) nesta distância: 1 é o tamanho de fábrica. */
  escala: number
  /** A distância até o olho, ao longo do olhar: maior é mais longe. */
  fundo: number
}

const menos = (a: Ponto3, b: Ponto3): Ponto3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const escalar = (a: Ponto3, b: Ponto3) => a.x * b.x + a.y * b.y + a.z * b.z
const vetorial = (a: Ponto3, b: Ponto3): Ponto3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})
const unitario = (a: Ponto3): Ponto3 => {
  const n = Math.hypot(a.x, a.y, a.z) || 1
  return { x: a.x / n, y: a.y / n, z: a.z / n }
}

/** A câmera com perspectiva: onde está o olho, para onde ele olha e o tamanho da tela. */
export interface CameraPerspectiva {
  olho: Ponto3
  alvo: Ponto3
  /** A "lente": quanto maior, maior tudo aparece. */
  foco: number
  centro: { x: number; y: number }
}

/**
 * A projeção com PERSPECTIVA: longe fica menor e mais perto do horizonte.
 *
 * ⚠️ É ela que separa o z do y a olho na `axis-z`: o z muda o TAMANHO e o y não.
 */
export function projetorPerspectiva(camera: CameraPerspectiva): (p: Ponto3) => NaTela {
  const frente = unitario(menos(camera.alvo, camera.olho))
  const direita = unitario(vetorial(frente, { x: 0, y: 1, z: 0 }))
  const cima = vetorial(direita, frente)
  return (p) => {
    const v = menos(p, camera.olho)
    const fundo = Math.max(1, escalar(v, frente))
    const escala = camera.foco / fundo
    return {
      px: camera.centro.x + escalar(v, direita) * escala,
      py: camera.centro.y - escalar(v, cima) * escala,
      escala,
      fundo,
    }
  }
}

/**
 * Girar em volta do objeto: a VOLTA (em graus, em torno do eixo y) e a ALTURA (em graus: positiva é
 * olhar de cima). É a câmera que anda, então o objeto gira ao contrário.
 */
export function girar(p: Ponto3, voltaGraus: number, alturaGraus: number): Ponto3 {
  const a = (-voltaGraus * Math.PI) / 180
  const b = (alturaGraus * Math.PI) / 180
  const x = p.x * Math.cos(a) + p.z * Math.sin(a)
  const z1 = -p.x * Math.sin(a) + p.z * Math.cos(a)
  return { x, y: p.y * Math.cos(b) - z1 * Math.sin(b), z: p.y * Math.sin(b) + z1 * Math.cos(b) }
}

/** A projeção SEM perspectiva, de um ponto já girado: o z só decide quem fica na frente. */
export const naTelaSemPerspectiva = (
  p: Ponto3,
  centro: { x: number; y: number },
  escala: number,
): NaTela => ({ px: centro.x + p.x * escala, py: centro.y - p.y * escala, escala, fundo: -p.z })

/** O eixo da normal de uma face: é o que dá o tom (em cima claro, frente médio, lado escuro). */
export type EixoDaFace = 'x' | 'y' | 'z'

/** Uma face de cubo já na tela. */
export interface FaceNaTela {
  /** `frente`/`tras` (z), `direita`/`esquerda` (x), `cima`/`baixo` (y). */
  lado: 'frente' | 'tras' | 'direita' | 'esquerda' | 'cima' | 'baixo'
  eixo: EixoDaFace
  pontos: NaTela[]
  /** A distância média até o olho: as faces são desenhadas da mais longe para a mais perto. */
  fundo: number
}

const FACES_DO_CUBO: readonly {
  lado: FaceNaTela['lado']
  eixo: EixoDaFace
  normal: Ponto3
  cantos: readonly [number, number, number][]
}[] = [
  {
    lado: 'frente',
    eixo: 'z',
    normal: { x: 0, y: 0, z: 1 },
    cantos: [
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ],
  },
  {
    lado: 'tras',
    eixo: 'z',
    normal: { x: 0, y: 0, z: -1 },
    cantos: [
      [1, -1, -1],
      [-1, -1, -1],
      [-1, 1, -1],
      [1, 1, -1],
    ],
  },
  {
    lado: 'direita',
    eixo: 'x',
    normal: { x: 1, y: 0, z: 0 },
    cantos: [
      [1, -1, 1],
      [1, -1, -1],
      [1, 1, -1],
      [1, 1, 1],
    ],
  },
  {
    lado: 'esquerda',
    eixo: 'x',
    normal: { x: -1, y: 0, z: 0 },
    cantos: [
      [-1, -1, -1],
      [-1, -1, 1],
      [-1, 1, 1],
      [-1, 1, -1],
    ],
  },
  {
    lado: 'cima',
    eixo: 'y',
    normal: { x: 0, y: 1, z: 0 },
    cantos: [
      [-1, 1, 1],
      [1, 1, 1],
      [1, 1, -1],
      [-1, 1, -1],
    ],
  },
  {
    lado: 'baixo',
    eixo: 'y',
    normal: { x: 0, y: -1, z: 0 },
    cantos: [
      [-1, -1, -1],
      [1, -1, -1],
      [1, -1, 1],
      [-1, -1, 1],
    ],
  },
]

/**
 * As faces VISÍVEIS de um cubo com perspectiva, da mais longe para a mais perto.
 *
 * ⚠️⚠️ Visível é a face cuja normal aponta para o OLHO. Um cubo é convexo: desenhar só essas, em
 * qualquer ordem, nunca deixa uma face de trás aparecer por cima de uma da frente.
 */
export function cuboComPerspectiva(
  centro: Ponto3,
  meio: number,
  camera: CameraPerspectiva,
): FaceNaTela[] {
  const projetar = projetorPerspectiva(camera)
  return FACES_DO_CUBO.flatMap((face) => {
    const meioDaFace = {
      x: centro.x + face.normal.x * meio,
      y: centro.y + face.normal.y * meio,
      z: centro.z + face.normal.z * meio,
    }
    if (escalar(face.normal, menos(camera.olho, meioDaFace)) <= 0) return []
    const pontos = face.cantos.map(([cx, cy, cz]) =>
      projetar({ x: centro.x + cx * meio, y: centro.y + cy * meio, z: centro.z + cz * meio }),
    )
    return [
      {
        lado: face.lado,
        eixo: face.eixo,
        pontos,
        fundo: pontos.reduce((soma, p) => soma + p.fundo, 0) / pontos.length,
      },
    ]
  }).sort((a, b) => b.fundo - a.fundo)
}

/**
 * As faces VISÍVEIS de um cubo GIRADO (sem perspectiva), para a `camera-3d`.
 *
 * ⚠️⚠️ Visível é a normal girada com z > 0 (virada para quem olha). Com a câmera bem de frente, as
 * normais dos lados ficam com z = 0 EXATO na conta, e o `1e-6` é o que as tira: é por isso que de
 * frente aparece UMA face, a mesma conta de `facesAVista` do motor.
 *
 * ⭐ `foco` liga uma perspectiva LEVE (consertos do review da onda B do lote 5): sem ela, de canto e na
 * altura do meio, a aresta mais perto tinha a altura das de trás e o cubo lia como dois retângulos
 * chapados lado a lado ("duas cartas"). Com o olho em z = `foco`, o que está mais perto cresce.
 * ⚠️⚠️ A régua de QUAL face aparece continua a de cima (normal girada com z > 0), e não a da perspectiva
 * (que pede z > meio / foco): nas 24 posições da cena a menor normal visível tem z ≈ 0,53, então com
 * `foco` acima de 2 × `meio` as duas réguas dão as mesmas faces, e a contagem segue a do motor.
 */
export function cuboGirado(
  centro: { x: number; y: number },
  meio: number,
  voltaGraus: number,
  alturaGraus: number,
  foco?: number,
): FaceNaTela[] {
  return FACES_DO_CUBO.flatMap((face) => {
    const normal = girar(face.normal, voltaGraus, alturaGraus)
    if (normal.z <= 1e-6) return []
    const pontos = face.cantos.map(([cx, cy, cz]) => {
      const p = girar({ x: cx * meio, y: cy * meio, z: cz * meio }, voltaGraus, alturaGraus)
      return naTelaSemPerspectiva(p, centro, foco ? foco / Math.max(1, foco - p.z) : 1)
    })
    return [
      {
        lado: face.lado,
        eixo: face.eixo,
        pontos,
        fundo: pontos.reduce((soma, p) => soma + p.fundo, 0) / pontos.length,
      },
    ]
  }).sort((a, b) => b.fundo - a.fundo)
}

/** Um polígono como `d` de um `<path>`. */
export const caminhoDe = (pontos: readonly { px: number; py: number }[]) =>
  pontos.length === 0
    ? ''
    : `M${pontos.map((p) => `${p.px.toFixed(1)} ${p.py.toFixed(1)}`).join('L')}Z`

/**
 * O TOM de uma face pelo lado dela: em cima claro, frente e trás médio, os lados escuros. É o que faz
 * três faces da MESMA cor lerem como um objeto com volume.
 *
 * ⚠️ Desenhado por cima da cor da face, com a tinta do papel ou do texto: a cor da face não muda (na
 * `camera-3d` a COR é o que a criança conta).
 */
export function TomDaFace({ face, forte = 1 }: { face: FaceNaTela; forte?: number }) {
  if (face.eixo === 'z') return null
  return (
    <path
      className={face.eixo === 'y' ? 'fill-scene-card' : 'fill-scene-ink'}
      d={caminhoDe(face.pontos)}
      opacity={(face.eixo === 'y' ? 0.3 : 0.22) * forte}
    />
  )
}

/**
 * A SOMBRA no chão: um círculo deitado em y 0, com a perspectiva da câmera. Clarinha e um pouco maior
 * que o objeto, para ficar À VISTA mesmo com o objeto pousado em cima dela.
 */
export function SombraNoChao({
  x,
  z,
  raio,
  camera,
}: {
  x: number
  z: number
  raio: number
  camera: CameraPerspectiva
}) {
  const projetar = projetorPerspectiva(camera)
  const pontos = Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2
    return projetar({ x: x + Math.cos(a) * raio, y: 0, z: z + Math.sin(a) * raio })
  })
  return <path data-sombra className="fill-scene-ink" d={caminhoDe(pontos)} opacity={0.2} />
}

/**
 * As cores dos eixos, as do AxesHelper do Estúdio (`studio/src/blockly/blocks/canvas3d.ts`): x
 * vermelho, y verde, z azul. ⚠️ São tokens da CENA (a cor do alerta, a folha e o azul do par), que já
 * passam no contraste do papel; uma cor crua do three.js (#ff0000) não passaria.
 */
export const COR_DO_EIXO = {
  x: { traco: 'stroke-scene-alert', tinta: 'fill-scene-alert' },
  y: { traco: 'stroke-scene-leaf', tinta: 'fill-scene-leaf' },
  z: { traco: 'stroke-scene-a', tinta: 'fill-scene-a' },
} as const
