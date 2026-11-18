import {
  alturaDoCampo,
  amostrasDaPeca,
  type CampoDeAlturas,
  campoDaBase,
  clonarCampo,
  criarCampoDeAlturas,
  pecasDaRegiao,
  type RegiaoDoCampo,
} from './campo-de-alturas'
import { igual } from './igual'
import {
  type BuracosDoTerreno,
  codificarBuracosDaPeca,
  codificarPecaDePintura,
  colocarBuracosDaPeca,
  colocarPecaDePintura,
  criarBuracos,
  criarPinturaDeChao,
  type PinturaDeChao,
} from './pintura-de-chao'
import {
  codificarRecursoDeBuracos,
  metadadosDoTerrenoCorrespondem,
  type RecursoDeTerreno,
  referenciasDoTerreno,
} from './recursos-de-terreno'
import {
  type BaseDeTerreno,
  BaseDeTerrenoSchema,
  codificarPecaDeAlturas,
  type PecaDeAlturas,
  TerrenoInvalido,
} from './terreno'

export interface EstadoDoTerreno {
  campo: CampoDeAlturas
  pintura: PinturaDeChao
  buracos: BuracosDoTerreno
}
export const clonarEstadoDoTerreno = (e: EstadoDoTerreno): EstadoDoTerreno => ({
  campo: clonarCampo(e.campo),
  pintura: { ...e.pintura, pesos: e.pintura.pesos.slice() },
  buracos: { ...e.buracos, celulas: e.buracos.celulas.slice() },
})
export type PapelDaPeca = 'alturas' | 'pintura' | 'buracos'
export interface PecaDeEdicao {
  papel: PapelDaPeca
  coluna: number
  linha: number
  /** Nulo retira a referência, restaurando o fundo/pintura inicial/células fechadas. */
  conteudo: Uint8Array<ArrayBuffer> | null
}

/** Confere cada papel antes de expandir os recursos imutáveis para o campo de trabalho. */
export function abrirEdicaoDeTerreno(
  base: BaseDeTerreno,
  recursos: ReadonlyMap<string, RecursoDeTerreno>,
): EstadoDoTerreno {
  BaseDeTerrenoSchema.parse(base)
  for (const ref of referenciasDoTerreno(base)) {
    const recurso = recursos.get(ref.digest)
    if (!recurso || !metadadosDoTerrenoCorrespondem(recurso.metadados, ref.esperado))
      throw new TerrenoInvalido(`O recurso não corresponde ao terreno: ${ref.digest}`)
  }
  const alturas = new Map<string, PecaDeAlturas>()
  for (const ref of base.pecas) {
    const recurso = recursos.get(ref.digest)!
    if (recurso.tipo === 'alturas') alturas.set(ref.digest, recurso.alturas)
  }
  const estado: EstadoDoTerreno = {
    campo: campoDaBase(base, alturas),
    pintura: criarPinturaDeChao(base, base.solo?.camadas.length ?? 1),
    buracos: criarBuracos(base),
  }
  for (const ref of base.solo?.pecas ?? []) {
    const recurso = recursos.get(ref.digest)!
    if (recurso.tipo === 'pintura')
      colocarPecaDePintura(estado.pintura, ref.coluna, ref.linha, {
        camadas: recurso.metadados.camadas,
        pesos: recurso.pesos,
      })
  }
  for (const ref of base.buracos ?? []) {
    const recurso = recursos.get(ref.digest)!
    if (recurso.tipo === 'buracos')
      colocarBuracosDaPeca(estado.buracos, ref.coluna, ref.linha, recurso.bits)
  }
  return estado
}

