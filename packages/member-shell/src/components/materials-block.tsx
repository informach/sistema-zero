'use client'

import { Spinner } from '@sistemazero/ui/spinner'
import { Download, ExternalLink, Play } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { downloadLessonAttachment, lessonAttachmentUrl } from '../lib/attachment-download'
import { formatBytes, friendlyFileType } from '../lib/format'
import { helpLinkHref, renderMarkdown } from '../lib/markdown'
import type { MaterialItem, MaterialsBlock } from '../lib/types'
import { videoEmbedUrl } from '../lib/video-embed'
import { useLessonPlayer } from './lesson-player-context'

/**
 * **Materiais complementares** — o bloco que substituiu os "materiais de apoio".
 *
 * Ele é um bloco de aula como outro qualquer: a autora o põe no ponto que quiser da seção
 * (inclusive embaixo do vídeo, na coluna de conteúdo) e a ordem dos itens é a que ela montou.
 * O antigo `<details>` "Materiais de apoio" ficava em posição FIXA no pé de toda seção, fora da
 * ordem dela — era exatamente isso que precisava morrer.
 *
 * ⚠️ **Só ganchos de classe, zero cor aqui.** `sz-lesson-materials*` e `data-material` são o
 * contrato com o CSS de cada app (o kids veste com o relevo e a pílula da marca; o adulto, sóbrio),
 * o mesmo padrão dos outros ganchos `sz-lesson-*`. Renomear um deles quebra o desenho dos DOIS
 * apps em silêncio.
 */
