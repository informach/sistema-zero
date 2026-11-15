import { describe, expect, test } from 'bun:test'
import { avatarDoPack, AVATAR_CATALOG as C } from '../src/avatar/pack-catalog'

describe('avatarDoPack', () => {
  test('a fantasia guardada com a parte antiga aparece com a de agora (fantasma, visita, jogo)', () => {
    const conjunto = C.sets.fantasia_cavaleiro
    if (!conjunto) throw new Error('sem a fantasia de cavaleiro')
    const guardado: Record<string, string> = {}
    for (const { slot, part } of conjunto.parts) guardado[slot] = part
    guardado.chapeu = 'fantasia_cavaleiro_elmo_chifres_pacote'
    const lido = avatarDoPack(guardado)
    expect(lido.chapeu).toBe('chapeu_elmo_cavaleiro__na_fantasia_cavaleiro')
    for (const { slot, part } of conjunto.parts) expect(lido[slot]).toBe(part)
  })

  test('sem fantasia, nada muda (só o corpo, o rosto e as orelhas de partida)', () => {
    const lido = avatarDoPack({ chapeu: 'chapeu_elmo_cavaleiro' })
    expect(lido.chapeu).toBe('chapeu_elmo_cavaleiro')
    expect(lido.corpo).toBe(C.rules.default.corpo)
  })
})