/** Somente regiões sujas são codificadas. O chamador calcula SHA/envia antes de gravar a base. */
export function prepararPecasEditadas(
  base: BaseDeTerreno,
  estado: EstadoDoTerreno,
  regioes: Partial<Record<PapelDaPeca, RegiaoDoCampo | null>>,
): PecaDeEdicao[] {
  const resultado: PecaDeEdicao[] = []
  for (const papel of ['alturas', 'pintura', 'buracos'] as const) {
    for (const posicao of pecasDaRegiao(estado.campo, regioes[papel] ?? null)) {
      let conteudo: Uint8Array<ArrayBuffer> | null
      if (papel === 'alturas') {
        const amostras = amostrasDaPeca(estado.campo, posicao.coluna, posicao.linha)
        const q = Math.round(
          ((base.fundo - estado.campo.min) / (estado.campo.max - estado.campo.min)) * 65535,
        )
        conteudo = amostras.every(
          (h) =>
            Math.round(((h - estado.campo.min) / (estado.campo.max - estado.campo.min)) * 65535) ===
            q,
        )
          ? null
          : codificarPecaDeAlturas(amostras, estado.campo.min, estado.campo.max)
      } else if (papel === 'pintura') {
        const bytes = codificarPecaDePintura(estado.pintura, posicao.coluna, posicao.linha)
        const n = estado.pintura.camadas
        conteudo = bytes.subarray(8).every((v, i) => v === (i % n === 0 ? 255 : 0)) ? null : bytes
      } else {
        const bits = codificarBuracosDaPeca(estado.buracos, posicao.coluna, posicao.linha)
        conteudo = bits.some((v) => v !== 0) ? codificarRecursoDeBuracos(bits) : null
      }
      resultado.push({ ...posicao, papel, conteudo })
    }
  }
  return resultado
}

/** Aplica digests já calculados. Nenhum arquivo ou base anterior é alterado. */
export function baseComPecasEditadas(
  base: BaseDeTerreno,
  pecas: readonly { papel: PapelDaPeca; coluna: number; linha: number; digest: string | null }[],
): BaseDeTerreno {
  const nova = structuredClone(base)
  for (const papel of ['alturas', 'pintura', 'buracos'] as const) {
    const alteradas = pecas.filter((p) => p.papel === papel)
    if (!alteradas.length) continue
    const lista =
      papel === 'alturas'
        ? nova.pecas
        : papel === 'pintura'
          ? nova.solo?.pecas
          : (nova.buracos ?? [])
    if (!lista) throw new TerrenoInvalido('Defina as camadas de solo antes de pintar')
    const porPosicao = new Map(lista.map((p) => [`${p.coluna}:${p.linha}`, p]))
    const vistos = new Set<string>()
    for (const p of alteradas) {
      const chave = `${p.coluna}:${p.linha}`
      if (
        vistos.has(chave) ||
        !Number.isInteger(p.coluna) ||
        !Number.isInteger(p.linha) ||
        p.coluna < 0 ||
        p.linha < 0 ||
        p.coluna >= base.colunas / 64 ||
        p.linha >= base.linhas / 64
      )
        throw new TerrenoInvalido('A peça editada se repete ou está fora do terreno')
      vistos.add(chave)
      if (p.digest === null) porPosicao.delete(chave)
      else porPosicao.set(chave, { coluna: p.coluna, linha: p.linha, digest: p.digest })
    }
    const ordenadas = [...porPosicao.values()]
    if (papel === 'alturas') nova.pecas = ordenadas
    else if (papel === 'pintura') nova.solo!.pecas = ordenadas
    else if (ordenadas.length) nova.buracos = ordenadas
    else delete nova.buracos
  }
  BaseDeTerrenoSchema.parse(nova)
  return igual(nova, base) ? base : nova
}

