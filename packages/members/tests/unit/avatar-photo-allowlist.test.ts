import { describe, expect, test } from 'bun:test'
import { SetAvatarPhotoService } from '../../src/application/avatar/set-avatar-photo.service'
import { AvatarInvalidError } from '../../src/domain/avatar/avatar.errors'
import { normalizeAvatarPhotoPrefixes } from '../../src/infrastructure/config/env'
import { InMemoryAvatarRepository } from '../fakes/in-memory'

const USER = '77777777-7777-4777-8777-777777777777'
const ACCOUNT = '88888888-8888-4888-8888-888888888888'
const NOW = () => new Date('2026-07-24T12:00:00.000Z')
const CDN = 'https://cdn.sistemazero.com.br/avatar3d/'

describe('SetAvatarPhotoService — allowlist de prefixos (full review 24/07)', () => {
  test('aceita URL do prefixo permitido (fluxo legítimo BFF → R2)', async () => {
    const service = new SetAvatarPhotoService(new InMemoryAvatarRepository(), NOW, [CDN])
    const result = await service.execute(USER, ACCOUNT, 'kids', `${CDN}${USER}.webp`)
    expect(result.photoUrl).toBe(`${CDN}${USER}.webp`)
  })

  test('recusa URL externa (pixel-rastreador/conteúdo não moderado → 400 AVATAR_INVALID)', async () => {
    const service = new SetAvatarPhotoService(new InMemoryAvatarRepository(), NOW, [CDN])
    await expect(
      service.execute(USER, ACCOUNT, 'kids', 'https://servidor-de-terceiro.com/x.png'),
    ).rejects.toBeInstanceOf(AvatarInvalidError)
  })

  test('sem prefixos configurados (dev) → comportamento antigo, qualquer http(s)', async () => {
    const service = new SetAvatarPhotoService(new InMemoryAvatarRepository(), NOW)
    const result = await service.execute(USER, ACCOUNT, 'kids', 'http://localhost:9000/foto.webp')
    expect(result.photoUrl).toBe('http://localhost:9000/foto.webp')
  })
})

describe('normalizeAvatarPhotoPrefixes (env) — prefixo sem `/` de path fecha o host', () => {
  test('só-host ganha a barra; com path fica intocado; csv com espaços/vazios limpa', () => {
    expect(normalizeAvatarPhotoPrefixes('https://cdn.sistemazero.com.br')).toEqual([
      'https://cdn.sistemazero.com.br/',
    ])
    expect(normalizeAvatarPhotoPrefixes(' https://pub-x.r2.dev/avatar3d , ,')).toEqual([
      'https://pub-x.r2.dev/avatar3d',
    ])
    expect(normalizeAvatarPhotoPrefixes(undefined)).toEqual([])
  })

  test('prefixo normalizado NÃO casa host-sufixo nem userinfo (bypass do startsWith)', async () => {
    const prefixes = normalizeAvatarPhotoPrefixes('https://cdn.sistemazero.com.br')
    const service = new SetAvatarPhotoService(new InMemoryAvatarRepository(), NOW, prefixes)
    await expect(
      service.execute(USER, ACCOUNT, 'kids', 'https://cdn.sistemazero.com.br.evil.com/x.png'),
    ).rejects.toBeInstanceOf(AvatarInvalidError)
    await expect(
      service.execute(USER, ACCOUNT, 'kids', 'https://cdn.sistemazero.com.br@evil.com/x.png'),
    ).rejects.toBeInstanceOf(AvatarInvalidError)
  })
})
