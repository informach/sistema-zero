/**
 * O formato de FIO das criações (o `payload` que a nuvem guarda e devolve).
 * É o mesmo JSON do backup: peles em base64, resto igual ao asset. A volta
 * passa pelo sanitize, que trata id, nome, paleta, peças e peles.
 */
import { assetFromJson, assetToJson, type MoldaAssetJson } from '../export/assetJson'

export type MoldaAssetWire = MoldaAssetJson

export const moldaAssetToWire = assetToJson
export const moldaAssetFromWire = assetFromJson
