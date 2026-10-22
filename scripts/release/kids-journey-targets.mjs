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
