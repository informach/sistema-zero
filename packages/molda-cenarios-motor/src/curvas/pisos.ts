import { recortarAtributos } from '@sistemazero/molda-cenarios-core/geometria'
import {
  type BaseDeCenario,
  type CaminhoDeCenario,
  type EstadoDoTerreno,
  medidasDaPecaDeCaminho,
  type PontoNoChao,
  pontoNoPoligono,
} from '@sistemazero/molda-cenarios-core/v2'
import { BufferAttribute, BufferGeometry, Matrix4, ShapeUtils, Vector2 } from 'three'
import type { ModeloCarregado } from '../modelos'
import { conformarParteAoChao, type ParteConformada } from './geometria'
import { lerParteEstatica } from './parte-estatica'
import { perfilDoPiso } from './perfil-do-piso'

type Atributos = ReturnType<typeof recortarAtributos>
const MAX_VERTICES = 600_000,
  MAX_PECAS = 20_000,
  MAX_TRABALHO = 4_000_000

/** Junta antes da conformação: a atualização de alturas mantém o buffer efetivamente desenhado. */
function juntar(partes: Atributos[], quantidade: number): BufferGeometry {
  const geometria = new BufferGeometry()
  if (!partes.length)
    return geometria.setAttribute('position', new BufferAttribute(new Float32Array(), 3))
  for (const [nome, a] of Object.entries(partes[0]!)) {
    const valores = new Float32Array(quantidade * a.itemSize)
    let posicao = 0
    for (const parte of partes) {
      valores.set(parte[nome]!.valores, posicao)
      posicao += parte[nome]!.valores.length
    }
    geometria.setAttribute(nome, new BufferAttribute(valores, a.itemSize))
  }
  return geometria
}

