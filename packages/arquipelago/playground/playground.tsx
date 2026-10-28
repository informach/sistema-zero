import type { PublicoJogo } from '@sistemazero/arquipelago-contracts'
import { montarArquipelago } from '../src/entrada'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'

/**
 * O jogo sozinho, com a plataforma de mentira. Parâmetros na URL:
 * `?posicao=2` (posto/etapa), `?publico=adulto`, `?limite=30`, `?liberado=0`, `?novo=1` e
 * `?em=x,z` (começa fora de casa, nesse ponto) e `?adiantar=13` (a noite chega aos 12 min).
 */
const q = new URLSearchParams(location.search)
if (q.get('novo') === '1') localStorage.removeItem('arquipelago-playground')
const plataforma = criarPlataformaFalsa({
  posicao: Number(q.get('posicao') ?? 2),
  publico: (q.get('publico') as PublicoJogo | null) ?? 'kids',
  limiteDiarioMinutos: q.has('limite') ? Number(q.get('limite')) : undefined,
  liberado: q.get('liberado') !== '0',
  persistir: q.get('persistir') !== '0',
  comecarEm: q.has('em')
    ? { x: Number(q.get('em')?.split(',')[0]), z: Number(q.get('em')?.split(',')[1]) }
    : undefined,
  adiantarMinutos: Number(q.get('adiantar') ?? 0),
})
plataforma.voltarParaPlataforma = () => {
  document.body.innerHTML =
    '<p style="font:16px system-ui;padding:24px">Aqui a plataforma voltaria para a página anterior.</p>'
}
const el = document.getElementById('jogo')
if (el) montarArquipelago(el, plataforma)
