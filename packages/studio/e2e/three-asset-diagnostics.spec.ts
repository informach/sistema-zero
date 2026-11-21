import { expect, test } from '@playwright/test'
import { unexpected3DAssetDiagnostics } from './helpers/threeAssetDiagnostics'

test('diagnósticos de assets 3D: aviso adaptativo não encobre falhas de carregamento ou execução', () => {
  const notice =
    'SZGameKit3D: modo leve ligado: este computador pediu um jogo mais leve (sombra menor, sem efeitos de cinema)'
  const failures = [
    'warning: GLTFLoader: modelo não carregou',
    'error: RGBELoader: céu não carregou',
    'pageerror: runtime interrompido',
    `error: ${notice}`,
    `warning: ${notice}; GLTFLoader falhou`,
  ]
  expect(unexpected3DAssetDiagnostics([`warning: ${notice}`])).toEqual([])
  expect(unexpected3DAssetDiagnostics([`warning: ${notice}`, ...failures])).toEqual(failures)
})
