import { PensaApp, type PensaHostAdapter, PensaHostChromeProvider } from '@sistemazero/pensa'
import { StrictMode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createProjectServer, type PlaygroundScene } from './project-server'
import './styles.css'

const params = new URLSearchParams(location.search)
const scene = (params.get('cena') ?? (params.has('vazio') ? 'vazio' : 'projeto')) as PlaygroundScene
const adult = params.has('adulto')
const PROJECT_SCENES: PlaygroundScene[] = [
  'organizando',
  'pergunta',
  'proposta',
  'projeto',
  'mudanca',
  'pronto',
  'esperando',
  'tropeco',
  'ideias',
  'pausado',
  'suporte',
]

/**
 * O playground do Pensa: o `<PensaApp>` com um servidor em memória e, no computador, uma barra
 * lateral do tamanho da do host (250px) para a largura bater com a do app de verdade.
 * `?cena=` escolhe o quadro do Canvas; `?adulto=1` liga a audiência adulta; `?shell=0` tira a
 * barra lateral. As imagens do Zappy vêm de `community-kids/public` (o `publicDir` do Vite).
 */
function Playground() {
  const [notice, setNotice] = useState('')
  const transport = useMemo(() => createProjectServer({ scene }), [])
  const adapter = useMemo<PensaHostAdapter>(
    () => ({
      transport,
      viewerId: 'playground',
      mode: adult ? 'adult' : 'kids',
      theme: params.get('theme') === 'dark' ? 'dark' : 'light',
      readOnly: scene === 'suporte',
      // O botão de falar é do host (member-shell); aqui só a forma dele, para conferir o desenho.
      renderVoiceInput: adult
        ? undefined
        : ({ disabled }) => (
            <button type="button" className="playground-fake-voice" disabled={disabled}>
              Falar
            </button>
          ),
      mascotImages: adult
        ? undefined
        : {
            happy: '/zappy/happy.webp',
            thinking: '/zappy/thinking.webp',
            celebrating: '/zappy/celebrating.webp',
            sleeping: '/zappy/sleeping.webp',
            speaking: '/zappy/speaking.webp',
          },
      onOpenMission: (mission) =>
        setNotice(
          `A missão abre no ${mission.destination === 'studio' ? 'Estúdio' : mission.destination === 'pinta' ? 'Pinta' : 'Molda'} no aplicativo completo.`,
        ),
      onOpenGame: () => setNotice('O jogo abre no Estúdio no aplicativo completo.'),
    }),
    [transport],
  )
  const initialProjectId = PROJECT_SCENES.includes(scene)
    ? ['organizando', 'pergunta', 'proposta', 'tropeco'].includes(scene)
      ? '20000000-0000-4000-8000-000000000001'
      : '10000000-0000-4000-8000-000000000001'
    : params.get('plano')
  return (
    <PensaHostChromeProvider
      value={{
        menu: null,
        back: {
          href: '#',
          label: 'Voltar para Criar',
          onNavigate: () => setNotice('Você está no playground do Pensa.'),
        },
      }}
    >
      <div className={params.get('shell') === '0' ? 'pg-frame' : 'pg-frame has-shell'}>
        <aside className="pg-shell" aria-label="Menu do host (simulado)">
          <strong>Sistema Zero Kids</strong>
          <span>Início</span>
          <span>Explorar</span>
          <span>Criar</span>
          <span className="pg-shell__sub">Meus jogos</span>
          <span className="pg-shell__sub">Estúdio</span>
          <span className="pg-shell__sub">Pinta</span>
          <span className="pg-shell__sub is-on">Pensa</span>
          <span className="pg-shell__sub">Molda</span>
          <span>Comunidade</span>
          <span>Meu espaço</span>
        </aside>
        <div className="pg-app">
          <PensaApp adapter={adapter} initialProjectId={initialProjectId} />
        </div>
      </div>
      <p role="status" className="pensa-playground-notice">
        {notice}
      </p>
    </PensaHostChromeProvider>
  )
}
const root = document.getElementById('root')
if (!root) throw new Error('Missing playground root')
createRoot(root).render(
  <StrictMode>
    <Playground />
  </StrictMode>,
)