/** Peças medidas, sem esticar o último módulo nem alterar o GLB de origem. */
export function montarPisoDeModelo(
  caminho: CaminhoDeCenario,
  modelo: ModeloCarregado,
  base: BaseDeCenario,
  estado: EstadoDoTerreno | null,
  excluir: readonly (readonly PontoNoChao[])[] = [],
) {
  if (!['trilha', 'estrada', 'praca'].includes(caminho.tipo))
    throw Error('Este acabamento de piso requer trilha, estrada ou praça.')
  const medidas = medidasDaPecaDeCaminho(caminho, {
      min: { x: modelo.caixa.min.x, y: modelo.caixa.min.y, z: modelo.caixa.min.z },
      max: { x: modelo.caixa.max.x, y: modelo.caixa.max.y, z: modelo.caixa.max.z },
    }),
    {
      eixo,
      transversal,
      inicio,
      fim,
      centroTransversal,
      baseLocal,
      escalaTransversal: escala,
    } = medidas,
    perfil = perfilDoPiso(caminho),
    unidade = (fim - inicio) * escala,
    largura = caminho.largura,
    poligono = perfil.curva.pontos,
    xs = poligono.map((p) => p.x),
    zs = poligono.map((p) => p.z),
    minX = Math.min(...xs),
    minZ = Math.min(...zs),
    maxX = Math.max(...xs),
    maxZ = Math.max(...zs),
    colunas = Math.max(1, Math.ceil((maxX - minX) / unidade)),
    linhas = Math.max(1, Math.ceil((maxZ - minZ) / largura)),
    quantidade =
      caminho.tipo === 'praca' ? colunas * linhas : Math.ceil(perfil.curva.comprimento / unidade)
  if (!Number.isFinite(quantidade) || quantidade > MAX_PECAS)
    throw Error('O acabamento exige peças demais. Aumente o módulo ou divida o caminho.')
  // Exterior triangulado, subtraído uma vez por tile; conserva contornos côncavos.
  const margem = Math.max(unidade, largura),
    externo = [
      new Vector2(minX - margem, minZ - margem),
      new Vector2(maxX + margem, minZ - margem),
      new Vector2(maxX + margem, maxZ + margem),
      new Vector2(minX - margem, maxZ + margem),
    ],
    buraco = poligono.map((p) => new Vector2(p.x, p.z)),
    todos = [...externo, ...buraco],
    fora =
      caminho.tipo === 'praca'
        ? ShapeUtils.triangulateShape(externo, [buraco]).map((t) =>
            t.map((i) => ({ x: todos[i]!.x, z: todos[i]!.y })),
          )
        : []
  let vertices = 0,
    verticesConformados = 0,
    trabalho = 0
  const resultados: (ParteConformada & {
    material: ModeloCarregado['partes'][number]['material']
  })[] = []
  try {
    for (const parte of modelo.partes) {
      const leitura = lerParteEstatica(parte, new Matrix4()),
        copias: Atributos[] = []
      let numero = 0
      try {
        const adicionar = (atributos: Atributos) => {
          const n = atributos.position!.valores.length / 3
          vertices += n
          numero += n
          if (vertices > MAX_VERTICES)
            throw Error('O acabamento exige vértices demais. Divida o caminho.')
          if (n) copias.push(atributos)
        }
        const cobrar = (cortes = 1) => {
          trabalho +=
            ((leitura.malha.indices?.length ??
              leitura.malha.atributos.position!.valores.length / 3) /
              3) *
            cortes
          if (trabalho > MAX_TRABALHO)
            throw Error(
              'O recorte deste acabamento é complexo demais. Divida a área ou simplifique o modelo.',
            )
        }
        for (let modulo = 0; modulo < quantidade; modulo++) {
          if (caminho.tipo === 'praca') {
            cobrar(Math.max(1, fora.length))
            const atributos = recortarAtributos(leitura.malha, [
                { x: eixo === 'x' ? -1 : 0, z: eixo === 'z' ? -1 : 0, limite: -inicio },
                { x: eixo === 'x' ? 1 : 0, z: eixo === 'z' ? 1 : 0, limite: fim },
              ]),
              p = atributos.position!.valores,
              x = minX + (modulo % colunas) * unidade,
              z = minZ + Math.floor(modulo / colunas) * largura
            for (let i = 0; i < p.length; i += 3) {
              const px = p[i]!,
                pz = p[i + 2]!
              p[i] = x + ((eixo === 'x' ? px : pz) - inicio) * escala
              p[i + 1] = (p[i + 1]! - baseLocal) * escala
              p[i + 2] =
                z + (eixo === 'x' ? pz - medidas.volume.min.z : medidas.volume.max.x - px) * escala
            }
            if (eixo === 'z') girarAtributos(atributos)
            const recorte = recortarAtributos({ atributos }, [], fora)
            adicionar(retirarParedesExternas(recorte, poligono))
          } else {
            const a = modulo * unidade,
              b = Math.min(perfil.curva.comprimento, a + unidade),
              cortes = [
                a,
                ...perfil.curva.distancias.filter((d) => d > a + 1e-7 && d < b - 1e-7),
                b,
              ]
            for (let j = 0; j < cortes.length - 1; j++) {
              cobrar()
              const de = cortes[j]!,
                ate = cortes[j + 1]!,
                atributos = recortarAtributos(leitura.malha, [
                  {
                    x: eixo === 'x' ? -1 : 0,
                    z: eixo === 'z' ? -1 : 0,
                    limite: -(inicio + (de - a) / escala),
                  },
                  {
                    x: eixo === 'x' ? 1 : 0,
                    z: eixo === 'z' ? 1 : 0,
                    limite: inicio + (ate - a) / escala,
                  },
                ])
              deformar(
                atributos,
                a,
                escala,
                eixo,
                transversal,
                inicio,
                centroTransversal,
                baseLocal,
                perfil,
              )
              adicionar(atributos)
            }
          }
        }
        const geometria = juntar(copias, numero)
        try {
          const r = conformarParteAoChao(
            { geometria, matriz: new Matrix4() },
            new Matrix4().makeTranslation(perfil.origem.x, 0, perfil.origem.z),
            base,
            estado,
            perfil.origem,
            excluir,
          )
          resultados.push({ ...r, material: parte.material })
          verticesConformados += r.geometria.getAttribute('position').count
          if (verticesConformados > MAX_VERTICES)
            throw Error('O acabamento conformado exige vértices demais. Divida o caminho.')
        } finally {
          geometria.dispose()
        }
      } finally {
        leitura.descartar()
      }
    }
    return {
      origem: { ...perfil.origem },
      partes: resultados,
      descartar() {
        for (const p of resultados) p.descartar()
      },
    }
  } catch (erro) {
    for (const p of resultados) p.descartar()
    throw erro
  }
}

function girarAtributos(atributos: Atributos) {
  for (const nome of ['normal', 'tangent']) {
    const a = atributos[nome]
    if (!a) continue
    for (let i = 0; i < a.valores.length; i += a.itemSize) {
      const x = a.valores[i]!
      a.valores[i] = a.valores[i + 2]!
      a.valores[i + 2] = -x
    }
  }
}

