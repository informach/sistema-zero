import { useCallback, useState } from 'react'
import { getPintaStorageNamespace } from '../../../state/persistence'
import { type MapLevel, readMapLevel, writeMapLevel } from './mapLevels'

/**
 * O nível das ferramentas do mapa, guardado por perfil neste aparelho: o mesmo no mapa comum, no
 * cenário grande inteiro e na janela focal.
 */
export function useMapLevel(): readonly [MapLevel, (next: MapLevel) => void] {
  const [level, setLevelState] = useState<MapLevel>(() => readMapLevel(getPintaStorageNamespace()))
  const setLevel = useCallback((next: MapLevel): void => {
    setLevelState(next)
    writeMapLevel(getPintaStorageNamespace(), next)
  }, [])
  return [level, setLevel] as const
}
