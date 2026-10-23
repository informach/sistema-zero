'use client'

import { Button } from '@sistemazero/ui'
import { Camera, Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { canShareLiveTab, friendlyDeviceError } from '../../lib/live/device-errors'

/**
 * Teste local: testar um aparelho nunca o envia à sala. `open` mostra o teste direto (encontro
 * marcado, porta da sala); sem ele, fica recolhido em "Preparar meu navegador".
 */
export function LivePreflight({
  open = false,
  teacher = false,
}: {
  open?: boolean
  /** Quem conduz lê o aviso da aba do jeito dela: é a demonstração que não dá para mostrar. */
  teacher?: boolean
}) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const generation = useRef(0)
  const meter = useRef<{ context: AudioContext; frame: number } | null>(null)
  const [status, setStatus] = useState('A câmera e o microfone começam desligados.')
  const [preview, setPreview] = useState(false)
  const [level, setLevel] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [tabSharing, setTabSharing] = useState<boolean | null>(null)
  const stop = () => {
    generation.current += 1
    for (const track of stream.current?.getTracks() ?? []) track.stop()
    stream.current = null
    if (meter.current) {
      cancelAnimationFrame(meter.current.frame)
      void meter.current.context.close().catch(() => undefined)
      meter.current = null
    }
    if (video.current) video.current.srcObject = null
    setPreview(false)
    setLevel(null)
    setBusy(false)
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: stop só mexe em refs; roda uma vez ao sair.
  useEffect(() => () => stop(), [])
  useEffect(() => setTabSharing(canShareLiveTab()), [])
  /** Um medidor de volume: a criança vê o microfone ouvindo, sem nada sair do computador. */
  function listen(next: MediaStream) {
    try {
      const context = new AudioContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      context.createMediaStreamSource(next).connect(analyser)
      const data = new Uint8Array(analyser.fftSize)
      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let peak = 0
        for (const value of data) peak = Math.max(peak, Math.abs(value - 128))
        setLevel(Math.min(1, peak / 64))
        if (meter.current) meter.current.frame = requestAnimationFrame(tick)
      }
      meter.current = { context, frame: requestAnimationFrame(tick) }
    } catch {
      /* Sem medidor: o teste continua valendo. */
    }
  }
  async function test(kind: 'audio' | 'video') {
    stop()
    const attempt = ++generation.current
    setBusy(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error('Abra num navegador atualizado, como o Chrome ou o Edge.')
      const next = await navigator.mediaDevices.getUserMedia({
        audio: kind === 'audio',
        video: kind === 'video',
      })
      if (attempt !== generation.current) {
        for (const track of next.getTracks()) track.stop()
        return
      }
      stream.current = next
      setPreview(kind === 'video')
      if (video.current) video.current.srcObject = next
      if (kind === 'audio') listen(next)
      setStatus(
        kind === 'video'
          ? 'Só você está vendo esta imagem. Nada vai para a turma.'
          : 'Fale alguma coisa: a barrinha mexe quando o microfone ouve você. Nada vai para a turma.',
      )
    } catch (cause) {
      if (attempt === generation.current)
        setStatus(friendlyDeviceError(cause, kind === 'audio' ? 'microphone' : 'camera'))
    } finally {
      if (attempt === generation.current) setBusy(false)
    }
  }
  const body = (
    <div className={open ? 'space-y-3' : 'mt-4 space-y-3'}>
      {tabSharing === false ? (
        <p className="rounded-xl border bg-muted/30 p-3 font-medium text-sm">
          {teacher
            ? 'Neste navegador não dá para mostrar uma aba para a turma. Para transmitir a demonstração, use o computador com o Chrome ou o Edge.'
            : 'Neste navegador a professora não consegue ver sua tela enquanto você cria. No computador, com o Chrome ou o Edge, dá. Você participa do mesmo jeito.'}
        </p>
      ) : null}
      <p role="status" className="font-medium text-muted-foreground text-sm">
        {status}
      </p>
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        className={`${preview ? 'block' : 'hidden'} aspect-video w-full max-w-sm rounded-xl bg-black`}
        aria-label="Prévia da sua câmera, só para você"
      />
      {level !== null ? (
        <div
          className="h-3 w-full max-w-sm overflow-hidden rounded-full bg-muted"
          role="meter"
          aria-label="Volume do microfone"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level * 100)}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-75"
            style={{ width: `${Math.max(4, level * 100)}%` }}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="min-h-11"
          disabled={busy}
          onClick={() => void test('video')}
        >
          <Camera className="size-4" />
          Testar câmera
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={busy}
          onClick={() => void test('audio')}
        >
          <Mic className="size-4" />
          Testar microfone
        </Button>
        {preview || level !== null ? (
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => {
              stop()
              setStatus('Teste encerrado. Câmera e microfone desligados.')
            }}
          >
            <Square className="size-4" />
            Encerrar teste
          </Button>
        ) : null}
      </div>
    </div>
  )
  if (open) return body
  return (
    <details
      className="rounded-2xl border bg-card p-4"
      onToggle={(event) => {
        // Fechar o "Preparar" desliga a câmera de teste (antes ela seguia ligada escondida).
        if (!(event.currentTarget as HTMLDetailsElement).open) stop()
      }}
    >
      <summary className="min-h-11 cursor-pointer font-bold">Preparar meu navegador</summary>
      {body}
    </details>
  )
}
