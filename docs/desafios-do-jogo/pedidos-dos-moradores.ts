/**
 * Os pedidos dos moradores (A44, revisão de 31/10/2026): o enunciado de cada quadro em blocos do
 * Recife, do Pico, do Vale e das Nuvens é o pedido do morador da ilha, que diz o que ele precisa e
 * não o bloco ou a variável a usar. O objetivo principal ganha um rótulo específico no lugar do
 * genérico "Complete a ação indicada". O texto técnico de antes vira a última dica (lacunas,
 * 01/11/2026, pela Jornada: as dicas ajudam a pensar antes de mostrar o caminho).
 */
export interface PedidoDoMorador {
  /** O enunciado: o que o morador precisa, em linguagem de criança. */
  pedido: string
  /** O rótulo do objetivo principal (`acao`), específico do quadro. */
  objetivo: string
}

export const PEDIDOS_DOS_MORADORES: Record<string, PedidoDoMorador> = {
  // Recife: a Maré (lacunas, 01/11/2026: a Mira do Recife, mira e alvos do Explorador).
  'uma-bolha-por-vez': {
    pedido:
      'A Maré quer brincar de mirar na lagoa. Ela quer que o espaço solte uma bolha da mira para cima, uma de cada vez: enquanto uma bolha sobe, outro toque espera.',
    objetivo: 'O espaço solta uma bolha por vez, e cada bolha solta conta uma vez.',
  },
  'alvo-preso': {
    pedido:
      'A estrela do mar boia no alto da lagoa. A Maré quer que a bolha que encosta nela prenda a estrela e ganhe um ponto, um ponto só por bolha.',
    objetivo: 'Cada bolha que prende o alvo vale um ponto, uma vez.',
  },
  'alvo-em-outro-lugar': {
    pedido:
      'Mirar sempre no mesmo lugar ficou fácil demais. A Maré quer que, depois de presa, a estrela apareça em outro lugar do alto, sorteado a cada vez.',
    objetivo: 'Preso o alvo, ele volta num lugar sorteado no alto.',
  },
  'tempo-de-partida': {
    pedido:
      'A Maré quer uma partida com tempo, para ver quantas estrelas cabem nela. O relógio desconta um segundo de cada vez e, no zero, a partida acaba e não sai mais bolha.',
    objetivo: 'O relógio acaba a partida no zero, e depois dele não sai bolha.',
  },
  'nova-partida': {
    pedido:
      'Acabou a partida e a Maré quer jogar outra sem fechar o jogo. Ela quer que o Enter comece uma partida nova, com o tempo cheio e os pontos zerados.',
    objetivo: 'O Enter começa outra partida com o tempo cheio e sem pontos.',
  },
  // Pico: o Floco (lacunas, 01/11/2026: a Fase do Pico, plataforma com fases do Mestre).
  'pulo-com-apoio': {
    pedido:
      'O Floco está ensinando o pinguim a pular no gelo. Ele quer que o espaço faça o pinguim pular só quando os pés estão no gelo; no ar, outro toque espera o próximo pouso.',
    objetivo: 'O espaço faz o pinguim pular só quando ele está no gelo.',
  },
  'agua-volta-ao-comeco': {
    pedido:
      'Às vezes o pinguim cai na água gelada do buraco. O Floco quer que ele volte ao começo do gelo e que cada queda fique contada.',
    objetivo: 'Cair na água leva o pinguim de volta ao começo e conta uma queda.',
  },
  'proxima-fase': {
    pedido:
      'O Floco montou uma segunda fase, com a bandeira lá no gelo do alto. Ele quer que, ao chegar à bandeira da primeira fase, o pinguim vá para a fase 2.',
    objetivo: 'A bandeira da fase 1 leva o pinguim à fase 2.',
  },
  'fim-do-jogo': {
    pedido:
      'Na fase 2, a bandeira fica no gelo do alto. O Floco quer que chegar até ela termine o jogo, uma vez só.',
    objetivo: 'A bandeira da fase 2 termina o jogo, uma vez só.',
  },
  'de-volta-a-fase-1': {
    pedido:
      'O Floco quer jogar de novo desde o começo sem fechar o jogo. Ele quer que o Enter leve tudo de volta à fase 1, sem quedas contadas.',
    objetivo: 'O Enter volta o jogo para a fase 1, sem quedas.',
  },
  // Vale: a Jade.
  'contagem-da-lista': {
    pedido:
      'A Jade precisa saber quantos ninhos há no Vale agora, mesmo quando um ninho sai ou volta para a lista. Ela quer recontar do zero a cada vez que apertar o espaço.',
    objetivo: 'O espaço reconta do zero os ninhos que estão na lista.',
  },
  'cinza-retirada': {
    pedido:
      'A cinza do vulcão sujou os três ninhos. A Jade quer limpar todos de uma vez com o espaço, sem precisar repetir a mesma ação para cada um.',
    objetivo: 'O espaço tira a cinza de todos os ninhos da lista.',
  },
  'folhas-bem-usadas': {
    pedido:
      'A Jade tem poucas folhas para cobrir os ninhos. Ela quer escolher um ninho e cobri-lo com uma folha, sem gastar folha num ninho que já está coberto.',
    objetivo: 'Cada ninho coberto gasta uma folha, e só uma vez.',
  },
  'uma-onda-por-vez': {
    pedido:
      'A Jade quer treinar a proteção dos ninhos com uma onda de cinza de cada vez. Enquanto uma onda passa, apertar o espaço de novo não começa outra.',
    objetivo: 'Só começa uma onda nova quando a anterior terminou.',
  },
  'rodada-conferida': {
    pedido:
      'A Jade confere os três ninhos, um de cada vez. Ela quer fechar a rodada só depois de conferir todos, e contar cada rodada uma vez.',
    objetivo: 'A rodada fecha só com os três ninhos conferidos, e conta uma vez.',
  },
  // Nuvens: a Iriê.
  'reserva-de-agua': {
    pedido:
      'A Iriê guarda água de chuva numa reserva que leva até três. Ela quer guardar e gastar água sem a reserva transbordar e sem ficar abaixo de zero.',
    objetivo: 'A reserva guarda até três de água e nunca fica negativa.',
  },
  'luz-na-medida': {
    pedido:
      'A flor do jardim da Iriê cresce com a luz certa, nem pouca nem demais. Ela quer que a flor só cresça quando a luz está entre 1 e 3.',
    objetivo: 'A flor cresce só com a luz entre 1 e 3.',
  },
  'canteiros-livres': {
    pedido:
      'A Iriê tem três canteiros no céu. Ela quer plantar só no canteiro que está vazio, sem plantar duas vezes no mesmo lugar nem mexer nos outros.',
    objetivo: 'Planta só no canteiro escolhido que está vazio.',
  },
  'dois-recursos': {
    pedido:
      'O jardim da Iriê produz com água e adubo juntos. Ela quer que cada produção use um de cada, e que, faltando um deles, nada seja gasto.',
    objetivo: 'Cada produção usa uma água e um adubo, e sem um deles nada é gasto.',
  },
  'colheita-da-lista': {
    pedido:
      'Três flores estão prontas para colher. A Iriê quer colher todas de uma vez com o espaço, e uma flor colhida não pode ser contada de novo.',
    objetivo: 'O espaço colhe todas as flores da lista, sem contar uma colhida de novo.',
  },
}

