import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { type StudioHostChrome, StudioHostChromeProvider } from '../src/studio/host-chrome'

/**
 * Chrome do HOST de demonstração (07/09/2026): o botão de esconder o menu da comunidade
 * (alterna estado local) e o selo "Guardado na sua conta" percorrendo os estados a cada
 * 4 s, começando pelo REPOUSO (selo nulo: a lista mostra a pílula da conta). Desde 11/09
 * também a seta "← Criar" da lista (loga no console em vez de navegar) e a conta ligada.
 * É como se vê, sem subir o kids, o que a Topbar e a ProjectList desenham.
 *
 * Só com `?host=1`, para os specs e2e (que rodam contra este playground) não verem botão a
 * mais. ⚠️ Importa o Provider pelo caminho RELATIVO, como o `main.tsx` faz com o
 * ErrorBoundary: pelo índice do pacote ele arrastaria o editor inteiro para o chunk da
 * lista, e o `initialBundleBudget` reprova.
 */
export const HOST_DEMO = new URLSearchParams(window.location.search).get('host') === '1'

const DEMO_STATUSES: StudioHostChrome['status'][] = [
  null,
  { tone: 'muted', icon: 'upload', label: 'Guardando…', text: 'Guardando na sua conta…' },
  { tone: 'ok', icon: 'cloud', label: 'Guardado na sua conta', text: 'Guardado na sua conta' },
  {
    tone: 'warn',
    icon: 'offline',
    label: 'Sem internet agora',
    text: 'Sem internet agora. Vou guardar na sua conta quando voltar.',
  },
  {
    tone: 'danger',
    icon: 'alert',
    label: 'Não consegui guardar',
    text: 'Não consegui guardar na sua conta.',
  },
]

// Fora do componente: identidade estável, como a do host de verdade (`useHostChrome`).
const DEMO_BACK: StudioHostChrome['back'] = {
  text: 'Criar',
  label: 'Voltar para Criar',
  href: '#criar',
  onNavigate: () => console.log('[playground] voltar para Criar'),
}
const DEMO_ACCOUNT: StudioHostChrome['account'] = { label: 'Guardado na sua conta' }

export function DemoHostChrome({ children }: { children: JSX.Element }): JSX.Element {
  const [hidden, setHidden] = useState(false)
  const [step, setStep] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setStep((s) => (s + 1) % DEMO_STATUSES.length), 4000)
    return () => window.clearInterval(id)
  }, [])
  const chrome: StudioHostChrome = {
    menu: {
      hidden,
      label: hidden ? 'Mostrar menu' : 'Esconder menu',
      onToggle: () => setHidden((h) => !h),
    },
    status: DEMO_STATUSES[step] ?? null,
    back: DEMO_BACK,
    account: DEMO_ACCOUNT,
  }
  return <StudioHostChromeProvider value={chrome}>{children}</StudioHostChromeProvider>
}
