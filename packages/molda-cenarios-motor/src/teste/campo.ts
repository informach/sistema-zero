import { Box3, Ray, Vector3 } from 'three'

/**
 * O relevo como CAMPO DE ALTURAS na colisão (plano "Mundos de 2 km", lote 1, 23/11/2026,
 * `docs/plans/2026-11-23-mundos-de-2km.md`). Até aqui o chão ia ao pacote duas vezes, como malha
 * desenhada e como malha de colisão (`colisoes/chao-*.glb`), e é isso que não cabe num mundo grande.
 * Aqui as mesmas consultas da colisão (`MundoDoTeste`) leem a grade de alturas direto, sem malha nem
 * árvore: os triângulos de cada célula são montados na hora, com a MESMA diagonal da malha desenhada
 * (`malhaDeGradeNaPeca`, índices `[a, c, b, b, c, d]`) e da interpolação
 * (`interpolarAlturasDaCelula`).
 *
 * Nada aqui guarda cópia das alturas: o campo é lido de quem o carregou (a regra do "× 8" do
 * orçamento da janela, `compilar/conteudo.ts`).
 */
export interface CampoDeColisao {
  readonly origem: { readonly x: number; readonly z: number }
  readonly passo: number
  readonly colunas: number
  readonly linhas: number
  /** `(colunas + 1) × (linhas + 1)` alturas, linha a linha (z cresce a cada linha). */
  readonly alturas: ArrayLike<number>
  /** `colunas × linhas`; 1 = célula sem chão (buraco), como a máscara do terreno compilado. */
  readonly buracos?: ArrayLike<number>
}

export interface ContatoNoCampo {
  ponto: Vector3
  normal: Vector3
  distancia: number
}

/** Confere a forma do campo; lança com a frase do problema. */
export function conferirCampo(campo: CampoDeColisao): void {
  const { passo, colunas, linhas, origem } = campo
  if (!(Number.isFinite(passo) && passo > 0))
    throw new Error('O passo do campo de alturas é inválido.')
  if (!Number.isSafeInteger(colunas) || !Number.isSafeInteger(linhas) || colunas < 1 || linhas < 1)
    throw new Error('O tamanho do campo de alturas é inválido.')
  if (!Number.isFinite(origem.x) || !Number.isFinite(origem.z))
    throw new Error('A origem do campo de alturas é inválida.')
  if (campo.alturas.length !== (colunas + 1) * (linhas + 1))
    throw new Error('As alturas não correspondem à grade do campo.')
  if (campo.buracos && campo.buracos.length !== colunas * linhas)
    throw new Error('Os buracos não correspondem à grade do campo.')
  for (let i = 0; i < campo.alturas.length; i++)
    if (!Number.isFinite(campo.alturas[i])) throw new Error('O campo tem uma altura inválida.')
}

/** A caixa do campo no mundo (o mínimo e o máximo das alturas). */
export function limitesDoCampo(campo: CampoDeColisao, alvo = new Box3()): Box3 {
  let min = Number.POSITIVE_INFINITY,
    max = Number.NEGATIVE_INFINITY
  for (let i = 0; i < campo.alturas.length; i++) {
    const h = campo.alturas[i] as number
    if (h < min) min = h
    if (h > max) max = h
  }
  alvo.min.set(campo.origem.x, min, campo.origem.z)
  alvo.max.set(
    campo.origem.x + campo.colunas * campo.passo,
    max,
    campo.origem.z + campo.linhas * campo.passo,
  )
  return alvo
}

const buraco = (campo: CampoDeColisao, ix: number, iz: number) =>
  campo.buracos ? campo.buracos[iz * campo.colunas + ix] === 1 : false

/**
 * Um dos dois triângulos da célula (`ix`, `iz`) no mundo, na ordem da malha desenhada: o 0 é
 * `[a, c, b]` e o 1 é `[b, c, d]` (a diagonal vai de `b`, canto de x maior, a `c`, canto de z maior).
 */
export function trianguloDoCampo(
  campo: CampoDeColisao,
  ix: number,
  iz: number,
  qual: 0 | 1,
  a: Vector3,
  b: Vector3,
  c: Vector3,
): void {
  const largura = campo.colunas + 1,
    i = iz * largura + ix,
    x0 = campo.origem.x + ix * campo.passo,
    z0 = campo.origem.z + iz * campo.passo,
    x1 = x0 + campo.passo,
    z1 = z0 + campo.passo
  const hA = campo.alturas[i] as number,
    hB = campo.alturas[i + 1] as number,
    hC = campo.alturas[i + largura] as number,
    hD = campo.alturas[i + largura + 1] as number
  if (qual === 0) {
    a.set(x0, hA, z0)
    b.set(x0, hC, z1)
    c.set(x1, hB, z0)
  } else {
    a.set(x1, hB, z0)
    b.set(x0, hC, z1)
    c.set(x1, hD, z1)
  }
}