/**
 * Os pedidos dos minijogos e dos desafios do dia (A44): o enunciado de antes vira a última dica
 * (`dicasNaOrdemDaJornada`), e o pedido do morador entra no lugar. `soKids` deixa o adulto com o texto
 * técnico próprio (os desafios em texto e no Pro já têm um enunciado adulto diferente).
 */
const PEDIDOS_DOS_MINIJOGOS: Record<string, { pedido: string; soKids?: true }> = {
  // Bosque: a Capi.
  'bosque-corrida-dos-bichos': {
    pedido:
      'A Capi organizou uma corrida entre o cachorro, o gato, o coelho e o porquinho. Ela quer uma largada que ponha os quatro no começo, passos sorteados para cada um e um vencedor só: o primeiro a chegar diz Ganhei e todos param.',
  },
  'bosque-corrida-dos-bichos-pedras': {
    pedido:
      'A Capi pôs pedras na pista da corrida. Ela quer que cada bicho suba antes da pedra e desça depois dela, voltando à sua faixa, e que a corrida continue com um vencedor só.',
  },
  'bosque-corrida-dos-bichos-noite': {
    pedido:
      'Anoiteceu no Bosque e a Capi não enxerga a pista. Ela quer que o espaço clareie a pista sem tirar nenhum bicho do lugar.',
  },
  'bosque-corrida-dos-bichos-placar': {
    pedido:
      'A Capi quer saber quem ganha mais corridas. Ela quer que só o vencedor de cada corrida ganhe uma vitória no placar, e que as vitórias fiquem guardadas para a próxima largada.',
  },
  // Recife: a Maré.
  'recife-mira-de-bolhas': {
    pedido:
      'A Maré inventou uma brincadeira na lagoa: mirar e soltar bolhas para prender os alvos que boiam. Ela quer mirar com as setas, soltar uma bolha de cada vez e ganhar um ponto por alvo preso, sem contar o mesmo alvo duas vezes.',
  },
  'recife-mira-de-bolhas-rapida': {
    pedido:
      'A Maré acha que as bolhas sobem devagar demais. Ela quer bolhas mais rápidas, sem mudar a mira nem as regras de prender os alvos.',
  },
  'recife-mira-de-bolhas-pontos': {
    pedido:
      'A Maré quer deixar a brincadeira mais animada: cada alvo preso passa a valer dois pontos, ainda contando uma vez só por alvo.',
  },
  'recife-mira-de-bolhas-alvo-novo': {
    pedido:
      'Apareceu um alvo novo do lado esquerdo da lagoa, mas a bolha passa por ele sem prender. A Maré quer que ele também possa ser preso, uma vez só.',
  },
  // Pico: o Floco.
  'pico-fase-de-plataforma-pulo-alto': {
    pedido:
      'O Floco pôs a bandeira num gelo alto, e o pulo do pinguim não chega lá. Ele quer um pulo mais forte, sem mudar as outras regras.',
  },
  'pico-fase-de-plataforma-floco': {
    pedido:
      'Um floco de neve apareceu acima do começo da fase. O Floco quer que o pinguim pegue o floco ao encostar nele, uma vez só, e que ele suma.',
  },
  'pico-fase-de-plataforma-quedas': {
    pedido:
      'O Floco quer saber quantas vezes o pinguim caiu na água. Ele quer que cada queda some uma no placar das quedas.',
  },
  // Vale: a Jade.
  'vale-proteja-os-ninhos': {
    pedido:
      'A cinza do vulcão chega em ondas, e a Jade precisa proteger os ninhos. Ela quer cobrir ninhos com folhas, chamar uma onda de cada vez e, quando a onda passar, contar os ninhos protegidos e os que receberam cinza, numa rodada de três ondas.',
  },
  'vale-proteja-os-ninhos-ondas': {
    pedido:
      'A Jade quer uma rodada mais longa, com quatro ondas de cinza em vez de três, e nenhuma onda depois da última.',
  },
  'vale-proteja-os-ninhos-pontos': {
    pedido: 'A Jade quer premiar quem protege bem: cada ninho protegido passa a valer dois pontos.',
  },
  'vale-proteja-os-ninhos-lista': {
    pedido:
      'Um quarto ninho apareceu no Vale, mas a contagem não olha para ele. A Jade quer que as mesmas regras cuidem dos quatro ninhos.',
  },
  'vale-guardiao-dos-ninhos-texto': {
    pedido:
      'A cinza voltou ao Vale e segue um caminho até os ninhos. A Jade quer uma torre que escolha sozinha a nuvem de cinza mais adiantada dentro do alcance, e ondas que cresçam a cada vez.',
    soKids: true,
  },
  // Nuvens: a Iriê.
  'nuvens-jardim-que-floresce': {
    pedido:
      'O jardim do céu da Iriê cresce com água, sol e tempo. Ela quer guardar água e sol, ver a flor crescer a cada segundo só quando há os dois, e saber quando o jardim floresceu, uma vez só.',
  },
  'nuvens-jardim-que-floresce-rega-forte': {
    pedido:
      'A Iriê quer regar menos vezes: cada rega passa a guardar cinco de água, e o resto do jardim continua igual.',
  },
  'nuvens-jardim-que-floresce-sol-forte': {
    pedido:
      'Nos dias de muito sol, a Iriê quer que a flor cresça mais depressa: com sol forte, ela cresce o dobro.',
  },
  'nuvens-jardim-que-floresce-chuva': {
    pedido:
      'A Iriê quer chuva no jardim do céu: um pouco de água cai sozinho a cada segundo, e com sol a flor cresce mesmo sem regar.',
  },
  'nuvens-jardim-em-grade-pro': {
    pedido:
      'A Iriê quer planejar o jardim do céu numa grade, plantar onde cabe e houver moedas, colher a produção e guardar o jardim para continuar depois.',
    soKids: true,
  },
  // Sua ilha: o Nico.
  'sua-ilha-passos-na-areia': {
    pedido:
      'O Nico quer mostrar a praia, mas o guia não sai do lugar. Ele quer que as setas levem o guia pela areia, sem passar da borda da tela.',
  },
  'sua-ilha-a-primeira-concha': {
    pedido:
      'Há uma concha na areia. O Nico quer que o guia pegue a concha ao encostar nela, lembre que está com ela e que a concha saia da areia.',
  },
  'sua-ilha-o-balde-do-nico': {
    pedido:
      'O Nico guarda conchas num balde. Ele quer receber a concha só se o guia estiver com ela; sem concha, ele pede uma.',
  },
  'sua-ilha-a-concha-rosa': {
    pedido:
      'O Nico só quer a concha rosa, que fica mais no alto. Ele quer que o balde aceite só a rosa; com a cinza ou sem nada, ele pede de novo.',
  },
  'sua-ilha-a-mare-volta': {
    pedido:
      'O Nico quer brincar de novo. Ele quer que o Enter faça a praia voltar como era: a concha na areia, o guia no começo e nada entregue.',
  },
  'sua-ilha-pega-conchas': {
    pedido:
      'O Nico quer as três conchas da praia, inclusive a do alto. Ele quer que o balde só fique cheio quando as três tiverem sido pegas.',
  },
  // O desafio do dia da sua ilha (lacunas, 01/11/2026).
  'sua-ilha-pega-conchas-aviso': {
    pedido:
      'O Nico nunca sabe quando falta concha no balde. Ele quer um aviso quando alguma das três ficar na praia, e o balde cheio como antes quando chegarem as três.',
  },
  'sua-ilha-pega-conchas-rosa': {
    pedido:
      'Hoje o Nico só quer a concha rosa, a do alto. Ele quer que o balde fique cheio com ela, mesmo sem as conchas da areia, e que as da areia sozinhas não encham.',
  },
  'sua-ilha-pega-conchas-esvaziar': {
    pedido:
      'O balde do Nico encheu e ele quer brincar de novo sem recomeçar a praia. Ele quer que a barra de espaço esvazie o balde.',
  },
}

