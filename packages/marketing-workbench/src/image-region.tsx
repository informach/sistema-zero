'use client'
import type { ImageRegion } from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { useEffect, useId, useRef, useState } from 'react'
import { errorMessage, type WorkbenchPort } from './port'

export function ImageRegionPicker({
  port,
  projectId,
  assetId,
  value,
  onChange,
  disabled,
}: {
  port: WorkbenchPort
  projectId: string
  assetId: string
  value: ImageRegion | undefined
  onChange: (value: ImageRegion | undefined) => void
  disabled: boolean
}) {
  const [preview, setPreview] = useState<{ id: string; url: string } | null>(null),
    [error, setError] = useState('')
  const enabled = Boolean(value)
  const start = useRef<{ x: number; y: number } | null>(null),
    id = useId()
  useEffect(() => {
    if (!enabled) return
    let alive = true
    setError('')
    void port
      .assetUrl(projectId, assetId)
      .then((url) => {
        if (alive) setPreview({ id: assetId, url })
      })
      .catch((error) => {
        if (alive) setError(errorMessage(error))
      })
    return () => {
      alive = false
    }
  }, [port, projectId, assetId, enabled])
  const region = value ?? { x: 0.25, y: 0.25, width: 0.5, height: 0.5 }
  return (
    <div className="mt-3 space-y-3 rounded-lg border p-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(event) => {
            onChange(event.target.checked ? region : undefined)
          }}
        />
        Editar somente uma região da imagem
      </label>
      {enabled ? (
        <>
          <p className="text-xs text-muted-foreground">
            Arraste sobre a referência para delimitar a área. Os pixels de fora serão preservados.
            Você também pode usar os campos abaixo.
          </p>
          {preview?.id === assetId ? (
            <div
              className="relative max-w-sm touch-none overflow-hidden rounded border"
              onPointerDown={(event) => {
                if (disabled) return
                const rect = event.currentTarget.getBoundingClientRect()
                start.current = {
                  x: (event.clientX - rect.left) / rect.width,
                  y: (event.clientY - rect.top) / rect.height,
                }
                event.currentTarget.setPointerCapture(event.pointerId)
              }}
              onPointerMove={(event) => {
                if (!start.current || disabled) return
                const rect = event.currentTarget.getBoundingClientRect(),
                  x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
                  y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
                if (Math.abs(x - start.current.x) > 0.01 && Math.abs(y - start.current.y) > 0.01)
                  onChange({
                    x: Math.min(x, start.current.x),
                    y: Math.min(y, start.current.y),
                    width: Math.abs(x - start.current.x),
                    height: Math.abs(y - start.current.y),
                  })
              }}
              onPointerUp={() => {
                start.current = null
              }}
              onPointerCancel={() => {
                start.current = null
              }}
            >
              <img
                src={preview.url}
                alt="Imagem de origem para delimitar a região"
                draggable={false}
                className="block w-full select-none"
              />
              <div
                className="pointer-events-none absolute border-2 border-blue-500 bg-blue-500/15"
                style={{
                  left: `${region.x * 100}%`,
                  top: `${region.y * 100}%`,
                  width: `${region.width * 100}%`,
                  height: `${region.height * 100}%`,
                }}
              />
            </div>
          ) : (
            <p className="text-xs">Carregando referência…</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { key: 'x', label: 'Esquerda (%)' },
                { key: 'y', label: 'Topo (%)' },
                { key: 'width', label: 'Largura (%)' },
                { key: 'height', label: 'Altura (%)' },
              ] as const
            ).map((field) => (
              <label key={field.key} htmlFor={`${id}-${field.key}`} className="text-xs">
                {field.label}
                <input
                  id={`${id}-${field.key}`}
                  type="number"
                  min={field.key === 'x' || field.key === 'y' ? 0 : 1}
                  max={100}
                  step={1}
                  disabled={disabled}
                  value={Math.round(region[field.key] * 100)}
                  className="mt-1 block w-full rounded border bg-background p-2"
                  onChange={(event) => {
                    const n = Number(event.target.value) / 100
                    if (!Number.isFinite(n)) return
                    const next = { ...region, [field.key]: Math.max(0, Math.min(1, n)) }
                    next.width = Math.min(next.width, 1 - next.x)
                    next.height = Math.min(next.height, 1 - next.y)
                    if (next.width > 0 && next.height > 0) onChange(next)
                  }}
                />
              </label>
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => onChange({ x: 0, y: 0, width: 1, height: 1 })}
          >
            Selecionar imagem inteira
          </Button>
        </>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