function deformar(
  atributos: Atributos,
  a: number,
  escala: number,
  eixo: 'x' | 'z',
  transversal: 'x' | 'z',
  inicio: number,
  centro: number,
  base: number,
  perfil: ReturnType<typeof perfilDoPiso>,
) {
  const p = atributos.position!.valores,
    n = atributos.normal,
    t = atributos.tangent,
    longitudinal = eixo === 'x' ? 0 : 2,
    lateral = transversal === 'x' ? 0 : 2,
    sinal = eixo === 'x' ? -1 : 1
  if ((n && n.itemSize !== 3) || (t && t.itemSize !== 4))
    throw Error('As normais ou tangentes do acabamento são inválidas.')
  for (let i = 0; i < p.length / 3; i++) {
    const ponto = perfil.em(
        a + (p[i * 3 + longitudinal]! - inicio) * escala,
        (p[i * 3 + lateral]! - centro) * escala * sinal,
      ),
      xx = (eixo === 'x' ? ponto.duX : ponto.dlX) * escala,
      xz = (eixo === 'x' ? ponto.duZ : ponto.dlZ) * escala,
      zx = (eixo === 'x' ? -ponto.dlX : ponto.duX) * escala,
      zz = (eixo === 'x' ? -ponto.dlZ : ponto.duZ) * escala,
      det = xx * zz - zx * xz
    if (!(det > 1e-10)) throw Error('O caminho dobra sobre si mesmo. Ajuste a curva ou a largura.')
    p[i * 3] = ponto.x
    p[i * 3 + 1] = (p[i * 3 + 1]! - base) * escala
    p[i * 3 + 2] = ponto.z
    if (n) {
      const x = n.valores[i * 3]!,
        y = n.valores[i * 3 + 1]!,
        z = n.valores[i * 3 + 2]!,
        nx = (zz * x - xz * z) / det,
        ny = y / escala,
        nz = (-zx * x + xx * z) / det,
        tamanho = Math.hypot(nx, ny, nz)
      if (!(tamanho > 1e-12)) throw Error('A normal do acabamento é inválida.')
      n.valores.set([nx / tamanho, ny / tamanho, nz / tamanho], i * 3)
    }
    if (t) {
      const x = t.valores[i * 4]!,
        y = t.valores[i * 4 + 1]!,
        z = t.valores[i * 4 + 2]!,
        tx = xx * x + zx * z,
        ty = y * escala,
        tz = xz * x + zz * z,
        tamanho = Math.hypot(tx, ty, tz)
      if (!(tamanho > 1e-12)) throw Error('A tangente do acabamento é inválida.')
      t.valores.set([tx / tamanho, ty / tamanho, tz / tamanho], i * 4)
    }
  }
}

function retirarParedesExternas(
  atributos: Atributos,
  contorno: readonly { x: number; z: number }[],
): Atributos {
  const p = atributos.position!.valores,
    manter: number[] = []
  for (let i = 0; i < p.length / 3; i += 3) {
    const j = i * 3,
      ux = p[j + 3]! - p[j]!,
      uy = p[j + 4]! - p[j + 1]!,
      uz = p[j + 5]! - p[j + 2]!,
      vx = p[j + 6]! - p[j]!,
      vy = p[j + 7]! - p[j + 1]!,
      vz = p[j + 8]! - p[j + 2]!,
      nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx,
      comprimento = Math.hypot(nx, nz)
    if (Math.abs(ny) < 1e-8 && comprimento > 1e-10) {
      const x = (p[j]! + p[j + 3]! + p[j + 6]!) / 3,
        z = (p[j + 2]! + p[j + 5]! + p[j + 8]!) / 3,
        dx = (nx / comprimento) * 1e-6,
        dz = (nz / comprimento) * 1e-6
      if (
        !pontoNoPoligono({ x: x + dx, z: z + dz }, contorno) &&
        !pontoNoPoligono({ x: x - dx, z: z - dz }, contorno)
      )
        continue
    }
    manter.push(i, i + 1, i + 2)
  }
  return Object.fromEntries(
    Object.entries(atributos).map(([nome, a]) => [
      nome,
      {
        itemSize: a.itemSize,
        valores: Float32Array.from(
          manter.flatMap((i) =>
            Array.from(a.valores.subarray(i * a.itemSize, (i + 1) * a.itemSize)),
          ),
        ),
      },
    ]),
  )
}
