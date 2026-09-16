import { ValidationError } from '../shared/errors'
import type { OfferStatus } from './offer.status'
import type { PricingMode } from './pricing-mode'

export const ACCESS_MODES = ['lifetime', 'fixed', 'billing_cycle'] as const

export type AccessMode = (typeof ACCESS_MODES)[number]

export const ACCESS_DURATION_UNITS = ['days', 'months'] as const

export type AccessDurationUnit = (typeof ACCESS_DURATION_UNITS)[number]

export interface OfferAccessPolicy {
  accessMode: AccessMode
  accessDurationValue: number | null
  accessDurationUnit: AccessDurationUnit | null
}

export interface OfferAccessPolicyInput {
  accessMode?: AccessMode
  accessDurationValue?: number | null
  accessDurationUnit?: AccessDurationUnit | null
}

/**
 * Defaults retrocompatíveis: toda compra única anterior a este contrato era
 * vitalícia; assinatura sempre acompanha os ciclos pagos.
 */
export function defaultAccessPolicy(pricingMode: PricingMode): OfferAccessPolicy {
  return pricingMode === 'subscription'
    ? {
        accessMode: 'billing_cycle',
        accessDurationValue: null,
        accessDurationUnit: null,
      }
    : { accessMode: 'lifetime', accessDurationValue: null, accessDurationUnit: null }
}

export function accessPolicyForCreate(
  pricingMode: PricingMode,
  status: OfferStatus,
  input: OfferAccessPolicyInput,
): OfferAccessPolicy {
  const defaults = defaultAccessPolicy(pricingMode)
  const accessMode = input.accessMode ?? defaults.accessMode
  const policy = normalizeDurations(
    accessMode,
    input.accessDurationValue ?? null,
    input.accessDurationUnit ?? null,
  )
  assertAccessPolicy(pricingMode, status, policy)
  return policy
}

export function accessPolicyForUpdate(
  currentPricingMode: PricingMode,
  current: OfferAccessPolicy,
  nextPricingMode: PricingMode,
  status: OfferStatus,
  patch: OfferAccessPolicyInput,
): OfferAccessPolicy {
  const pricingModeChanged = currentPricingMode !== nextPricingMode
  if (pricingModeChanged && nextPricingMode === 'one_time' && patch.accessMode === undefined) {
    throw new ValidationError(
      'Ao mudar para compra única, escolha se o acesso será vitalício ou por prazo fixo',
    )
  }

  const accessMode =
    patch.accessMode ??
    (pricingModeChanged ? defaultAccessPolicy(nextPricingMode).accessMode : current.accessMode)
  const preserveFixedDurations = !pricingModeChanged && current.accessMode === 'fixed'
  const durationValue =
    patch.accessDurationValue !== undefined
      ? patch.accessDurationValue
      : preserveFixedDurations
        ? current.accessDurationValue
        : null
  const durationUnit =
    patch.accessDurationUnit !== undefined
      ? patch.accessDurationUnit
      : preserveFixedDurations
        ? current.accessDurationUnit
        : null
  const policy = normalizeDurations(accessMode, durationValue, durationUnit)
  assertAccessPolicy(nextPricingMode, status, policy)
  return policy
}

export function assertAccessPolicy(
  pricingMode: PricingMode,
  status: OfferStatus,
  policy: OfferAccessPolicy,
): void {
  if (pricingMode === 'subscription' && policy.accessMode !== 'billing_cycle') {
    throw new ValidationError(
      'Oferta de assinatura exige acesso enquanto a assinatura estiver ativa',
    )
  }
  if (pricingMode === 'one_time' && policy.accessMode === 'billing_cycle') {
    throw new ValidationError('Compra única não pode usar acesso por ciclo de assinatura')
  }

  if (policy.accessMode !== 'fixed') {
    if (policy.accessDurationValue !== null || policy.accessDurationUnit !== null) {
      throw new ValidationError('Apenas acesso por prazo fixo aceita duração')
    }
    return
  }

  if (policy.accessDurationValue !== null) {
    if (!Number.isInteger(policy.accessDurationValue) || policy.accessDurationValue <= 0) {
      throw new ValidationError('Duração do acesso deve ser um inteiro positivo')
    }
  }

  const hasValue = policy.accessDurationValue !== null
  const hasUnit = policy.accessDurationUnit !== null
  if (hasValue !== hasUnit) {
    throw new ValidationError('Prazo fixo exige valor e unidade de duração juntos')
  }
  if (status === 'active' && (!hasValue || !hasUnit)) {
    throw new ValidationError('Oferta ativa por prazo fixo exige valor e unidade de duração')
  }
}

function normalizeDurations(
  accessMode: AccessMode,
  accessDurationValue: number | null,
  accessDurationUnit: AccessDurationUnit | null,
): OfferAccessPolicy {
  if (accessMode !== 'fixed') {
    return { accessMode, accessDurationValue: null, accessDurationUnit: null }
  }
  return { accessMode, accessDurationValue, accessDurationUnit }
}
