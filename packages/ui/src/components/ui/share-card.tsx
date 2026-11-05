'use client'

import { QrCode } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn'
import type { ShareCardContent } from '../../lib/share-card-image'
import { Button, buttonVariants } from './button'
import { Dialog } from './dialog'

export function ShareCard({
  buttonClassName,
  label = 'Cartão de divulgação',
  ...content
}: ShareCardContent & { buttonClassName?: string; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn('min-h-11 gap-2 px-4 text-sm', buttonClassName)}
        onClick={() => setOpen(true)}
      >
        <QrCode className="size-4" aria-hidden="true" />
        {label}
      </Button>
      {open && <CardPreview {...content} onClose={() => setOpen(false)} />}
    </>
  )
}

function CardPreview({
  onClose,
  url,
  title,
  subtitle,
  description,
  notice,
}: ShareCardContent & { onClose: () => void }) {
  const key = JSON.stringify({ url, title, subtitle, description, notice })
  const [result, setResult] = useState<{
    key: string
    attempt: number
    image?: string
    error?: boolean
  } | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let current = true
    setResult(null)
    import('../../lib/share-card-image')
      .then(({ createShareCardImage }) =>
        createShareCardImage({ url, title, subtitle, description, notice }),
      )
      .then((image) => {
        if (current) setResult({ key, attempt, image })
      })
      .catch(() => {
        if (current) setResult({ key, attempt, error: true })
      })
    return () => {
      current = false
    }
  }, [key, attempt, url, title, subtitle, description, notice])
  const image = result?.key === key && result.attempt === attempt ? result.image : undefined
  const error = result?.key === key && result.attempt === attempt && result.error
  return (
    <Dialog
      open
      onClose={onClose}
      title="Cartão de divulgação"
      description="Baixe a imagem para compartilhar ou imprimir. O QR code abre o mesmo link público."
      footer={
        image ? (
          <a
            className={cn(buttonVariants({ size: 'lg' }), 'min-h-11 px-5')}
            href={image}
            download="sistema-zero-divulgacao.png"
          >
            Baixar PNG
          </a>
        ) : undefined
      }
    >
      {image ? (
        <img
          src={image}
          width={1080}
          height={1350}
          className="h-auto w-full rounded-lg"
          alt={`${subtitle}: ${title}. ${description} ${notice ?? ''} Link: ${url}`}
        />
      ) : error ? (
        <div role="alert" className="space-y-3">
          <p>Não foi possível gerar o cartão. Tente novamente.</p>
          <Button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <p role="status">Preparando seu cartão…</p>
      )}
    </Dialog>
  )
}
