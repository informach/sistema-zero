import { Player } from '@remotion/player'
import {
  applyStoryPatch,
  defaultStory,
  StoryComposition,
  type StoryProps,
} from '@sistemazero/marketing-production'
import { useEffect, useState } from 'react'
import type { Asset, Progress, Provider, ProviderStatus, RunRequest } from '../shared/contracts'
import './styles.css'
import { DesktopConnection } from './connection'

export default function ProofApp() {
  const [statuses, setStatuses] = useState<ProviderStatus[]>([])
  const [provider, setProvider] = useState<Provider>('codex')
  const [kind, setKind] = useState<RunRequest['kind']>('copy')
  const [prompt, setPrompt] = useState('')
  const [text, setText] = useState('')
  const [media, setMedia] = useState<Asset | null>(null)
  const [video, setVideo] = useState<Asset | null>(null)
  const [history, setHistory] = useState<StoryProps[]>([defaultStory])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<Progress>({ stage: 'Pronto para começar' })
  const [error, setError] = useState('')
  const story = history.at(-1) ?? defaultStory
  const current = statuses.find((status) => status.provider === provider)

  useEffect(() => {
    let active = true
    window.marketing
      .status()
      .then((value) => {
        if (active) setStatuses(value)
      })
      .catch(() => {
        if (active) setError('Não foi possível verificar os clientes.')
      })
    const unsubscribe = window.marketing.onProgress(setProgress)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  async function work(operation: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await operation()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message.replace(/^Error invoking remote method '[^']+': Error: /, '')
          : 'Não foi possível concluir.',
      )
    } finally {
      setBusy(false)
    }
  }
  function updateStory(next: StoryProps) {
    setHistory((values) => [...values.slice(-19), next])
    setVideo(null)
  }

  return (
    <main>
      <DesktopConnection />
      <header>
        <div>
          <span className="eyebrow">SISTEMA ZERO</span>
          <h1>Produção de marketing</h1>
        </div>
        <span className="local">Bancada local</span>
      </header>
      <p className="notice">
        Esta bancada valida a produção no computador. Os resultados ainda não são sincronizados com
        a equipe.
      </p>
      <div className="layout">
        <section className="panel instructions">
          <h2>O que vamos produzir?</h2>
          <label htmlFor="provider">Assistente</label>
          <select
            id="provider"
            value={provider}
            disabled={busy}
            onChange={(event) => {
              setProvider(event.target.value as Provider)
              setKind('copy')
            }}
          >
            <option value="codex">Codex</option>
            <option value="claude">Claude Code</option>
          </select>
          <div className="connection">
            <span>
              {current?.available ? current.mode : (current?.reason ?? 'Verificando conexão…')}
            </span>
            <button
              type="button"
              className="quiet"
              disabled={busy}
              onClick={() =>
                work(async () => {
                  await window.marketing.login(provider)
                  setStatuses(await window.marketing.status())
                })
              }
            >
              Conectar
            </button>
          </div>
          <label htmlFor="kind">Resultado</label>
          <select
            id="kind"
            value={kind}
            disabled={busy}
            onChange={(event) => setKind(event.target.value as RunRequest['kind'])}
          >
            <option value="copy">Copy</option>
            <option value="video">Ajuste do vídeo</option>
            {provider === 'codex' ? (
              <>
                <option value="image">Nova imagem</option>
                <option value="edit-image">Ajuste da imagem</option>
              </>
            ) : null}
          </select>
          <label htmlFor="prompt">Seu pedido</label>
          <textarea
            id="prompt"
            value={prompt}
            disabled={busy}
            maxLength={12000}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Descreva o resultado. Para ajustar, diga o que deve mudar e o que deve permanecer."
          />
          <div className="actions">
            <button
              type="button"
              disabled={busy || !prompt.trim() || !current?.available}
              onClick={() =>
                work(async () => {
                  const context =
                    kind === 'video'
                      ? JSON.stringify({
                          title: story.title,
                          subtitle: story.subtitle,
                          accent: story.accent,
                          durationInFrames: story.durationInFrames,
                          fps: story.fps,
                          hasClip: !!story.clip,
                          trimBefore: story.clip?.trimBefore,
                        })
                      : ''
                  const result = await window.marketing.run({
                    provider,
                    kind,
                    prompt:
                      kind === 'video'
                        ? `Composição atual: ${context}\nPedido: ${prompt}`
                        : kind === 'copy' && text
                          ? `Copy atual para ajustar:\n${text}\n\nPedido: ${prompt}`
                          : prompt,
                    ...(kind === 'edit-image' && media ? { sourceAssetId: media.id } : {}),
                  })
                  if (kind === 'video') {
                    const patch = JSON.parse(
                      result.text.replace(/^\s*```(?:json)?\s*/, '').replace(/\s*```\s*$/, ''),
                    )
                    updateStory(applyStoryPatch(story, patch))
                  } else setText(result.text)
                  if (result.assets[0]) setMedia(result.assets[0])
                })
              }
            >
              {busy ? 'Produzindo…' : 'Executar pedido'}
            </button>
            {busy ? (
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  window.marketing.cancel().catch(() => setError('Não foi possível cancelar.'))
                }
              >
                Cancelar
              </button>
            ) : null}
          </div>
          <div className="status" role="status">
            {progress.stage}
            {progress.progress !== undefined ? ` · ${Math.round(progress.progress * 100)}%` : ''}
          </div>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <p className="hint">
            O pedido usa a assinatura conectada no cliente oficial. Não há troca automática para uma
            API paga.
          </p>
        </section>
        <section className="panel result">
          <div className="section-title">
            <h2>Prévia e resultado</h2>
            <button
              type="button"
              className="quiet"
              disabled={busy}
              onClick={() =>
                work(async () => {
                  const asset = await window.marketing.chooseMedia()
                  if (!asset) return
                  setMedia(asset)
                  if (asset.mime.startsWith('video/'))
                    updateStory({ ...story, clip: { src: asset.url, trimBefore: 0, muted: false } })
                })
              }
            >
              Adicionar imagem ou gravação
            </button>
          </div>
          <div className="preview-row">
            <div className="player" data-player>
              <Player
                component={StoryComposition}
                inputProps={story}
                durationInFrames={story.durationInFrames}
                compositionWidth={story.width}
                compositionHeight={story.height}
                fps={story.fps}
                initialFrame={Math.min(30, story.durationInFrames - 1)}
                controls
                style={{ width: '100%' }}
              />
            </div>
            <div className="outputs">
              {text ? (
                <div className="copy">{text}</div>
              ) : (
                <p className="empty">
                  A copy aparece aqui. Ajuste o vídeo por pedido ou adicione uma gravação para
                  começar.
                </p>
              )}
              {media?.mime.startsWith('image/') ? (
                <img
                  className="artwork"
                  src={media.url}
                  alt="Imagem produzida ou fornecida para conferência"
                />
              ) : null}
              {video ? (
                <video controls src={video.url} aria-label="Vídeo final exportado">
                  <track kind="captions" />
                </video>
              ) : null}
            </div>
          </div>
          <div className="actions">
            <button
              type="button"
              className="secondary"
              disabled={busy || history.length < 2}
              onClick={() => {
                setHistory((values) => values.slice(0, -1))
                setVideo(null)
              }}
            >
              Desfazer ajuste
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                work(async () => {
                  setVideo(await window.marketing.render(story))
                })
              }
            >
              Exportar vídeo
            </button>
            {video || media ? (
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() =>
                  work(async () => {
                    const asset = video ?? media
                    if (asset) await window.marketing.exportAsset(asset.id)
                  })
                }
              >
                Salvar arquivo
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}
