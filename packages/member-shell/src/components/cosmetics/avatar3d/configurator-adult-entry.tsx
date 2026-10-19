'use client'

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
}: {
  dark: boolean
  returnTo: AvatarReturnPath
}) {
  return (
    <AvatarConfigurator
      dark={dark}
      returnTo={returnTo}
      skin="adult"
      adultView={AdultAvatarConfigurator}
    />
  )
}
