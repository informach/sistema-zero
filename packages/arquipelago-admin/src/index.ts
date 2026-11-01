/**
 * O Admin do jogo (lacunas, 01/11/2026, desfaz a A11): a seção Jogo do Admin em pacote próprio,
 * montada numa página do Admin. Não importa o jogo nem o Admin; o Admin entrega as peças dele
 * (`PecasDoAdmin`). O BFF (`/api/arquipelago/*`) e o editor de objetivos ficam no Admin.
 */
export * from './challenge-manifest'
export { ChallengeManifestPanel } from './challenge-manifest-panel'
export { GameAdmin, type PecasDoAdmin } from './game-admin'
export * from './game-challenge-authoring'
export { GameMeasurement, measurementNumber, textoDaFonteQueFalta } from './game-measurement'
export { GameRequestError, gameRequest } from './game-request'
