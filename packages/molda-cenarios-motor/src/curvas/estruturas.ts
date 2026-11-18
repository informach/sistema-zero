import {
  alturaDoChao,
  type CaminhoDeCenario,
  type DocumentoDeCenario,
  estruturaDoCaminho,
  type FonteDeAlturas,
  type PecaEstruturalDoCaminho,
  type Transformacao,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  type BoxGeometry,
  type BufferGeometry,
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
    de = new Vector3(),
    ate = new Vector3(),
    inferior = (p: { x: number; z: number }) => {
      if (!consulta) return null
      // Raio de baixo para cima: primeiro triângulo é a face inferior real do modelo/tabuleiro.
      return (
        consulta.rastrear(de.set(p.x, -100001, p.z), ate.set(p.x, 100001, p.z))?.ponto.y ?? null
      )
    },
    partes: PartePreparadaDeCaminho[] = [],
    referencias = new Map<string, PecaEstruturalDoCaminho>(),
    descartaveis: (() => void)[] = []
  let vertices = 0
  try {
    const finais = precisaBase
      ? estruturaDoCaminho(caminho, altura, volume, { baseDoTabuleiro: inferior })
      : inicial
    for (const p of finais.pecas) {
      referencias.set(p.chave, p)
      const matriz = matrizDaEstrutura(p.transformacao)
      if (p.tipo === 'pilar') {
        // Cubo normalizado: bottom=0, top=1. Cada tampa mede suas duas superfícies reais.
        const g = cubo.clone().translate(0, 0.5, 0),
          t = p.transformacao,
          xz = new Matrix4().makeScale(t.escala.x, 1, t.escala.z)
        xz.setPosition(t.posicao.x, 0, t.posicao.z)
        let r: ParteConformada
        try {
          r = conformarParteAoChao(
            { geometria: g, matriz: new Matrix4() },
            xz,
            doc.base,
            terreno?.estado ?? null,
            origem,
          )
        } finally {
          g.dispose()
        }
        descartaveis.push(() => r.descartar())
        const pos = r.geometria.getAttribute('position')
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i) + origem.x,
            z = pos.getZ(i) + origem.z,
            fundo = alturaDoChao(doc.base, x, z, altura),
            fracao = pos.getY(i) - fundo,
            topo = inferior({ x, z })
          if (topo === null || topo < fundo - 1e-5)
            throw Error(
              'Um pilar ultrapassa a face inferior do tabuleiro. Ajuste largura ou posição dos apoios.',
            )
          pos.setY(i, fundo + fracao * Math.max(0, topo - fundo))
        }
        r.geometria.computeVertexNormals()
        r.geometria.computeBoundingBox()
        r.geometria.computeBoundingSphere()
        partes.push({
          geometria: r.geometria,
          matriz: new Matrix4().makeTranslation(origem.x, 0, origem.z),
          parte: p.chave,
        })
        vertices += pos.count
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
      avisos: finais.avisos,
      descartar() {
        for (const limpar of descartaveis) limpar()
      },
    }
  } catch (erro) {
    for (const limpar of descartaveis) limpar()
    throw erro
  } finally {
    consulta?.descartar()
  }
}
