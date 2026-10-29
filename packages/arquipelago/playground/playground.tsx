import type { PublicoJogo } from '@sistemazero/arquipelago-contracts'
import { montarArquipelago } from '../src/entrada'
import type { CartasDoPlayground } from '../src/plataforma/cartas-falsas'
import type { DiaDoPlayground } from '../src/plataforma/desafios-falsos'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'

/**
 * O jogo sozinho, com a plataforma de mentira. Parâmetros na URL:
 * `?posicao=2` (posto/etapa), `?publico=adulto`, `?limite=30`, `?liberado=0`, `?novo=1` e
 * `?em=x,z` ou `?em=x,z,y` (começa fora de casa, nesse ponto; o `y` põe em cima de um deque) e `?adiantar=13` (a noite chega aos 12 min).
 * `?obra=exemplo` começa a casa com a obra de exemplo do modo construção.
 * `?bichos=achados` começa com os quatro encontrados para receber o presente na conversa.
 * `?bento=100` põe a amizade com o Bento (com 100 ele lembrou o bolo de fubá e o forno chega).
 * `?patins=1` põe um par de patins na mochila (o prêmio da entrega pelos telhados).
 * `?cartas=todas` (ou `desligadas`, `fora-do-ar`) muda os cartões dos Lumis do caderno.
 * `?dia=feito` (ou `nenhum`; padrão `pronto`) muda o desafio do dia do Quadro das Cores.
 * `?objetos=sem-acesso` faz o Pinta e o Molda no molde de um objeto responderem sem acesso.
 * `?qualidade=leve` ou `?qualidade=completa` força só o desenho, sem gravar a preferência.
 * `?perder-pulso=1` simula uma resposta perdida após registrar tempo, para testar recuperação.
 */
const q = new URLSearchParams(location.search)

function lerPonto(texto: string): { x: number; z: number; y?: number } {
  const [x, z, y] = texto.split(',').map(Number)
  return { x: x ?? 0, z: z ?? 0, ...(y !== undefined && Number.isFinite(y) ? { y } : {}) }
}
if (q.get('novo') === '1') localStorage.removeItem('arquipelago-playground')
const plataforma = criarPlataformaFalsa({
  posicao: Number(q.get('posicao') ?? 2),
  publico: (q.get('publico') as PublicoJogo | null) ?? 'kids',
  limiteDiarioMinutos: q.has('limite') ? Number(q.get('limite')) : undefined,
  liberado: q.get('liberado') !== '0',
  persistir: q.get('persistir') !== '0',
  comecarEm: q.has('em') ? lerPonto(q.get('em') ?? '') : undefined,
  adiantarMinutos: Number(q.get('adiantar') ?? 0),
  cartas: (q.get('cartas') as CartasDoPlayground | null) ?? undefined,
  obra: q.get('obra') === 'exemplo' ? 'exemplo' : undefined,
  bichos: q.get('bichos') === 'achados' ? 'achados' : undefined,
  bento: q.has('bento') ? Number(q.get('bento')) : undefined,
  patins: q.get('patins') === '1',
  dia: (q.get('dia') as DiaDoPlayground | null) ?? undefined,
  objetos: q.get('objetos') === 'sem-acesso' ? 'sem-acesso' : undefined,
  galeria: {
    moedas: q.has('moedas') ? Number(q.get('moedas')) : undefined,
    situacao: q.get('galeria') === 'fora-do-ar' ? 'fora-do-ar' : undefined,
  },
})
if (q.get('perder-pulso') === '1') {
  const buscar = plataforma.servico.buscar
  let perder = true
  plataforma.servico.buscar = async (caminho, opcoes) => {
    const resposta = await buscar(caminho, opcoes)
    if (
      perder &&
      caminho === '/tempo/sessao' &&
      (opcoes?.corpo as { acao?: unknown } | undefined)?.acao === 'pulsar'
    ) {
      perder = false
      throw new Error('Resposta de tempo perdida no playground')
    }
    return resposta
  }
}
plataforma.voltarParaPlataforma = () => {
  document.body.innerHTML =
    '<p style="font:16px system-ui;padding:24px">Aqui a plataforma voltaria para a página anterior.</p>'
}
const el = document.getElementById('jogo')
if (el) montarArquipelago(el, plataforma)
