import { defineConfig } from '@playwright/test'
import editor, { pythonEditorWebServer } from './playwright.python-editor.config'

export default defineConfig({
  ...editor,
  testMatch:
    /(?:bridge-workspace|source-editor|python-language|authoring-runtime|live-runtime|free-runtime|public-runtime|web-export)\.spec\.ts$/,
  outputDir: '../../.cache/studio-python-bridge-results',
  webServer: [
    {
      command: 'bun ../../experiments/studio-python-runtime/server.ts',
      url: 'http://127.0.0.1:5297/configuration',
      env: { PYTHON_PROBE_EDITOR: '1' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    pythonEditorWebServer,
  ],
})
