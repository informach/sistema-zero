import { describe, expect, test } from 'bun:test'
import { ENVIOS_AO_CLUBE, SITUACOES_DO_CLUBE } from '@sistemazero/arquipelago-contracts'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { clubeDepoisDoEnvio, podeMandarAoClube, TEXTOS_DA_FOTO } from '../src/sistemas/modo-foto'

describe('fotos no Clube no modo foto (N08b)', () => {
  test('o botão só aparece com a foto pronta, o Clube ligado e a foto ainda não mandada', () => {
    expect(podeMandarAoClube('ligado', 'pronta', null)).toBe(true)
    expect(podeMandarAoClube('ligado', 'pronta', 'falhou')).toBe(true)
    expect(podeMandarAoClube('ligado', 'outra', null)).toBe(false)
    expect(podeMandarAoClube('ligado', 'pronta', 'mandando')).toBe(false)
    expect(podeMandarAoClube('ligado', 'pronta', 'em-moderacao')).toBe(false)
    expect(podeMandarAoClube('ligado', 'pronta', 'publicada')).toBe(false)
    for (const s of SITUACOES_DO_CLUBE.filter((s) => s !== 'ligado'))
      expect(podeMandarAoClube(s, 'pronta', null)).toBe(false)
    expect(podeMandarAoClube(null, 'pronta', null)).toBe(false)
  })

  test('o envio recusado por permissão ou canal esconde o botão daí em diante', () => {
    expect(clubeDepoisDoEnvio('ligado', 'desligado')).toBe('desligado')
    expect(clubeDepoisDoEnvio('ligado', 'sem-clube')).toBe('sem-clube')
    expect(clubeDepoisDoEnvio('ligado', 'falhou')).toBe('ligado')
    expect(clubeDepoisDoEnvio('ligado', 'em-moderacao')).toBe('ligado')
  })

  test('cada resultado do envio tem um recado, sem travessão, exclamação nem pergunta no começo', () => {
    for (const e of ENVIOS_AO_CLUBE) {
      const t = TEXTOS_DA_FOTO.envio[e]
      expect(t.length).toBeGreaterThan(0)
      expect(t).not.toContain('—')
      expect(t).not.toContain('!')
      expect(t.split('.')[0]).not.toContain('?')
    }
    // A moderação vem dita: a foto não aparece no Clube sem um adulto olhar.
    expect(TEXTOS_DA_FOTO.envio['em-moderacao']).toContain('adulto da equipe')
  })

  test('a plataforma falsa só monta o Clube quando pedido e guarda o que foi mandado', async () => {
    expect(criarPlataformaFalsa({ persistir: false }).clube).toBeUndefined()
    const ligada = criarPlataformaFalsa({ persistir: false, clube: 'ligado' }).clube
    expect(await ligada?.situacao()).toBe('ligado')
    expect(await ligada?.mandarFoto(new Blob([new Uint8Array(4)]))).toBe('em-moderacao')
    const desligada = criarPlataformaFalsa({ persistir: false, clube: 'desligado' }).clube
    expect(await desligada?.mandarFoto(new Blob([]))).toBe('desligado')
    const falha = criarPlataformaFalsa({ persistir: false, clube: 'falha-no-envio' }).clube
    expect(await falha?.situacao()).toBe('ligado')
    expect(await falha?.mandarFoto(new Blob([]))).toBe('falhou')
  })
})
