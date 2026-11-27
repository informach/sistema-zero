import { verifyStudioProPlatformFiles } from '@sistemazero/core/studio/pro-revision'
import libraries from '../pro/defaultLibraries.json'
import { createProLanguageService } from '../pro/languageService'
import type { ProLanguageRequest, ProLanguageResponse } from '../pro/protocol'

const service = createProLanguageService(libraries)
const files: Record<string, string> = {}
let availableFiles: readonly string[] = []
self.onmessage = async (event: MessageEvent<ProLanguageRequest>) => {
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
      case 'diagnostics': {
        const path = message.args[0]
        const platform = await verifyStudioProPlatformFiles({ [path]: files[path] })
        result = service.diagnostics(path, platform)
        break
      }
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
      case 'organizeImports':
        result = service.organizeImports(...message.args)
        break
      case 'symbols':
        result = service.symbols(...message.args)
        break
      case 'references':
        result = service.references(...message.args)
        break
      case 'renameFile':
        result = service.renameFile(...message.args)
        break
      case 'renameSymbol':
        result = service.renameSymbol(...message.args)
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
