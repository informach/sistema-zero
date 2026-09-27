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
  type PintaTaskSession,
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

/**
 * `?tarefa=1` monta um brief de mentira (o que o kids monta a partir do handoff do
 * Pensa), para ver o painel — e o "Voltar ao plano" — no navegador sem banco.
 * `onReturnToPlan` só loga: aqui não há para onde navegar.
 *
 * `?tarefa=falha` faz a volta REJEITAR, para conferir que nada navega e o recado
 * aparece no painel.
 */
const taskDemo = new URLSearchParams(window.location.search).get('tarefa')
const DEMO_TASK: PintaTaskSession = {
  taskId: 'tarefa-demo',
  project: { id: 'plano-demo', name: 'Bosque encantado' },
  cycle: { id: 'ciclo-demo', number: 1, goal: 'Desenhar a turma do jogo' },
  title: 'Desenhar a heroína',
  summary: 'A personagem que a criança controla.',
  brief: {
    assetId: 'heroina',
    artKind: 'sprite',
    style: 'pixel',
    palette: [
      { role: 'roupa', color: '#aa33cc' },
      { role: 'pele', color: '#f2c4a0' },
    ],
    appearance: 'Pequena, ágil e com capa roxa.',
    animations: ['andar'],
    states: ['parada'],
    usage: 'Personagem principal',
    requiresStudioUse: false,
  },
  guide: {
    steps: [{ id: 'desenhar', text: 'Desenhar a personagem de frente', required: true }],
    criteria: [{ id: 'silhueta', text: 'Dá para reconhecer de longe', required: true }],
  },
  progress: {
    status: 'in_progress',
    completedStepIds: [],
    completedCriteriaIds: [],
    startedAt: '2026-09-17T12:00:00.000Z',
    completedAt: null,
    updatedAt: '2026-09-17T12:00:00.000Z',
    outputRef: null,
  },
  onProgress: async (input) => {
    console.log('[playground] onProgress', input)
  },
  onReturnToPlan: () => {
    if (taskDemo === 'falha') throw new Error('Falha de mentira do playground.')
    console.log('[playground] onReturnToPlan → /pensa?plano=plano-demo')
  },
}

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
      ...(taskDemo ? { taskSession: DEMO_TASK } : {}),
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
