import './edisvg-process.js'
import { BUILTIN_ART } from '@sistemazero/edisvg/builtins'
import { EdiAnimation } from '@sistemazero/edisvg/react'
import { DialogueBlockView } from '@sistemazero/member-shell/components/dialogue-block'
import { ZappyFalaProvider } from '@sistemazero/member-shell/components/zappy-fala-context'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { StrictMode, useRef, useState, version } from 'react'
import { createRoot } from 'react-dom/client'
import { KidsMascotAnimated } from '../../../src/components/kids/mascot-animated'
import { TrailChest } from '../../../src/components/kids/trail-chest'

const router = {
  bfcacheId: 'edisvg-qa',
  back() {},
  forward() {},
  push() {},
  replace() {},
  prefetch: async () => {},
  refresh() {
    document.documentElement.dataset.refreshed = String(
      Number(document.documentElement.dataset.refreshed ?? 0) + 1,
    )
  },
}
const params = new URLSearchParams(location.search)

function Voice() {
  const [talking, setTalking] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  return (
    <section id="voice">
      <ZappyFalaProvider value={{ podeFalar: true, falando: talking }}>
        <DialogueBlockView
          content={{ kind: 'dialogue', text: 'Prévia da fala do Zappy.' }}
          mascot={
            <span id="speaking-art">
              <KidsMascotAnimated expression="speaking" className="voice-size" />
            </span>
          }
        />
      </ZappyFalaProvider>
      <audio
        ref={audio}
        src="/qa/tone.wav"
        onPlay={() => setTalking(true)}
        onPause={() => setTalking(false)}
        onEnded={() => setTalking(false)}
        onError={() => setTalking(false)}
      >
        <track kind="captions" src="/qa/tone.vtt" srcLang="pt-BR" label="Tom de teste" default />
      </audio>
      <button type="button" onClick={() => void audio.current?.play()}>
        Ouvir
      </button>
      <button type="button" onClick={() => audio.current?.pause()}>
        Pausar
      </button>
      <output id="talking">{String(talking)}</output>
    </section>
  )
}

function Fixture() {
  const [present, setPresent] = useState(true)
  const [expression, setExpression] = useState<'happy' | 'thinking'>('happy')
  const [artPlaying, setArtPlaying] = useState(true)
  return (
    <AppRouterContext.Provider value={router}>
      <p id="react-version">{version}</p>
      <button type="button" onClick={() => setPresent(false)}>
        Sair da prévia
      </button>
      <button
        type="button"
        onClick={() => setExpression((value) => (value === 'happy' ? 'thinking' : 'happy'))}
      >
        Trocar arte
      </button>
      <button type="button" onClick={() => setArtPlaying(false)}>
        Pausar arte
      </button>
      {params.get('offscreen') === '1' && <div style={{ height: 1600 }} aria-hidden="true" />}
      {present && (
        <main>
          <Voice />
          <section id="chest" style={{ position: 'relative', height: 180, width: 360 }}>
            <TrailChest
              courseSlug="qa"
              moduleId="00000000-0000-4000-8000-000000000001"
              unitNumber={1}
              offset={0}
              chest={{ unlocked: true, claimed: params.get('opened') === '1', xp: 25, coins: 15 }}
            />
          </section>
          <section id="art" style={{ width: 200, height: 200 }}>
            <EdiAnimation
              src={
                params.get('preview') === '1'
                  ? '/api/media/module-animation/preview?src=fixture'
                  : BUILTIN_ART[expression].url
              }
              poster={BUILTIN_ART[expression].poster.url}
              className="art-size"
              playing={artPlaying}
            />
          </section>
        </main>
      )}
    </AppRouterContext.Provider>
  )
}

const root = document.querySelector('#root')
if (!root) throw new Error('Fixture root missing')
createRoot(root).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
)