const HELP_LINK_PREFIX = /^\/como-fazer\/[a-z0-9]+(?:-[a-z0-9]+)*(?:[?#].*)?$/

function isHelpLink(url: string): boolean {
  return HELP_LINK_PREFIX.test(url)
}

/** O caminho da aula em que o bloco está (as duas comunidades usam a mesma rota). */
function lessonReturnPath(
  player: { lessonId: string; courseSlug: string } | null | undefined,
): string | undefined {
  if (!player?.lessonId || !player.courseSlug) return undefined
  return `/cursos/${encodeURIComponent(player.courseSlug)}/aulas/${encodeURIComponent(player.lessonId)}`
}

export function MaterialsBlockView({
  blockId,
  blockRevision,
  content,
}: {
  blockId: string
  blockRevision?: string
  content: MaterialsBlock
}) {
  const player = useLessonPlayer()
  const [baixando, setBaixando] = useState<string | null>(null)
  const [baixados, setBaixados] = useState<Set<string>>(() => new Set())
  const downloadKey = (itemId: string) => `${blockRevision ?? ''}:${itemId}`
  const required =
    player?.materialRequiredItems?.find((entry) => entry.blockId === blockId)?.itemIds ?? []
  const saved = player?.learningProgress?.blocks.find(
    (progress) => progress.blockId === blockId && progress.revision === blockRevision,
  )
  const confirmed = Array.isArray(saved?.answers.downloadedMaterialItemIds)
    ? saved.answers.downloadedMaterialItemIds
    : []

  async function baixar(item: Extract<MaterialItem, { kind: 'file' }>) {
    if (baixando || !player) return
    const url = lessonAttachmentUrl(
      player.courseSlug,
      player.lessonId,
      item.attachmentId,
      required.includes(item.id) && player.viewerId && blockRevision
        ? { blockId, itemId: item.id, viewerId: player.viewerId, blockRevision }
        : undefined,
    )
    setBaixando(item.id)
    try {
      const r = await downloadLessonAttachment(url, item.label ?? 'material')
      if (r.ok) {
        setBaixados((ids) => new Set(ids).add(downloadKey(item.id)))
        if (required.includes(item.id)) player.refreshAfterLearning?.()
      } else if (r.reason === 'refused') toast.error(r.message)
      else {
        toast.info('O material pode abrir em outra aba. Confira se o download começou.')
        if (required.includes(item.id))
          window.setTimeout(() => player.refreshAfterLearning?.(), 1000)
      }
    } finally {
      setBaixando(null)
    }
  }

  // ⚠️ Sem contexto de player não existe rota de anexo — é o caso da PRÉVIA de autoria do admin,
  // que monta o bloco fora da aula. O arquivo continua à vista (a autora precisa conferir a lista),
  // mas o botão nasce desligado e DIZ por quê: um clique mudo ali lê como defeito.
  const podeBaixar = player !== null

  if (content.items.length === 0) return null
  return (
    <div className="sz-lesson-materials">
      {content.title ? <h3 className="sz-lesson-materials-title">{content.title}</h3> : null}
      {/* ⚠️ Com título, o `<h3>` acima já nomeia a lista; sem ele, um leitor de tela anunciaria
          "lista de 3 itens" sem dizer de quê. Nomear nos DOIS casos faria o nome ser dito duas
          vezes seguidas. */}
      <ul
        className="sz-lesson-materials-list"
        aria-label={content.title ? undefined : 'Materiais complementares'}
      >
        {content.items.map((item) => (
          <li key={item.id} className="sz-lesson-material" data-material={item.kind}>
            {item.kind === 'file' ? (
              <>
                <button
                  type="button"
                  onClick={() => baixar(item)}
                  disabled={
                    baixando !== null ||
                    !podeBaixar ||
                    (required.includes(item.id) && (!blockRevision || !player?.viewerId))
                  }
                  className="sz-lesson-material-action"
                  aria-label={`${baixando === item.id ? 'Preparando download de' : baixados.has(downloadKey(item.id)) || confirmed.includes(item.id) ? 'Baixar novamente' : 'Baixar'} ${item.label ?? 'material'}${required.includes(item.id) ? ', obrigatório para avançar' : ''}`}
                >
                  <span className="sz-lesson-material-icon" aria-hidden>
                    {baixando === item.id ? (
                      <Spinner className="size-4" />
                    ) : (
                      <Download className="size-4" />
                    )}
                  </span>
                  <span className="sz-lesson-material-copy">
                    <span className="sz-lesson-material-label">{item.label}</span>
                    {required.includes(item.id) && (
                      <span className="sz-lesson-material-required">Obrigatório para avançar</span>
                    )}
                    <span className="sz-lesson-material-meta">
                      {podeBaixar ? descricaoDoArquivo(item) : 'baixa na aula'}
                    </span>
                  </span>
                  <span className="sz-lesson-material-cta" aria-live="polite">
                    {baixando === item.id
                      ? 'Preparando…'
                      : baixados.has(downloadKey(item.id)) || confirmed.includes(item.id)
                        ? 'Baixado'
                        : 'Baixar'}
                  </span>
                </button>
                {item.note ? <p className="sz-lesson-material-note">{item.note}</p> : null}
              </>
            ) : null}

            {item.kind === 'link' ? (
              <>
                <a
                  // Link INTERNO do "Como fazer" (`/como-fazer/<slug>`): mesma aba nova (a ajuda
                  // não atrapalha a aula), mas leva o caminho da aula de volta (`?voltar=`) e é
                  // da nossa origem — o referrer pode ir.
                  href={
                    isHelpLink(item.url)
                      ? helpLinkHref(item.url, lessonReturnPath(player))
                      : item.url
                  }
                  target="_blank"
                  rel={isHelpLink(item.url) ? 'noopener' : 'noopener noreferrer'}
                  className="sz-lesson-material-action"
                  {...(isHelpLink(item.url) ? { 'data-sz-help-link': '' } : {})}
                >
                  <span className="sz-lesson-material-icon" aria-hidden>
                    <ExternalLink className="size-4" />
                  </span>
                  <span className="sz-lesson-material-label">{item.label}</span>
                  {/* ⚠️ SÓ para o leitor de tela. MEDIDO num celular de 390px: visível, "abre em outra
                      aba" ocupa 120px e o NOME do link fica com 108 — o aviso maior que a coisa. O
                      ícone de link externo já diz isso a quem enxerga. */}
                  <span className="sz-lesson-material-meta sr-only">abre em outra aba</span>
                </a>
                {item.note ? <p className="sz-lesson-material-note">{item.note}</p> : null}
              </>
            ) : null}

            {item.kind === 'video' ? <MaterialVideo item={item} /> : null}

            {item.kind === 'image' ? (
              <figure className="sz-lesson-material-figure">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.alt ?? ''} loading="lazy" />
                {item.caption ? <figcaption>{item.caption}</figcaption> : null}
              </figure>
            ) : null}

            {item.kind === 'text' ? (
              <div className="lesson-prose sz-lesson-material-text">
                {renderMarkdown(item.markdown)}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * ⚠️ O vídeo só vira iframe quando `videoEmbedUrl` reconhece o host (Vimeo ou YouTube nocookie,
 * os dois que a CSP dos apps libera). Qualquer outro provedor vira LINK: um iframe bloqueado pela
 * CSP não avisa nada, e a criança ficaria olhando um retângulo branco.
 */
function MaterialVideo({ item }: { item: Extract<MaterialItem, { kind: 'video' }> }) {
  const embed = videoEmbedUrl(item.url)
  if (!embed)
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="sz-lesson-material-action"
      >
        <span className="sz-lesson-material-icon" aria-hidden>
          <Play className="size-4" />
        </span>
        <span className="sz-lesson-material-label">{item.label ?? 'Assistir ao vídeo'}</span>
        <span className="sz-lesson-material-meta sr-only">abre em outra aba</span>
      </a>
    )
  return (
    <figure className="sz-lesson-material-figure">
      {/* A caixa reserva a altura ANTES de o iframe carregar — sem pulo de layout. */}
      <div className="sz-lesson-material-video">
        {/* ⚠️ `allow` E `allowFullScreen`: o atributo legado ainda é o que Vimeo e YouTube leem
            para desenhar o botão de tela cheia dentro do player. */}
        <iframe
          src={embed}
          title={item.label ?? 'Vídeo complementar'}
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
        />
      </div>
      {item.label ? <figcaption>{item.label}</figcaption> : null}
    </figure>
  )
}

function descricaoDoArquivo(item: Extract<MaterialItem, { kind: 'file' }>) {
  return [friendlyFileType(item.fileType), formatBytes(item.sizeBytes)].filter(Boolean).join(' · ')
}
