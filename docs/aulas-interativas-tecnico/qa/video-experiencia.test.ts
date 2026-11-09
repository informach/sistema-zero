import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { isLearningManifest } from '../../../packages/core/src/learning'
import { caminhoAula } from './caminhos'
import { extrairPartesElevenLabs, semTags } from './roteiro-elevenlabs'

/**
 * O vídeo da parte de experiência no molde do Cadê Todo Mundo (decisão da dona, 02/11/2026): o
 * conceito, uma analogia curta, o conceito no jogo dela, no máximo UMA pergunta devolvida à criança
 * ("Isso você vai testar na experiência.") e UM convite dizendo o que investigar, com o fecho
 * comum. A investigação é dela; quem acompanha cada teste é o Zappy, dentro da experiência.
 *
 * Reprovado no vídeo: o tour pelos controles ("Olha aqui: nesta experiência", "este botão", "aqui
 * você vê"), nomes de botão, a sequência dos testes ("primeiro… depois", "Nas duas vezes", "teste
 * mais duas coisas") e a lista do que vai acontecer ("Repare em três coisas"). O "Na tela" só
 * amplia a experiência e mostra a cena parada, sem apontar controles nem tocar. Apresentar o
 * Zappy ao dizer que ele ajuda a observar é permitido. A instrução e o recado da
 * página dizem o que comparar, sem sequência.
 */
const AULAS = [
  'cade-todo-mundo-aula-1',
  'cade-todo-mundo-aula-2',
  'desafio-dia-1',
  'desafio-dia-2',
  'desafio-dia-3',
  'ilha-aula-1',
  'ilha-aula-2',
  'ilha-aula-3',
  'ponte-aula-1',
  'moedas-aula-1',
  'simbolos-aula-1',
  'cabana-aula-1',
]

const FECHO =
  'Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.'
const CONVITE = /(?:^|[.!?] )Agora você vai investigar [^.!?]+\. $/
const TOUR =
  /Olha aqui|\bnesta (?:experiência|atividade)\b|\b(?:este|esta|estes|estas|esse|essa) (?:botão|botões|campo|campos|lista|régua|controle|controles|marca|tabela|deslizante)\b|\baqui (?:você (?:vê|escolhe|muda)|fica)\b|Repare em (?:duas|três|quatro) coisas/i
const SEQUENCIA =
  /\bprimeiro\b|\bdepois (?:clique|teste|faça|compare|mude|pegue|toque|tente|encoste|ligue|desligue)\b|Nas duas vezes|\bteste mais\b|\bPor (?:último|fim)\b|\bFaça [^.]* e depois\b/i
// Só a indicação exata do mascote é apresentação; outros alvos continuam sendo controles.
const GESTO_NA_TELA = /\[(?:apontar(?! zappy\])|tocar|clicar|arrastar|encaixar|escolher|trocar)\b/

interface Convite {
  fala: string
  naTela: string
  instrucao: string
  ponte: string
}

function problemasDoConvite({ fala, naTela, instrucao, ponte }: Convite): string[] {
  const p: string[] = []
  const texto = semTags(fala)
  if (!texto.endsWith(FECHO)) p.push('o vídeo termina no fecho comum')
  else if (!CONVITE.test(texto.slice(0, -FECHO.length)))
    p.push('antes do fecho vem UM convite: "Agora você vai investigar …."')
  if (TOUR.test(texto)) p.push(`tour pelos controles: ${texto.match(TOUR)?.[0]}`)
  if (SEQUENCIA.test(texto)) p.push(`sequência de testes: ${texto.match(SEQUENCIA)?.[0]}`)
  if (/\bclique em (?!Próxima parte)/i.test(texto)) p.push('nome de botão no vídeo')
  if ((texto.match(/Isso você vai testar na experiência\./g) ?? []).length > 1)
    p.push('no máximo uma pergunta devolvida à criança')
  if (GESTO_NA_TELA.test(naTela) || /Olha aqui/.test(naTela))
    p.push(`gesto dentro da experiência no Na tela: ${naTela.match(GESTO_NA_TELA)?.[0]}`)
  if (!instrucao.endsWith('Você escolhe a ordem e pode repetir quando quiser.'))
    p.push('a instrução termina em "Você escolhe a ordem e pode repetir quando quiser."')
  if ((instrucao.match(/[.!?](?:\s|$)/g) ?? []).length > 2) p.push('instrução com mais de 2 frases')
  if (/\bDepois\b|\bPor (?:último|fim)\b|\bclique\b/i.test(instrucao))
    p.push('instrução com sequência ou botão')
  if (
    !/^Sua vez! Investigue [^.!?]+\. Você escolhe a ordem dos testes, e o Zappy sugere o que observar\. Quando terminar, clique em Próxima parte\.$/.test(
      ponte,
    )
  )
    p.push('o recado da página é "Sua vez! Investigue <o que>. …"')
  return p
}

