/**
 * Gera o capítulo "Missões, minijogos e desafios, ilha por ilha" do manual a partir dos manifestos
 * dos desafios (os mesmos que a equipe importa no Admin, versão Kids). Os textos de cada desafio
 * (título, pedido, dicas, o que conta, o extra, as moedas) vêm dos manifestos; as missões no mundo
 * e o resumo do minijogo de cada ilha estão aqui embaixo, escritos a partir das regras.
 *
 *   bun docs/arquipelago-manual/desafios.ts
 *
 * Grava `desafios.html` (o trecho) e o encaixa em `index.html`, entre os marcadores
 * `<!-- desafios:inicio -->` e `<!-- desafios:fim -->`.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const AQUI = import.meta.dir
const PASTA = path.join(AQUI, '..', 'desafios-do-jogo')

interface Objetivo {
  id: string
  label: string
  optional?: boolean
}
interface Desafio {
  slug: string
  ilha: string
  tipo: 'quadro-das-cores' | 'desafio-do-dia' | 'pedido-de-morador'
  quadro: number | null
  ordem: number
  publicar?: boolean
  conteudo: {
    titulo: string
    enunciado: string
    dicas: string[]
    objetivos: Objetivo[]
    desafioExtra?: { titulo: string; texto: string }
    recompensa: { cor: boolean; moedas: number; moedasExtra: number; atracao?: string }
    projetoInicial: {
      programmingLanguage?: string
      mode?: string
      kind?: string
      installedExtensions?: { id: string }[]
    }
  }
}

const manifestos = readdirSync(PASTA, { recursive: true })
  .map(String)
  .filter((f) => f.endsWith('.manifesto.json') && !f.includes('adulto'))
const todos: Desafio[] = manifestos.flatMap(
  (f) =>
    (JSON.parse(readFileSync(path.join(PASTA, f), 'utf8')) as { desafios: Desafio[] }).desafios,
)

const esc = (t: string) =>
  t
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
const humano = (slug: string) => {
  const t = slug.replaceAll('-', ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}
function linguagem(d: Desafio): string {
  const p = d.conteudo.projetoInicial
  if (p.kind === 'pro') return 'Pro'
  if (p.programmingLanguage === 'python') return 'Python'
  if (p.mode === 'bridge' || p.mode === 'code') return 'JavaScript na Ponte'
  if ((p.installedExtensions ?? []).some((e) => e.id === 'game-3d')) return 'Blocos 3D'
  return 'Blocos'
}
const eh3d = (d: Desafio) =>
  (d.conteudo.projetoInicial.installedExtensions ?? []).some((e) => e.id === 'game-3d')
function rotuloDoTipo(d: Desafio): string {
  if (d.ilha === 'farol') return 'Projeto da Lenda'
  if (d.tipo === 'quadro-das-cores') return `Quadro ${d.quadro}`
  if (d.tipo === 'pedido-de-morador') return 'Pedido no Estúdio'
  return eh3d(d) ? 'Desafio 3D' : 'Desafio do dia'
}
function ordemDe(d: Desafio): number {
  if (d.ilha === 'farol') return d.quadro ?? 0
  if (d.tipo === 'quadro-das-cores')
    return (d.quadro ?? 0) * 10 + (linguagem(d) === 'Blocos' ? 0 : 1)
  if (d.tipo === 'pedido-de-morador') return 300
  return eh3d(d) ? 400 : 100 + d.ordem
}
/** Tira o "Extra: " do começo do rótulo opcional (o cartão já diz que é extra). */
const semExtra = (t: string) => t.replace(/^Extra:\s*/i, '')

