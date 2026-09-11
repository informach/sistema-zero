/**
 * Playground de DEV do Pinta (QA em browser real sem subir o kids inteiro):
 * monta o <PintaApp> com um adapter de demonstração — a ponte "Usar no
 * Estúdio" loga o payload no console e devolve sucesso.
 *
 * `?host=1` liga um chrome de HOST de mentira (07/09/2026): o botão de esconder
 * o menu (alterna o estado local) e o selo "Guardado na sua conta" percorrendo
 * os estados a cada 4 s, começando pelo REPOUSO (selo nulo: a galeria mostra a
 * pílula da conta). Desde 11/09 também a seta "← Criar" da galeria (loga no
 * console em vez de navegar) e a conta ligada. É como se vê, sem o kids, o que
 * o Pinta desenha na barra do editor e no cabeçalho da galeria. Sem o parâmetro
 * nada muda.
 */

import {
  PintaApp,
  type PintaHostChrome,
  PintaHostChromeProvider,
  type PintaHostChromeStatus,
  setPintaStorageNamespace,
} from '@sistemazero/pinta'
import { type JSX, StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

setPintaStorageNamespace('playground')

const root = document.getElementById('root')
if (!root) throw new Error('#root não encontrado')

const DEMO_STATUSES: Array<PintaHostChromeStatus | null> = [
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
const DEMO_BACK: PintaHostChrome['back'] = {
  text: 'Criar',
  label: 'Voltar para Criar',
  href: '#criar',
  onNavigate: () => console.log('[playground] voltar para Criar'),
}
const DEMO_ACCOUNT: PintaHostChrome['account'] = { label: 'Guardado na sua conta' }

function DemoHostChrome({ children }: { children: JSX.Element }): JSX.Element {
  const [hidden, setHidden] = useState(false)
  const [step, setStep] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setStep((s) => (s + 1) % DEMO_STATUSES.length), 4000)
    return () => window.clearInterval(id)
  }, [])
  const chrome: PintaHostChrome = {
    menu: {
      hidden,
      label: hidden ? 'Mostrar menu' : 'Esconder menu',
      onToggle: () => setHidden((h) => !h),
    },
    status: DEMO_STATUSES[step] ?? null,
    back: DEMO_BACK,
    account: DEMO_ACCOUNT,
  }
  return <PintaHostChromeProvider value={chrome}>{children}</PintaHostChromeProvider>
}

const hostDemo = new URLSearchParams(window.location.search).get('host') === '1'

const app = (
  <PintaApp
    adapter={{
      sendToStudio: async (asset) => {
        console.log('[playground] sendToStudio', {
          id: asset.id,
          name: asset.name,
          width: asset.width,
          height: asset.height,
          dataUrlChars: asset.dataUrl.length,
          // Mapa: a grade DEVE trazer as camadas da frente (nada some por aqui).
          grid: asset.tilemap?.grid,
        })
        return { ok: true }
      },
      sendGameToStudio: async (asset) => {
        console.log('[playground] sendGameToStudio', {
          name: asset.name,
          hasTilemap: Boolean(asset.tilemap),
          hasFront: Boolean(asset.tilemapFront),
          grid: asset.tilemap?.grid,
          frontGrid: asset.tilemapFront?.grid,
        })
        return { ok: true }
      },
      // Reenvio automático ao salvar: no app de verdade o host só atualiza o
      // que JÁ está na biblioteca do Estúdio; aqui devolve sempre "atualizei"
      // para dar como ver o aviso no cabeçalho.
      resyncToStudio: async (asset) => {
        console.log('[playground] resyncToStudio', {
          id: asset.id,
          name: asset.name,
          dataUrlChars: asset.dataUrl.length,
        })
        return { updated: true }
      },
      // Deep link do botão "Editar" do Estúdio: `?desenho=<id>`.
      ...(new URLSearchParams(window.location.search).get('desenho')
        ? { initialAssetId: new URLSearchParams(window.location.search).get('desenho') ?? '' }
        : {}),
      onOpenStudio: () => console.log('[playground] onOpenStudio'),
    }}
  />
)

createRoot(root).render(
  <StrictMode>
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {hostDemo ? <DemoHostChrome>{app}</DemoHostChrome> : app}
    </div>
  </StrictMode>,
)
