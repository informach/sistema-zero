import type { LessonDraftDocument } from '@sistemazero/core/learning'
import { lessonContentLabel } from './lesson-authoring'
import type { LessonBlockContent } from './types'

type Document = LessonDraftDocument<LessonBlockContent>

/** Uma peça da comparação: um bloco do percurso ou um material da aula. */
export interface PecaComparada {
  id: string
  tipo: 'bloco' | 'material'
  /** O resumo legível ("Vídeo da seção", o começo do texto, o nome do material). */
  titulo: string
  /** Onde ela estava no PUBLICADO: o nome da seção, "Materiais de apoio" ou null (anexo). */
  origem: string | null
  /** A seção de origem não existe mais no rascunho — a peça volta para os materiais de apoio. */
  origemSumiu: boolean
}

export interface ComparacaoComOPublicado {
  /** Está no ar e sumiu do rascunho — o que ela quer de volta. */
  sumiram: PecaComparada[]
  /** Está no rascunho e não no ar — some se ela escolher "Trazer tudo". */
  soNoRascunho: PecaComparada[]
  /** Está nos dois, com conteúdo diferente. */
  mudaram: PecaComparada[]
  /** A aula nunca foi publicada (nada no ar para trazer de volta). */
  semPublicado: boolean
}

const MATERIAIS_DE_APOIO = 'Materiais de apoio'

function ondeEstava(documento: Document, id: string) {
  const secao = documento.sections.find((s) => s.blockIds.includes(id))
  if (secao) return secao
  return documento.supportBlockIds.includes(id) ? MATERIAIS_DE_APOIO : null
}

function peca(
  documento: Document,
  rascunho: Document,
  id: string,
  titulo: string,
  tipo: PecaComparada['tipo'],
): PecaComparada {
  const origem = tipo === 'material' ? null : ondeEstava(documento, id)
  const nome = typeof origem === 'string' ? origem : (origem?.title ?? null)
  return {
    id,
    tipo,
    titulo,
    origem: nome,
    origemSumiu:
      typeof origem === 'object' && origem !== null
        ? !rascunho.sections.some((s) => s.id === origem.id)
        : false,
  }
}

/** Compara o conteúdo sem depender da ordem das chaves do JSON. */
function mesmoConteudo(a: unknown, b: unknown): boolean {
  return estavel(a) === estavel(b)
}
function estavel(valor: unknown): string {
  if (valor === null || typeof valor !== 'object') return JSON.stringify(valor) ?? 'null'
  if (Array.isArray(valor)) return `[${valor.map(estavel).join(',')}]`
  const objeto = valor as Record<string, unknown>
  // Chave com `undefined` é ausência: sem isto um `{…, capa: undefined}` no rascunho apareceria
  // como "mudou" contra um publicado que simplesmente não tem a chave.
  const chaves = Object.keys(objeto)
    .filter((k) => objeto[k] !== undefined)
    .sort()
  return `{${chaves.map((k) => `${JSON.stringify(k)}:${estavel(objeto[k])}`).join(',')}}`
}

/**
 * O que mudou entre o rascunho e o que está PUBLICADO.
 *
 * ⚠️ É só APRESENTAÇÃO: quem restaura é o servidor, com a mesma regra pura do core
 * (`restoreFromPublished`). Este módulo existe para a autora ver o que vai acontecer antes de
 * clicar — e para o painel saber o que oferecer.
 */
export function compararComOPublicado(
  rascunho: Document,
  publicado: Document,
): ComparacaoComOPublicado {
  const noRascunho = new Map(rascunho.blocks.map((b) => [b.id, b]))
  const noAr = new Map(publicado.blocks.map((b) => [b.id, b]))
  const anexosDoRascunho = new Map(rascunho.attachments.map((a) => [a.id, a]))
  const anexosNoAr = new Map(publicado.attachments.map((a) => [a.id, a]))

  const sumiram: PecaComparada[] = []
  const mudaram: PecaComparada[] = []
  for (const bloco of publicado.blocks) {
    const doRascunho = noRascunho.get(bloco.id)
    const descricao = lessonContentLabel(bloco)
    if (!doRascunho) sumiram.push(peca(publicado, rascunho, bloco.id, descricao, 'bloco'))
    else if (!mesmoConteudo(doRascunho.content, bloco.content))
      mudaram.push(peca(publicado, rascunho, bloco.id, descricao, 'bloco'))
  }
  for (const anexo of publicado.attachments) {
    const doRascunho = anexosDoRascunho.get(anexo.id)
    if (!doRascunho) sumiram.push(peca(publicado, rascunho, anexo.id, anexo.label, 'material'))
    else if (!mesmoConteudo(doRascunho, anexo))
      mudaram.push(peca(publicado, rascunho, anexo.id, anexo.label, 'material'))
  }

  const soNoRascunho: PecaComparada[] = [
    ...rascunho.blocks
      .filter((b) => !noAr.has(b.id))
      .map((b) => peca(rascunho, rascunho, b.id, lessonContentLabel(b), 'bloco')),
    ...rascunho.attachments
      .filter((a) => !anexosNoAr.has(a.id))
      .map((a) => peca(rascunho, rascunho, a.id, a.label, 'material')),
  ]

  return {
    sumiram,
    soNoRascunho,
    mudaram,
    semPublicado: publicado.blocks.length === 0 && publicado.attachments.length === 0,
  }
}
