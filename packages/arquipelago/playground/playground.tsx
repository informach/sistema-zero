import { LUMIS, type LumiId, type PublicoJogo } from '@sistemazero/arquipelago-contracts'
import recifeGlb from '../src/assets/ilhas/recife.glb'
import pierGlb from '../src/assets/mundo/pier.glb'
import { montarArquipelago } from '../src/entrada'
import { marcarAberturaVista } from '../src/estado/abertura'
import { definirFestaDoPlayground } from '../src/estado/festas'
import { medicaoDasAparencias } from '../src/mundo/carregar-aparencia'
import { giroDaIlha, ilhasEmVolta, PIER } from '../src/mundo/medidas'
import { ancorasDoPorto } from '../src/mundo/portos'
import type { CartasDoPlayground } from '../src/plataforma/cartas-falsas'
import type { DiaDoPlayground } from '../src/plataforma/desafios-falsos'
import {
  CHAVE_DA_GALERIA,
  CHAVE_DAS_PROFISSOES,
  criarPlataformaFalsa,
} from '../src/plataforma/falsa'
import type { FamiliaDoPlayground } from '../src/plataforma/familia-falsa'
import { chaveDaAbertura } from '../src/sistemas/abertura'
import { lerFesta } from '../src/sistemas/festas'
import { abrirOficinaDeExemplo } from './oficina-de-aparencia'

/**
 * O jogo sozinho, com a plataforma de mentira. Parâmetros na URL:
 * `?barco=central` ou `?barco=recife` começa no embarque com o Recife aberto.
 * `?posicao=2` (posto/etapa), `?publico=adulto`, `?limite=30`, `?liberado=0`, `?novo=1` e
 * `?em=x,z` ou `?em=x,z,y` (começa fora de casa, nesse ponto; o `y` põe em cima de um deque) e `?adiantar=13` (a noite chega aos 12 min).
 * `?abertura=1` mostra a abertura "O Cinza" (sem ele, ela fica marcada como vista).
 * `?convidados=1` prepara uma casa aconchegante e os moradores conhecidos para visitas.
 * `?obra=exemplo` começa a casa com a obra de exemplo do modo construção.
 * `?bichos=achados` começa com os quatro encontrados para receber o presente na conversa.
 * `?bento=100` põe a amizade com o Bento (com 100 ele lembrou o bolo de fubá e o forno chega).
 * `?patins=1` põe um par de patins na mochila (o prêmio da entrega pelos telhados).
 * `?lanterna=1` põe a lanterna na mochila e `?lumis=quindim:2,brigadeiro:1` os Lumis já presos
 * (fase2-06); com `?adiantar=13` a Vila já começa de noite, com os borrões.
 * `?energia=20` começa com pouca energia, para conferir o descanso no banco e na cama (fase2-13).
 * `?cartas=todas` (ou `desligadas`, `fora-do-ar`) muda os cartões dos Lumis do caderno.
 * `?dia=feito` (ou `nenhum`; padrão `pronto`) muda o desafio do dia do Quadro das Cores.
 * `?objetos=sem-acesso` faz o Pinta e o Molda no molde de um objeto responderem sem acesso.
 * `?qualidade=leve` ou `?qualidade=completa` força só o desenho, sem gravar a preferência.
 * `?perder-pulso=1` simula uma resposta perdida após registrar tempo, para testar recuperação.
 */
const q = new URLSearchParams(location.search)
Object.assign(window, { __arquipelagoAparencias: medicaoDasAparencias })
// Conferência do barco usa as mesmas âncoras da produção, sem coordenadas de teste no jogo.
const portoDeTeste = q.get('barco')
let partidaDoBarco: { x: number; y: number; z: number } | undefined
if (portoDeTeste === 'central' || portoDeTeste === 'recife') {
  const recife = ilhasEmVolta().find((i) => i.ilha.id === 'recife')!
  const central = portoDeTeste === 'central'
  const resposta = await fetch(new URL(central ? pierGlb : recifeGlb, import.meta.url).href)
  if (!resposta.ok) throw new Error('Sem âncoras para conferir o barco')
  const p = ancorasDoPorto(
    await resposta.arrayBuffer(),
    central ? 'embarque' : 'cais',
    central ? PIER : recife.centro,
    central ? 0 : giroDaIlha(recife.ilha),
  ).embarque
  partidaDoBarco = { ...p, y: p.y + 1.2 }
}

