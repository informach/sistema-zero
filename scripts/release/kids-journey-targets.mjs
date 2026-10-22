const project = '415d5a1c-5f75-432c-8445-b395d0977ce3'
const members = 'aa282801-ffba-477c-af6d-394b2f4f9af9'
const auth = '8c57d71d-3a8e-48f1-9627-63f1528b9a48'

/** Closed provider identities; caller input cannot override any UUID. */
export const kidsJourneyTargets = Object.freeze({
  staging: Object.freeze({
    project,
    environment: 'f634cff6-aafb-4804-8b69-172fad4e946e',
    members,
    auth,
  }),
  production: Object.freeze({
    project,
    environment: '19c212a5-85c0-493c-9630-a7a0569e8412',
    members,
    auth,
  }),
})

/** Existing staging callers keep their target; production always requires its literal name. */
export function resolveKidsJourneyTarget(target = 'staging') {
  if (typeof target !== 'string' || !Object.hasOwn(kidsJourneyTargets, target))
    throw new Error('Destino da onda Kids inválido')
  return kidsJourneyTargets[target]
}

/** Existing application identities; optional deployment waves never create services. */
export function productionApplicationIds(env) {
  const ids = {
    'api-gateway': '2b7748bc-d3e3-4aff-bd94-3f514b53c44f',
    auth,
    catalog: '0e59f903-6bd8-4c3e-8792-34ea7479c13c',
    payments: '1d2455ac-05cd-436b-a39d-3f07392713f3',
    members,
    messaging: '93fb9f5c-3d08-43da-a3cb-4c0207bd2ee0',
    funnel: 'a617f2d2-6a58-46a2-8669-2eaf192712f0',
    admin: 'e00eca0b-5323-4424-9b58-fdb073cfce82',
    community: '9df1b493-4cea-4b36-bec8-7299f054c17d',
    'community-kids': 'fc8a1b29-ac14-4dc9-a7b3-03d497b8bf4f',
    hub: '00b27b18-0587-460b-ba90-b6b24c423e45',
    fiscal: '2ea11afd-bdfd-4736-b400-c3db13fd8a0e',
    marketing: '7b8a87e6-a92f-4a5c-adc1-c4d2fe23b737',
    'marketing-app': '95f3752d-95f7-45ab-a52a-19aa126d77ab',
    referrals: '1ad1c5ce-977c-4d7d-95a4-b8b08f2dc258',
    helpdesk: env.HELPDESK_SERVICE_ID,
    'helpdesk-app': env.HELPDESK_APP_SERVICE_ID,
    'live-recorder': env.LIVE_RECORDER_SERVICE_ID,
  }
  if (
    Object.values(ids).some(
      (id) => typeof id !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id),
    ) ||
    new Set(Object.values(ids)).size !== Object.keys(ids).length
  )
    throw new Error('IDs explícitos das aplicações de produção ausentes ou divergentes')
  return Object.freeze(ids)
}
