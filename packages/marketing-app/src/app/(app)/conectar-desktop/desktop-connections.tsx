'use client'
import { Button } from '@sistemazero/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'

const devicesSchema = z.object({
  devices: z.array(
    z.object({
      id: z.string().uuid(),
      label: z.string(),
      createdAt: z.string(),
      expiresAt: z.string(),
      revokedAt: z.string().nullable(),
      current: z.boolean(),
    }),
  ),
})
type Device = z.infer<typeof devicesSchema>['devices'][number]
async function call(body?: unknown) {
  const response = await fetch('/api/desktop', {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const json: unknown = await response.json()
  if (!response.ok) {
    const parsed = z.object({ error: z.object({ message: z.string() }) }).safeParse(json)
    throw new Error(
      parsed.success ? parsed.data.error.message : 'Não foi possível conectar. Tente novamente.',
    )
  }
  return json
}
export function DesktopConnections({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode),
    [label, setLabel] = useState(''),
    [devices, setDevices] = useState<Device[]>([])
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('')
  const load = useCallback(async () => {
    setDevices(devicesSchema.parse(await call()).devices)
  }, [])
  useEffect(() => {
    void load().catch((e) =>
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os computadores.'),
    )
  }, [load])
  async function perform(work: () => Promise<void>) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await work()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível concluir.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Computadores da sua conta</h1>
        <p className="text-muted-foreground mt-2">
          Conecte o app desktop para produzir com suas assinaturas e sincronizar o trabalho com a
          equipe.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Conectar um computador</CardTitle>
          <CardDescription>Abra o app desktop e confira o código exibido nele.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void perform(async () => {
                const value = z
                  .object({ label: z.string() })
                  .parse(await call({ action: 'describe', code }))
                setLabel(value.label)
              })
            }}
            className="space-y-3"
          >
            <Field htmlFor="desktop-code" label="Código do computador">
              <Input
                id="desktop-code"
                value={code}
                maxLength={20}
                autoComplete="off"
                onChange={(e) => {
                  setCode(e.target.value)
                  setLabel('')
                }}
                placeholder="ABCD-1234-EF56"
              />
            </Field>
            <Button type="submit" disabled={busy || code.length < 8}>
              Conferir código
            </Button>
          </form>
          {label ? (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <p>
                Conectar <strong>{label}</strong> à sua conta? Confira se este nome e o código
                aparecem no computador que você está usando.
              </p>
              <Button
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    await call({ action: 'approve', code })
                    setLabel('')
                    setCode('')
                    setMessage('Conexão autorizada. Volte ao app desktop para continuar.')
                    await load()
                  })
                }
              >
                Autorizar este computador
              </Button>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Cada pessoa conecta sua própria conta e suas próprias assinaturas. As credenciais do
            Codex e do Claude ficam no computador.
          </p>
        </CardContent>
      </Card>
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      <Card>
        <CardHeader>
          <CardTitle>Computadores conectados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {devices.length === 0 ? (
            <p className="text-muted-foreground">Nenhum computador conectado.</p>
          ) : (
            devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-medium">{device.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {device.revokedAt
                      ? 'Desconectado'
                      : new Date(device.expiresAt) < new Date()
                        ? 'Acesso expirado'
                        : `Conectado em ${new Date(device.createdAt).toLocaleDateString('pt-BR')}`}
                  </p>
                </div>
                {!device.revokedAt ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void perform(async () => {
                        await call({ action: 'revoke', deviceId: device.id })
                        await load()
                        setMessage(
                          'Computador desconectado. O acervo compartilhado foi preservado.',
                        )
                      })
                    }
                  >
                    Desconectar
                  </Button>
                ) : null}
              </div>
            ))
          )}
          <Button variant="ghost" disabled={busy} onClick={() => void perform(load)}>
            Atualizar lista
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
