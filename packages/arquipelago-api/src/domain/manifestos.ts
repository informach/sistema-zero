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

/** O quadro que o desafio segura hoje no índice único: o da última publicação, ou o do rascunho. */
const chaveQueSegura = (d: DesafioNoBanco) =>
  d.situacao === 'arquivado' ? null : chaveDoQuadro(d.metadadosPublicados ?? d.metadados)

/**
 * O que acontece com cada desafio do arquivo. `cadastro` é o cadastro inteiro de agora (arquivados
 * inclusive). Um desafio fora do arquivo ocupa o quadro que segura no índice; um do arquivo só o
 * libera se trocar de quadro ao aplicar (`barrarQuadrosPresos`).
 */
export function decidir(
  manifesto: ManifestoDeDesafios,
  cadastro: readonly DesafioNoBanco[],
): DecisaoDoItem[] {
  const porSlug = new Map(cadastro.map((d) => [d.metadados.slug, d]))
  const noArquivo = new Set(manifesto.desafios.map((d) => d.slug))
  const ocupados = new Map<string, string>()
  for (const d of cadastro) {
    if (noArquivo.has(d.metadados.slug)) continue
    const chave = chaveQueSegura(d)
    if (chave) ocupados.set(chave, d.metadados.slug)
  }
  const decisoes = manifesto.desafios.map((item): DecisaoDoItem => {
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
  barrarQuadrosPresos(manifesto, decisoes)
  return decisoes
}

/**
 * De quem do arquivo cada item espera o quadro: o índice do desafio do arquivo que hoje está no
 * quadro para onde o item vai (ele precisa sair antes), ou null.
 */
function quemSegura(
  manifesto: ManifestoDeDesafios,
  decisoes: readonly DecisaoDoItem[],
): (number | null)[] {
  const dono = new Map<string, number>()
  decisoes.forEach((d, j) => {
    const chave = d.existente ? chaveQueSegura(d.existente) : null
    if (chave) dono.set(chave, j)
  })
  return manifesto.desafios.map((item, i) => {
    const chave = chaveDoQuadro(item)
    const j = chave ? dono.get(chave) : undefined
    return j === undefined || j === i ? null : j
  })
}

const vaiGravar = (d: DecisaoDoItem | undefined) => d?.acao === 'criar' || d?.acao === 'atualizar'

/**
 * O item passa a segurar o quadro do arquivo ao aplicar. Quem nunca publicou segura o do rascunho,
 * então troca ao gravar; quem já publicou só troca ao publicar de novo (pediu `publicar` e há o que
 * publicar, mesmo sem nada para gravar). Só então solta o quadro que segurava.
 */
const trocaDeQuadro = (manifesto: ManifestoDeDesafios, decisoes: readonly DecisaoDoItem[]) => {
  return (i: number) => {
    const d = decisoes[i]
    if (!d || d.acao === 'conflito') return false
    const publica = manifesto.desafios[i]?.publicar === true && d.temOQuePublicar
    if (!d.existente?.metadadosPublicados) return vaiGravar(d)
    return publica
  }
}

/**
 * Um quadro só fica livre quando quem está nele sai. Se esse desafio não vai sair (deu conflito) ou
 * se os quadros trocam de dono em roda (o 1 vai para o 2 e o 2 para o 1), gravar daria conflito no
 * meio do caminho: a conferência já diz isso, antes de aplicar.
 */
function barrarQuadrosPresos(manifesto: ManifestoDeDesafios, decisoes: DecisaoDoItem[]) {
  let mudou = true
  while (mudou) {
    mudou = false
    const espera = quemSegura(manifesto, decisoes)
    const troca = trocaDeQuadro(manifesto, decisoes)
    for (const [i, d] of decisoes.entries()) {
      if (!troca(i)) continue
      const item = manifesto.desafios[i]
      const j = espera[i]
      if (!item || j == null) continue
      if (!troca(j)) {
        decisoes[i] = {
          ...d,
          acao: 'conflito',
          conflito: {
            codigo: 'QUADRO_OCUPADO',
            mensagem: `O quadro ${item.quadro} desta ilha ainda é do desafio "${manifesto.desafios[j]?.slug}", que não sai dele neste arquivo (para sair, ele precisa gravar e ser publicado).`,
          },
          temOQuePublicar: false,
        }
        mudou = true
        continue
      }
      const roda: number[] = []
      let k: number | null | undefined = j
      for (let passos = 0; k != null && passos < decisoes.length; passos++) {
        roda.push(k)
        if (k === i) break
        k = troca(k) ? espera[k] : null
      }
      if (k !== i) continue
      // A roda inteira vira conflito de uma vez, com o mesmo motivo para cada desafio dela.
      for (const r of roda) {
        const dr = decisoes[r]
        const slug = manifesto.desafios[r]?.slug
        if (!dr || !slug) continue
        decisoes[r] = {
          ...dr,
          acao: 'conflito',
          conflito: {
            codigo: 'TROCA_DE_QUADRO',
            mensagem: `Os quadros trocam de desafio em roda neste arquivo. Mova "${slug}" para um quadro livre, aplique e depois suba o arquivo de novo.`,
          },
          temOQuePublicar: false,
        }
      }
      mudou = true
    }
  }
}

/**
 * Em que ordem gravar: quem libera um quadro grava antes de quem vai para ele. Depois do
 * `decidir` não sobra roda, então a ordem sempre existe.
 */
export function ordemDeGravacao(
  manifesto: ManifestoDeDesafios,
  decisoes: readonly DecisaoDoItem[],
): number[] {
  const espera = quemSegura(manifesto, decisoes)
  const troca = trocaDeQuadro(manifesto, decisoes)
  const feito = new Set<number>()
  const ordem: number[] = []
  const visitar = (i: number, profundidade: number) => {
    if (feito.has(i)) return
    const j = espera[i]
    const esperaOutro = j != null && troca(i) && troca(j)
    if (esperaOutro && profundidade < decisoes.length) visitar(j, profundidade + 1)
    feito.add(i)
    ordem.push(i)
  }
  for (let i = 0; i < decisoes.length; i++) visitar(i, 0)
  return ordem
}

/**
 * A impressão digital de uma prévia: o arquivo e o estado de cada desafio que ele toca (revisão,
 * situação e revisão publicada). Se alguém gravar um deles entre a prévia e o aplicar, a impressão muda.
 */
export function impressaoDigital(
  manifesto: ManifestoDeDesafios,
  cadastro: readonly DesafioNoBanco[],
): string {
  const porSlug = new Map(cadastro.map((d) => [d.metadados.slug, d]))
  const estado = manifesto.desafios.map((d) => {
    const e = porSlug.get(d.slug)
    return e
      ? `${d.slug}:${e.id}:${e.revisao}:${e.situacao}:${e.revisaoPublicada ?? '-'}`
      : `${d.slug}:novo`
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
