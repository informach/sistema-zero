import type { SceneAction, SceneId } from '../../../src/learning/scene'

export const pegarPlasma: SceneAction = { type: 'weapon-pickup' }
export const apertarE: SceneAction = { type: 'weapon-key-e' }
export const apertarEspaco: SceneAction = { type: 'weapon-fire' }
export const novaPartida: SceneAction = { type: 'weapon-new-match' }

/**
 * ⭐ A troca de arma (Poder "Troca de arma" do Construtor, 28/11/2026), na ordem que o Zappy sugere:
 * o E sem o item (a arma continua laser), o item e o E (o plasma), um tiro de laser e um de plasma, e
 * a Nova partida com o plasma escolhido (a arma volta ao laser).
 */
export const CAMINHOS_LIVRES_NAVE_ARMA: Partial<Record<SceneId, SceneAction[]>> = {
  'weapon-swap': [apertarE, pegarPlasma, apertarEspaco, apertarE, apertarEspaco, novaPartida],
}
