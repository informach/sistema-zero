import { describe, expect, test } from 'bun:test'
import { CASA_DA_LUA, criarFamiliaFalsa } from '../src/plataforma/familia-falsa'
import {
  faixaDaVisita,
  falaDaChegada,
  falaDaSaida,
  leituraDaCasaDeAmigo,
  leituraDasCasasDeAmigos,
  TEXTOS_DAS_VISITAS,
  visitaDaCasaDeAmigo,
} from '../src/sistemas/visitas'

describe('casas de amigos no jogo (N08a)', () => {
  test('a lista: ok, desligada pelos responsáveis ou fora do ar', () => {
    const ok = criarFamiliaFalsa('irmaos').buscar('/amigos', 'GET')
    expect(leituraDasCasasDeAmigos(ok?.status ?? 0, ok?.corpo)).toEqual({
      tipo: 'ok',
      casas: [{ id: CASA_DA_LUA, apelido: 'Casa da Lua' }],
    })
    const des = criarFamiliaFalsa('desligada').buscar('/amigos', 'GET')
    expect(leituraDasCasasDeAmigos(des?.status ?? 0, des?.corpo)).toEqual({ tipo: 'desligado' })
    expect(leituraDasCasasDeAmigos(502, null)).toEqual({ tipo: 'fora-do-ar' })
    expect(leituraDasCasasDeAmigos(200, { versao: 9 })).toEqual({ tipo: 'fora-do-ar' })
  })

  test('a casa: só a pedida, só leitura, e a visita usa o apelido', () => {
    const r = criarFamiliaFalsa('irmaos').buscar(`/amigos/${CASA_DA_LUA}/casa`, 'GET')
    const lida = leituraDaCasaDeAmigo(r?.status ?? 0, r?.corpo, CASA_DA_LUA)
    if (lida.tipo !== 'ok') throw new Error('a casa não abriu')
    const visita = visitaDaCasaDeAmigo(lida.casa)
    expect(visita).toMatchObject({ origem: 'amigo', perfilId: CASA_DA_LUA, nome: 'Casa da Lua' })
    expect(leituraDaCasaDeAmigo(r?.status ?? 0, r?.corpo, crypto.randomUUID())).toEqual({
      tipo: 'nao-abriu',
    })
    const desligada = criarFamiliaFalsa('desligada').buscar(`/amigos/${CASA_DA_LUA}/casa`, 'GET')
    expect(leituraDaCasaDeAmigo(desligada?.status ?? 0, desligada?.corpo, CASA_DA_LUA)).toEqual({
      tipo: 'desligado',
    })
  })

  test('as frases de quem visita um amigo não dizem "a casa de"', () => {
    expect(faixaDaVisita('Casa da Lua', 'amigo')).toBe(
      'Você está visitando Casa da Lua. Aqui você só olha.',
    )
    expect(falaDaChegada({ nome: 'Ana', quarto: null, origem: 'amigo' })).not.toContain('de Ana')
    expect(falaDaSaida('Ana', 'amigo')).toContain('visita a Ana')
    expect(faixaDaVisita('Tomás')).toContain('na casa de Tomás')
    for (const t of [
      TEXTOS_DAS_VISITAS.amigosTitulo,
      TEXTOS_DAS_VISITAS.amigosExplica,
      TEXTOS_DAS_VISITAS.amigosNenhuma,
      TEXTOS_DAS_VISITAS.amigosDesligadas,
    ])
      expect(t).not.toMatch(/[—–!]/)
  })
})
