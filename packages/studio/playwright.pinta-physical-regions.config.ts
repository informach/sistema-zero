import { defineConfig } from '@playwright/test'
import base from './playwright.pinta-chunks.config'

export default defineConfig({
  ...base,
  testMatch: [
    'pinta-physical-regions.flow.ts',
    'pinta-local-chunks.flow.ts',
    'pinta-authority.flow.ts',
    'pinta-causal-local.flow.ts',
    'pinta-future-recovery.flow.ts',
  ],
  outputDir: './.cache/pinta-physical-regions-results',
  reporter: [
    ['list'],
    ['json', { outputFile: './.cache/pinta-physical-regions-results/report.json' }],
  ],
  projects: base.projects?.map((project) => ({
    ...project,
    testMatch:
      project.name === 'desktop'
        ? [
            'pinta-physical-regions.flow.ts',
            'pinta-local-chunks.flow.ts',
            'pinta-authority.flow.ts',
            'pinta-causal-local.flow.ts',
            'pinta-future-recovery.flow.ts',
          ]
        : [
            'pinta-physical-regions.flow.ts',
            'pinta-local-chunks.flow.ts',
            'pinta-future-recovery.flow.ts',
          ],
  })),
})
