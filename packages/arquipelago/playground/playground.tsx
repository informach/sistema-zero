import { LUMIS, type LumiId, type PublicoJogo } from '@sistemazero/arquipelago-contracts'
import { montarArquipelago } from '../src/entrada'
import { marcarAberturaVista } from '../src/estado/abertura'
import { definirFestaDoPlayground } from '../src/estado/festas'
import { chaveDaObraEstendida } from '../src/estado/obra-estendida'
import { medicaoDasAparencias } from '../src/mundo/carregar-aparencia'
import { PORTOS_DA_ARTE } from '../src/mundo/portos-da-arte'
import type { CartasDoPlayground } from '../src/plataforma/cartas-falsas'
import type { DiaDoPlayground } from '../src/plataforma/desafios-falsos'
import {
  CHAVE_DA_GALERIA,
  CHAVE_DAS_PROFISSOES,
  type ClubeDoPlayground,
  criarPlataformaFalsa,
  QUARTO_DE_EXEMPLO,
} from '../src/plataforma/falsa'
import type { FamiliaDoPlayground } from '../src/plataforma/familia-falsa'
import { CHAVE_DOS_FANTASMAS_FALSOS } from '../src/plataforma/fantasmas-falsos'
import { CHAVE_DA_OBRA_ESTENDIDA_FALSA } from '../src/plataforma/obra-estendida-falsa'
import { chaveDaAbertura } from '../src/sistemas/abertura'
import { chaveDasDicas } from '../src/sistemas/dicas'
import { lerFesta } from '../src/sistemas/festas'
import { chaveDosPassos } from '../src/sistemas/primeiros-passos'
import { ehPorto } from '../src/sistemas/rede-do-barco'
import { configurarCoresDoPlayground } from './cores'
import { abrirOficinaDeExemplo } from './oficina-de-aparencia'

