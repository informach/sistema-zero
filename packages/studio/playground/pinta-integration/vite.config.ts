import { resolve } from 'node:path'
import { mergeConfig } from 'vite'
import base from '../vite.config'

const here = import.meta.dirname
const r = (path: string) => resolve(here, path).replace(/\\/g, '/')
// Dedicated local QA host. Production Pinta/Studio UI and member-shell adapters are unchanged.
export default mergeConfig(base, {
  root: here,
  publicDir: r('../public'),
  resolve: {
    alias: {
      'next/navigation': r('navigation.ts'),
      '@sistemazero/pinta/studio-library': r('../../../pinta/src/export/studioLibrary.ts'),
      '@sistemazero/pinta/assets': r('../../../pinta/src/assets/index.ts'),
      '@sistemazero/pinta': r('../../../pinta/src/index.ts'),
    },
  },
})
