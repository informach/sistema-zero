import { describe, expect, it } from 'bun:test'
import { sceneActivityForReading } from './index'
import {
  chaveDeVoz,
  falaDaInstrucao,
  falaDaPergunta,
  falaDoPalpite,
  filaDeVoz,
  isSceneVozes,
  textoFalado,
  textosFalaveisDaCena,
  VOZ_LIMITS,
} from './voz'

describe('o texto falado', () => {
  it('tira os símbolos da tela e colapsa o espaço', () => {
    expect(textoFalado('↑ Pular  agora')).toBe('Pular agora')
    expect(textoFalado('✓ Você descobriu! 🎉')).toBe('Você descobriu!')
  })

  /**
   * ⚠️⚠️ O ponto da feature inteira: a chave é o texto, então uma frase EDITADA não encontra o áudio
   * dela e o "Ouvir" volta à voz do navegador. O pior caso — a criança ouvindo a instrução anterior
   * à correção — não existe, e não depende de ninguém lembrar de regerar.
   */
  it('editar a frase derruba a resposta do dicionário', () => {
    const antes = 'Ligue a borda e veja o que aparece.'
    const vozes = { [chaveDeVoz(antes)]: 'https://cdn.test/a.mp3' }
    expect(filaDeVoz([antes], vozes)).toEqual(['https://cdn.test/a.mp3'])
    expect(filaDeVoz(['Ligue a borda e veja o que acontece.'], vozes)).toBeNull()
  })

  it('a diferença é só de símbolo ou espaço: o áudio continua servindo', () => {
    const vozes = { [chaveDeVoz('Ligue a borda.')]: 'https://cdn.test/a.mp3' }
    expect(filaDeVoz(['↑ Ligue  a borda.'], vozes)).toEqual(['https://cdn.test/a.mp3'])
  })
})

describe('a fila da fala', () => {
  const url = (n: string) => `https://cdn.test/${n}.mp3`

  it('é TUDO ou NADA: falta um trecho, a fala inteira cai para a voz do navegador', () => {
    const vozes = { [chaveDeVoz('Primeiro.')]: url('a') }
    expect(filaDeVoz(['Primeiro.'], vozes)).toEqual([url('a')])
    // A pista que o motor monta na hora não tem áudio — e aí nem o trecho que TEM toca sozinho.
    expect(filaDeVoz(['Primeiro.', 'Tente: mexer no fogo 2.'], vozes)).toBeNull()
  })

  it('trecho vazio não conta (o player monta a fala com buracos)', () => {
    const vozes = { [chaveDeVoz('Só isto.')]: url('a') }
    expect(filaDeVoz(['', 'Só isto.', '   '], vozes)).toEqual([url('a')])
  })

  it('sem dicionário nenhum, não há fila', () => {
    expect(filaDeVoz(['Qualquer coisa.'], undefined)).toBeNull()
  })
})

describe('o dicionário é validado', () => {
  it('recusa chave fora da forma falada', () => {
    // Guardada com espaço duplo, ela nunca seria encontrada pelo player.
    expect(isSceneVozes({ 'Duas  palavras': 'https://cdn.test/a.mp3' })).toBe(false)
    expect(isSceneVozes({ 'Duas palavras': 'https://cdn.test/a.mp3' })).toBe(true)
  })

  it('recusa endereço que não é https nem caminho do próprio site', () => {
    expect(isSceneVozes({ Oi: 'http://cdn.test/a.mp3' })).toBe(false)
    expect(isSceneVozes({ Oi: '//outro-host/a.mp3' })).toBe(false)
    expect(isSceneVozes({ Oi: '/audio/a.mp3' })).toBe(true)
  })

  it('recusa dicionário acima do teto de entradas', () => {
    const grande = Object.fromEntries(
      Array.from({ length: VOZ_LIMITS.entradas + 1 }, (_, i) => [`Fala ${i}`, '/a.mp3']),
    )
    expect(isSceneVozes(grande)).toBe(false)
  })

  it('ausente é legal (a cena sem voz cai no navegador)', () => {
    expect(isSceneVozes(undefined)).toBe(true)
  })
})

describe('os textos faláveis de uma cena', () => {
  const palpite = {
    context: { explanation: 'Nesta experiência, vamos observar a gravidade do jogo.' },
    prompt: 'O que acontece se a gravidade desligar?',
    choices: [{ label: 'O Dino cai' }, { label: 'O Dino sobe' }],
  }

  it('lê a instrução, o palpite e a pergunta do fim', () => {
    const textos = textosFalaveisDaCena({
      instructions: 'Ligue a borda.',
      prediction: palpite,
      checkpoint: { prompt: 'Por quê?', choices: [{ label: 'Porque sim' }] },
      activity: { type: 'experimentation' },
    })
    expect(textos).toEqual([
      falaDaInstrucao('Ligue a borda.'),
      falaDoPalpite('Seu palpite', palpite),
      falaDaPergunta('Agora explique', { prompt: 'Por quê?', choices: [{ label: 'Porque sim' }] }),
    ])
  })

  /**
   * ⚠️ O rótulo muda com o TIPO da atividade, e o player monta a fala com ele. Gerar sempre "Antes
   * de assistir" deixaria toda demonstração sem áudio no palpite — sem erro nenhum, só calada.
   */
  it('na demonstração o palpite é "Antes de assistir"', () => {
    const [, fala] = textosFalaveisDaCena({
      instructions: 'Olhe a cena.',
      prediction: palpite,
      activity: { type: 'demonstration' },
    })
    expect(fala).toBe(falaDoPalpite('Antes de assistir', palpite))
  })

  it('cena sem palpite nem pergunta fala só a instrução', () => {
    expect(
      textosFalaveisDaCena({
        instructions: 'Mexa à vontade.',
        activity: { type: 'experimentation' },
      }),
    ).toEqual(['Mexa à vontade.'])
  })
})

/**
 * ⚠️⚠️ O áudio NUNCA derruba a cena. Com o members um deploy à frente, um teto novo em
 * `VOZ_LIMITS` faria o app antigo recusar a atividade inteira — a criança veria "esta atividade
 * precisa de uma configuração válida" no lugar do palco por causa do dicionário de voz.
 */
describe('a leitura tolerante e o dicionário', () => {
  const atividade = (vozes: unknown) => ({ type: 'experimentation', scene: 'world', vozes })

  it('descarta o dicionário inválido e PRESERVA a cena', () => {
    const lida = sceneActivityForReading(
      atividade({ 'Fala  torta': 'https://cdn.test/a.mp3' }),
    ) as {
      scene: string
      vozes?: unknown
    }
    expect(lida.scene).toBe('world')
    expect(lida.vozes).toBeUndefined()
  })

  it('o dicionário legal atravessa intacto', () => {
    const vozes = { 'Ligue a borda.': 'https://cdn.test/a.mp3' }
    const lida = sceneActivityForReading(atividade(vozes)) as { vozes?: unknown }
    expect(lida.vozes).toEqual(vozes)
  })
})
