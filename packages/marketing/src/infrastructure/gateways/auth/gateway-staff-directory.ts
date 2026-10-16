import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { staffIdentitySchema } from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import type { StaffDirectory } from '../../../domain/ports/staff-directory.port'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
export class GatewayStaffDirectory implements StaffDirectory {
  constructor(
    private readonly url: string,
    private readonly secret: string | undefined,
  ) {}
  async lookup(input: { ids: string[] } | { query: string }) {
    if (!this.secret)
      throw new WorkspaceError(
        'DIRECTORY_UNAVAILABLE',
        'A conexão com as contas da equipe ainda não foi configurada',
      )
    if ('ids' in input && !input.ids.length) return []
    const path = '/auth/internal/staff-directory',
      body = JSON.stringify(input),
      idempotencyKey = crypto.randomUUID(),
      ts = Math.floor(Date.now() / 1000)
    const signature = signHmac(
      this.secret,
      canonicalHmacMessage({ method: 'POST', path, body, idempotencyKey }),
      ts,
    )
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch(`${this.url.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'x-consumer-id': 'marketing',
          'x-signature': `t=${ts},v1=${signature}`,
          'idempotency-key': idempotencyKey,
        },
        signal: controller.signal,
      })
      if (!response.ok)
        throw new WorkspaceError(
          'DIRECTORY_UNAVAILABLE',
          'Não foi possível consultar as contas da equipe',
        )
      return z
        .array(staffIdentitySchema)
        .max(100)
        .parse(await response.json())
    } catch (error) {
      if (error instanceof WorkspaceError) throw error
      throw new WorkspaceError(
        'DIRECTORY_UNAVAILABLE',
        'O serviço de contas não respondeu; tente novamente',
      )
    } finally {
      clearTimeout(timer)
    }
  }
}