/**
 * Visita os triângulos das células que o retângulo [x0, x1] × [z0, z1] toca, sem os buracos. O
 * índice é `(iz × colunas + ix) × 2 + qual`, estável. Os vetores são reaproveitados entre visitas:
 * quem precisa guardar copia. `visitar` devolve `true` para parar.
 */
export function paraCadaTrianguloNaCaixa(
  campo: CampoDeColisao,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  visitar: (indice: number, a: Vector3, b: Vector3, c: Vector3) => boolean | undefined,
): void {
  const p = campo.passo,
    gx0 = Math.floor((Math.min(x0, x1) - campo.origem.x) / p),
    gx1 = Math.floor((Math.max(x0, x1) - campo.origem.x) / p),
    gz0 = Math.floor((Math.min(z0, z1) - campo.origem.z) / p),
    gz1 = Math.floor((Math.max(z0, z1) - campo.origem.z) / p)
  if (gx1 < 0 || gz1 < 0 || gx0 >= campo.colunas || gz0 >= campo.linhas) return
  const a = new Vector3(),
    b = new Vector3(),
    c = new Vector3()
  for (let iz = Math.max(0, gz0); iz <= Math.min(campo.linhas - 1, gz1); iz++)
    for (let ix = Math.max(0, gx0); ix <= Math.min(campo.colunas - 1, gx1); ix++) {
      if (buraco(campo, ix, iz)) continue
      for (const qual of [0, 1] as const) {
        trianguloDoCampo(campo, ix, iz, qual, a, b, c)
        if (visitar((iz * campo.colunas + ix) * 2 + qual, a, b, c) === true) return
      }
    }
}

/**
 * O primeiro contato do segmento `de` → `ate` com o campo, como o `rastrear` do `MundoDoTeste`
 * (os dois lados das faces; a normal virada contra o raio). Anda pela grade célula a célula, na
 * ordem do segmento (Amanatides e Woo): a primeira célula com contato tem o contato mais perto,
 * porque o ponto de contato fica sempre dentro da célula.
 */
export function rastrearNoCampo(
  campo: CampoDeColisao,
  de: Vector3,
  ate: Vector3,
): ContatoNoCampo | null {
  const dx = ate.x - de.x,
    dy = ate.y - de.y,
    dz = ate.z - de.z,
    tamanho = Math.hypot(dx, dy, dz)
  if (tamanho < 1e-9) return null
  const p = campo.passo,
    gx0 = (de.x - campo.origem.x) / p,
    gz0 = (de.z - campo.origem.z) / p,
    gdx = dx / p,
    gdz = dz / p
  // O trecho do segmento (t de 0 a 1) que passa sobre a grade.
  let t0 = 0,
    t1 = 1
  for (const [g, d, n] of [
    [gx0, gdx, campo.colunas],
    [gz0, gdz, campo.linhas],
  ] as const) {
    if (d === 0) {
      if (g < 0 || g > n) return null
    } else {
      const ta = (0 - g) / d,
        tb = (n - g) / d
      t0 = Math.max(t0, Math.min(ta, tb))
      t1 = Math.min(t1, Math.max(ta, tb))
    }
  }
  if (t0 > t1) return null
  const celula = (g: number, n: number) => Math.min(n - 1, Math.max(0, Math.floor(g)))
  let ix = celula(gx0 + gdx * t0, campo.colunas),
    iz = celula(gz0 + gdz * t0, campo.linhas)
  const passoX = gdx > 0 ? 1 : -1,
    passoZ = gdz > 0 ? 1 : -1,
    deltaX = gdx === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / gdx),
    deltaZ = gdz === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / gdz)
  let proximoX = gdx === 0 ? Number.POSITIVE_INFINITY : ((gdx > 0 ? ix + 1 : ix) - gx0) / gdx,
    proximoZ = gdz === 0 ? Number.POSITIVE_INFINITY : ((gdz > 0 ? iz + 1 : iz) - gz0) / gdz
  const raio = new Ray(de.clone(), new Vector3(dx, dy, dz).multiplyScalar(1 / tamanho)),
    a = new Vector3(),
    b = new Vector3(),
    c = new Vector3(),
    ponto = new Vector3()
  for (;;) {
    if (!buraco(campo, ix, iz)) {
      let melhor: ContatoNoCampo | null = null
      for (const qual of [0, 1] as const) {
        trianguloDoCampo(campo, ix, iz, qual, a, b, c)
        if (!raio.intersectTriangle(a, b, c, false, ponto)) continue
        const distancia = de.distanceTo(ponto)
        if (distancia > tamanho || (melhor && distancia >= melhor.distancia)) continue
        const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize()
        if (normal.dot(raio.direction) > 0) normal.negate()
        melhor = { ponto: ponto.clone(), normal, distancia }
      }
      if (melhor) return melhor
    }
    if (proximoX < proximoZ) {
      if (proximoX > t1) return null
      ix += passoX
      proximoX += deltaX
    } else {
      if (proximoZ > t1) return null
      iz += passoZ
      proximoZ += deltaZ
    }
    if (ix < 0 || iz < 0 || ix >= campo.colunas || iz >= campo.linhas) return null
  }
}
