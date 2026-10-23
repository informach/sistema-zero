import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ForbiddenError } from '@sistemazero/core/http'
import { CreateProfileService } from '../../src/application/profiles/create-profile.service'
import { ProfileAdmissionService } from '../../src/application/profiles/profile-admission.service'
import { UpdateProfileDetailsService } from '../../src/application/profiles/update-profile.service'
import {
  assertMayEnableVoiceInput,
  VOICE_INPUT_SUPPORT_FORBIDDEN_MESSAGE,
} from '../../src/application/profiles/voice-input.policy'
import { ProfileAggregate, type VoiceInputActor } from '../../src/domain/profile/profile.aggregate'
import { VoiceInputSupportCannotEnableError } from '../../src/domain/profile/profile.errors'
import { ParentReauthenticationRequiredError } from '../../src/domain/study-access/errors'
import {
  FakeProfileAllowanceGateway,
  FakeProfileJourneyGateway,
  InMemoryProfileRepository,
  silentLogger,
} from '../fakes/in-memory'

const T0 = new Date('2026-10-14T12:00:00.000Z')
const T1 = new Date('2026-10-14T13:00:00.000Z')
const ACCOUNT = '11111111-1111-4111-8111-111111111111'
/** O ator REAL de uma sessão de suporte (`x-auth-impersonator-id`). */
const SUPPORT_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
const PARENT: VoiceInputActor = { kind: 'parent' }
const SUPPORT: VoiceInputActor = { kind: 'support', impersonatorId: SUPPORT_ID }

function newProfile(now: Date = T0): ProfileAggregate {
  return ProfileAggregate.create({
    birthDate: '2016-05-10',
    id: randomUUID(),
    accountUserId: ACCOUNT,
    name: 'Sofia',
    now,
  })
}

describe('fala da criança: agregado', () => {
  test('perfil novo nasce com a fala DESLIGADA e sem data de consentimento', () => {
    const profile = newProfile()
    expect(profile.voiceInputEnabled).toBe(false)
    expect(profile.toSnapshot().voiceInputEnabledAt).toBeNull()
    expect(profile.voiceInputChange).toBeNull()
  })

  test('ligar carimba o consentimento; reenviar ligada preserva a data; desligar zera', () => {
    const profile = newProfile()
    profile.setVoiceInputEnabled(true, PARENT, T0)
    expect(profile.voiceInputEnabled).toBe(true)
    expect(profile.toSnapshot().voiceInputEnabledAt).toEqual(T0)
    expect(profile.toSnapshot().updatedAt).toEqual(T0)

    // O formulário dos pais reenvia o campo ao trocar só o nome: não reescreve o consentimento.
    profile.setVoiceInputEnabled(true, PARENT, T1)
    expect(profile.toSnapshot().voiceInputEnabledAt).toEqual(T0)
    expect(profile.toSnapshot().updatedAt).toEqual(T0)

    profile.setVoiceInputEnabled(false, PARENT, T1)
    expect(profile.voiceInputEnabled).toBe(false)
    expect(profile.toSnapshot().voiceInputEnabledAt).toBeNull()
    expect(profile.toSnapshot().updatedAt).toEqual(T1)
  })

  test('trilha: ligar e desligar deixam a mudança para gravar; reenviar o mesmo valor não', () => {
    const profile = newProfile()

    profile.setVoiceInputEnabled(true, PARENT, T0)
    expect(profile.voiceInputChange).toEqual({
      enabled: true,
      actor: 'parent',
      impersonatorId: null,
      at: T0,
    })
    profile.markVoiceInputChangeSaved()
    expect(profile.voiceInputChange).toBeNull()

    // No-op: a mesma escolha reenviada não é mudança e não vira linha na trilha.
    profile.setVoiceInputEnabled(true, PARENT, T1)
    expect(profile.voiceInputChange).toBeNull()

    profile.setVoiceInputEnabled(false, PARENT, T1)
    expect(profile.voiceInputChange).toEqual({
      enabled: false,
      actor: 'parent',
      impersonatorId: null,
      at: T1,
    })
  })

  test('trilha: o suporte só registra DESLIGAR, com o ator real', () => {
    const off = newProfile()
    expect(() => off.setVoiceInputEnabled(true, SUPPORT, T0)).toThrow(
      VoiceInputSupportCannotEnableError,
    )
    // A recusa não muda nada nem deixa trilha.
    expect(off.voiceInputEnabled).toBe(false)
    expect(off.voiceInputChange).toBeNull()

    const on = ProfileAggregate.restore({
      ...newProfile().toSnapshot(),
      voiceInputEnabled: true,
      voiceInputEnabledAt: T0,
    })
    // Perfil lido do banco não traz mudança pendente.
    expect(on.voiceInputChange).toBeNull()
    // Reenviar ligada pelo suporte (editando o nome) é no-op, não "ligar".
    expect(() => on.setVoiceInputEnabled(true, SUPPORT, T1)).not.toThrow()
    expect(on.voiceInputChange).toBeNull()

    on.setVoiceInputEnabled(false, SUPPORT, T1)
    expect(on.voiceInputEnabled).toBe(false)
    expect(on.voiceInputChange).toEqual({
      enabled: false,
      actor: 'support',
      impersonatorId: SUPPORT_ID,
      at: T1,
    })
  })

  test('trilha: ida e volta antes de salvar não é mudança', () => {
    const profile = newProfile()
    profile.setVoiceInputEnabled(true, PARENT, T0)
    profile.setVoiceInputEnabled(false, PARENT, T1)
    expect(profile.voiceInputEnabled).toBe(false)
    expect(profile.voiceInputChange).toBeNull()
  })
})

