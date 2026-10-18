import { pythonPreviewObserver } from './previewObserver'
import { startStandalonePythonPlayer } from './standalonePlayer'

startStandalonePythonPlayer(import.meta.url, pythonPreviewObserver())
