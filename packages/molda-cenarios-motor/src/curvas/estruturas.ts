import {
  type CaminhoDeCenario,
  type DocumentoDeCenario,
  estruturaDoCaminho,
  type FonteDeAlturas,
  type PecaEstruturalDoCaminho,
  PilarSemSuperficie,
  pilarEntreSuperficies,
  type Transformacao,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  Box3,
  type BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Euler,
  type Material,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import type { ModeloCarregado, ParteDoModelo } from '../modelos'
import type { TerrenoDoPalco } from '../Terreno'
import { MundoDoTeste } from '../teste/colisoes'
import { conformarParteAoChao, type ParteConformada } from './geometria'
import { lerParteEstatica } from './parte-estatica'

export interface PartePreparadaDeCaminho {
  geometria: BufferGeometry
  material?: Material
  matriz: Matrix4
  parte?: string
  conformada?: ParteConformada
}
export function matrizDaEstrutura(t: Transformacao) {
  return new Matrix4().compose(
    new Vector3(t.posicao.x, t.posicao.y, t.posicao.z),
    new Quaternion().setFromEuler(new Euler(t.rotacao.x, t.rotacao.y, t.rotacao.z, 'XYZ')),
    new Vector3(t.escala.x, t.escala.y, t.escala.z),
  )
}

/** Estruturas usam as mesmas medidas e partes estáveis dos apoios do documento. */
export function montarEstrutura(
  caminho: CaminhoDeCenario,
  doc: DocumentoDeCenario,
  terreno: TerrenoDoPalco | null,
  modelo: ModeloCarregado | null,
  cubo: BoxGeometry,
) {
  const altura: FonteDeAlturas = terreno?.altura ?? (() => 0),
    volume = modelo
      ? {
          min: { x: modelo.caixa.min.x, y: modelo.caixa.min.y, z: modelo.caixa.min.z },
          max: { x: modelo.caixa.max.x, y: modelo.caixa.max.y, z: modelo.caixa.max.z },
        }
      : undefined,
    fonte: (Pick<ParteDoModelo, 'geometria' | 'matriz'> & { material?: Material })[] =
      modelo?.partes ?? [{ geometria: cubo, matriz: new Matrix4() }],
    semPilares = caminho.tipo === 'ponte' ? { ...caminho, pilares: undefined } : caminho,
    inicial = estruturaDoCaminho(semPilares, altura, volume),
    origem = { ...caminho.pontos[0]!, y: 0 },
    rigidas = inicial.pecas
      .filter((p) => !p.noTerreno)
      .flatMap((p) => {
        const mundo = matrizDaEstrutura(p.transformacao)
        return fonte.map((f) => ({
          geometria: f.geometria,
          matriz: new Matrix4().multiplyMatrices(mundo, f.matriz),
        }))
      }),
    precisaBase = caminho.tipo === 'ponte' && Boolean(caminho.pilares),
    consulta = precisaBase ? new MundoDoTeste(rigidas) : null,
    partes: PartePreparadaDeCaminho[] = [],
    referencias = new Map<string, PecaEstruturalDoCaminho>(),
    descartaveis: (() => void)[] = []
  let vertices = 0
  const preparados = new Map<string, ReturnType<typeof pilarEntreSuperficies>>(),
    prismas = new Map<number, ReturnType<typeof lerParteEstatica>>()
  let temLacunas = false
  const chaveDoPilar = (x: number, z: number, largura: number) => `${x}:${z}:${largura}`
  const prepararBaseDoPilar = (p: { x: number; z: number }, largura: number) => {
    const chave = chaveDoPilar(p.x, p.z, largura),
      anterior = preparados.get(chave)
    if (anterior) return anterior.alturaNoCentro
    try {
      const regiao = new Box3(
          new Vector3(p.x - largura / 2, -100001, p.z - largura / 2),
          new Vector3(p.x + largura / 2, 100001, p.z + largura / 2),
        ),
        triangulos = consulta!.triangulosNaCaixa(regiao)
      for (let i = 0; i < triangulos.length; i += 3) {
        triangulos[i] = triangulos[i]! - p.x
        triangulos[i + 2] = triangulos[i + 2]! - p.z
      }
      let prisma = prismas.get(largura)
      if (!prisma) {
        prisma = lerParteEstatica(
          {
            geometria: cubo,
            matriz: new Matrix4().makeScale(largura, 1, largura).setPosition(0, 0.5, 0),
          },
          new Matrix4(),
        )
        prismas.set(largura, prisma)
      }
      const dados = pilarEntreSuperficies(
        prisma.malha,
        triangulos,
        doc.base,
        terreno?.estado ?? null,
        p,
      )
      preparados.set(chave, dados)
      if (dados.contato.area < dados.contato.total * 0.9999) temLacunas = true
      return dados.alturaNoCentro
    } catch (erro) {
      if (erro instanceof PilarSemSuperficie) return null
      throw erro
    }
  }
  try {
    const finais = precisaBase
      ? estruturaDoCaminho(caminho, altura, volume, { baseDoPilar: prepararBaseDoPilar })
      : inicial
    for (const p of finais.pecas) {
      referencias.set(p.chave, p)
      const matriz = matrizDaEstrutura(p.transformacao)
      if (p.tipo === 'pilar') {
        const t = p.transformacao,
          origemDoPilar = { x: t.posicao.x, z: t.posicao.z },
          preparado = preparados.get(chaveDoPilar(origemDoPilar.x, origemDoPilar.z, t.escala.x)),
          geometria = new BufferGeometry()
        descartaveis.push(() => geometria.dispose())
        if (!preparado) throw Error('A superfície do pilar precisa ser preparada antes do desenho')
        for (const [nome, a] of Object.entries(preparado.atributos))
          geometria.setAttribute(nome, new BufferAttribute(a.valores, a.itemSize))
        geometria.computeVertexNormals()
        geometria.computeBoundingBox()
        geometria.computeBoundingSphere()
        partes.push({
          geometria,
          matriz: new Matrix4().makeTranslation(origemDoPilar.x, 0, origemDoPilar.z),
          parte: p.chave,
        })
        vertices += geometria.getAttribute('position').count
      } else
        for (const f of p.tipo === 'modelo'
          ? fonte
          : [{ geometria: cubo, matriz: new Matrix4(), material: null }]) {
          if (p.noTerreno) {
            const r = conformarParteAoChao(f, matriz, doc.base, terreno?.estado ?? null, origem)
            descartaveis.push(() => r.descartar())
            vertices += r.geometria.getAttribute('position').count
            partes.push({
              geometria: r.geometria,
              material: f.material ?? undefined,
              matriz: new Matrix4().makeTranslation(origem.x, 0, origem.z),
              parte: p.chave,
              conformada: r,
            })
          } else {
            partes.push({
              geometria: f.geometria,
              material: f.material ?? undefined,
              matriz: new Matrix4().multiplyMatrices(matriz, f.matriz),
              parte: p.chave,
            })
          }
        }
      if (vertices > 600_000)
        throw Error('A estrutura conformada exige vértices demais. Divida o caminho.')
    }
    return {
      partes,
      referencias,
      avisos: [
        ...finais.avisos,
        ...(temLacunas
          ? ['Há aberturas entre as tábuas sobre parte dos pilares. Confira as linhas de apoio.']
          : []),
      ],
      descartar() {
        for (const limpar of descartaveis) limpar()
      },
    }
  } catch (erro) {
    for (const limpar of descartaveis) limpar()
    throw erro
  } finally {
    for (const prisma of prismas.values()) prisma.descartar()
    consulta?.descartar()
  }
}