function cartao(d: Desafio): string {
  const c = d.conteudo
  const obrigatorios = c.objetivos.filter((o) => !o.optional)
  const opcionais = c.objetivos.filter((o) => o.optional)
  const tipo = rotuloDoTipo(d)
  const premio = [
    c.recompensa.cor ? 'devolve a cor de um pedaço da ilha' : null,
    `${c.recompensa.moedas} moedas`,
    c.recompensa.moedasExtra ? `${c.recompensa.moedasExtra} no extra` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return `<article class="desafio" data-tipo="${esc(d.tipo)}">
  <header><span class="selo-tipo">${esc(tipo)}</span><span class="selo-ling">${esc(linguagem(d))}</span></header>
  <h4>${esc(c.titulo)}</h4>
  <p class="pedido">${esc(c.enunciado)}</p>
  <div class="conta"><b>Conta como feito quando</b><ul>${obrigatorios.map((o) => `<li>${esc(o.label)}</li>`).join('')}</ul></div>
  ${
    c.desafioExtra || opcionais.length
      ? `<div class="extra"><b>${esc(c.desafioExtra?.titulo ?? 'Extra')}</b>${c.desafioExtra ? `<p>${esc(c.desafioExtra.texto)}</p>` : ''}${
          opcionais.length && !c.desafioExtra
            ? `<ul>${opcionais.map((o) => `<li>${esc(semExtra(o.label))}</li>`).join('')}</ul>`
            : ''
        }</div>`
      : ''
  }
  ${c.dicas.length ? `<details><summary>Dicas (${c.dicas.length})</summary><ol>${c.dicas.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></details>` : ''}
  <footer>${esc(premio)}${c.recompensa.atracao ? ` · vira a atração <b>${esc(humano(c.recompensa.atracao))}</b>` : ''}${d.publicar === false ? ' · <b>fora da publicação automática</b> (usa um bloco que só um curso extra ensina; a equipe decide)' : ''}</footer>
</article>`
}

/** O que cada ilha monta no Estúdio e as missões que ela tem no mundo (das regras do jogo). */
const ILHAS: {
  id: string
  nome: string
  cor: string
  jogo: string
  missoes: [string, string][]
}[] = [
  {
    id: 'sua-ilha',
    nome: 'Sua ilha',
    cor: 'sua',
    jogo: 'O <b>Pega-conchas</b>: o guia anda pela areia, pega as conchas e entrega no balde do Nico. Cada quadro acrescenta uma parte (andar, pegar, entregar, escolher a concha certa, recomeçar e as três conchas). Os seis quadros devolvem a cor da casa, da horta, do píer, da praia, do gramado e da trilha das pedras. O jogo pronto vira a atração <b>Pega-conchas</b>.',
    missoes: [
      [
        'Primeiros passos',
        'As 23 falas do Zappy: andar, olhar, pular, abrir a porta nova, plantar, regar, colher e a primeira obra. Prêmio: a geladeira.',
      ],
      ['Abrir a porta nova', 'Sai do quarto e acende a casa. Libera o modo Construir.'],
      [
        'O pedido da ilha',
        'Plantar, regar e colher pela primeira vez (cresce em minutos). Prêmio: o projeto azul da geladeira e a cor da horta.',
      ],
      [
        'O primeiro peixe',
        'Lançar e recolher a linha no píer. Prêmio: a cor do píer e o peixe no álbum.',
      ],
      [
        'As quatro chaves',
        'Cozinha, sala, banheiro e quintal, escondidas no gramado. Cada uma libera mais um cômodo (a do quintal, cerca, caminho e canteiro).',
      ],
      ['Coleções da praia', 'Cinco conchas, a estrela-do-mar e cinco peixes para o álbum.'],
      [
        'Pedidos do Nico',
        'Um por dia: uma alface, um milho ou uma salada. Paga 3 moedas, amizade e uma cesta. Com 3 corações, o Chapéu 2.',
      ],
      [
        'Os três segredos',
        'O vento atrás da horta (planador), o deque alto do cipó (depois do Bosque) e a gruta debaixo do píer (depois do mergulho do Recife). Cada um tem um baú com uma página extra.',
      ],
    ],
  },
  {
    id: 'bosque',
    nome: 'Bosque dos Bichos',
    cor: 'bosque',
    jogo: 'A <b>Chuva de pinhas</b>: o coelho desvia das pinhas que caem e joga bolotas para quebrá-las, com vidas, fim e outra partida. Os quadros 1 a 5 montam esse jogo, um passo por quadro (grupos, relógio, encontro, vidas e recomeçar). O quadro 6 é a <b>Corrida dos bichos</b>: quatro bichos correm com passos sorteados até a chegada. Os dois viram atrações.',
    missoes: [
      [
        'Esconde-esconde',
        'Achar os quatro bichos (cachorro, gato, coelho e porquinho) pelas pegadas. Prêmio: uma salada e a receita da Salada colorida.',
      ],
      [
        'Adotar e cuidar',
        'Até três bichos, com nome. Barriga, limpeza e carinho; cresce em 7 dias bem cuidado e aprende um truque na 5ª aula.',
      ],
      [
        'Percurso nas copas',
        'Dos deques ao escorregador, com 5 vagalumes. Três estrelas: chegar, em até 24 s, achar o escondido.',
      ],
      [
        'Pedidos da Capi',
        'Alfaces, tomates, milho, salada, pipocas ou achar mais um bicho. Com 2 corações, a página do diário; com 3, o Colar de coração.',
      ],
      [
        'Os dois segredos',
        'O baú no alto do vento (planador, Ipê de Luz) e o vão da pista que só os patins passam (página extra).',
      ],
    ],
  },
  {
    id: 'vila-doce',
    nome: 'Vila Doce',
    cor: 'vila',
    jogo: 'A <b>corrida do entregador</b>, sobre o curso Corre, Dino!: o entregador do Bento pula as pedras da rua, com abertura, fim, batida justa, pedras sorteadas e dificuldade com teto. O quadro 6 corre pelos telhados, pulando chaminés, com o bolo dourado que vale o dobro. Vira a atração <b>Corrida do entregador</b> na barraca do jogo.',
    missoes: [
      [
        'As receitas do Bento',
        'A cada coração, uma receita: bolo de fubá, pão de queijo, brigadeiro e chocolate quente. Com 1 coração chega o forno; com 2, a página do diário; com 3, a Manga longa.',
      ],
      [
        'Turnos nos balcões',
        'Padaria, sorveteria e barraca de sucos: seis fregueses por turno. O primeiro turno do dia em cada balcão paga 5 moedas e ingredientes.',
      ],
      [
        'Entrega pelos telhados',
        'Caixotes, casinhas e o terraço da sorveteria, com 4 confeitos e dois atalhos. A primeira chegada dá os patins.',
      ],
      [
        'A lanterna e os borrões',
        'Na noite, a lanterna do Bento prende os borrões e solta os Lumis (Quindim e Brigadeiro).',
      ],
      [
        'A feira da semana',
        'Comprar aparências e insumos e vender pratos na banca (uma venda por dia).',
      ],
      ['O segredo', 'O baú no alto do vento (planador), com o Brigadeiro de Luz.'],
    ],
  },
  {
    id: 'recife',
    nome: 'Recife Coral',
    cor: 'recife',
    jogo: 'A <b>Mira do Recife</b>: as bolhas sobem, o alvo é preso com um clique e muda de lugar, com tempo de partida e nova partida. Os quadros 1 a 5 montam o jogo em blocos. O quadro 6, em <b>Python</b>, é outro jogo no mesmo conceito, "Mira de bolhas: mudas da lagoa", e vira a atração <b>Bolhas da lagoa</b>.',
    missoes: [
      [
        'O navio afundado',
        'Mergulhar até o navio: o baú e a página do Recife, no cesto sob a vela caída.',
      ],
      ['O labirinto de corais', 'Nadar pelo labirinto até as pérolas do fim.'],
      [
        'Replantar os corais',
        'Quatro corais desbotados na lagoa. O primeiro traz o aquário, que ganha um peixe por coral.',
      ],
      [
        'Pulos nos corais',
        'Doze corais em volta da lagoa, com 5 pérolas. Três estrelas: chegar, em até 22 s, achar o escondido.',
      ],
      [
        'Pedidos da Maré',
        'Alfaces, tomates ou milho. Com 1 coração, o Peixe com coco; com 3, os Óculos redondos.',
      ],
      ['O segredo', 'O baú no alto do vento (planador), com a Pérola de Luz.'],
    ],
  },
  {
    id: 'pico',
    nome: 'Pico Gelado',
    cor: 'pico',
    jogo: 'A <b>Fase do Pico</b>: um jogo de plataforma em que o pinguim pula com apoio, a água devolve ao começo, a bandeira leva à próxima fase e há fim do jogo e volta à fase 1. O quadro 6, em <b>Python</b>, é "A subida do Floco: flocos no gelo", que vira atração no quiosque do festival.',
    missoes: [
      [
        'Montar a banda',
        'Levar o xilofone (iglu), o violão (lago congelado) e a bateria (cume) aos pinguins do palco. Prêmio: o festival de inverno, o planador e os instrumentos da banda.',
      ],
      [
        'Chocolate no iglu',
        'Fazer chocolate quente no fogareiro do iglu. O primeiro traz a lareira.',
      ],
      [
        'Subida ao cume',
        'A trilha em espiral, com 5 flocos de neve. Três estrelas: chegar, em até 18 s, achar o escondido.',
      ],
      [
        'Descida de trenó',
        'Do platô ao pé da montanha, com 6 portões e 5 bandeirinhas (estrela em 10 s).',
      ],
      ['A caverna de cristal', 'Atrás da montanha: o cristal rosa e mais três cristais.'],
      [
        'As notas musicais',
        'Quatro notas; a clave fica no alto da parede de gelo, alcançada pelo vento com o planador.',
      ],
      [
        'Pedidos do Floco',
        'Milho, pipoca ou tomates. Com 1 coração, o Mingau de milho; com 2, a página; com 3, o Chapéu 1.',
      ],
    ],
  },
  {
    id: 'vale-dos-dinos',
    nome: 'Vale dos Dinos',
    cor: 'vale',
    jogo: 'O <b>Guardião dos ninhos</b>, uma defesa de torre: as ondas de cinza descem do vulcão por um caminho, num relógio, e a torre protege os ninhos pelo alcance. Os quadros 1 a 5 montam o jogo em blocos. O quadro 6 é o mesmo conceito em <b>JavaScript na Ponte</b>, "Guardião dos ninhos: ondas e alcance".',
    missoes: [
      ['Seguir as pegadas', 'O rastro de três dedos da chegada até a escavação.'],
      [
        'A escavação',
        'Tirar a areia, limpar com o pincel e observar. O fóssil traz o museu; depois, um fóssil novo por dia (seis ao todo).',
      ],
      [
        'Proteger os ninhos',
        'Três ninhos; com a lanterna acesa, a luz espanta as ondas de cinza. Prêmio: o ovo da Jade.',
      ],
      [
        'O filhote',
        'Aquecer o ovo no chão quente por 3 dias, dar um nome, alimentar e fazer carinho. Cresce em 5 dias e pode ir junto.',
      ],
      [
        'A montaria',
        'Montar no dino depois dos três ninhos. Trilha das pedras do vulcão (12 s) e corrida da montaria (8 s).',
      ],
      [
        'Pedidos da Jade',
        'Milho, alfaces ou tomates. Com 1 coração, o Açaí na tigela; com 2, a página; com 3, o Chapéu 4.',
      ],
      ['O segredo', 'O terraço da cinza quente: só montado no dino. Lá está o Brotinho de Luz.'],
    ],
  },
  {
    id: 'nuvens',
    nome: 'Ilha das Nuvens',
    cor: 'nuvens',
    jogo: 'O <b>Jardim em grade</b>: plantar com moedas, canteiro ocupado, produção pelo relógio, colheita e meta. Os quadros 1 a 5 montam o jogo em blocos. O quadro 6, no <b>Pro</b> (TypeScript), é "Jardim das Nuvens: plantas juntas e jardim maior", que vira a atração <b>Jardim das Nuvens</b>.',
    missoes: [
      [
        'Saltos entre nuvens',
        'Dos degraus de nuvem às plataformas mais altas, com 3 fitas do arco-íris (60 s).',
      ],
      [
        'Balão e corrida de balão',
        'Subir no balão e passar pelas seis argolas na ordem do arco-íris (45 s).',
      ],
      ['As constelações', 'No mirante, à noite, acender as seis figuras do céu.'],
      [
        'O jardim do céu',
        'Seis canteiros no terraço; a flor colhida faz a sua ilha florescer em três níveis.',
      ],
      ['As estrelas caídas', 'Quatro estrelas que só aparecem à noite.'],
      [
        'Pedidos da Iriê',
        'Tomates, milho ou pipoca. Com 1 coração, a Canjica; com 2, a página; com 3, o Look 1. Ela ensina a escolher o clima.',
      ],
      ['O segredo', 'A nuvem pequena no alto, que só o balão alcança. Lá está a Pluma de Luz.'],
    ],
  },
  {
    id: 'farol',
    nome: 'O Farol',
    cor: 'farol',
    jogo: 'O <b>Meu jogo do Arquipélago</b>, o projeto da Lenda, em quatro linguagens: blocos, Python, JavaScript na Ponte e Pro. Em blocos e na Ponte, os critérios pedem um jogo que combine o que os três primeiros postos ensinaram. No Python e no Pro, o cenário é aberto: a criança escreve na ficha o objetivo e três funcionalidades. Cada envio aprovado passa pela revisão da equipe, e o extra é a versão 2.',
    missoes: [
      [
        'A subida do Farol',
        'Escada, quinas, viga de equilíbrio e o vento com o planador até a varanda (60 s, 5 vagalumes).',
      ],
      ['A última página', 'A mesa da Íris na sala do alto, em quatro trechos.'],
      ['Os seis fachos', 'O Farol se acende e alcança as seis ilhas. A Íris volta para casa.'],
      ['A galeria', 'Seis pedestais para expor as criações da criança.'],
    ],
  },
]

const porIlha = (id: string) =>
  todos.filter((d) => d.ilha === id).sort((a, b) => ordemDe(a) - ordemDe(b))

const total = todos.length
const html = `<!-- desafios:inicio -->
    <section class="cap" id="missoes" data-titulo="Missões, minijogos e desafios">
      <div class="cap-topo">
        <span class="cap-num">Capítulo 10</span>
        <h2>Missões, minijogos e desafios, ilha por ilha</h2>
        <p class="cap-intro">Para cada ilha: o minijogo que ela monta no Estúdio, as missões no mundo e cada um dos ${total} desafios, com o pedido do morador como a criança lê, o que conta como feito, o extra e as dicas na ordem em que aparecem.</p>
      </div>
      <p class="nota">Os textos dos desafios saem dos arquivos que a equipe importa no Admin (a versão Kids; a adulta tem o mesmo conteúdo, com textos próprios). "Conta como feito" são os objetivos obrigatórios conferidos pelo executor; as dicas aparecem uma a uma, do lembrete do objetivo ao texto técnico.</p>
      <div class="ilhas-grade">${ILHAS.map((i) => `<a class="ilha-cartao" href="#missoes-${i.id}" style="--cor: var(--${i.cor})"><b>${esc(i.nome)}</b><span>${porIlha(i.id).length} desafios · ${i.missoes.length} missões</span></a>`).join('')}</div>
${ILHAS.map((ilha) => {
  const lista = porIlha(ilha.id)
  return `      <div class="ilha-desafios" id="missoes-${ilha.id}" style="--cor: var(--${ilha.cor})">
        <h3>${esc(ilha.nome)} <small>${lista.length} desafios</small></h3>
        <div class="lado">
          <div class="bloco"><h4>O minijogo da ilha</h4><p>${ilha.jogo}</p></div>
          <div class="bloco"><h4>As missões no mundo</h4><dl class="missoes">${ilha.missoes.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl></div>
        </div>
        <div class="desafios">
${lista.map((d) => `          ${cartao(d)}`).join('\n')}
        </div>
      </div>`
}).join('\n')}
    </section>
<!-- desafios:fim -->`

writeFileSync(path.join(AQUI, 'desafios.html'), `${html}\n`)
const indice = path.join(AQUI, 'index.html')
let pagina = readFileSync(indice, 'utf8')
const ini = pagina.indexOf('<!-- desafios:inicio -->')
const fim = pagina.indexOf('<!-- desafios:fim -->')
if (ini >= 0 && fim > ini)
  pagina = pagina.slice(0, ini) + html + pagina.slice(fim + '<!-- desafios:fim -->'.length)
writeFileSync(indice, pagina)
console.log(
  `${total} desafios em ${ILHAS.length} ilhas; ${ini >= 0 ? 'encaixado no index.html' : 'sem marcador no index.html'}`,
)