function lerPonto(texto: string): { x: number; z: number; y?: number } {
  const [x, z, y] = texto.split(',').map(Number)
  return { x: x ?? 0, z: z ?? 0, ...(y !== undefined && Number.isFinite(y) ? { y } : {}) }
}
function lerLumis(texto: string): Partial<Record<LumiId, number>> {
  const lumis: Partial<Record<LumiId, number>> = {}
  for (const par of texto.split(',')) {
    const [id, qtd] = par.split(':')
    if ((LUMIS as readonly string[]).includes(id ?? '')) lumis[id as LumiId] = Number(qtd ?? 1)
  }
  return lumis
}
/** `?familia=irmaos|sozinha|desligada|fora-do-ar`: os irmãos de mentira (recordes e visitas, fase3-12). */
function lerFamilia(texto: string | null): FamiliaDoPlayground | undefined {
  return texto === 'irmaos' ||
    texto === 'sozinha' ||
    texto === 'desligada' ||
    texto === 'fora-do-ar'
    ? texto
    : undefined
}
if (q.get('novo') === '1') {
  localStorage.removeItem('arquipelago-playground')
  localStorage.removeItem(CHAVE_DA_GALERIA)
  for (const publico of ['kids', 'adulto']) {
    localStorage.removeItem(`${CHAVE_DAS_PROFISSOES}:${publico}`)
    for (const posto of ['padaria', 'sorveteria', 'sucos'])
      localStorage.removeItem(`arquipelago:profissoes:v1:${publico}:perfil-de-teste:${posto}`)
  }
}
const plataforma = criarPlataformaFalsa({
  rotina:
    q.get('rotina') === 'cancelado'
      ? 'cancelado'
      : q.get('rotina') === 'indisponivel'
        ? 'indisponivel'
        : 'editor',
  editarRotina:
    q.get('rotina') === 'editor'
      ? async (molde) => {
          const { abrirEditorLumiNoPlayground } = await import(
            '../../member-shell/tests/fixtures/rotina-lumi-playground'
          )
          return abrirEditorLumiNoPlayground(molde, () => plataforma.servico.buscar('/cartas'))
        }
      : undefined,
  posicao: Number(q.get('posicao') ?? (partidaDoBarco ? 4 : 2)),
  publico: (q.get('publico') as PublicoJogo | null) ?? 'kids',
  limiteDiarioMinutos: q.has('limite') ? Number(q.get('limite')) : undefined,
  liberado: q.get('liberado') !== '0',
  persistir: q.get('persistir') !== '0',
  comecarEm: q.has('em') ? lerPonto(q.get('em') ?? '') : partidaDoBarco,
  adiantarMinutos: Number(q.get('adiantar') ?? 0),
  cartas: (q.get('cartas') as CartasDoPlayground | null) ?? undefined,
  convidados: q.get('convidados') === '1',
  obra: q.get('obra') === 'exemplo' ? 'exemplo' : undefined,
  bichos: q.get('bichos') === 'achados' ? 'achados' : undefined,
  bento: q.has('bento') ? Number(q.get('bento')) : undefined,
  patins: q.get('patins') === '1',
  lanterna: q.get('lanterna') === '1',
  energia: q.has('energia') ? Number(q.get('energia')) : undefined,
  lumis: q.has('lumis') ? lerLumis(q.get('lumis') ?? '') : undefined,
  dia: (q.get('dia') as DiaDoPlayground | null) ?? undefined,
  quadrosFeitos: q.get('quadros') === 'feitos',
  objetos: q.get('objetos') === 'sem-acesso' ? 'sem-acesso' : undefined,
  aparencias:
    q.get('aparencias') === 'falha'
      ? 'falha'
      : q.get('aparencias') === 'sem-metodo'
        ? 'sem-metodo'
        : 'pronto',
  editarObjeto: q.has('aparencias') ? abrirOficinaDeExemplo : undefined,
  familia: lerFamilia(q.get('familia')),
  galeria: {
    moedas: q.has('moedas') ? Number(q.get('moedas')) : undefined,
    situacao: q.get('galeria') === 'fora-do-ar' ? 'fora-do-ar' : undefined,
  },
})
const festa = lerFesta(q.get('festa'))
if (festa) definirFestaDoPlayground(plataforma, festa)
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
// A abertura só aparece com `?abertura=1` (os verificadores abrem o jogo direto no mundo).
if (q.get('abertura') === '1') {
  try {
    localStorage.removeItem(chaveDaAbertura(plataforma.publico, plataforma.perfil.id))
  } catch {
    // Sem armazenamento: o jogo mostra a abertura só num jogo novo.
  }
} else marcarAberturaVista(plataforma.publico, plataforma.perfil.id)
const el = document.getElementById('jogo')
if (el) montarArquipelago(el, plataforma)