describe('fala da criança: régua para LIGAR', () => {
  test('suporte nunca liga, mesmo com login recente', () => {
    expect(() =>
      assertMayEnableVoiceInput({ supportSession: true, parentAuthRecent: true }),
    ).toThrow(new ForbiddenError(VOICE_INPUT_SUPPORT_FORBIDDEN_MESSAGE))
  })

  test('responsável do Kids com login antigo precisa entrar de novo', () => {
    expect(() => assertMayEnableVoiceInput({ parentAuthRecent: false })).toThrow(
      ParentReauthenticationRequiredError,
    )
  })

  test('login recente ou sessão de outro produto liga', () => {
    expect(() => assertMayEnableVoiceInput({ parentAuthRecent: true })).not.toThrow()
    expect(() => assertMayEnableVoiceInput({})).not.toThrow()
  })
})

describe('fala da criança: serviços de perfil', () => {
  function services() {
    const profiles = new InMemoryProfileRepository()
    const allowance = new FakeProfileAllowanceGateway()
    allowance.maxProfiles = 5
    const admission = new ProfileAdmissionService(
      profiles,
      new FakeProfileJourneyGateway(),
      () => T0,
      silentLogger,
    )
    const create = new CreateProfileService(profiles, allowance, randomUUID, () => T0, admission)
    const update = new UpdateProfileDetailsService(profiles, () => T1)
    return { profiles, allowance, create, update }
  }

  test('criar com a fala ligada e login antigo recusa ANTES do teto e do insert', async () => {
    const { profiles, allowance, create } = services()
    await expect(
      create.execute({
        birthDate: '2016-05-10',
        requestId: randomUUID(),
        accountUserId: ACCOUNT,
        name: 'Sofia',
        voiceInputEnabled: true,
        parentAuthRecent: false,
      }),
    ).rejects.toBeInstanceOf(ParentReauthenticationRequiredError)
    expect(allowance.calls).toBe(0)
    expect(profiles.byId.size).toBe(0)
    expect(profiles.voiceInputEvents).toEqual([])
  })

  test('criar com a fala ligada pelo suporte é recusado', async () => {
    const { profiles, create } = services()
    await expect(
      create.execute({
        birthDate: '2016-05-10',
        requestId: randomUUID(),
        accountUserId: ACCOUNT,
        name: 'Sofia',
        voiceInputEnabled: true,
        impersonatorId: SUPPORT_ID,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(profiles.byId.size).toBe(0)
    expect(profiles.voiceInputEvents).toEqual([])
  })

  test('criar com false ou sem o campo não pede login recente, nasce desligada e sem trilha', async () => {
    const { profiles, create } = services()
    for (const voiceInputEnabled of [false, undefined]) {
      const view = await create.execute({
        birthDate: '2016-05-10',
        requestId: randomUUID(),
        accountUserId: ACCOUNT,
        name: 'Sofia',
        voiceInputEnabled,
        parentAuthRecent: false,
        impersonatorId: SUPPORT_ID,
      })
      expect(view.voiceInputEnabled).toBe(false)
    }
    // Nascer desligada não é mudança: nada a provar.
    expect(profiles.voiceInputEvents).toEqual([])
  })

  test('criar com a fala ligada e login recente grava o consentimento e a 1ª linha da trilha', async () => {
    const { profiles, create } = services()
    const view = await create.execute({
      birthDate: '2016-05-10',
      requestId: randomUUID(),
      accountUserId: ACCOUNT,
      name: 'Sofia',
      voiceInputEnabled: true,
      parentAuthRecent: true,
    })
    expect(view.voiceInputEnabled).toBe(true)
    expect(profiles.byId.get(view.id)?.voiceInputEnabledAt).toEqual(T0)
    // A data do consentimento fica no banco; a view não a expõe.
    expect(Object.keys(view)).not.toContain('voiceInputEnabledAt')
    expect(profiles.voiceInputEvents).toEqual([
      {
        profileId: view.id,
        accountUserId: ACCOUNT,
        enabled: true,
        actor: 'parent',
        impersonatorId: null,
        at: T0,
      },
    ])
  })

  test('editar: desligar é livre (login antigo e suporte); ligar segue a régua', async () => {
    const { profiles, update } = services()
    const profile = newProfile()
    profile.setVoiceInputEnabled(true, PARENT, T0)
    profiles.seedReady(profile)
    const base = { accountUserId: ACCOUNT, profileId: profile.id }

    // Reenviar ligada com login antigo e pelo suporte não é ligar: passa, sem linha na trilha.
    await update.execute({
      ...base,
      name: 'Sofia Maria',
      voiceInputEnabled: true,
      parentAuthRecent: false,
      impersonatorId: SUPPORT_ID,
    })
    expect(profiles.byId.get(profile.id)?.voiceInputEnabledAt).toEqual(T0)
    expect(profiles.voiceInputEvents).toEqual([])

    const off = await update.execute({
      ...base,
      voiceInputEnabled: false,
      parentAuthRecent: false,
      impersonatorId: SUPPORT_ID,
    })
    expect(off.voiceInputEnabled).toBe(false)
    expect(profiles.byId.get(profile.id)?.voiceInputEnabledAt).toBeNull()

    await expect(
      update.execute({ ...base, voiceInputEnabled: true, parentAuthRecent: false }),
    ).rejects.toBeInstanceOf(ParentReauthenticationRequiredError)
    await expect(
      update.execute({ ...base, voiceInputEnabled: true, impersonatorId: SUPPORT_ID }),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(profiles.byId.get(profile.id)?.voiceInputEnabled).toBe(false)

    const on = await update.execute({ ...base, voiceInputEnabled: true, parentAuthRecent: true })
    expect(on.voiceInputEnabled).toBe(true)
    expect(profiles.byId.get(profile.id)?.voiceInputEnabledAt).toEqual(T1)

    // Só as duas mudanças efetivas viraram trilha (as recusas e o reenvio, não).
    const trail = { profileId: profile.id, accountUserId: ACCOUNT }
    expect(profiles.voiceInputEvents).toEqual([
      { ...trail, enabled: false, actor: 'support', impersonatorId: SUPPORT_ID, at: T1 },
      { ...trail, enabled: true, actor: 'parent', impersonatorId: null, at: T1 },
    ])
  })

  test('editar: desligar já desligada ou mexer só no nome não grava linha', async () => {
    const { profiles, update } = services()
    const profile = newProfile()
    profiles.seedReady(profile)
    const base = { accountUserId: ACCOUNT, profileId: profile.id }

    await update.execute({ ...base, voiceInputEnabled: false })
    await update.execute({ ...base, name: 'Sofia Maria' })
    expect(profiles.voiceInputEvents).toEqual([])

    await update.execute({ ...base, voiceInputEnabled: true })
    await update.execute({ ...base, voiceInputEnabled: true, name: 'Sofia M' })
    expect(profiles.voiceInputEvents.map((event) => event.enabled)).toEqual([true])
  })

  test('edição defasada não desfaz o "desligar" gravado no meio do caminho', async () => {
    const { profiles, update } = services()
    const profile = newProfile()
    profile.setVoiceInputEnabled(true, PARENT, T0)
    profiles.seedReady(profile)

    // A form captured earlier contains only the requested name, never a voice snapshot.
    const rename = { accountUserId: ACCOUNT, profileId: profile.id, name: 'Sofia Maria' }
    await update.execute({
      accountUserId: ACCOUNT,
      profileId: profile.id,
      voiceInputEnabled: false,
    })
    await update.execute(rename)

    expect(profiles.byId.get(profile.id)?.voiceInputEnabled).toBe(false)
    expect(profiles.byId.get(profile.id)?.name).toBe('Sofia Maria')
    expect(profiles.voiceInputEvents.map((event) => event.enabled)).toEqual([false])
  })
})
