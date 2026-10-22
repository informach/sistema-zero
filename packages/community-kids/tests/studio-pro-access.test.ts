import { describe, expect, test } from 'bun:test'
import { studioGate } from '@/server/studio-gate'
import { resolveStudioProAccess } from '@/server/studio-pro-access'
import { kidsStaffPreview, kidsView } from './kids-journey-fixtures'

const profileSession = {
  id: 'profile-1',
  role: 'student',
  activeProfile: { accountId: 'account-1', name: 'Ana' },
}

test('the shared Pro page admits either known language; the JS dependency endpoint remains JS-only', () => {
  for (const blocks of [['sz_js_array_push'], ['sz_py_pass']]) {
    const input = {
      session: profileSession,
      studioAccess: true,
      journey: kidsView(['studio', 'pro']),
      blocks,
    }
    expect(resolveStudioProAccess({ ...input, language: 'any' }).allowed).toBe(true)
    expect(resolveStudioProAccess({ ...input, language: 'javascript' }).allowed).toBe(
      blocks[0] === 'sz_js_array_push',
    )
  }
  for (const blocks of [[], ['sz_py_unknown'], ['sz_js_unknown']])
    expect(
      resolveStudioProAccess({
        session: profileSession,
        studioAccess: true,
        journey: kidsView(['studio', 'pro']),
        blocks,
        language: 'any',
      }).allowed,
    ).toBe(false)
})

describe('resolveStudioProAccess', () => {
  test('JavaScript Pro requires a known JavaScript achievement, never a Python ID or prefix', () => {
    for (const blocks of [[], ['sz_py_pass'], ['sz_js_unknown']])
      expect(
        resolveStudioProAccess({
          language: 'javascript',
          session: profileSession,
          studioAccess: true,
          journey: kidsView(['studio', 'pro']),
          blocks,
        }),
      ).toEqual({
        allowed: false,
        code: 'STUDIO_LANGUAGE_REQUIRED',
      })
    expect(
      resolveStudioProAccess({
        language: 'javascript',
        session: profileSession,
        studioAccess: true,
        journey: kidsView(['studio', 'pro']),
        blocks: ['sz_js_array_push'],
      }).allowed,
    ).toBe(true)
  })
  test('recusa a sessão da conta sem perfil ativo', () => {
    expect(
      resolveStudioProAccess({
        language: 'javascript',
        blocks: ['sz_js_array_push'],
        session: { role: 'student' },
        studioAccess: true,
        journey: kidsView(['studio', 'pro']),
      }),
    ).toEqual({ allowed: false, code: 'PROFILE_SESSION_REQUIRED' })
  })

  test('recusa acesso sem o produto ou sem a capacidade Pro', () => {
    expect(
      resolveStudioProAccess({
        language: 'javascript',
        blocks: ['sz_js_array_push'],
        session: profileSession,
        studioAccess: false,
        journey: kidsView(['studio', 'pro']),
      }),
    ).toEqual({ allowed: false, code: 'STUDIO_ACCESS_REQUIRED' })

    expect(
      resolveStudioProAccess({
        language: 'javascript',
        blocks: ['sz_js_array_push'],
        session: profileSession,
        studioAccess: true,
        journey: kidsView([], 'god'),
      }),
    ).toEqual({ allowed: false, code: 'STUDIO_PRO_TIER_REQUIRED' })
  })

  test('libera somente o perfil com produto e tier Pro', () => {
    expect(
      resolveStudioProAccess({
        language: 'javascript',
        blocks: ['sz_js_array_push'],
        session: profileSession,
        studioAccess: true,
        journey: kidsView(['studio', 'pro']),
      }),
    ).toEqual({ allowed: true })
  })
})

test('Pro policy unavailable is explicit even for a previously capable child', () => {
  expect(
    resolveStudioProAccess({
      language: 'javascript',
      blocks: ['sz_js_array_push'],
      session: profileSession,
      studioAccess: true,
      journey: null,
    }),
  ).toEqual({ allowed: false, code: 'JOURNEY_UNAVAILABLE' })
})

test('unavailable curriculum is not interpreted as an empty achievement list', () => {
  expect(
    resolveStudioProAccess({
      language: 'javascript',
      session: profileSession,
      studioAccess: true,
      journey: kidsView(['studio', 'pro']),
      blocks: null,
    }),
  ).toEqual({
    allowed: false,
    code: 'CURRICULUM_UNAVAILABLE',
  })
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
        language: 'javascript',
        blocks: [],
        session: { ...staffProfileSession, role },
        studioAccess: true,
        journey: kidsStaffPreview,
      }),
    ).toEqual({ allowed: true })
})

test('the account session never opens Pro, not even for the team', () => {
  for (const journey of [kidsStaffPreview, null])
    expect(
      resolveStudioProAccess({
        language: 'javascript',
        blocks: ['sz_js_array_push'],
        session: { role: 'staff' },
        studioAccess: true,
        journey,
      }),
    ).toEqual({ allowed: false, code: 'PROFILE_SESSION_REQUIRED' })
  expect(
    resolveStudioProAccess({
      language: 'javascript',
      blocks: ['sz_js_array_push'],
      session: null,
      studioAccess: true,
      journey: kidsStaffPreview,
    }),
  ).toEqual({ allowed: false, code: 'PROFILE_SESSION_REQUIRED' })
})

test('a preview reaching a non-team profile is refused; children keep their journey rule', () => {
  expect(
    resolveStudioProAccess({
      language: 'javascript',
      blocks: ['sz_js_array_push'],
      session: profileSession,
      studioAccess: true,
      journey: kidsStaffPreview,
    }),
  ).toEqual({ allowed: false, code: 'STUDIO_PRO_TIER_REQUIRED' })
  // Child without the Pro capability (Studio only) stays out of Pro.
  expect(
    resolveStudioProAccess({
      language: 'javascript',
      blocks: ['sz_js_array_push'],
      session: profileSession,
      studioAccess: true,
      journey: kidsView(['studio', 'bridge']),
    }),
  ).toEqual({ allowed: false, code: 'STUDIO_PRO_TIER_REQUIRED' })
  // The team preview still needs the product gate like everyone else.
  expect(
    resolveStudioProAccess({
      language: 'javascript',
      blocks: ['sz_js_array_push'],
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
    expect(
      resolveStudioProAccess({
        language: 'javascript',
        blocks: ['sz_js_array_push'],
        session,
        studioAccess: true,
        journey,
      }).allowed,
    ).toBe(offered)
  }
})
