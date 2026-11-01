import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import {
  PathnameContext,
  SearchParamsContext,
} from 'next/dist/shared/lib/hooks-client-context.shared-runtime'
import { type ReactNode, useState } from 'react'

const router = {
  bfcacheId: 'parity',
  back() {},
  forward() {},
  push() {},
  replace() {},
  prefetch: async () => {},
  refresh() {},
}
export function LessonParityPreview({ children }: { children: ReactNode }) {
  const [inside, setInside] = useState(true)
  return (
    <AppRouterContext.Provider value={router}>
      <PathnameContext.Provider value="/cursos/ensaio/aulas/primeira">
        <SearchParamsContext.Provider value={new URLSearchParams(location.search)}>
          <button
            id="leave"
            type="button"
            className="fixed bottom-0 left-0 z-[100]"
            onClick={() => setInside(false)}
          >
            Sair do ensaio
          </button>
          {inside ? children : <main id="outside">Fora da aula</main>}
        </SearchParamsContext.Provider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  )
}
