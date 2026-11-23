/**
 * A medida de um mundo grande numa placa de vídeo de verdade (plano "Mundos de 2 km", lote 0,
 * 23/11/2026). O herói percorre uma rota pelo mundo, sem parar, e cada quadro registra o tempo, os
 * desenhos e os triângulos; cada entrada numa região registra os quadros dos 2 s seguintes (é ali
 * que a carga acontece). No fim vêm a memória, a placa de vídeo e a rota.
 *
 * Três usos, um código: a prova local `e2e/grande-gpu.spec.ts` (Playwright com janela, a placa de
 * vídeo desta máquina), a página de medida do staging (lote 8) e os testes deste arquivo.
 *
 * ⚠️ `medirNoNavegador` roda DENTRO da página por texto (`codigoDaMedida`): nada de importar nem de
 * chamar funções do módulo lá dentro. As ajudantes puras chegam como argumento, e cada uma também
 * não pode chamar outra do módulo.
 */

export interface PontoDaRota {
  x: number
  z: number
}

export interface CaixaDaRegiao {
  x0: number
  x1: number
  z0: number
  z1: number
}

export interface OpcoesDaMedida {
  /** Pontos por onde o herói passa; sem eles, os centros das regiões, do mais perto, e de volta. */
  rota?: PontoDaRota[]
  /** Metros por segundo. */
  velocidade: number
  /** Quadros que não entram na conta (a carga inicial e o aquecimento dos shaders). */
  aquecimentoMs: number
  duracaoMs: number
}

export interface EntradaNaRegiao {
  regiao: string
  quadros: number
  acima100: number
  acima200: number
  piorMs: number
}

export interface MedidaDoMundo {
  gpu: string
  duracaoMs: number
  quadros: number
  fpsMediano: number
  quadroMs: { p50: number; p95: number; p99: number; maximo: number }
  desenhos: { p50: number; p95: number; maximo: number } | null
  triangulos: { p50: number; p95: number; maximo: number } | null
  entradas: EntradaNaRegiao[]
  regioesVisitadas: string[]
  memoria: {
    heapJs: number | null
    geometrias: number | null
    texturas: number | null
    programas: number | null
    /** Largura × altura × 4 de cada textura viva na cena (× 4/3 com mipmaps). */
    bytesDeTexturas: number
  }
  rota: { pontos: number; metros: number; voltas: number }
}

/**
 * Os centros das regiões numa ordem que anda pouco: a partir do `inicio`, sempre o centro mais
 * perto que falta, e no fim de volta ao início.
 */
export function rotaPelasRegioes(
  caixas: readonly CaixaDaRegiao[],
  inicio: PontoDaRota,
): PontoDaRota[] {
  const resto = caixas.map((c) => ({ x: (c.x0 + c.x1) / 2, z: (c.z0 + c.z1) / 2 }))
  const rota: PontoDaRota[] = [{ x: inicio.x, z: inicio.z }]
  while (resto.length > 0) {
    const ultimo = rota[rota.length - 1] as PontoDaRota
    let melhor = 0
    let distancia = Number.POSITIVE_INFINITY
    for (let i = 0; i < resto.length; i++) {
      const c = resto[i] as PontoDaRota
      const d = Math.hypot(c.x - ultimo.x, c.z - ultimo.z)
      if (d < distancia) {
        distancia = d
        melhor = i
      }
    }
    rota.push(resto.splice(melhor, 1)[0] as PontoDaRota)
  }
  rota.push({ x: inicio.x, z: inicio.z })
  return rota
}

/**
 * Um retângulo no meio do terreno (de 25% a 75% de cada lado), fechado: a rota de um mundo sem
 * regiões. `null` sem terreno.
 */
export function rotaPeloTerreno(
  terreno: {
    origem: { x: number; z: number }
    passo: number
    colunas: number
    linhas: number
  } | null,
): PontoDaRota[] | null {
  if (!terreno) return null
  const largura = terreno.colunas * terreno.passo,
    fundo = terreno.linhas * terreno.passo,
    x0 = terreno.origem.x + largura * 0.25,
    x1 = terreno.origem.x + largura * 0.75,
    z0 = terreno.origem.z + fundo * 0.25,
    z1 = terreno.origem.z + fundo * 0.75
  return [
    { x: x0, z: z0 },
    { x: x1, z: z0 },
    { x: x1, z: z1 },
    { x: x0, z: z1 },
    { x: x0, z: z0 },
  ]
}

