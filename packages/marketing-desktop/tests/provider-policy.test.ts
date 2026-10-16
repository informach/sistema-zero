import { describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { observeLogin } from '../src/main/login-completion'
import {
  decodeNativeImage,
  requireNativeImage,
  validateNativeImagePath,
} from '../src/main/provider-policy'

describe('resultados nativos e login', () => {
  test('login concluído antes da resposta não é perdido nem aceita outra tentativa', async () => {
    const rpc = new EventEmitter()
    const login = observeLogin(rpc, undefined, 1000)
    rpc.emit('notification', {
      method: 'account/login/completed',
      params: { loginId: 'other', success: true },
    })
    rpc.emit('notification', {
      method: 'account/login/completed',
      params: { loginId: 'ours', success: false },
    })
    login.identify('ours')
    await expect(login.completion).rejects.toThrow('não concluído')
    expect(rpc.listenerCount('notification')).toBe(0)
  })
  test('cancelamento e encerramento limpam listeners imediatamente', async () => {
    const rpc = new EventEmitter(),
      controller = new AbortController()
    const login = observeLogin(rpc, controller.signal, 1000)
    controller.abort()
    await expect(login.completion).rejects.toThrow('cancelada')
    expect(rpc.listenerCount('notification')).toBe(0)
  })
  test('falha de imagem é explícita e retorno excessivo não é decodificado', () => {
    expect(() => requireNativeImage(true, 1)).toThrow('original foi preservado')
    expect(() => requireNativeImage(false, 0)).toThrow('Nenhuma alteração')
    expect(() => decodeNativeImage('A'.repeat(32000001))).toThrow('limite')
  })
  test('resultado não pode apontar para arquivo externo ao diretório nativo', async () => {
    const folder = await mkdtemp(path.join(os.tmpdir(), 'marketing-image-policy-'))
    if (
      path.dirname(folder) !== path.resolve(os.tmpdir()) ||
      !path.basename(folder).startsWith('marketing-image-policy-')
    )
      throw new Error('Diretório temporário inesperado')
    try {
      const root = path.join(folder, 'allowed')
      const { mkdir } = await import('node:fs/promises')
      await mkdir(root)
      const valid = path.join(root, 'image.png'),
        outside = path.join(folder, 'private.txt')
      await writeFile(valid, 'image')
      await writeFile(outside, 'private')
      expect(await validateNativeImagePath(valid, root)).toBe(valid)
      await rejects(() => validateNativeImagePath(outside, root), { code: 'IMAGE_PATH_REJECTED' })
    } finally {
      await rm(folder, { recursive: true, force: true })
    }
  })
})
