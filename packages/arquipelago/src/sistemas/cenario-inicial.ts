import {
  type DocumentoDeCenario,
  type ModeloDeCatalogo,
  validarDocumento,
} from '@sistemazero/molda-cenarios-core'
import { ARTE_DA_FAISCA } from '../mundo/faisca/arte.generated'
import { assentamentoDaPeca, pisoDaFaisca } from './assentamento-da-faisca'
import { COMPOSICAO_DA_FAISCA } from './composicao-faisca'
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
                deslocamento: a.y - pisoDaFaisca(p.x, p.z),
                inclinar: false,
              },
        fisica: p.solida ?? 'nenhuma',
        ...(p.raioDoTronco !== undefined ? { raioDoTronco: p.raioDoTronco } : {}),
        ...(p.enterrada !== undefined ? { enterrada: p.enterrada } : {}),
        ...(p.sinal ? { sinal: { ...p.sinal, destino: `lugar:${p.sinal.destino}` } } : {}),
        ...(f
          ? {
              fundacao: {
                min: { x: f.minX, y: f.baixo - a.y, z: f.minZ },
                max: { x: f.maxX, y: f.topo - a.y, z: f.maxZ },
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
  return validarDocumento(documento, new Map(catalogoInicialDaFaisca().map((m) => [m.id, m])))
}
