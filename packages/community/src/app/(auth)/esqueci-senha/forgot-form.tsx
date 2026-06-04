'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'

const Schema = z.object({ email: z.string().email('E-mail inválido') })

export function ForgotForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = Schema.safeParse({ email })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message)
      return
    }
    setError(undefined)
    setLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      // A resposta é SEMPRE genérica (anti-enumeração) — exibe a mesma mensagem.
      setSent(true)
    } catch {
      toast.error('Falha de rede. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Verifique seu e-mail</CardTitle>
          <CardDescription>
            Se houver uma conta cadastrada com este e-mail, enviamos um link para redefinir a senha.
            O link expira em 1 hora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-interactive hover:text-interactive-hover">
              Voltar ao login
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Esqueci minha senha</CardTitle>
        <CardDescription>
          Informe seu e-mail de compra e enviaremos um link para redefinir a senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field label="E-mail" htmlFor="email" error={error}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(error)}
            />
          </Field>
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? <Spinner /> : null}
            Enviar link
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-interactive hover:text-interactive-hover">
              Voltar ao login
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
