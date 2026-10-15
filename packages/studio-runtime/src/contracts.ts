import type { ProTemplateId } from '@sistemazero/core/studio'

export {
  InvalidBuildRequestError,
  normalizeBuildPath,
  PRO_BUILD_LIMITS,
  PRO_TEMPLATE_IDS,
  type ProBuildFailure,
  type ProBuildRequest,
  type ProBuildResponse,
  type ProBuildSuccess,
  type ProTemplateId,
  parseBuildRequest,
} from '@sistemazero/core/studio'

export function trustedPackageJson(templateId: ProTemplateId): string {
  const dependencies: Record<string, string> = {}
  const devDependencies: Record<string, string> = { vite: '8.0.16' }
  if (templateId === 'vanilla-vite') devDependencies.typescript = '5.9.3'
  if (templateId === 'react-ts') {
    dependencies.react = '19.2.0'
    dependencies['react-dom'] = '19.2.0'
    devDependencies['@vitejs/plugin-react'] = '6.0.2'
    devDependencies.typescript = '5.9.3'
  }
  if (templateId === 'three-js' || templateId === 'three-ts') {
    dependencies.three = '0.180.0'
  }
  if (templateId === 'three-ts') {
    devDependencies['@types/three'] = '0.180.0'
    devDependencies.typescript = '5.9.3'
  }
  return `${JSON.stringify(
    {
      name: 'sz-pro-lesson',
      private: true,
      type: 'module',
      scripts: { build: 'vite build' },
      dependencies,
      devDependencies,
    },
    null,
    2,
  )}\n`
}

export function trustedViteConfig(templateId: ProTemplateId): string {
  const reactImport = templateId === 'react-ts' ? "import react from '@vitejs/plugin-react'\n" : ''
  const plugins = templateId === 'react-ts' ? '  plugins: [react()],\n' : ''
  return `import { defineConfig } from 'vite'\n${reactImport}\nexport default defineConfig({\n${plugins}  base: './',\n  build: {\n    assetsInlineLimit: 100000000,\n    cssCodeSplit: false,\n    sourcemap: false,\n    rolldownOptions: { output: { codeSplitting: false } },\n  },\n})\n`
}
