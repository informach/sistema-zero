'use client'

import { Button } from '@sistemazero/ui'
import { Camera, Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/** Local only: testing a device never publishes it or joins the meeting. */
export function LivePreflight() {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const generation = useRef(0)
  const [status, setStatus] = useState('A câmera e o microfone começam desligados.')
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [tabSharing, setTabSharing] = useState<boolean | null>(null)
  const stop = () => {
    generation.current += 1
    for (const track of stream.current?.getTracks() ?? []) track.stop()
    stream.current = null
    if (video.current) video.current.srcObject = null
    setPreview(false)
    setBusy(false)
  }
  useEffect(
    () => () => {
      generation.current += 1
      for (const track of stream.current?.getTracks() ?? []) track.stop()
    },
    [],
  )
  useEffect(() => {
    const devices = navigator.mediaDevices as
      | (MediaDevices & { setCaptureHandleConfig?: unknown })
      | undefined
    setTabSharing(
      typeof devices?.getDisplayMedia === 'function' &&
        typeof devices?.setCaptureHandleConfig === 'function',
    )
  }, [])
  async function test(kind: 'audio' | 'video') {
    stop()
    const attempt = ++generation.current
    setBusy(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error('Abra em um navegador atualizado, com conexão segura.')
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
      setStatus(
        kind === 'video'
          ? 'Esta imagem aparece só para você. Nada está sendo enviado à turma.'
          : 'Microfone encontrado. O teste não envia áudio à turma. Use fones de ouvido na oficina.',
      )
    } catch (cause) {
      if (attempt === generation.current)
        setStatus(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível abrir o aparelho. Confira a permissão do navegador.',
        )
    } finally {
      if (attempt === generation.current) setBusy(false)
    }
  }
  return (
    <details className="rounded-2xl border bg-card p-4">
      <summary className="min-h-11 cursor-pointer font-bold">Preparar meu navegador</summary>
      <div className="mt-4 space-y-3">
        {tabSharing !== null ? (
          <p className="rounded-xl border bg-muted/30 p-3 text-sm">
            {tabSharing
              ? 'Este navegador oferece acompanhamento da aba. Ao compartilhar, escolha somente a aba do Sistema Zero; o navegador ainda pedirá sua permissão.'
              : 'Este navegador não oferece o acompanhamento seguro da aba. Para a professora ver sua criação enquanto você trabalha, use Chrome ou Edge atualizado em um computador. No celular e em navegadores sem esse recurso, você ainda pode acessar os desafios e a gravação disponível.'}
          </p>
        ) : null}
        <p role="status" className="text-sm text-muted-foreground">
          {status}
        </p>
        <video
          ref={video}
          autoPlay
          muted
          playsInline
          className={`${preview ? 'block' : 'hidden'} aspect-video w-full max-w-sm rounded-xl bg-black`}
          aria-label="Prévia privada da sua câmera"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void test('video')}>
            <Camera className="size-4" />
            Testar câmera
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void test('audio')}>
            <Mic className="size-4" />
            Testar microfone
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              stop()
              setStatus('Teste encerrado. Câmera e microfone desligados.')
            }}
          >
            <Square className="size-4" />
            Encerrar teste
          </Button>
        </div>
      </div>
    </details>
  )
}