/** Redimensiona em coordenadas de mundo. Buracos usam cobertura conservadora, sem fechar pequenas aberturas. */
export function reamostrarTerreno(
  anterior: EstadoDoTerreno,
  forma: Pick<BaseDeTerreno, 'origem' | 'colunas' | 'linhas' | 'passo' | 'min' | 'max' | 'fundo'>,
): EstadoDoTerreno {
  BaseDeTerrenoSchema.parse({ tipo: 'terreno', ...forma, pecas: [] })
  const c = anterior.campo,
    campo = criarCampoDeAlturas(forma, forma.fundo),
    pintura = criarPinturaDeChao(forma, anterior.pintura.camadas),
    buracos = criarBuracos(forma)
  const dentro = (x: number, z: number) =>
    x >= c.origem.x &&
    z >= c.origem.z &&
    x <= c.origem.x + c.colunas * c.passo &&
    z <= c.origem.z + c.linhas * c.passo
  const n = pintura.camadas,
    pesos = new Float64Array(n),
    restos = new Float64Array(n)
  for (let z = 0; z <= campo.linhas; z++)
    for (let x = 0; x <= campo.colunas; x++) {
      const wx = campo.origem.x + x * campo.passo,
        wz = campo.origem.z + z * campo.passo
      if (!dentro(wx, wz)) continue
      const i = z * (campo.colunas + 1) + x
      campo.alturas[i] = Math.max(campo.min, Math.min(campo.max, alturaDoCampo(c, wx, wz)))
      const gx = (wx - c.origem.x) / c.passo,
        gz = (wz - c.origem.z) / c.passo,
        ix = Math.min(c.colunas - 1, Math.floor(gx)),
        iz = Math.min(c.linhas - 1, Math.floor(gz)),
        u = gx - ix,
        v = gz - iz
      let soma = 0
      for (let k = 0; k < n; k++) {
        const ler = (dx: number, dz: number) =>
          anterior.pintura.pesos[((iz + dz) * (c.colunas + 1) + ix + dx) * n + k]!
        pesos[k] =
          ler(0, 0) * (1 - u) * (1 - v) +
          ler(1, 0) * u * (1 - v) +
          ler(0, 1) * (1 - u) * v +
          ler(1, 1) * u * v
        const inteiro = Math.floor(pesos[k]! + 1e-9)
        pintura.pesos[i * n + k] = inteiro
        restos[k] = pesos[k]! - inteiro
        soma += inteiro
      }
      while (soma < 255) {
        let maior = 0
        for (let k = 1; k < n; k++) if (restos[k]! > restos[maior]!) maior = k
        pintura.pesos[i * n + maior] = pintura.pesos[i * n + maior]! + 1
        restos[maior] = -1
        soma++
      }
    }
  if (anterior.buracos.celulas.some((v) => v !== 0)) {
    const largura = c.colunas + 1,
      soma = new Uint32Array(largura * (c.linhas + 1))
    for (let z = 0; z < c.linhas; z++) {
      let linha = 0
      for (let x = 0; x < c.colunas; x++) {
        linha += anterior.buracos.celulas[z * c.colunas + x]!
        soma[(z + 1) * largura + x + 1] = soma[z * largura + x + 1]! + linha
      }
    }
    const limitarX = (x: number) => Math.max(0, Math.min(c.colunas, x))
    const limitarZ = (z: number) => Math.max(0, Math.min(c.linhas, z))
    for (let z = 0; z < campo.linhas; z++)
      for (let x = 0; x < campo.colunas; x++) {
        const wx = campo.origem.x + x * campo.passo,
          wz = campo.origem.z + z * campo.passo,
          x0 = limitarX(Math.floor((wx - c.origem.x) / c.passo)),
          z0 = limitarZ(Math.floor((wz - c.origem.z) / c.passo)),
          x1 = limitarX(Math.ceil((wx + campo.passo - c.origem.x) / c.passo)),
          z1 = limitarZ(Math.ceil((wz + campo.passo - c.origem.z) / c.passo))
        const abertas =
          soma[z1 * largura + x1]! -
          soma[z0 * largura + x1]! -
          soma[z1 * largura + x0]! +
          soma[z0 * largura + x0]!
        if (abertas > 0) buracos.celulas[z * campo.colunas + x] = 1
      }
  }
  return { campo, pintura, buracos }
}
