import { describe, expect, it } from 'bun:test'
import { lessonStudioProjectId } from '../src/lib/studio-project-id'

describe('lessonStudioProjectId', () => {
  // O Studio REJEITA um id de projeto fora de /^[A-Za-z0-9_-]+$/ (≤128 chars) e o troca por um
  // ULID aleatório ao hidratar o initialProject → o autosave grava sob o ULID e o load por este
  // id NUNCA acha o rascunho (a criança perde tudo no refresh). Este contrato NÃO pode regredir.
  const SAFE = /^[A-Za-z0-9_-]+$/

  it('fica no charset seguro do Studio (sem `:` — era o bug de perder o WIP)', () => {
    const id = lessonStudioProjectId('a6b6ac75-9117-4cb2-a457-c57541a90090')
    expect(id).toMatch(SAFE)
    expect(id).not.toContain(':')
    expect(id.length).toBeLessThanOrEqual(128)
  })

  it('é estável por bloco e único entre blocos', () => {
    const a = lessonStudioProjectId('block-a')
    expect(lessonStudioProjectId('block-a')).toBe(a) // mesmo bloco → mesmo rascunho
    expect(lessonStudioProjectId('block-b')).not.toBe(a) // blocos diferentes não se misturam
  })

  it('isola por perfil (viewerId) — irmãos no mesmo navegador não misturam', () => {
    const profA = lessonStudioProjectId('block-1', 'profile-A')
    expect(lessonStudioProjectId('block-1', 'profile-A')).toBe(profA) // mesmo perfil → mesmo rascunho
    expect(lessonStudioProjectId('block-1', 'profile-B')).not.toBe(profA) // outro perfil → outro
    expect(lessonStudioProjectId('block-1')).not.toBe(profA) // sem perfil ≠ com perfil
    expect(profA).toMatch(SAFE) // segue no charset seguro
  })
})
