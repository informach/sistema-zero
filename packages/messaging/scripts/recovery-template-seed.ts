import type { TemplateRepository } from '../src/domain/ports/template-repository.port'
import { type CreateTemplateInput, Template } from '../src/domain/template/template.aggregate'

const keys = ['kids', 'adult'].flatMap((audience) =>
  ['initial', 'reminder', 'recovered', 'canceled'].map(
    (purpose) => `recovery-${audience}-${purpose}`,
  ),
)
type Seed = Omit<CreateTemplateInput, 'id' | 'now'>
type Repository = Pick<TemplateRepository, 'findByChannelAndKey' | 'create' | 'update'>

function matches(item: Template, seed: Seed): boolean {
  const state = item.state
  return (
    state.name === seed.name &&
    state.subject === (seed.subject ?? null) &&
    state.body === seed.body &&
    JSON.stringify(state.variables) === JSON.stringify(seed.variables ?? [])
  )
}

/** Only the eight recovery models; unrelated templates and sender settings remain untouched. */
export async function seedRecoveryTemplates(
  repository: Repository,
  catalog: Seed[],
  options: { apply: boolean; retireLegacy: boolean; now: Date },
) {
  const selected = catalog.filter((seed) => seed.key.startsWith('recovery-'))
  if (
    selected.length !== 8 ||
    selected.some((seed) => seed.channel !== 'email' || !keys.includes(seed.key)) ||
    new Set(selected.map((seed) => seed.key)).size !== 8 ||
    !Number.isFinite(options.now.getTime())
  )
    throw new Error('RECOVERY_TEMPLATE_CONTRACT')
  const result: {
    key: string
    exists: boolean
    active: boolean
    current: boolean
    action: string
  }[] = []
  for (const seed of selected) {
    let item = await repository.findByChannelAndKey(seed.channel, seed.key)
    const action = !item ? 'CREATE' : matches(item, seed) ? 'UNCHANGED' : 'UPDATE'
    if (options.apply && action !== 'UNCHANGED') {
      if (item) {
        item.update(
          {
            name: seed.name,
            subject: seed.subject ?? null,
            body: seed.body,
            variables: seed.variables,
          },
          options.now,
        )
        await repository.update(item)
      } else {
        item = Template.create({ id: crypto.randomUUID(), ...seed, now: options.now })
        await repository.create(item)
      }
    }
    result.push({
      key: seed.key,
      exists: Boolean(item),
      active: item?.state.active ?? false,
      current: item ? matches(item, seed) : false,
      action,
    })
  }
  const legacy: { channel: 'email' | 'whatsapp'; exists: boolean; active: boolean }[] = []
  for (const channel of ['email', 'whatsapp'] as const) {
    const item = await repository.findByChannelAndKey(channel, 'subscription-charge-failed')
    if (options.apply && options.retireLegacy && item?.state.active) {
      item.update({ active: false }, options.now)
      await repository.update(item)
    }
    legacy.push({ channel, exists: Boolean(item), active: item?.state.active ?? false })
  }
  return {
    mode: options.apply ? 'APPLY' : 'PREVIEW',
    templates: result,
    legacy,
    ready:
      result.every((item) => item.exists && item.active && item.current) &&
      legacy.every((item) => !item.active),
  }
}
