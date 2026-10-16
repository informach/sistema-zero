import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { DesktopApp } from './desktop-app'
import './console.css'

const ProofApp = lazy(() => import('./proof-app'))
const root = document.getElementById('root')
if (!root) throw new Error('Página não inicializada')
const proof = new URLSearchParams(window.location.search).get('proof') === '1'
createRoot(root).render(
  proof ? (
    <Suspense fallback={<p>Carregando prova de produção…</p>}>
      <ProofApp />
    </Suspense>
  ) : (
    <DesktopApp />
  ),
)
