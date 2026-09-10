import { ObjInputError } from './objInput'
import { OBJ_CONVERSION_REPORT_LIMITS } from './objReportLimits'

/** Only validated, acyclic report data. This is NOT a reader for raw worker messages. */
export class ObjReportTextBudget {
  private characters = 0
  private text(value: string) {
    if (value.length > OBJ_CONVERSION_REPORT_LIMITS.textChars - this.characters)
      throw new ObjInputError(
        'budget',
        'report.text',
        'O relatório tem textos demais para revisar nesta importação.',
      )
    this.characters += value.length
  }
  add(value: unknown): void {
    if (typeof value === 'string') {
      this.text(value)
      return
    }
    if (value === null || typeof value !== 'object') return
    if (Array.isArray(value)) {
      for (const item of value) this.add(item)
    } else {
      for (const [key, item] of Object.entries(value)) {
        this.text(key)
        this.add(item)
      }
    }
  }
}
