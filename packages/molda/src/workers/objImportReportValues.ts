import { OBJ_INPUT_LIMITS } from '../import/objInput'
import { OBJ_CONVERSION_REPORT_LIMITS } from '../import/objReportLimits'
import * as v from '../scene/validation'

export {
  readNativeImportReportCode as reportCode,
  readNativeImportReportTarget as reportTarget,
} from './nativeImportReport'
export const reportLine = (value: unknown) =>
  v.number(value, 'issue.line', 1, OBJ_INPUT_LIMITS.lines, true)
export const reportPath = (value: unknown) =>
  v.text(value, 'issue.path', OBJ_CONVERSION_REPORT_LIMITS.pathChars)
