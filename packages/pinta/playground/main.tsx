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
 * `?missao=1` monta uma missão de demonstração (o que o Kids recebe no handoff do
 * Pensa), para ver o painel — e o "Voltar ao plano" — no navegador sem banco.
 * `onReturnToPlan` só loga: aqui não há para onde navegar.
 *
 * `?missao=falha` faz a volta rejeitar, para conferir que nada navega e o recado
 * aparece no painel.
 */
const taskDemo = new URLSearchParams(window.location.search).get('missao')
const DEMO_TASK: PintaTaskSession = {
  project: { id: '10000000-0000-4000-8000-000000000001', name: 'Bosque encantado' },
  mission: {
    id: '10000000-0000-4000-8000-000000000002',
    contentRevision: 1,
    stageId: '10000000-0000-4000-8000-000000000003',
    position: 0,
    title: 'Desenhe a heroína',
    objective: 'Crie a personagem que o jogador controla.',
    kind: 'asset',
    destination: 'pinta',
    requirementIds: ['10000000-0000-4000-8000-000000000004'],
    dependencyIds: [],
    assetSlotIds: ['10000000-0000-4000-8000-000000000005'],
    rules: [{ id: 'appearance', text: 'Ela é pequena, ágil e tem uma capa roxa.' }],
    checks: [
      {
        id: 'silhouette',
        action: 'Veja a personagem no tamanho do jogo.',
        expected: 'Dá para reconhecer sua silhueta.',
      },
    ],
  },
  progress: {
    missionId: '10000000-0000-4000-8000-000000000002',
    progressRevision: 0,
    status: 'in_progress',
    validity: 'current',
    assigneeProfileId: null,
    completedByProfileId: null,
    deliveries: [],
    verification: null,
    resumeNote: null,
    startedAt: null,
    completedAt: null,
  },
  assetSlots: [
    {
      id: '10000000-0000-4000-8000-000000000005',
      name: 'Heroína',
      kind: 'sprite',
      description: 'A personagem de capa roxa.',
      source: 'create',
      existing: null,
    },
  ],
  references: [],
  blockedReason: null,
  collapsed: false,
  onCollapsedChange() {},
  async onComplete() {
    console.log('[playground] conferir missão')
  },
  async onReopen() {
    console.log('[playground] reabrir missão')
  },
  async onNextMission() {
    console.log('[playground] continuar caminho')
  },
  nextMissionLabel: 'Voltar ao plano',
  onNeedHelp() {
    console.log('[playground] abrir ajuda')
  },
  async onBindCreation(input) {
    console.log('[playground] ligar criação', input)
  },
  async onSaveNote(note) {
    console.log('[playground] guardar nota', note)
  },
  onReturnToPlan: () => {
    if (taskDemo === 'falha') throw new Error('Falha de mentira do playground.')
    console.log('[playground] onReturnToPlan → /pensa?plano=plano-demo')
  },
}

function PintaDemo() {
  const [collapsed, setCollapsed] = useState(false)
  return (
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
        ...(taskDemo
          ? { taskSession: { ...DEMO_TASK, collapsed, onCollapsedChange: setCollapsed } }
          : {}),
      }}
    />
  )
}

const app = <PintaDemo />

createRoot(root).render(
  <StrictMode>
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {hostDemo ? <DemoHostChrome>{app}</DemoHostChrome> : app}
    </div>
  </StrictMode>,
)
