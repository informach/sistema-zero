'use client'

import type { MoldeDoVestuario } from '@sistemazero/arquipelago-contracts'
import type { AvatarReturnPath } from '../../../lib/avatar-return'
import { AvatarConfigurator } from './configurator'
import { AdultAvatarConfigurator } from './configurator-adult'

/**
 * A porta da pele ADULTA do configurador: a mesma lógica (`AvatarConfigurator`) com a tela adulta.
 * Mora num módulo à parte para o Kids, que carrega só o `configurator`, não baixar a tela adulta.
 */
export function AdultAvatarConfiguratorEntry({
  dark,
  returnTo,
  onReturn,
  festa,
}: {
  dark: boolean
  returnTo: AvatarReturnPath
  onReturn?: (saved: boolean) => void
  festa?: MoldeDoVestuario['festa']
}) {
  return (
    <AvatarConfigurator
      dark={dark}
      returnTo={returnTo}
      onReturn={onReturn}
      festa={festa}
      skin="adult"
      adultView={AdultAvatarConfigurator}
    />
  )
}