/** Teto de dicas de um desafio (`LIMITES_DO_DESAFIO.dicas`). */
const DICAS_MAXIMO = 5
/** Teto de uma dica no contrato (`LIMITES_DO_DESAFIO.dica`). */
const DICA_MAXIMA = 300
/** O enunciado de antes em dicas de até 300 caracteres, cortado entre frases. */
function emDicas(texto: string): string[] {
  const frases = texto
    .match(/[^.]+(?:\.|$)/g)
    ?.map((f) => f.trim())
    .filter(Boolean) ?? [texto]
  const dicas: string[] = []
  for (const frase of frases) {
    const ultima = dicas.at(-1)
    if (ultima && ultima.length + 1 + frase.length <= DICA_MAXIMA)
      dicas[dicas.length - 1] = `${ultima} ${frase}`
    else dicas.push(frase.slice(0, DICA_MAXIMA))
  }
  return dicas
}

/**
 * As dicas na ordem da Jornada (lacunas, 01/11/2026): primeiro lembrar o objetivo, depois as pistas
 * de raciocínio e de estrutura (na ordem em que vierem) e, por último, o texto técnico, que mostra o
 * caminho. Dentro do teto de cinco: o lembrete e o texto técnico ficam, e as pistas cedem lugar.
 */
export function dicasNaOrdemDaJornada(
  objetivo: string,
  pistas: readonly string[],
  tecnico: string,
): string[] {
  const lembrete = `Lembre o objetivo: ${objetivo}`.slice(0, DICA_MAXIMA)
  const fim = emDicas(tecnico).slice(0, DICAS_MAXIMO - 1)
  return [lembrete, ...pistas.slice(0, DICAS_MAXIMO - 1 - fim.length), ...fim]
}

/** O objetivo principal de um desafio (o primeiro que não é o extra). */
function objetivoPrincipal(objetivos: readonly { label: string; optional?: true }[]): string {
  return (objetivos.find((o) => !o.optional) ?? objetivos[0])?.label ?? ''
}

/** Aplica os pedidos dos minijogos e dos desafios do dia a um manifesto já validado. */
export function comPedidosDosMoradores<
  M extends {
    desafios: {
      slug: string
      publico: string
      conteudo: {
        enunciado: string
        dicas: string[]
        objetivos: { label: string; optional?: true }[]
      }
    }[]
  },
>(manifesto: M): M {
  return {
    ...manifesto,
    desafios: manifesto.desafios.map((d) => {
      const base = d.slug.replace(/-adulto$/, '')
      const p = PEDIDOS_DOS_MINIJOGOS[base]
      if (!p || (p.soKids && d.publico !== 'kids')) return d
      return {
        ...d,
        conteudo: {
          ...d.conteudo,
          enunciado: p.pedido,
          dicas: dicasNaOrdemDaJornada(
            objetivoPrincipal(d.conteudo.objetivos),
            d.conteudo.dicas,
            d.conteudo.enunciado,
          ),
        },
      }
    }),
  }
}