/** O ponto a `s` metros do começo da rota, dando quantas voltas for preciso. */
export function pontoNaRota(rota: readonly PontoDaRota[], s: number): PontoDaRota {
  const primeiro = rota[0]
  if (!primeiro) return { x: 0, z: 0 }
  let total = 0
  for (let i = 0; i + 1 < rota.length; i++) {
    const a = rota[i] as PontoDaRota,
      b = rota[i + 1] as PontoDaRota
    total += Math.hypot(b.x - a.x, b.z - a.z)
  }
  if (!(total > 0)) return { x: primeiro.x, z: primeiro.z }
  let resto = ((s % total) + total) % total
  for (let i = 0; i + 1 < rota.length; i++) {
    const a = rota[i] as PontoDaRota,
      b = rota[i + 1] as PontoDaRota,
      trecho = Math.hypot(b.x - a.x, b.z - a.z)
    if (resto <= trecho && trecho > 0) {
      const t = resto / trecho
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }
    }
    resto -= trecho
  }
  const ultimo = rota[rota.length - 1] as PontoDaRota
  return { x: ultimo.x, z: ultimo.z }
}

/** O comprimento da rota em metros. */
export function metrosDaRota(rota: readonly PontoDaRota[]): number {
  let total = 0
  for (let i = 0; i + 1 < rota.length; i++) {
    const a = rota[i] as PontoDaRota,
      b = rota[i + 1] as PontoDaRota
    total += Math.hypot(b.x - a.x, b.z - a.z)
  }
  return total
}

/** O valor no quantil `p` (0 a 1), pelo posto mais próximo; `NaN` sem valores. */
export function quantil(valores: readonly number[], p: number): number {
  const ordenados = [...valores].sort((a, b) => a - b)
  return (
    ordenados[Math.min(ordenados.length - 1, Math.ceil(p * ordenados.length) - 1)] ?? Number.NaN
  )
}

/** A placa de vídeo é emulada (o CI, sem placa: SwiftShader; Linux sem driver: llvmpipe)? */
export function gpuEmulada(renderizador: string): boolean {
  return /swiftshader|llvmpipe|software|basic render/i.test(renderizador)
}

interface Ajudantes {
  rotaPelasRegioes: typeof rotaPelasRegioes
  rotaPeloTerreno: typeof rotaPeloTerreno
  pontoNaRota: typeof pontoNaRota
  metrosDaRota: typeof metrosDaRota
  quantil: typeof quantil
}

interface JanelaDoJogoE {
  SZGame3D: { setPosition(o: unknown, x: number, y: number, z: number): void }
  __qaJogoE: {
    heroi: { position: { x: number; y: number; z: number } }
    cena: {
      scene?: { traverse(f: (o: unknown) => void): void }
      renderer?: {
        getContext(): WebGLRenderingContext | WebGL2RenderingContext
        info: {
          render: { calls: number; triangles: number }
          memory: { geometries: number; textures: number }
          programs?: unknown[] | null
        }
      }
      _sceneHandle?: {
        alturas?: (x: number, z: number) => number
        dados: {
          regioes?: Array<{ id: string; nome: string; caixa: CaixaDaRegiao }>
          terreno?: {
            origem: { x: number; z: number }
            passo: number
            colunas: number
            linhas: number
          }
        }
        estadoDasRegioes(): { atual: string | null } | null
      }
    }
  }
}

