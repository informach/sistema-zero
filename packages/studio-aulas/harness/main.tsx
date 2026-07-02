import {
  createEmptyProject,
  type InstalledExtension,
  type Project,
  StudioEditor,
} from '@sistemazero/studio'
import '@sistemazero/studio/styles.css'
import './styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Side-effect: instala window.__aulas (a API que o driver Playwright chama).
import './automation'

// Harness de GRAVAÇÃO: monta o Estúdio com um projeto inicial e as extensões
// pedidas, num tema claro fixo (didático), sem terminal/IA. Tudo aqui vive no
// pacote novo; o Estúdio é só CONSUMIDO.

function lerExtensoes(): InstalledExtension[] {
  const raw = new URLSearchParams(window.location.search).get('ext') ?? ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((id) => ({ id, version: '1.0.0', installedAt: 0 }))
}

function projetoInicial(): Project {
  const p = createEmptyProject('aula-harness', 'Aula (gravação)')
  const extensoes = lerExtensoes()
  return extensoes.length ? { ...p, installedExtensions: extensoes } : p
}

const el = document.getElementById('root')
if (!el) throw new Error('sem #root')
createRoot(el).render(
  <StrictMode>
    <div style={{ position: 'fixed', inset: 0 }}>
      <StudioEditor
        initialProject={projetoInicial()}
        theme="light"
        persistence="none"
        allowedModes={['blocks']}
        initialMode="blocks"
      />
    </div>
  </StrictMode>,
)
