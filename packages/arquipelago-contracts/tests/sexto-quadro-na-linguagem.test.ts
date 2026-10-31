import { expect, test } from 'bun:test'
import { linguagemDoProjeto, ManifestoDeDesafiosSchema } from '../src'

/**
 * §6.28 A2: do Explorador em diante, os quadros 1 a 5 são retomadas em blocos e o sexto quadro é o
 * desafio na linguagem do posto (Python no Recife e no Pico, a Ponte no Vale, o Pro nas Nuvens).
 * Os dois arquivos de cada ilha juntos preenchem os seis quadros, sem quadro repetido.
 */
const ILHAS = [
  ['recife', 'recife', 'recife-python', 'python'],
  ['pico', 'pico', 'pico-python', 'python'],
  ['vale', 'vale', 'vale-texto', 'texto'],
  ['nuvens', 'nuvens', 'nuvens-pro', 'pro'],
] as const

const ler = async (pasta: string, nome: string) =>
  ManifestoDeDesafiosSchema.parse(
    await Bun.file(
      new URL(`../../../docs/desafios-do-jogo/${pasta}/${nome}.manifesto.json`, import.meta.url),
    ).json(),
  )

test('os seis quadros: cinco em blocos e o sexto na linguagem do posto, nos dois públicos', async () => {
  for (const [pasta, blocos, linguagem, esperada] of ILHAS)
    for (const sufixo of ['', '-adulto']) {
      const emBlocos = await ler(pasta, `${blocos}${sufixo}`)
      const naLinguagem = await ler(pasta, `${linguagem}${sufixo}`)
      const quadros = [...emBlocos.desafios, ...naLinguagem.desafios]
        .filter((d) => d.tipo === 'quadro-das-cores')
        .map((d) => [d.quadro, linguagemDoProjeto(d.conteudo.projetoInicial)])
        .sort((a, b) => Number(a[0]) - Number(b[0]))
      expect(quadros, `${pasta}${sufixo}`).toEqual([
        [1, 'blocos'],
        [2, 'blocos'],
        [3, 'blocos'],
        [4, 'blocos'],
        [5, 'blocos'],
        [6, esperada],
      ])
      for (const d of naLinguagem.desafios) expect(d.conteudo.recompensa.cor).toBe(true)
    }
})
