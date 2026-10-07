import { describe, expect, it } from 'bun:test'
import { gradeLearningQuiz } from '../quiz'
import { chaveDeVoz, isZappySpeechText, roteiroDoZappy } from './voz'
import {
  audioDaExplicacao,
  falaDaPerguntaDoQuiz,
  falasDoQuiz,
  isQuizQuestionSpeech,
  isQuizVozes,
  letraDaAlternativa,
  textoDoMarkdownParaFala,
  vozesPublicasDoQuiz,
} from './voz-quiz'

const url = (nome: string) => `https://cdn.test/aulas/voz/${nome}.mp3`

const questao = {
  id: 'q1',
  prompt: 'O que faz o bloco **pular**?',
  choices: [
    { id: 'a', label: 'Faz o Dino pular.' },
    { id: 'b', label: '`mover 10` passos' },
    { id: 'c', label: '![Um cacto](https://cdn.test/cacto.png){width=50}' },
  ],
  correctChoiceIds: ['a'],
  explanation: 'O bloco *pular* muda a altura do Dino.',
}

describe('a fala do quiz', () => {
  it('lê o enunciado e cada alternativa com a letra da tela', () => {
    expect(falaDaPerguntaDoQuiz(questao)).toBe(
      'O que faz o bloco pular? Letra A: Faz o Dino pular. Letra B: mover 10 passos. Letra C: Um cacto.',
    )
  })

  it('não fala marcação, endereço de imagem nem de link', () => {
    expect(
      textoDoMarkdownParaFala(
        '# Título\n- **vermelho**\n- _azul_\n> veja [o tutorial](/como-fazer/pular)\n```\nmover()\n```',
      ),
    ).toBe('Título. vermelho. azul. veja o tutorial. mover()')
    expect(textoDoMarkdownParaFala('nome_da_variavel')).toBe('nome_da_variavel')
  })

  it('fala os comparadores e não confunde a pergunta com uma tag', () => {
    const fala = falaDaPerguntaDoQuiz({
      prompt: 'O que acontece quando x > 0 e y < 5?',
      choices: [{ label: 'x >= 1' }, { label: '<b>Nada</b>' }],
    })
    expect(fala).toBe(
      'O que acontece quando x maior que 0 e y menor que 5? Letra A: x maior ou igual a 1. Letra B: Nada.',
    )
    expect(isZappySpeechText(fala)).toBe(true)
  })

  it('comparação colada não vira tag: x<y && y>0 é lido por inteiro', () => {
    const fala = falaDaPerguntaDoQuiz({
      prompt: 'O que acontece se x<y && y>0?',
      choices: [{ label: 'a<=b || c>=d' }, { label: '<img src="a.png" alt="" /> Nada' }],
    })
    expect(fala).toBe(
      'O que acontece se x menor que y e y maior que 0? Letra A: a menor ou igual a b ou c maior ou igual a d. Letra B: Nada.',
    )
    expect(isZappySpeechText(fala)).toBe(true)
  })

  it('x<y && y>0 é lido inteiro no texto, entre crases e em bloco de código; HTML de verdade sai', () => {
    const lido = 'x menor que y e y maior que 0'
    expect(textoDoMarkdownParaFala('Se x<y && y>0, o personagem anda.')).toBe(
      `Se ${lido}, o personagem anda.`,
    )
    expect(textoDoMarkdownParaFala('Confira `x<y && y>0` no bloco.')).toBe(
      `Confira ${lido} no bloco.`,
    )
    expect(textoDoMarkdownParaFala('```\nx<y && y>0\n```')).toBe(lido)
    expect(textoDoMarkdownParaFala('<b>Atenção</b> x<y && y>0<br/>')).toBe(`Atenção ${lido}`)
    expect(textoDoMarkdownParaFala('<span class="dica">x<y && y>0</span>')).toBe(lido)
    expect(isZappySpeechText(textoDoMarkdownParaFala('Confira `x<y && y>0`.'))).toBe(true)
  })

  it('a alternativa só de imagem sem descrição não deixa a letra calada', () => {
    expect(
      falaDaPerguntaDoQuiz({
        prompt: 'Qual?',
        choices: [{ label: '![](https://cdn.test/a.png)' }, { label: 'Nenhuma' }],
      }),
    ).toBe('Qual? Letra A: a imagem. Letra B: Nenhuma.')
  })

  it('as letras vão de A a T, e depois viram número', () => {
    expect(letraDaAlternativa(0)).toBe('A')
    expect(letraDaAlternativa(19)).toBe('T')
    expect(letraDaAlternativa(20)).toBe('21')
  })

  it('grava pergunta e explicação, cada uma com seu ajuste de pronúncia', () => {
    const falas = falasDoQuiz({
      questions: [
        {
          ...questao,
          zappySpeech: {
            explanation: {
              sourceText: 'O bloco pular muda a altura do Dino.',
              speechText: 'O bloco pular muda a altura do Dino.<break time="0.5s" />',
            },
          },
        },
      ],
    })
    expect(falas.map((f) => f.slot)).toEqual(['question', 'explanation'])
    expect(falas[1]?.speechText).toBe('O bloco pular muda a altura do Dino.<break time="0.5s" />')
    expect(falas[1]?.key).toBe(chaveDeVoz(falas[1]?.speechText ?? ''))
  })

  it('aceita só os dois lugares de ajuste conhecidos', () => {
    expect(isQuizQuestionSpeech(undefined)).toBe(true)
    expect(isQuizQuestionSpeech({ question: { sourceText: 'a', speechText: 'b' } })).toBe(true)
    expect(isQuizQuestionSpeech({ checkpoint: { sourceText: 'a', speechText: 'b' } })).toBe(false)
  })
})

describe('o dicionário de voz do quiz', () => {
  const [pergunta, explicacao] = falasDoQuiz({ questions: [questao] })
  const vozes = {
    [pergunta?.key ?? '']: url('pergunta'),
    [explicacao?.key ?? '']: url('explicacao'),
  }

  it('passa pela régua da chave e do endereço', () => {
    expect(isQuizVozes(vozes)).toBe(true)
    expect(isQuizVozes({ 'zappy:outro:texto': url('x') })).toBe(false)
    expect(isQuizVozes({ [pergunta?.key ?? '']: 'javascript:alert(1)' })).toBe(false)
  })

  it('cabem 60 falas, não 61', () => {
    const muitas = (n: number) =>
      Object.fromEntries(
        Array.from({ length: n }, (_, i) => [
          chaveDeVoz(roteiroDoZappy(`Fala ${i}.`)),
          url(`${i}`),
        ]),
      )
    expect(isQuizVozes(muitas(60))).toBe(true)
    expect(isQuizVozes(muitas(61))).toBe(false)
  })

  it('o GET leva só a fala da pergunta: a explicação é gabarito', () => {
    expect(vozesPublicasDoQuiz({ questions: [questao], vozes })).toEqual({
      [pergunta?.key ?? '']: url('pergunta'),
    })
  })

  it('a correção traz o MP3 da explicação', () => {
    expect(audioDaExplicacao(questao, vozes)).toBe(url('explicacao'))
    const nota = gradeLearningQuiz({ questions: [questao], vozes }, { q1: ['b'] })
    expect(nota.questions[0]?.explanationAudioUrl).toBe(url('explicacao'))
  })

  it('sem voz gravada, a correção não ganha campo nenhum', () => {
    const nota = gradeLearningQuiz({ questions: [questao] }, { q1: ['a'] })
    expect(nota.questions[0]).not.toHaveProperty('explanationAudioUrl')
  })
})
