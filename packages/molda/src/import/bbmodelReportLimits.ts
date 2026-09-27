import { BbmodelInputError } from './bbmodelInput'

export const BBMODEL_REPORT_LIMITS = {
  issues: 65536,
  /** Counts UTF-16 string keys/values, not serialized bytes or peak memory. */
  textChars: 4 * 1024 * 1024,
  pathChars: 65536,
} as const

/** Only owned, acyclic, bounded-depth diagnostics. Never pass unknown source subtrees here. */
export class BbmodelReportBudget {
  private issues = 0
  private characters = 0
  addText(value: unknown): void {
    if (typeof value === 'string') {
      if (value.length > BBMODEL_REPORT_LIMITS.textChars - this.characters)
        throw new BbmodelInputError(
          'budget',
          'report.text',
          'O relatório tem textos demais para revisar.',
        )
      this.characters += value.length
    } else if (Array.isArray(value)) {
      for (const item of value) this.addText(item)
    } else if (value !== null && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) {
        this.addText(key)
        this.addText(item)
      }
    }
  }
  addIssue(value: { detail: { path: string } }): void {
    if (this.issues >= BBMODEL_REPORT_LIMITS.issues)
      throw new BbmodelInputError(
        'budget',
        'report.issues',
        'Há adaptações demais para revisar nesta importação.',
      )
    if (value.detail.path.length > BBMODEL_REPORT_LIMITS.pathChars)
      throw new BbmodelInputError(
        'budget',
        'report.path',
        'Um caminho do relatório é longo demais.',
      )
    this.addText(value)
    this.issues++
  }
}
