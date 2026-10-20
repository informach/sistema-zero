'use client'

import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { toast } from 'sonner'
import {
  CONNECTION_ERROR,
  CONNECTION_MESSAGE,
  StudyRequestError,
  studyErrorMessage,
} from '@/lib/study-access-client'

/** Os botões do diálogo em pílula de 44px (o ui desenha 32px com cantos de 8px). */
export const DIALOG_ACTIONS =
  'flex flex-wrap justify-end gap-2 [&_button]:min-h-11 [&_button]:rounded-full [&_button]:px-4'

const ARCHIVE_FAILED_MESSAGE = 'Não foi possível arquivar o perfil. Tente novamente.'

/**
 * Arquiva o perfil. O `DELETE` do perfil arquiva no Auth (`status = 'archived'`), nunca apaga: o
 * perfil sai da conta, a vaga do plano volta (o limite conta só perfis ativos) e o progresso e os
 * projetos ficam guardados. Não existe caminho de desarquivar na plataforma, por isso a tela não
 * promete volta. A falha leva o código do servidor
 * (`PARENT_REAUTH_REQUIRED` vira o atalho "Entrar de novo" de `showProfileActionError`). Quem
 * chama leva a família de volta para `/pais`.
 */
export async function archiveProfile(profileId: string): Promise<void> {
  let response: Response
  try {
    response = await sessionFetch(`/api/profiles/${profileId}`, { method: 'DELETE' })
  } catch {
    throw new StudyRequestError(CONNECTION_ERROR, CONNECTION_MESSAGE)
  }
  if (response.ok) return
  let code: string | null = null
  try {
    const data = (await response.json()) as { error?: { code?: unknown } } | null
    code = typeof data?.error?.code === 'string' ? data.error.code : null
  } catch {
    // Corpo fora do JSON (página de erro do proxy): fica a frase geral.
  }
  if (code === 'PARENT_REAUTH_REQUIRED')
    throw new StudyRequestError(code, 'Por segurança, entre de novo para arquivar o perfil.')
  throw new StudyRequestError(code ?? 'PROFILE_ARCHIVE_FAILED', ARCHIVE_FAILED_MESSAGE)
}

/**
 * A falha de uma mudança no perfil, dita ao responsável. ⚠️ Arquivar, mudar o nascimento, ligar
 * o perfil público e ligar a fala pedem login de até 15 min (`PARENT_REAUTH_REQUIRED`, full
 * review de 10/10/2026): sem o atalho, o responsável lia o recado e ficava sem caminho. A
 * entrada dos responsáveis volta para a página onde ele estava.
 */
export function showProfileActionError(error: unknown): void {
  if (error instanceof StudyRequestError && error.code === 'PARENT_REAUTH_REQUIRED') {
    const next = encodeURIComponent(window.location.pathname)
    toast.error('Por segurança, entre de novo para salvar essa mudança.', {
      action: {
        label: 'Entrar de novo',
        onClick: () => window.location.assign(`/login/responsavel?next=${next}`),
      },
    })
  } else toast.error(studyErrorMessage(error))
}

/**
 * A confirmação de sempre antes de arquivar, igual no editor e na página da criança. O texto não diz
 * "criança": o mesmo diálogo serve ao perfil de quem já fez 18 anos.
 */
export function RemoveProfileDialog({
  name,
  open,
  busy,
  onCancel,
  onConfirm,
}: {
  name: string | undefined
  open: boolean
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onCancel()
      }}
      title="Arquivar perfil"
      footer={
        <div className={DIALOG_ACTIONS}>
          <Button variant="secondary" disabled={busy} onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onConfirm}>
            Arquivar
          </Button>
        </div>
      }
    >
      <p>
        Arquivar o perfil de {name}? Ele sai da sua conta e libera a vaga do plano, e {name} deixa
        de entrar com ele. O progresso e os projetos ficam guardados, mas não aparecem mais na
        plataforma.
      </p>
    </Dialog>
  )
}
