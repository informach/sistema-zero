import { createHash } from 'node:crypto'
import {
  type AcaoDoManifesto,
  type ConteudoDoDesafio,
  type DesafioDoManifesto,
  FORMATO_DO_MANIFESTO,
  type ManifestoDeDesafios,
  type MetadadosDoDesafio,
  migrarConteudoDoDesafio,
  type ProblemaDoDesafio,
  VERSAO_DO_MANIFESTO,
} from '@sistemazero/arquipelago-contracts'
import type { DesafioNoBanco } from './desafios.port'

/**
 * O manifesto de desafios (regras puras): o que fazer com cada desafio do arquivo, olhando o
 * cadastro de agora, e a impressão digital que liga a prévia ao aplicar. O `slug` é a identidade;
 * um desafio que não está no arquivo nunca é mexido.
 */

/** JSON com as chaves em ordem, para comparar o arquivo com o que o banco guardou (o `jsonb` reordena). */
export function canonico(valor: unknown): string {
  return JSON.stringify(ordenar(valor))
}

function ordenar(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(ordenar)
  if (v === null || typeof v !== 'object') return v
  return Object.fromEntries(
    Object.keys(v as Record<string, unknown>)
      .sort()
      .map((k) => [k, ordenar((v as Record<string, unknown>)[k])]),
  )
}

export function metadadosDoItem(d: DesafioDoManifesto): MetadadosDoDesafio {
  return {
    slug: d.slug,
    publico: d.publico,
    ilha: d.ilha,
    tipo: d.tipo,
    quadro: d.quadro,
    ordem: d.ordem,
  }
}

export interface DecisaoDoItem {
  acao: AcaoDoManifesto
  existente: DesafioNoBanco | null
  conflito: ProblemaDoDesafio | null
  /** Há algo para publicar, se o item pedir (novo, mudou, rascunho ou mudança guardada). */
  temOQuePublicar: boolean
}

const chaveDoQuadro = (m: { publico: string; ilha: string; quadro: number | null }) =>
  m.quadro === null ? null : `${m.publico}:${m.ilha}:${m.quadro}`

/**
 * O que acontece com cada desafio do arquivo. `cadastro` é o cadastro inteiro de agora (arquivados
 * inclusive). O quadro conta como ocupado só por um desafio fora do arquivo: os do arquivo já
 * trazem a posição nova.
 */
export function decidir(
  manifesto: ManifestoDeDesafios,
  cadastro: readonly DesafioNoBanco[],
): DecisaoDoItem[] {
  const porSlug = new Map(cadastro.map((d) => [d.metadados.slug, d]))
  const noArquivo = new Set(manifesto.desafios.map((d) => d.slug))
  const ocupados = new Map<string, string>()
  for (const d of cadastro) {
    if (d.situacao === 'arquivado' || noArquivo.has(d.metadados.slug)) continue
    const chave = chaveDoQuadro(d.metadados)
    if (chave) ocupados.set(chave, d.metadados.slug)
  }
  return manifesto.desafios.map((item): DecisaoDoItem => {
    const existente = porSlug.get(item.slug) ?? null
    if (existente?.situacao === 'arquivado')
      return {
        acao: 'conflito',
        existente,
        conflito: {
          codigo: 'DESAFIO_ARQUIVADO',
          mensagem: 'Este desafio está arquivado. Reative no Admin antes de subir de novo.',
        },
        temOQuePublicar: false,
      }
    const chave = chaveDoQuadro(item)
    const dono = chave ? ocupados.get(chave) : undefined
    if (dono)
      return {
        acao: 'conflito',
        existente,
        conflito: {
          codigo: 'QUADRO_OCUPADO',
          mensagem: `O quadro ${item.quadro} desta ilha já é do desafio "${dono}".`,
        },
        temOQuePublicar: false,
      }
    if (!existente) return { acao: 'criar', existente, conflito: null, temOQuePublicar: true }
    const igual =
      canonico(metadadosDoItem(item)) === canonico(existente.metadados) &&
      canonico(item.conteudo) === canonico(migrarConteudoDoDesafio(existente.conteudo))
    return {
      acao: igual ? 'igual' : 'atualizar',
      existente,
      conflito: null,
      temOQuePublicar:
        !igual || existente.situacao === 'rascunho' || existente.alteradoDepoisDePublicar,
    }
  })
}

/**
 * A impressão digital de uma prévia: o arquivo e o estado de cada desafio que ele toca (revisão e
 * situação). Se alguém gravar um deles entre a prévia e o aplicar, a impressão muda.
 */
export function impressaoDigital(
  manifesto: ManifestoDeDesafios,
  cadastro: readonly DesafioNoBanco[],
): string {
  const porSlug = new Map(cadastro.map((d) => [d.metadados.slug, d]))
  const estado = manifesto.desafios.map((d) => {
    const e = porSlug.get(d.slug)
    return e ? `${d.slug}:${e.id}:${e.revisao}:${e.situacao}` : `${d.slug}:novo`
  })
  return createHash('sha256')
    .update(canonico(manifesto))
    .update('\n')
    .update(estado.join('\n'))
    .digest('hex')
}

/** Um desafio do cadastro como item de manifesto (para exportar). */
export function itemDoCadastro(d: DesafioNoBanco, conteudo: ConteudoDoDesafio): DesafioDoManifesto {
  return {
    ...d.metadados,
    publicar: d.situacao === 'publicado',
    conteudo,
  }
}

export function novoManifesto(
  desafios: DesafioDoManifesto[],
  escopo: ManifestoDeDesafios['escopo'],
): ManifestoDeDesafios {
  return {
    formato: FORMATO_DO_MANIFESTO,
    versao: VERSAO_DO_MANIFESTO,
    ...(escopo ? { escopo } : {}),
    desafios,
  }
}
