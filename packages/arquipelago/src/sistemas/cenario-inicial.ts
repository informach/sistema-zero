import {
  type DocumentoDeCenario,
  type ModeloDeCatalogo,
  validarDocumento,
} from '@sistemazero/molda-cenarios-core'
import { ARTE_DA_FAISCA } from '../mundo/faisca/arte.generated'
import { assentamentoDaPeca, pisoDaFaisca } from './assentamento-da-faisca'
import { COMPOSICAO_DA_FAISCA, IRIS_DE_ESTUDO } from './composicao-faisca'
import { LUGAR_DA_FAISCA } from './faisca'
import { LAGO_DA_FAISCA } from './lago-da-faisca'
import { CONTORNO_DA_PRACA, PERCURSO_DO_PILOTO } from './passeios-da-faisca'

type Meta = (typeof ARTE_DA_FAISCA.pecas)[keyof typeof ARTE_DA_FAISCA.pecas]
export const chaveDoModelo = (m: Meta) =>
  `artes-3d/${m.caminho.replace(/\.glb$/, '')}:${m.digest.slice(0, 12)}`
export function catalogoInicialDaFaisca(): ModeloDeCatalogo[] {
  return Object.values(ARTE_DA_FAISCA.pecas).map((m) => ({
    id: chaveDoModelo(m),
    nome: m.rotulo,
    origem: m.origem,
    caminho: 'sourcePath' in m ? m.sourcePath : m.caminho,
    commit: 'sourceCommit' in m ? String(m.sourceCommit) : ARTE_DA_FAISCA.commit,
    digest: m.digest,
    dimensoes: [m.dims[0], m.dims[2], m.dims[1]],
    min: [0, 1, 2].map((i) => Math.min(...m.colisao.map((b) => b.min[i]!))) as [
      number,
      number,
      number,
    ],
    max: [0, 1, 2].map((i) => Math.max(...m.colisao.map((b) => b.max[i]!))) as [
      number,
      number,
      number,
    ],
    bytes: m.bytes,
    triangulos: m.tris,
    arquivo: m.arquivo,
    categoria: m.caminho.split('/').at(-3) ?? m.origem,
    imagens: [...m.imagens],
    colisao: m.colisao.map((b) => ({
      min: [...b.min] as [number, number, number],
      max: [...b.max] as [number, number, number],
    })),
  }))
}
/** Uma importação do estado atual, sem modificar a composição nem os arquivos de arte. */
export function cenarioInicialDaFaisca(catalogoDigest: string): DocumentoDeCenario {
  const apoios = new Map(COMPOSICAO_DA_FAISCA.map((p) => [p.id, assentamentoDaPeca(p)]))
  for (const p of COMPOSICAO_DA_FAISCA)
    if (p.apoio) apoios.get(p.id)!.y = apoios.get(p.apoio)!.y + (p.deslocamentoY ?? 0)
  const meta = (id: keyof typeof ARTE_DA_FAISCA.pecas) => chaveDoModelo(ARTE_DA_FAISCA.pecas[id])
  const propriedades = { grupo: null, bloqueado: false, oculto: false }
  const caminho = (id: string, pontos: readonly { x: number; z: number }[]) => ({
    id,
    nome: id,
    ...propriedades,
    pontos: [...pontos],
    acabamento: meta('caminho_lajes_reto'),
    largura: 2.363,
    tipo: 'trilha' as const,
  })
  const documento: DocumentoDeCenario = {
    formato: 'molda-cenario',
    versao: 1,
    id: 'faisca-base',
    nome: 'Faísca — composição original',
    unidade: 'metro',
    eixoVertical: 'y',
    base: { id: 'faisca-v2', versao: '46b0ed92f' },
    catalogo: { id: 'faisca-acervo', digest: catalogoDigest },
    grupos: [],
    instancias: COMPOSICAO_DA_FAISCA.map((p) => {
      const a = apoios.get(p.id)!,
        f = a.fundacao
      return {
        id: p.id,
        nome: p.id,
        ...propriedades,
        modelo: meta(p.peca as keyof typeof ARTE_DA_FAISCA.pecas),
        transformacao: {
          posicao: { x: p.x, y: a.y, z: p.z },
          rotacao: { x: 0, y: p.giro, z: 0 },
          escala: p.escala,
        },
        apoio: p.apoio
          ? { tipo: 'objeto' as const, objeto: p.apoio, deslocamento: p.deslocamentoY ?? 0 }
          : p.altura !== undefined
            ? { tipo: 'absoluto' as const }
            : {
                tipo: 'terreno' as const,
                deslocamento: p.deslocamentoY ?? (f ? 0.025 : 0),
                referencia: p.deslocamentoY !== undefined ? ('pivo' as const) : ('volume' as const),
                inclinar: false,
              },
        fisica: p.solida ?? 'nenhuma',
        ...(p.raioDoTronco !== undefined ? { raioDoTronco: p.raioDoTronco } : {}),
        ...(p.enterrada !== undefined ? { enterrada: p.enterrada } : {}),
        ...(p.sinal ? { sinal: { ...p.sinal, destino: `lugar:${p.sinal.destino}` } } : {}),
        ...(f
          ? {
              fundacao: {
                min: { x: f.minX / p.escala, y: (f.baixo - a.y) / p.escala, z: f.minZ / p.escala },
                max: { x: f.maxX / p.escala, y: (f.topo - a.y) / p.escala, z: f.maxZ / p.escala },
              },
            }
          : {}),
      }
    }),
    caminhos: [
      { ...caminho('praca', CONTORNO_DA_PRACA), id: 'piso-praca', tipo: 'praca' },
      caminho('passeio-piloto', PERCURSO_DO_PILOTO),
      caminho('passeio-patio', [
        { x: 0, z: 137 },
        { x: -24, z: 132 },
      ]),
      caminho('passeio-costa', [
        { x: 0, z: 137 },
        { x: 20, z: 153 },
        { x: 22, z: 171 },
      ]),
      caminho('passeio-oficina', [
        { x: -24, z: 132 },
        { x: -28, z: 132 },
      ]),
      caminho('passeio-farol', [
        { x: 0, z: 137 },
        { x: -3, z: 120 },
        { x: -3, z: 106 },
      ]),
      caminho('passeio-lago-norte', [
        { x: 39, z: 122.1 },
        { x: 39, z: 115 },
        { x: 46, z: 108 },
      ]),
    ],
    aguas: [
      {
        id: 'agua-campos',
        nome: 'Lago dos Campos',
        ...propriedades,
        modelo: meta('lago_nadavel'),
        centro: { x: LAGO_DA_FAISCA.x, z: LAGO_DA_FAISCA.z },
        giro: 0,
        escala: 1,
        nivel: LAGO_DA_FAISCA.agua.y,
        profundidade: 1.5,
        contorno: LAGO_DA_FAISCA.agua.contorno.map((p) => ({ ...p })),
        recorte: LAGO_DA_FAISCA.furo.map((p) => ({
          x: p.x - LAGO_DA_FAISCA.x,
          z: p.z - LAGO_DA_FAISCA.z,
        })),
      },
    ],
    relevo: [],
    marcos: Object.entries(LUGAR_DA_FAISCA).map(([id, posicao]) => ({
      id: `lugar:${id}`,
      posicao: { ...posicao },
      objeto: null,
    })),
    iluminacao: { noite: false },
  }
  documento.instancias.push({
    id: 'iris',
    nome: 'Íris — estudo',
    ...propriedades,
    modelo: meta('coelho'),
    ator: 'iris',
    transformacao: {
      posicao: {
        x: IRIS_DE_ESTUDO.x,
        y: pisoDaFaisca(IRIS_DE_ESTUDO.x, IRIS_DE_ESTUDO.z),
        z: IRIS_DE_ESTUDO.z,
      },
      rotacao: { x: 0, y: 0, z: 0 },
      escala: 1,
    },
    apoio: { tipo: 'terreno', deslocamento: 0, inclinar: false, referencia: 'pivo' },
    fisica: 'nenhuma',
  })
  const ponte = documento.instancias.find((p) => p.id === 'ponte-lago')!,
    agua = documento.aguas[0]!
  ponte.apoio = {
    tipo: 'agua',
    agua: agua.id,
    local: {
      x: ponte.transformacao.posicao.x - agua.centro.x,
      z: ponte.transformacao.posicao.z - agua.centro.z,
    },
    deslocamento: ponte.transformacao.posicao.y - agua.nivel,
    giro: ponte.transformacao.rotacao.y,
    escala: ponte.transformacao.escala,
  }
  return validarDocumento(documento, new Map(catalogoInicialDaFaisca().map((m) => [m.id, m])))
}
