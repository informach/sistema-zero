import './configureProtectedSchemas'

import { createPythonPreviewContext } from './previewObserver'
import { startStandalonePythonPlayer } from './standalonePlayer'

const context = createPythonPreviewContext()
startStandalonePythonPlayer(import.meta.url, context.observer, context)
