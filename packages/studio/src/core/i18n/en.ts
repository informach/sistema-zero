import { en as editor } from './editor/en'
import { en as pro } from './pro/en'
import { en as shared } from './shared/en'

export const en: Record<string, string> = { ...shared, ...editor, ...pro }
