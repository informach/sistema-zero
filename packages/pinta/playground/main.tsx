/**
 * Playground de DEV do Pinta (QA em browser real sem subir o kids inteiro):
 * monta o <PintaApp> com um adapter de demonstração — a ponte "Usar no
 * Estúdio" loga o payload no console e devolve sucesso.
 */

import { PintaApp, setPintaStorageNamespace } from '@sistemazero/pinta'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

setPintaStorageNamespace('playground')

const root = document.getElementById('root')
if (!root) throw new Error('#root não encontrado')

createRoot(root).render(
  <StrictMode>
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
    </div>
  </StrictMode>,
)
