import type { ExtensionExample } from '#extensions'
import type { JSStatement } from '#ir'
import { reinoZeroProStages } from './reinoZeroProLevels'

/**
 * O Reino Zero Pro: a aventura de 8 mundos, 32 fases, saves e replay.
 *
 * ⭐ As GRADES saíram daqui: elas viraram plantas escritas à mão em
 * `reinoZeroProLevels.ts`. Este arquivo voltou a ser o que deve ser — a IR do
 * exemplo. O export continua saindo por aqui porque o e2e o importa deste
 * caminho.
 */
export { reinoZeroProStages } from './reinoZeroProLevels'

const start: JSStatement[] = [
  {
    type: 'gk:setup',
    w: { type: 'num', value: 512 },
    h: { type: 'num', value: 288 },
    bg: '#101827',
    accent: '#35d0ba',
  },
  {
    type: 'gk:setStageDescription',
    description:
      'Reino Zero Pro. Use setas ou A e D para andar, X ou espaço para pular, Z ou Shift para correr. Explore oito mundos, encontre oito gemas e vença os guardiões.',
  },
  { type: 'gk:fixedSetup', seed: { type: 'num', value: 147480 } },
  {
    type: 'gk:defineCampaign',
    id: 'reino-zero-pro',
    // ⚠⚠ 1 → 2 porque as 32 GEOMETRIAS mudaram. O save guarda
    // `checkpointX/Y` em PIXELS: restaurado sobre a planta nova, o herói nasce
    // dentro da rocha. Com o número novo o save antigo vira `incompatible` —
    // perda limpa e observável. Não subir seria a opção silenciosa.
    version: { type: 'num', value: 2 },
    firstStage: '1-1',
    players: { type: 'num', value: 2 },
    seed: { type: 'num', value: 147480 },
    requiredGems: { type: 'num', value: 8 },
  },
  ...reinoZeroProStages.map(
    (stage): JSStatement => ({
      type: 'gk:defineCampaignStage',
      stage,
    }),
  ),
  { type: 'gk:startCampaign', stageId: '1-1' },
]

const events: JSStatement[] = [
  {
    type: 'gk:onCampaignEvent',
    event: 'dica',
    body: [
      {
        type: 'consoleLog',
        value: { type: 'gk:campaignEventValue', field: 'value' },
      },
    ],
  },
  {
    type: 'gk:onCampaignEvent',
    event: 'fim',
    body: [
      {
        type: 'consoleLog',
        value: { type: 'gk:campaignEventValue', field: 'complete' },
      },
    ],
  },
]

export const reinoZeroProExample: ExtensionExample = {
  name: 'Reino Zero Pro',
  experience: 'game',
  description:
    'Aventura editável com 8 mundos, 32 fases, regiões, eventos, rotas secretas, dois jogadores, checkpoints, guardiões, saves e replay determinístico.',
  ir: {
    version: 2,
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d-advanced' }],
    behavior: { start, events, loops: [] },
  },
}
