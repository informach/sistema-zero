import libraries from '../pro/defaultLibraries.json'
import { createProLanguageService } from '../pro/languageService'
import type { ProLanguageRequest, ProLanguageResponse } from '../pro/protocol'

const service = createProLanguageService(libraries)
const files: Record<string, string> = {}
let availableFiles: readonly string[] = []
self.onmessage = (event: MessageEvent<ProLanguageRequest>) => {
  const message = event.data
  try {
    let result: unknown
    switch (message.method) {
      case 'update':
        for (const [path, content] of Object.entries(message.patch)) {
          if (content === null) delete files[path]
          else files[path] = content
        }
        if (message.availableFiles) availableFiles = message.availableFiles
        service.update(files, availableFiles)
        result = service.version
        break
      case 'diagnostics':
        result = service.diagnostics(...message.args)
        break
      case 'completions':
        result = service.completions(...message.args)
        break
      case 'hover':
        result = service.hover(...message.args)
        break
      case 'definitions':
        result = service.definitions(...message.args)
        break
      case 'format':
        result = service.format(...message.args)
        break
    }
    self.postMessage({ id: message.id, result } satisfies ProLanguageResponse)
  } catch (error) {
    self.postMessage({
      id: message.id,
      error: error instanceof Error ? error.message : String(error),
    } satisfies ProLanguageResponse)
  }
}