function experiencias(aula: string) {
  const m = JSON.parse(readFileSync(caminhoAula(`${aula}.manifesto.json`), 'utf8'))
  if (!isLearningManifest(m)) throw new Error(aula)
  const roteiro = readFileSync(caminhoAula(`${aula}.roteiro.md`), 'utf8').replaceAll('\r\n', '\n')
  const partes = extrairPartesElevenLabs(roteiro)
  const blocos = new Map(m.blocks.map((b) => [b.key, b]))
  return m.sections.flatMap((s) => {
    const bs = s.blockKeys.map((k) => blocos.get(k))
    const exp = bs.find(
      (b) =>
        b &&
        'content' in b &&
        b.content.kind === 'interactive' &&
        b.content.activity.type === 'experimentation',
    )
    if (!exp || !('content' in exp) || exp.content.kind !== 'interactive') return []
    const video = bs.find((b) => b && 'plannedVideo' in b)
    const ponte = bs.find((b) => b && 'content' in b && b.content.kind === 'dialogue')
    const parte = partes.find((p) => p.clipe === video?.key)
    const corpo = roteiro.split(/(?=^## )/m).find((c) => c.includes(`**Clipe:** \`${video?.key}\``))
    if (!parte || !corpo || !ponte || !('content' in ponte) || ponte.content.kind !== 'dialogue')
      throw new Error(`${aula}/${s.key}: vídeo, roteiro ou recado ausente`)
    return [
      {
        id: `${aula}/${s.key}`,
        fala: parte.texto,
        naTela: corpo.match(/^\*\*Na tela:\*\*\s*(.+)$/m)?.[1] ?? '',
        instrucao: exp.content.instructions,
        ponte: ponte.content.text,
      },
    ]
  })
}

describe('vídeo da experiência no molde do Cadê (02/11/2026)', () => {
  test('apresentar o Zappy não é demonstrar um controle da experiência', () => {
    const convite = experiencias('desafio-dia-2')[0]
    expect(convite).toBeDefined()
    expect(problemasDoConvite({ ...convite!, naTela: '[apontar zappy]' })).toEqual([])
    for (const gesto of [
      '[apontar "Lápis desligado"]',
      '[apontar zappy e tocar a chave]',
      '[clicar "Lápis desligado"]',
      '[apontar zappy] [apontar "Lápis desligado"]',
    ]) {
      expect(problemasDoConvite({ ...convite!, naTela: gesto }).join('; ')).toContain(
        'gesto dentro da experiência',
      )
    }
  })

  test('Cadê, Desafio, Ilha e os quatro Poderes: conceito, analogia e um convite', () => {
    const todas = AULAS.flatMap(experiencias)
    // Cadê 2 (toque, achados), Desafio 5 (quadro, limite, memória, porta, posição), Ilha 4, um por Poder.
    expect(todas.map((e) => e.id)).toHaveLength(15)
    for (const e of todas) expect(problemasDoConvite(e), e.id).toEqual([])
  })

  test('⭐ o convite de TODA experiência livre termina no mesmo fecho (08/11/2026)', () => {
    // Decisão dela: o Dia 1 do Farol e o Cadê também. Só a instrução: os vídeos deles já foram
    // gravados no molde anterior e não mudam.
    const instrucoes = [
      'desafio-dia-1',
      'cade-todo-mundo-aula-1',
      'cade-todo-mundo-aula-2',
    ].flatMap((aula) => {
      const m = JSON.parse(readFileSync(caminhoAula(`${aula}.manifesto.json`), 'utf8'))
      if (!isLearningManifest(m)) throw new Error(aula)
      return m.blocks.flatMap((b) =>
        'content' in b &&
        b.content.kind === 'interactive' &&
        b.content.activity.type === 'experimentation' &&
        b.content.activity.setup?.freeExploration
          ? [{ id: `${aula}/${b.key}`, instrucao: b.content.instructions }]
          : [],
      )
    })
    // Dia 1: câmera lenta e beirada; Cadê: o toque e os achados.
    expect(instrucoes).toHaveLength(4)
    for (const { id, instrucao } of instrucoes) {
      expect(instrucao, id).toEndWith('Você escolhe a ordem e pode repetir quando quiser.')
      expect((instrucao.match(/[.!?](?:\s|$)/g) ?? []).length, id).toBeLessThanOrEqual(2)
      expect(instrucao, id).not.toMatch(/\bDepois\b|\bPor (?:último|fim)\b|\bclique\b/i)
    }
  })

  test('reprova o tour pelos controles e a sequência de testes do formato antigo', () => {
    const antigo: Convite = {
      fala: '[confident, clear, unhurried voice] Nesta parte tem uma experiência com o personagem e a chave. Repare em três coisas nesse momento: a chave, o aviso e temChave. [interested, animated voice] Olha aqui: nesta experiência, este botão liga e desliga a memória da chave. E aqui você vê o que está guardado em temChave agora. [upbeat, encouraging voice] Agora é a sua vez de investigar! Faça o personagem pegar a chave com a memória ligada e depois com a memória desligada. Nas duas vezes, compare a chave, o aviso e temChave. Depois, teste mais duas coisas. Você escolhe por onde começar e pode repetir quantas vezes quiser. Quando terminar, clique em Próxima parte.',
      naTela:
        'No "Olha aqui: nesta experiência", apontar o botão [apontar "Ligar a memória da chave"].',
      instrucao:
        'Faça o personagem pegar a chave com a memória ligada e desligada. Depois teste se temChave muda quando ele se afasta. Você escolhe a ordem dos testes e pode repetir quando quiser.',
      ponte: 'Sua vez! Faça o personagem pegar a chave. Depois clique em Próxima parte.',
    }
    const p = problemasDoConvite(antigo)
    for (const trecho of [
      'fecho comum',
      'tour pelos controles',
      'sequência de testes',
      'Na tela',
      'instrução termina',
      'recado da página',
    ])
      expect(
        p.some((x) => x.includes(trecho)),
        trecho,
      ).toBe(true)
  })
})
