import { useMemo } from 'react'

// Only Next's routing boundary is adapted to this local, isolated origin.
const router = {
  push: (path: string) => window.location.assign(path),
  replace: (path: string) => window.history.replaceState(null, '', path),
  back: () => window.history.back(),
  forward: () => window.history.forward(),
  refresh: () => window.location.reload(),
  prefetch: async () => {},
}
export const useRouter = () => router
export const usePathname = () => window.location.pathname
export const useSearchParams = () => useMemo(() => new URLSearchParams(window.location.search), [])
