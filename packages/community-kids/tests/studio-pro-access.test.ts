import { describe, expect, test } from 'bun:test'
import { studioGate } from '@/server/studio-gate'
import { resolveStudioProAccess } from '@/server/studio-pro-access'
import { kidsStaffPreview, kidsView } from './kids-journey-fixtures'

const profileSession = {
  id: 'profile-1',
  role: 'student',
  activeProfile: { accountId: 'account-1', name: 'Ana' },
}

describe('resolveStudioProAccess', () => {
  test('recusa a sessão da conta sem perfil ativo', () => {
    expect(
      resolveStudioProAccess({
        session: { role: 'student' },
        studioAccess: true,
        journey: kidsView(['studio', 'pro']),
      }),
    ).toEqual({ allowed: false, code: 'PROFILE_SESSION_REQUIRED' })
  })

  test('recusa acesso sem o produto ou sem a capacidade Pro', () => {
    expect(
      resolveStudioProAccess({
        session: profileSession,
        studioAccess: false,
        journey: kidsView(['studio', 'pro']),
      }),
    ).toEqual({ allowed: false, code: 'STUDIO_ACCESS_REQUIRED' })

    expect(
      resolveStudioProAccess({
        session: profileSession,
        studioAccess: true,
        journey: kidsView([], 'god'),
      }),
    ).toEqual({ allowed: false, code: 'STUDIO_PRO_TIER_REQUIRED' })
  })

  test('libera somente o perfil com produto e tier Pro', () => {
    expect(
      resolveStudioProAccess({
        session: profileSession,
        studioAccess: true,
        journey: kidsView(['studio', 'pro']),
      }),
    ).toEqual({ allowed: true })
  })
})

test('Pro policy unavailable is explicit even for a previously capable child', () => {
  expect(
    resolveStudioProAccess({ session: profileSession, studioAccess: true, journey: null }),
  ).toEqual({ allowed: false, code: 'JOURNEY_UNAVAILABLE' })
})

// A conta é contexto de responsável: o proxy a manda para `/pais` e o Gateway não deixa o
// contexto `parent` ler o Studio. A prévia da equipe acontece num perfil da PRÓPRIA conta (regra do
// Members, que já a entrega ao `/estudio` livre); o que o `/estudio` oferece, o Pro precisa abrir.
const staffProfileSession = {
  id: 'profile-staff',
  role: 'staff',
  activeProfile: { accountId: 'account-staff', name: 'Equipe' },
}

test('team preview opens Pro in a profile of the staff account, matching the free Studio offer', () => {
  for (const role of ['staff', 'admin', 'superadmin'])
    expect(
      resolveStudioProAccess({
        session: { ...staffProfileSession, role },
        studioAccess: true,
        journey: kidsStaffPreview,
      }),
    ).toEqual({ allowed: true })
})

test('the account session never opens Pro, not even for the team', () => {
  for (const journey of [kidsStaffPreview, null])
    expect(
      resolveStudioProAccess({ session: { role: 'staff' }, studioAccess: true, journey }),
    ).toEqual({ allowed: false, code: 'PROFILE_SESSION_REQUIRED' })
  expect(
    resolveStudioProAccess({ session: null, studioAccess: true, journey: kidsStaffPreview }),
  ).toEqual({ allowed: false, code: 'PROFILE_SESSION_REQUIRED' })
})

test('a preview reaching a non-team profile is refused; children keep their journey rule', () => {
  expect(
    resolveStudioProAccess({
      session: profileSession,
      studioAccess: true,
      journey: kidsStaffPreview,
    }),
  ).toEqual({ allowed: false, code: 'STUDIO_PRO_TIER_REQUIRED' })
  // Child without the Pro capability (Studio only) stays out of Pro.
  expect(
    resolveStudioProAccess({
      session: profileSession,
      studioAccess: true,
      journey: kidsView(['studio', 'bridge']),
    }),
  ).toEqual({ allowed: false, code: 'STUDIO_PRO_TIER_REQUIRED' })
  // The team preview still needs the product gate like everyone else.
  expect(
    resolveStudioProAccess({
      session: staffProfileSession,
      studioAccess: false,
      journey: kidsStaffPreview,
    }),
  ).toEqual({ allowed: false, code: 'STUDIO_ACCESS_REQUIRED' })
})

test('what the free Studio offers as Pro is exactly what the Pro route accepts', () => {
  const cases = [
    { session: staffProfileSession, journey: kidsStaffPreview },
    { session: profileSession, journey: kidsView(['studio', 'pro'], 'god') },
    { session: profileSession, journey: kidsView(['studio', 'bridge']) },
    { session: profileSession, journey: kidsView(['studio']) },
  ]
  for (const { session, journey } of cases) {
    const offer = studioGate(journey, { status: 200, body: { blocks: ['sz_g2d_setup_stage'] } })
    expect(offer.kind).toBe('open')
    const offered = offer.kind === 'open' && offer.tier.canCreateProProject
    expect(resolveStudioProAccess({ session, studioAccess: true, journey }).allowed).toBe(offered)
  }
})
