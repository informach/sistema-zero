/**
 * Baixar um anexo da aula NA MESMA página.
 *
 * ⚠️ A rota autenticada demora alguns segundos aplicando a marca d'água, então `target="_blank"`
 * deixava uma guia em branco "morta" até o download começar. Aqui o arquivo vem por `fetch` e é
 * salvo por âncora programática — o aluno nunca sai da aula.
 *
 * ⚠️ Anexo EXTERNO (URL que a autora colou) responde 302 para outro domínio e o `fetch` morre no
 * CORS. Esse caso abre em nova guia, que é o comportamento de sempre; ele é indistinguível de uma
 * queda de rede aqui, e abrir a guia é a saída boa para os dois.
 */
export function lessonAttachmentUrl(
  courseSlug: string,
  lessonId: string,
  attachmentId: string,
  evidence?: { blockId: string; itemId: string; viewerId: string; blockRevision: string },
) {
  const path = `/api/cursos/${encodeURIComponent(courseSlug)}/aulas/${encodeURIComponent(
    lessonId,
  )}/anexos/${encodeURIComponent(attachmentId)}`
  return evidence ? `${path}?${new URLSearchParams(evidence)}` : path
}

export type AttachmentDownloadResult =
  | { ok: true }
  | { ok: false; reason: 'refused'; message: string }
  | { ok: false; reason: 'opened-tab' }

export async function downloadLessonAttachment(
  url: string,
  fallbackName: string,
): Promise<AttachmentDownloadResult> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      return {
        ok: false,
        reason: 'refused',
        message: body?.error?.message ?? 'Não foi possível baixar o material.',
      }
    }
    saveBlob(await res.blob(), filenameFrom(res.headers.get('content-disposition')) ?? fallbackName)
    return { ok: true }
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
    return { ok: false, reason: 'opened-tab' }
  }
}

/** Extrai o filename do Content-Disposition (a rota o monta com a extensão real). */
export function filenameFrom(disposition: string | null): string | null {
  const m = disposition?.match(/filename="([^"]+)"/)
  return m?.[1] ?? null
}

/** Salva o blob via âncora programática (sem navegar/abrir guia). */
function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}