/** Roda NA PÁGINA do jogo (com `window.__qaJogoE`); ver `codigoDaMedida`. */
export async function medirNoNavegador(
  opcoes: OpcoesDaMedida,
  ajudantes: Ajudantes,
): Promise<MedidaDoMundo> {
  const w = window as unknown as JanelaDoJogoE
  const { cena, heroi } = w.__qaJogoE
  const h = cena._sceneHandle
  const renderer = cena.renderer
  let gpu = 'sem WebGL'
  const gl = renderer?.getContext()
  if (gl) {
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    gpu = String(
      info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    )
  }
  const regioes = h?.dados.regioes ?? []
  const inicio = { x: heroi.position.x, z: heroi.position.z }
  const rota: PontoDaRota[] = (opcoes.rota?.length ? opcoes.rota : null) ??
    (regioes.length
      ? ajudantes.rotaPelasRegioes(
          regioes.map((r) => r.caixa),
          inicio,
        )
      : null) ??
    ajudantes.rotaPeloTerreno(h?.dados.terreno ?? null) ?? [inicio]
  const metros = ajudantes.metrosDaRota(rota)
  const nomeDe = (id: string) => regioes.find((r) => r.id === id)?.nome ?? id

  const quadros: number[] = [],
    desenhos: number[] = [],
    triangulos: number[] = [],
    entradas: Array<{ regiao: string; ate: number; intervalos: number[] }> = [],
    visitadas = new Set<string>()
  let atual = h?.estadoDasRegioes()?.atual ?? null
  if (atual) visitadas.add(nomeDe(atual))
  const t0 = performance.now()
  let antes = t0
  await new Promise<void>((pronto) => {
    const passo = (agora: number) => {
      const dt = agora - antes
      antes = agora
      const decorrido = agora - t0
      const andou = (opcoes.velocidade * Math.max(0, decorrido - opcoes.aquecimentoMs)) / 1000
      const p = ajudantes.pontoNaRota(rota, andou)
      const chao = h?.alturas ? h.alturas(p.x, p.z) : Number.NaN
      // A física do jogo segura o herói; aqui só não o deixamos afundar numa subida.
      const y = Number.isFinite(chao) ? Math.max(heroi.position.y, chao + 0.05) : heroi.position.y
      w.SZGame3D.setPosition(heroi, p.x, y, p.z)
      const medindo = decorrido > opcoes.aquecimentoMs
      if (medindo) {
        quadros.push(dt)
        const render = renderer?.info.render
        if (render) {
          desenhos.push(render.calls)
          triangulos.push(render.triangles)
        }
      }
      const regiao = h?.estadoDasRegioes()?.atual ?? null
      if (regiao !== atual) {
        atual = regiao
        if (regiao) {
          visitadas.add(nomeDe(regiao))
          if (medindo) entradas.push({ regiao: nomeDe(regiao), ate: agora + 2000, intervalos: [] })
        }
      }
      const ultima = entradas[entradas.length - 1]
      if (ultima && agora <= ultima.ate) ultima.intervalos.push(dt)
      if (decorrido < opcoes.aquecimentoMs + opcoes.duracaoMs) requestAnimationFrame(passo)
      else pronto()
    }
    requestAnimationFrame(passo)
  })

  // As texturas vivas na cena do jogo, cada uma uma vez.
  const texturas = new Set<{
    image?: { width?: number; height?: number } | null
    mipmaps?: unknown[]
    generateMipmaps?: boolean
  }>()
  cena.scene?.traverse((o) => {
    const material = (o as { material?: unknown }).material
    for (const m of Array.isArray(material) ? material : material ? [material] : [])
      for (const valor of Object.values(m as Record<string, unknown>))
        if (valor && typeof valor === 'object' && (valor as { isTexture?: boolean }).isTexture)
          texturas.add(valor as never)
  })
  let bytesDeTexturas = 0
  for (const t of texturas) {
    const largura = Number(t.image?.width ?? 0),
      altura = Number(t.image?.height ?? 0)
    if (!(largura > 0 && altura > 0)) continue
    const comMip = t.generateMipmaps || (t.mipmaps?.length ?? 0) > 1
    bytesDeTexturas += largura * altura * 4 * (comMip ? 4 / 3 : 1)
  }

  const resumo = (valores: number[]) =>
    valores.length
      ? {
          p50: ajudantes.quantil(valores, 0.5),
          p95: ajudantes.quantil(valores, 0.95),
          maximo: Math.max(...valores),
        }
      : null
  const p50 = ajudantes.quantil(quadros, 0.5)
  const info = renderer?.info
  return {
    gpu,
    duracaoMs: opcoes.duracaoMs,
    quadros: quadros.length,
    fpsMediano: Math.round((1000 / p50) * 10) / 10,
    quadroMs: {
      p50,
      p95: ajudantes.quantil(quadros, 0.95),
      p99: ajudantes.quantil(quadros, 0.99),
      maximo: quadros.length ? Math.max(...quadros) : Number.NaN,
    },
    desenhos: resumo(desenhos),
    triangulos: resumo(triangulos),
    entradas: entradas.map((e) => ({
      regiao: e.regiao,
      quadros: e.intervalos.length,
      acima100: e.intervalos.filter((d) => d > 100).length,
      acima200: e.intervalos.filter((d) => d > 200).length,
      piorMs: e.intervalos.length ? Math.max(...e.intervalos) : 0,
    })),
    regioesVisitadas: [...visitadas],
    memoria: {
      heapJs:
        (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
          ?.usedJSHeapSize ?? null,
      geometrias: info?.memory.geometries ?? null,
      texturas: info?.memory.textures ?? null,
      programas: info?.programs?.length ?? null,
      bytesDeTexturas: Math.round(bytesDeTexturas),
    },
    rota: {
      pontos: rota.length,
      metros: Math.round(metros),
      voltas:
        metros > 0
          ? Math.round(((opcoes.velocidade * opcoes.duracaoMs) / 1000 / metros) * 100) / 100
          : 0,
    },
  }
}

/** A expressão que roda `medirNoNavegador` na página, com as ajudantes por texto. */
export function codigoDaMedida(opcoes: OpcoesDaMedida): string {
  const ajudantes = [rotaPelasRegioes, rotaPeloTerreno, pontoNaRota, metrosDaRota, quantil]
    .map((f) => `${f.name}: ${f.toString()}`)
    .join(',\n')
  return `(${medirNoNavegador.toString()})(${JSON.stringify(opcoes)}, {\n${ajudantes}\n})`
}
