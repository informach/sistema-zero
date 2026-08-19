import { pintaAssetFromWire, pintaAssetToWire } from '@sistemazero/pinta/assets'
import type { PgClient } from './db'

/**
 * Restauração de entregas de Estúdio/Pinta apagadas (incidente de 08/2026: editar um bloco no
 * admin fazia DELETE das `studio_submissions` do bloco — regra revertida em `2a690495`).
 *
 * Cada item é uma entrega que a equipe RECUPEROU de outra fonte (linha morta do Postgres, snapshot
 * do Mural, entrega sobrevivente da mesma cadeia). A operação é deliberadamente conservadora:
 * - **nunca sobrescreve** uma linha viva (`ON CONFLICT (user_id, block_id) DO NOTHING`): se a
 *   criança reenviou entretanto, a versão dela vence;
 * - só grava em bloco `studio`/`pinta` existente e valida o payload conforme o bloco
 *   (`files` no Estúdio; asset completo no Pinta); qualquer coisa fora disso vira
 *   `skipped` com o motivo, sem abortar os demais;
 * - `lesson_id`/`course_id` vêm do BLOCO no banco (não do manifesto — o bloco é a verdade);
 * - `score`/`results`/`checked_at` ficam nulos (a correção automática pode ser refeita pela
 *   criança com "Verificar + Reenviar"); `passed_at` só entra quando o manifesto traz a prova
 *   (evento `studio_passed` do ledger);
 * - `dryRun` faz TODA a checagem e não escreve nada.
 *
 * Tudo numa transação: um erro inesperado desfaz o lote inteiro.
 */
export interface RestoreSubmissionItem {
  userId: string
  blockId: string
  /** Snapshot `Project` do Estúdio (ou asset do Pinta) a gravar em `project`. */
  project: unknown
  /** ISO-8601. Momento em que a criança tinha entregado (metadado recuperado ou melhor evidência). */
  submittedAt: string
  /** Conta responsável (kids = o pai/mãe). Ausente → tenta reaproveitar de outra entrega da criança. */
  accountId?: string | null
  passedAt?: string | null
  message?: string | null
  /** Só para o relatório (ex.: 'forense', 'mural', 'cadeia'). */
  source?: string
}

export interface RestoreSubmissionOutcome {
  userId: string
  blockId: string
  source?: string
  reason?: string
}

export interface RestoreSubmissionsResult {
  dryRun: boolean
  inserted: RestoreSubmissionOutcome[]
  skipped: RestoreSubmissionOutcome[]
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isPlausibleStudioProject(project: unknown): boolean {
  if (!project || typeof project !== 'object' || Array.isArray(project)) return false
  const files = (project as { files?: unknown }).files
  return !!files && typeof files === 'object' && !Array.isArray(files)
}

type BlockRow = { id: string; kind: string; lesson_id: string; course_id: string }

export async function restoreStudioSubmissions(
  sql: PgClient,
  items: RestoreSubmissionItem[],
  opts: { dryRun: boolean; newId: () => string },
): Promise<RestoreSubmissionsResult> {
  const result: RestoreSubmissionsResult = { dryRun: opts.dryRun, inserted: [], skipped: [] }
  if (items.length === 0) return result

  await sql.begin(async (tx) => {
    for (const item of items) {
      const outcome: RestoreSubmissionOutcome = {
        userId: item.userId,
        blockId: item.blockId,
        source: item.source,
      }
      const skip = (reason: string) => {
        result.skipped.push({ ...outcome, reason })
      }

      if (!UUID_RE.test(item.userId) || !UUID_RE.test(item.blockId)) {
        skip('userId/blockId não são uuid')
        continue
      }
      const submittedAt = new Date(item.submittedAt)
      if (Number.isNaN(submittedAt.getTime())) {
        skip('submittedAt inválido')
        continue
      }
      const passedAt = item.passedAt ? new Date(item.passedAt) : null
      if (passedAt && Number.isNaN(passedAt.getTime())) {
        skip('passedAt inválido')
        continue
      }
      if (item.accountId != null && !UUID_RE.test(item.accountId)) {
        skip('accountId não é uuid')
        continue
      }
      const message = item.message?.trim() ? item.message.trim().slice(0, 1000) : null

      const [block] = (await tx`
        select b.id::text as id, b.kind::text as kind, b.lesson_id::text as lesson_id, l.course_id::text as course_id
          from members.lesson_blocks b
          join members.lessons l on l.id = b.lesson_id
         where b.id = ${item.blockId}`) as BlockRow[]
      if (!block) {
        skip('bloco não existe')
        continue
      }
      if (block.kind !== 'studio' && block.kind !== 'pinta') {
        skip(`bloco é ${block.kind}, não studio/pinta`)
        continue
      }
      let projectToInsert: unknown = item.project
      if (block.kind === 'studio') {
        if (!isPlausibleStudioProject(item.project)) {
          skip('project não é um objeto com `files`')
          continue
        }
      } else {
        const asset = pintaAssetFromWire(item.project)
        if (!asset) {
          skip('project não é um asset válido do Pinta')
          continue
        }
        projectToInsert = pintaAssetToWire(asset)
      }

      const [existing] = await tx`
        select 1 as ok from members.studio_submissions
         where user_id = ${item.userId} and block_id = ${item.blockId}`
      if (existing) {
        skip('já existe entrega viva (não sobrescrevemos)')
        continue
      }

      let accountId = item.accountId ?? null
      if (!accountId) {
        const [other] = (await tx`
          select account_id::text as account_id from members.studio_submissions
           where user_id = ${item.userId} and account_id is not null
           limit 1`) as Array<{ account_id: string }>
        accountId = other?.account_id ?? null
      }

      if (opts.dryRun) {
        result.inserted.push(outcome)
        continue
      }

      const [row] = (await tx`
        insert into members.studio_submissions
          (id, user_id, account_id, block_id, lesson_id, course_id, project, submitted_at, passed_at, message)
        values
          (${opts.newId()}, ${item.userId}, ${accountId}, ${item.blockId}, ${block.lesson_id}, ${block.course_id},
           ${JSON.stringify(projectToInsert)}::jsonb, ${submittedAt.toISOString()}::timestamptz,
           ${passedAt ? passedAt.toISOString() : null}::timestamptz, ${message})
        on conflict (user_id, block_id) do nothing
        returning id`) as Array<{ id: string }>
      if (row) result.inserted.push(outcome)
      else skip('conflito na inserção (linha viva concorrente)')
    }
  })

  return result
}