/**
 * O jogo sozinho, com a plataforma de mentira. Parâmetros na URL:
 * `?barco=central|bosque|vila-doce|recife|pico|vale-dos-dinos|nuvens` começa no cais. Use `?posicao=8` para toda a rede.
 * `?posicao=2` (posto/etapa), `?publico=adulto`, `?limite=30`, `?liberado=0`, `?novo=1` e
 * `?em=x,z` ou `?em=x,z,y` (começa fora de casa, nesse ponto; o `y` põe em cima de um deque) e `?adiantar=13` (a noite chega aos 12 min).
 * `?abertura=1` mostra a abertura "O Cinza" (sem ele, ela fica marcada como vista).
 * `?passos=1` mostra os primeiros passos com o Zappy e `?dicas=1` liga as dicas de primeira vez.
 * `?convidados=1` prepara uma casa aconchegante e os moradores conhecidos para visitas.
 * `?obra=exemplo` começa a casa com a obra de exemplo do modo construção; `?obra=fundo`, a mesma com
 * um cômodo atrás do quarto e a porta no fundo dele; `?obra=entrada`, a mesma com a porta de entrada
 * (e a varanda) na frente do cômodo da frente do quarto; `?obra=andar`, a mesma com uma sala à
 * esquerda do quarto, o andar de cima com a escada nela e um morrinho no quintal (E04; com
 * `?posicao=7` aparecem os dois).
 * `?pet=passaro` usa o passarinho do catálogo no quarto, para conferir movimento e pausa
 * (`?pet=cachorro`, o cachorro: o espaço dos bichos, 31/10/2026).
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
const idDoPorto = portoDeTeste === 'central' ? 'sua-ilha' : portoDeTeste
if (idDoPorto && ehPorto(idDoPorto)) {
  const p = PORTOS_DA_ARTE[idDoPorto].embarque
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
/** `?clube=ligado|desligado|sem-clube|fora-do-ar|falha-no-envio`: fotos no Clube (N08b). */
function lerClube(texto: string | null): ClubeDoPlayground | undefined {
  return texto === 'ligado' ||
    texto === 'desligado' ||
    texto === 'sem-clube' ||
    texto === 'fora-do-ar' ||
    texto === 'falha-no-envio'
    ? texto
    : undefined
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
  localStorage.removeItem(CHAVE_DOS_FANTASMAS_FALSOS)
  localStorage.removeItem('arquipelago-playground')
  localStorage.removeItem(CHAVE_DA_GALERIA)
  localStorage.removeItem(CHAVE_DA_OBRA_ESTENDIDA_FALSA)
  for (const publico of ['kids', 'adulto']) {
    localStorage.removeItem(chaveDaObraEstendida(publico, 'perfil-de-teste'))
    localStorage.removeItem(`${CHAVE_DAS_PROFISSOES}:${publico}`)
    localStorage.removeItem(`arquipelago:cores:v1:${publico}:perfil-de-teste`)
    for (const posto of ['padaria', 'sorveteria', 'sucos'])
      localStorage.removeItem(`arquipelago:profissoes:v1:${publico}:perfil-de-teste:${posto}`)
  }
}
const plataforma = criarPlataformaFalsa({
  quarto:
    q.get('pet') === 'passaro' || q.get('pet') === 'cachorro'
      ? { ...QUARTO_DE_EXEMPLO, pet: `pet-${q.get('pet')}` }
      : undefined,
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
  usadoHojeSegundos: q.has('usado') ? Number(q.get('usado')) : undefined,
  liberado: q.get('liberado') !== '0',
  persistir: q.get('persistir') !== '0',
  comecarEm: q.has('em') ? lerPonto(q.get('em') ?? '') : partidaDoBarco,
  adiantarMinutos: Number(q.get('adiantar') ?? 0),
  cartas: (q.get('cartas') as CartasDoPlayground | null) ?? undefined,
  convidados: q.get('convidados') === '1',
  obra: (['exemplo', 'fundo', 'entrada', 'andar'] as const).find((v) => v === q.get('obra')),
  jogos: q.get('jogos') === 'exemplo' ? 'exemplo' : undefined,
  bichos: q.get('bichos') === 'achados' ? 'achados' : undefined,
  adotado: q.get('adotado') === '1',
  bento: q.has('bento') ? Number(q.get('bento')) : undefined,
  patins: q.get('patins') === '1',
  planador: q.get('planador') === '1',
  lanterna: q.get('lanterna') === '1',
  pontesVistas: q.get('chegada') !== '1',
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
  clube: lerClube(q.get('clube')),
  visitaAdulta:
    q.get('visita-adulta') === 'revogar'
      ? 'revogar-ao-conferir'
      : q.get('visita-adulta') === '1'
        ? 'ligado'
        : undefined,
  fantasma:
    q.get('fantasma') === '1'
      ? await (await import('./fantasma-de-exemplo')).fantasmaDeExemplo()
      : undefined,
  galeria: {
    moedas: q.has('moedas') ? Number(q.get('moedas')) : undefined,
    situacao: q.get('galeria') === 'fora-do-ar' ? 'fora-do-ar' : undefined,
  },
})
// `?cores=sem-conquistas|fora-do-ar|arquivadas|desligado|antigo` confere a reserva da pintura.
if (q.has('cores')) configurarCoresDoPlayground(plataforma, q.get('cores') ?? '')
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
// Os primeiros passos e as dicas de primeira vez também só aparecem quando a URL pede:
// `?passos=1` começa do zero, `?passos=manter` continua de onde parou (recarregando a página);
// `?dicas=1` liga as dicas sem nenhuma vista. Sem eles, os passos ficam feitos e as dicas
// desligadas, e os verificadores de antes abrem o jogo como sempre.
try {
  const chavePassos = chaveDosPassos(plataforma.publico, plataforma.perfil.id)
  if (q.get('passos') === '1') localStorage.removeItem(chavePassos)
  else if (q.get('passos') !== 'manter')
    localStorage.setItem(chavePassos, JSON.stringify({ situacao: 'feito', passo: 'fim' }))
  const chaveDicas = chaveDasDicas(plataforma.publico, plataforma.perfil.id)
  if (q.get('dicas') === '1') localStorage.removeItem(chaveDicas)
  else if (q.get('dicas') !== 'manter')
    localStorage.setItem(chaveDicas, JSON.stringify({ vistas: [], desligadas: true }))
} catch {
  // Sem armazenamento: os passos começam só num jogo novo, como a abertura.
}
const el = document.getElementById('jogo')
if (el) montarArquipelago(el, plataforma)
