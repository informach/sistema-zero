/**
 * A fonte editorial do Poder "Moedas no caminho": as falas gravadas (com as marcas do ElevenLabs),
 * as notas de tela, as falas do Zappy na página e o Passo a passo completo das duas dimensões.
 * O gerador (`gerar-moedas.ts`) monta manifestos, roteiros e caderno a partir daqui.
 *
 * A aula 1 (2D) ensina o conceito novo: vídeo do cofrinho, experiência e montagem guiada completa.
 * A aula 2 (3D) é a transferência: o vídeo lembra a regra e a ajuda completa fica no Passo a passo.
 */
import type { MoedasDimensao, MoedasEtapa } from './moedas-projeto'

export type MoedasTrecho = {
  key: string
  title: string
  kind: 'intro' | 'material' | 'experience' | 'build' | 'quiz' | 'delivery'
  etapa?: MoedasEtapa
  /** Fala do Zappy na página, logo depois do vídeo (ou antes do quiz). Não é gravada. */
  ponte: string
  /** Fala gravada, com as marcas de interpretação. Vazia na seção sem vídeo. */
  text: string
  screen: string
}

const verificar =
  '[confident, clear, unhurried voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, leia a dica, corrija os blocos e clique novamente. Depois clique em Próxima parte.'

export const moedasAulas: {
  slug: string
  title: string
  dimension: MoedasDimensao
  trechos: MoedasTrecho[]
}[] = [
  {
    slug: 'aula-1',
    title: 'Cada moeda conta',
    dimension: '2d',
    trechos: [
      {
        key: 'abertura',
        title: 'Moedas no caminho do Farol',
        kind: 'intro',
        screen:
          'Jogo pronto 2D. Mostrar as seis moedas, o baú no gramado de baixo e o placar ao lado do ícone. Pegar uma moeda e mostrar o número subir para 1; não abrir o baú nem mostrar os blocos.',
        ponte:
          'Sua vez! Clique no jogo e use as setas do teclado. Pegue moedas e tente o baú com poucas e com cinco ou mais. A tecla R começa outra partida. Depois clique em Próxima parte.',
        text: '[upbeat, welcoming voice] O caminho do Farol ganhou moedas! O personagem continua indo atrás da chave para acender o farol, mas agora tem seis moedas pelo caminho e um baú escondido no gramado. Cada moeda que ele pega soma um no número das moedas, e o baú só abre com pelo menos cinco. [interested, animated voice] Olha aqui: quando o personagem encosta numa moeda, ela some e o número ao lado do ícone sobe para 1. [upbeat, encouraging voice] Agora é a sua vez de jogar. Clique no jogo aqui na página e use as setas do teclado. Tente o baú com poucas moedas e depois com cinco ou mais. A tecla R começa uma nova partida. Você pode seguir mesmo sem terminar a partida: é só clicar em Próxima parte.',
      },
      {
        key: 'material',
        title: 'O seu Passo a passo do projeto',
        kind: 'material',
        screen:
          'Abrir o Passo a passo do projeto no bloco Consulte. Mostrar a parte 2D e a parte 3D, os títulos das montagens e o botão Baixar. Não inventar anexo antes do PDF produzido.',
        ponte:
          'Este é o seu Passo a passo do projeto. Se quiser, leia aqui mesmo ou clique em Baixar para guardar. Depois clique em Próxima parte.',
        text: '[engaging, energetic, conversational voice] Olha aqui: este é o seu Passo a passo do projeto! Ele tem cada montagem das duas aulas, com o caminho na paleta, o nome do bloco, onde encaixar e como testar. Tem uma parte para o jogo 2D e outra para a ilha em 3D, que você vai fazer na próxima aula. [reassuring, encouraging voice] Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o material e consultar onde quiser. Depois clique em Próxima parte.',
      },
      {
        key: 'experiencia',
        title: 'O contador de moedas',
        kind: 'experience',
        screen:
          'Vídeo conceitual. Meme ilustrado por 2 a 3 segundos: o Zappy deixando uma moeda cair num cofrinho, com o número do cofrinho passando de 3 para 4. Depois mostrar o placar do jogo ao lado do baú. Não percorrer os controles da experiência.',
        ponte:
          'Hora de investigar! Observe quando o número das moedas muda e quando continua igual, e compare as duas regras do baú. Depois clique em Próxima parte.',
        text: '[curious] Sabe quando você guarda moedas num cofrinho? Cada moeda que cai lá dentro faz o total crescer um pouco. E esse total continua lá, mesmo quando você sai de perto. [engaging, energetic, conversational voice] Para comprar alguma coisa, a pergunta é: eu tenho pelo menos o preço? No seu jogo vai ser igual. Uma variável chamada moedas guarda quantas o personagem já pegou. Cada encontro com uma moeda soma um nesse número, e o baú pergunta se moedas é pelo menos cinco. [interested, animated voice] Mas tem um detalhe importante: cada moeda só pode contar uma vez. [upbeat, encouraging voice] Na experiência, pegue as moedas e observe quando o número muda e quando continua igual. Volte ao lugar de uma moeda que você já pegou, tente o baú com poucas e compare as duas regras do baú. Depois clique em Próxima parte.',
      },
      {
        key: 'contador',
        title: 'Crie o contador',
        kind: 'build',
        etapa: 'contador',
        screen:
          'Projeto inicial. Mostrar o fim de Ao iniciar, abrir Programação → Variáveis, encaixar Criar variável, trocar contador por moedas e manter o 0. Mostrar Verificar projeto e Objetivo cumprido!.',
        ponte:
          'Agora crie a variável moedas no fim de Ao iniciar, começando em 0. Clique em Verificar projeto e depois em Próxima parte.',
        text: '[engaging, energetic, conversational voice] Agora crie o número que guarda as moedas. Lembra da experiência da parte anterior? O número começava em zero e mudava a cada moeda pega. Esse número ainda não existe no seu jogo, por isso a gente vai criar ele agora! [confident, clear, unhurried voice] Primeiro, encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco. [confident, clear, unhurried voice] Abra Programação e depois Variáveis. Pegue o bloco Criar variável e encaixe no fim de Ao iniciar. [confident, clear, unhurried voice] Repare que o bloco chega com contador. Clique em contador, apague e escreva moedas. [engaging, energetic, conversational voice] O valor já vem em 0; deixe assim. É com zero moedas que toda partida começa. [confident, clear, unhurried voice] Esse número ainda não aparece no jogo, por isso confira se ficou assim: o bloco está dentro de Ao iniciar, o nome é moedas e o valor é 0. [confident, clear, unhurried voice] Clique em Verificar projeto. Se faltar alguma coisa, leia a dica, corrija os blocos e clique novamente. Depois clique em Próxima parte.',
      },
      {
        key: 'coleta',
        title: 'Cada moeda soma um',
        kind: 'build',
        etapa: 'coleta',
        screen:
          'Começar pela retomada: levar o personagem por cima de uma moeda e mostrar que nada acontece. Depois, em Quando acontecer, montar o encontro com o grupo, Tirar o sprite do grupo e Somar em variável, um bloco por vez. Testar pegando moedas e voltando ao lugar de uma delas.',
        ponte:
          'Hora de montar a coleta! No encontro com as moedas, a moeda sai do grupo e soma 1 em moedas. Teste, clique em Verificar projeto e depois em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora faça cada moeda contar. Clique no jogo e leve o personagem até uma moeda. Tá vendo? Ele passa por cima e não acontece nada, porque o encontro com as moedas ainda não tem nenhuma reação ligada a ele. Lembra da experiência da terceira parte desta aula? A moeda pega sumia e somava um, e por ter sumido ela não contava de novo. Agora a gente vai montar essa regra no seu jogo! [confident, clear, unhurried voice] Primeiro, encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista um espaço vazio depois do último evento dela, fora do fazer dos outros eventos. [confident, clear, unhurried voice] Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue o bloco Quando o sprite começar a encostar em algum do grupo, chamando de, e encaixe nesse espaço. [confident, clear, unhurried voice] Repare que o bloco chega com jogador. Clique em jogador e escolha personagem. Depois clique em moedas, o nome do grupo, e escolha moedasDoCaminho. É o grupo onde estão as seis moedas. [engaging, energetic, conversational voice] O último nome já vem moeda; deixe assim. É por esse nome que os blocos de dentro falam da moeda que o personagem acabou de encostar. [confident, clear, unhurried voice] Agora a reação. Deixe à vista o espaço ao lado da palavra fazer, dentro desse encontro. Abra Jogo 2D, depois Grupos e depois Participação e limpeza. Pegue o bloco Tirar o sprite do grupo e encaixe dentro do fazer. [confident, clear, unhurried voice] Esse bloco chega com asteroide e asteroides. Clique em asteroide e escolha moeda. Depois clique em asteroides e escolha moedasDoCaminho. Assim a moeda sai do grupo e some do caminho. [confident, clear, unhurried voice] Agora deixe à vista o espaço embaixo de Tirar o sprite do grupo, ainda dentro do fazer. Abra Programação e depois Variáveis. Pegue o bloco Somar em variável e encaixe ali. [confident, clear, unhurried voice] Repare que ele chega com contador. Clique em contador e escolha moedas. O número já vem em 1; deixe assim. [engaging, energetic, conversational voice] Agora teste. Clique no jogo e leve o personagem pelas moedas do caminho. Cada uma deve sumir no encontro. O número ainda não aparece na tela: ele vai aparecer na próxima parte. Depois volte ao lugar de uma moeda que já sumiu. Repare que não acontece nada, porque ela já saiu do grupo. [reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o encontro usa personagem e moedasDoCaminho, Tirar o sprite do grupo usa moeda e moedasDoCaminho, e Somar 1 em variável moedas está dentro do mesmo fazer. Depois de corrigir, teste de novo. ${verificar}`,
      },
      {
        key: 'placar',
        title: 'Mostre as moedas na tela',
        kind: 'build',
        etapa: 'placar',
        screen:
          'Retomada: pegar duas moedas e mostrar que nada diz quantas foram. Em Enquanto estiver rodando, no fim de A cada quadro do jogo, encaixar Mostrar placar, trocar o rótulo, soltar valor da variável sobre o 0 e ajustar x, y e tamanho. Testar o placar subindo, a volta ao lugar de uma moeda e a tecla R.',
        ponte:
          'Agora mostre as moedas na tela, com Mostrar placar no fim de A cada quadro do jogo. Teste, clique em Verificar projeto e depois em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora mostre o número das moedas na tela. Clique no jogo e pegue duas moedas. Tá vendo? Elas somem, mas não dá para saber quantas você já pegou, porque o número está guardado em moedas e nada mostra esse valor na tela. Lembra do placar da experiência, ao lado do ícone da moeda? Agora a gente vai colocar esse placar no seu jogo! [confident, clear, unhurried voice] Primeiro, encontre a área Enquanto estiver rodando. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Dentro de A cada quadro do jogo, deixe à vista o fim dele, depois do último bloco, Escrever. [confident, clear, unhurried voice] Abra Jogo 2D, depois Vida e placar e depois Indicadores e texto na tela. Pegue o bloco Mostrar placar e encaixe no fim de A cada quadro do jogo. [confident, clear, unhurried voice] Repare que o placar chega com o rótulo Pontos, com dois-pontos. Clique em Pontos, apague e escreva Moedas, também com dois-pontos no fim. [confident, clear, unhurried voice] Agora o valor, que chega com o número 0. Abra Programação e depois Valores. Pegue o bloco valor da variável e solte em cima desse 0. [confident, clear, unhurried voice] Repare que esse bloco chega com a letra x. Clique nessa letra e escolha moedas. [confident, clear, unhurried voice] Agora o lugar do placar. Clique no número do x do placar, que vem com 12, e coloque 38. Depois clique no número do y, que vem com 30, e coloque 60. Assim o placar fica ao lado do ícone da moeda. [confident, clear, unhurried voice] A cor já vem branca; deixe assim. Clique no número do tamanho, que vem com 24, e coloque 20. [engaging, energetic, conversational voice] Agora teste. Clique no jogo. O placar começa em Moedas 0. Pegue as moedas e repare que o número sobe de um em um. Volte ao lugar de uma moeda que você já pegou: o número continua igual. Depois pressione a tecla R. O placar volta para 0, e as moedas voltam para o caminho. [reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: Mostrar placar está dentro de A cada quadro do jogo, e no valor está valor da variável moedas, e não o número 0. Depois de corrigir, teste de novo. ${verificar}`,
      },
      {
        key: 'bau',
        title: 'O baú pede pelo menos 5',
        kind: 'build',
        etapa: 'bau',
        screen:
          'Retomada: levar o personagem ao baú e mostrar que nada acontece. Em Quando acontecer, montar o encontro com o baú, o Se, abrir o senão pelo segundo sinal de mais, trocar x, o sinal e o 0 da pergunta, e montar o então e o senão. Testar sem moedas, com cinco e depois da tecla R.',
        ponte:
          'Hora de ensinar o baú a decidir! Com pelo menos 5 moedas ele abre; com menos, ele avisa. Teste os dois casos, clique em Verificar projeto e depois em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora faça o baú decidir pela quantidade. Clique no jogo e leve o personagem até o baú, no gramado de baixo. Tá vendo? Não acontece nada, porque o encontro com o baú ainda não tem uma regra. Lembra da experiência? Com menos de cinco moedas o baú ficava fechado e avisava o que faltava. Com pelo menos cinco, ele abria, e com seis também. Agora a gente vai montar essa decisão no seu jogo! [confident, clear, unhurried voice] Primeiro, encontre a área Quando acontecer. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista um espaço vazio depois do encontro com as moedas, fora do fazer dele. [confident, clear, unhurried voice] Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue o bloco Quando o sprite começar a encostar no sprite e encaixe nesse espaço. [confident, clear, unhurried voice] Esse bloco chega com jogador e inimigo. Clique em jogador e escolha personagem. Depois clique em inimigo e escolha bau. [engaging, energetic, conversational voice] Quem faz uma pergunta no jogo é o bloco Se. Deixe à vista o espaço ao lado da palavra fazer, dentro do encontro com o baú. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte nesse espaço. [engaging, energetic, conversational voice] O baú tem duas respostas, por isso o Se precisa do senão. Olha aqui, na linha de baixo do bloco Se, depois do então: tem dois sinais de mais. O primeiro fica antes de senão se, e o segundo fica antes da palavra senão, no fim da linha. Clique no segundo. Não clique no primeiro. [confident, clear, unhurried voice] Repare que o Se já vem com uma pergunta: x maior que 0. Desta vez ela serve, só que com outras partes. Clique no x e escolha moedas. Depois clique no sinal de maior e escolha o sinal de maior ou igual, que tem um tracinho embaixo. Por último, clique no 0 e coloque 5. [engaging, energetic, conversational voice] Pronto: agora a pergunta é se moedas é maior ou igual a cinco. Ou seja, se o personagem tem pelo menos cinco moedas. [confident, clear, unhurried voice] Agora o então, que roda quando a resposta é sim. Deixe à vista o espaço dentro do então. Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência. Pegue o bloco Trocar imagem do sprite e encaixe ali. [confident, clear, unhurried voice] Ele chega com heroi duas vezes. Clique no primeiro heroi e escolha bau. Depois clique no segundo e escolha bau-aberto. [confident, clear, unhurried voice] Deixe à vista o espaço embaixo dele, ainda dentro do então. Abra Programação e depois Variáveis, pegue o bloco Alterar variável e encaixe ali. Clique em contador e escolha aviso. [confident, clear, unhurried voice] O valor chega com o número 1. Abra Programação e depois Valores, pegue o bloco texto e solte em cima desse 1. Repare que o texto vem com a palavra Olá. Clique em Olá, apague e escreva: O baú abriu! Você juntou moedas suficientes. [confident, clear, unhurried voice] Agora o senão, que roda quando a resposta é não. Deixe à vista o espaço dentro do senão. Pegue outro Alterar variável, de Programação e Variáveis, e encaixe ali. Clique em contador e escolha aviso. Solte um texto em cima do 1, apague Olá e escreva: O baú pede pelo menos 5 moedas. [engaging, energetic, conversational voice] Agora teste os dois casos. Clique no jogo, pressione a tecla R e vá direto ao baú, sem pegar moedas. O baú continua fechado, e o aviso diz que ele pede pelo menos cinco. Depois pegue as cinco moedas do caminho e volte ao baú. Olha só: ele abre! Pressione R mais uma vez e confira que o baú volta fechado e o placar volta para 0. [reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o encontro usa personagem e bau, a pergunta é moedas maior ou igual a 5, a troca de imagem e o aviso de sucesso estão dentro do então, e o aviso que pede moedas está dentro do senão. Depois de corrigir, teste de novo. ${verificar}`,
      },
      {
        key: 'revisao',
        title: 'Pense nas moedas',
        kind: 'quiz',
        screen:
          'Quiz com quatro perguntas: duas previsões com cena, um diagnóstico e uma escolha de teste.',
        ponte:
          'Hora de pensar nas regras das moedas! As perguntas retomam o baú, a comparação, a coleta e os testes. Em cada uma tem uma explicação, e você pode tentar de novo. Nas perguntas com cena, escolha e clique em Ver o que acontece; na outra, clique em Responder.',
        text: '',
      },
      entrega('2d'),
    ],
  },
  {
    slug: 'aula-2',
    title: 'Moedas na ilha',
    dimension: '3d',
    trechos: [
      {
        key: 'abertura',
        title: 'As moedas chegaram à ilha',
        kind: 'intro',
        screen:
          'Jogo pronto 3D. Mostrar a trilha com as moedas, o baú atrás do começo e o número no canto de cima, à esquerda. Pegar uma moeda e mostrar o número subir; não abrir o baú nem mostrar os blocos.',
        ponte:
          'Sua vez! Clique no jogo e use as setas ou W, A, S e D. Tente o baú com poucas moedas e com cinco ou mais. R começa outra partida. Depois clique em Próxima parte.',
        text: '[upbeat, welcoming voice] As moedas chegaram à Ilha do Farol, em três dimensões! A regra é a mesma do seu jogo 2D: cada moeda soma um e conta uma vez só, o número aparece na tela, e o baú, atrás do começo, só abre com pelo menos cinco. [engaging, energetic, conversational voice] Olha aqui: quando o personagem encosta numa moeda, ela some e o número sobe. E o baú tem uma animação de abrir que já vem pronta: você vai escolher quando ela toca. [upbeat, encouraging voice] Agora clique no jogo aqui na página e use as setas ou W, A, S e D. Tente o baú com poucas moedas e com cinco ou mais. A tecla R começa uma nova partida. Depois clique em Próxima parte.',
      },
      {
        key: 'coleta',
        title: 'Conte as moedas da ilha',
        kind: 'build',
        etapa: 'coleta',
        screen:
          'Projeto inicial 3D. Mostrar a trilha com as moedas e o grupo moedasDoCaminho em Ao iniciar; não montar os blocos no vídeo. Mostrar o Passo a passo do projeto, parte 3D.',
        ponte:
          'Agora monte o contador e a coleta na ilha. Se precisar, a montagem completa está no Passo a passo do projeto. Teste, clique em Verificar projeto e depois em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Na ilha, as moedas também estão num grupo: o moedasDoCaminho. Por isso a regra é a mesma do seu jogo 2D. Crie a variável moedas começando em zero, no fim de Ao iniciar. Depois, no encontro do personagem com alguma moeda do grupo, a moeda sai da cena e moedas ganha mais um. [interested, animated voice] No 3D, o encontro com o grupo fica em Jogo 3D, na gaveta Encostar. E, para a moeda sumir, você usa o bloco Remover da cena. [upbeat, encouraging voice] Agora teste. Caminhe pela trilha até o farol: as cinco moedas do caminho devem sumir uma a uma. Se precisar, o Passo a passo do projeto, que está na primeira aula, tem a montagem completa da ilha. ${verificar}`,
      },
      {
        key: 'placar',
        title: 'O número na tela da ilha',
        kind: 'build',
        etapa: 'placar',
        screen: 'Mostrar o canto de cima, à esquerda, ainda vazio. Não montar o bloco no vídeo.',
        ponte:
          'Agora mostre o número das moedas no canto de cima da tela. Teste, clique em Verificar projeto e depois em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora mostre o número das moedas na tela da ilha. No 3D, quem escreve na tela é o bloco Escrever na tela, de Jogo 3D, em Placar, vida e telas. Ele vai dentro de A cada quadro da cena, e o que ele mostra é o valor da variável moedas. O canto já vem em cima, à esquerda; deixe assim. [upbeat, encouraging voice] Teste: o número começa em 0 e sobe a cada moeda. Volte pelo caminho: o número não muda. Pressione R e confira que ele volta para 0. ${verificar}`,
      },
      {
        key: 'bau',
        title: 'O baú da ilha abre',
        kind: 'build',
        etapa: 'bau',
        screen:
          'Mostrar o baú fechado atrás do começo e o nome do clipe abrir na ajuda. Não montar o encontro nem o Se no vídeo.',
        ponte:
          'Hora do baú da ilha! Com pelo menos 5 moedas ele toca a animação abrir; com menos, ele avisa. Teste os dois casos, clique em Verificar projeto e depois em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora o baú da ilha. Monte o encontro do personagem com o baú e, dentro dele, um Se com senão. A pergunta é a mesma do 2D: se moedas é maior ou igual a cinco. No então, o baú toca a animação abrir uma vez, e o aviso conta que ele abriu. No senão, o aviso diz que o baú pede pelo menos cinco moedas. [interested, animated voice] A animação abrir já vem no modelo do baú: você só escolhe quando ela toca. [upbeat, encouraging voice] Teste os dois casos. Pressione R e vá direto ao baú, sem moedas: ele fica fechado e avisa. Depois pegue as cinco moedas da trilha e volte: ele abre. ${verificar}`,
      },
      {
        key: 'revisao',
        title: 'Pense nas moedas da ilha',
        kind: 'quiz',
        screen: 'Quiz com duas perguntas: uma previsão com cena 3D e uma sem cena.',
        ponte:
          'Hora de pensar nas moedas da ilha! As perguntas retomam o que acontece ao voltar ao lugar de uma moeda e onde fica a animação do baú. Em cada uma tem uma explicação, e você pode tentar de novo. Na pergunta com cena, clique em Ver o que acontece; na outra, clique em Responder.',
        text: '',
      },
      entrega('3d'),
    ],
  },
]

function entrega(d: MoedasDimensao): MoedasTrecho {
  const three = d === '3d'
  return {
    key: 'entrega',
    title: three ? 'Envie a sua ilha com moedas' : 'Envie o seu jogo com moedas',
    kind: 'delivery',
    etapa: 'bau',
    screen:
      'Projeto atual, objetivos, Enviar meu projeto, confirmação Enviar e Projeto enviado!. Não preencher Recado nem simular o envio.',
    ponte:
      'Confira os objetivos e clique em Enviar meu projeto. Confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.',
    text: `[pleased, lively voice] ${three ? 'Pronto, você levou a mesma regra para outro mundo: na ilha, cada moeda também conta uma vez só, o número aparece na tela e o baú decide pela quantidade.' : 'Olha só o que você programou: cada moeda soma um e conta uma vez só, o número aparece na tela e o baú decide pela quantidade! Na próxima aula, você leva essa regra para a ilha, em três dimensões.'} [confident, clear, unhurried voice] Antes de enviar, jogue uma partida inteira: pegue as moedas e abra o baú${three ? '' : ', e acenda o farol com a chave'}. Depois pressione R e confira que o número volta para 0 e o baú volta fechado. Clique em Verificar projeto e corrija o que faltar. Quando os objetivos estiverem cumpridos, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.`,
  }
}

/** A montagem completa, opcional, das duas dimensões (o Passo a passo do projeto). */
export function moedasAjuda(d: MoedasDimensao): {
  key: string
  title: string
  idea: string
  steps: string[]
  test: string
  correction: string
}[] {
  const three = d === '3d'
  return [
    {
      key: 'contador',
      title: 'Crie o contador',
      idea: 'A variável moedas guarda quantas moedas o personagem já pegou. Toda partida começa com zero.',
      steps: [
        'Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco.',
        'Abra Programação → Variáveis. Pegue Criar variável e encaixe no fim de Ao iniciar.',
        'O bloco chega com contador. Clique em contador, apague e escreva moedas. O valor já vem em 0; deixe assim.',
      ],
      test: 'O número ainda não aparece na tela. Confira se o bloco está dentro de Ao iniciar, com o nome moedas e o valor 0.',
      correction:
        'Não crie a variável dentro de A cada quadro: isso voltaria o número para zero o tempo todo. Use sempre o mesmo nome, moedas, nos outros blocos.',
    },
    {
      key: 'coleta',
      title: 'Cada moeda soma um',
      idea: 'O encontro com alguma moeda do grupo é o evento. A reação tira essa moeda do jogo e soma 1 em moedas. Como a moeda sai, ela não conta de novo.',
      steps: three
        ? [
            'Encontre a área Quando acontecer. Deixe à vista um espaço vazio depois do último evento dela, fora do fazer dos outros eventos.',
            'Abra Jogo 3D → Encostar. Pegue Quando encostar em algum do grupo, chamando de, e encaixe nesse espaço. Clique em heroi e escolha personagem. No grupo, clique em estrelas e escolha moedasDoCaminho. No último nome, clique em item e escreva moeda.',
            'Deixe à vista o espaço ao lado de fazer, dentro desse encontro. Abra Jogo 3D → Objetos → Sumir. Pegue Remover da cena e encaixe ali. Clique em objeto e escolha moeda. A cena já vem cena; deixe assim.',
            'Embaixo de Remover da cena, ainda dentro do fazer, encaixe Somar em variável, de Programação → Variáveis. Clique em contador e escolha moedas. O número já vem em 1; deixe assim.',
          ]
        : [
            'Encontre a área Quando acontecer. Deixe à vista um espaço vazio depois do último evento dela, fora do fazer dos outros eventos.',
            'Abra Jogo 2D → Colisões → Encostar e bloquear. Pegue Quando o sprite começar a encostar em algum do grupo, chamando de, e encaixe nesse espaço. Clique em jogador e escolha personagem. Clique em moedas e escolha moedasDoCaminho. O último nome já vem moeda; deixe assim.',
            'Deixe à vista o espaço ao lado de fazer, dentro desse encontro. Abra Jogo 2D → Grupos → Participação e limpeza. Pegue Tirar o sprite do grupo e encaixe ali. Clique em asteroide e escolha moeda. Clique em asteroides e escolha moedasDoCaminho.',
            'Embaixo de Tirar o sprite do grupo, ainda dentro do fazer, encaixe Somar em variável, de Programação → Variáveis. Clique em contador e escolha moedas. O número já vem em 1; deixe assim.',
          ],
      test: three
        ? 'Caminhe pela trilha até o farol. As cinco moedas do caminho devem sumir uma a uma. Volte pelo caminho: nada acontece nos lugares vazios.'
        : 'Leve o personagem pelas moedas do caminho. Cada uma deve sumir no encontro. Volte ao lugar de uma moeda que já sumiu: nada acontece.',
      correction: three
        ? 'Se a moeda não sumir, confira se o grupo é moedasDoCaminho e se Remover da cena usa moeda. Se o número contar várias vezes a mesma moeda, falta Remover da cena dentro do encontro.'
        : 'Se a moeda não sumir, confira se o grupo é moedasDoCaminho nos dois blocos e se Tirar o sprite do grupo usa moeda. Se o número contar várias vezes a mesma moeda, falta tirar a moeda do grupo.',
    },
    {
      key: 'placar',
      title: 'Mostre as moedas na tela',
      idea: 'O número fica guardado em moedas. Para vê-lo, um bloco que roda a cada quadro escreve esse valor na tela.',
      steps: three
        ? [
            'Encontre a área Enquanto estiver rodando. Dentro de A cada quadro da cena, deixe à vista o espaço depois do último bloco.',
            'Abra Jogo 3D → Placar, vida e telas → Na tela. Pegue Escrever na tela e encaixe ali. O canto já vem em cima, à esquerda; deixe assim.',
            'O texto chega com Pegue as estrelas!. Abra Programação → Valores, pegue valor da variável e solte em cima desse texto. Clique no x e escolha moedas.',
          ]
        : [
            'Encontre a área Enquanto estiver rodando. Dentro de A cada quadro do jogo, deixe à vista o fim dele, depois do último bloco, Escrever.',
            'Abra Jogo 2D → Vida e placar → Indicadores e texto na tela. Pegue Mostrar placar e encaixe no fim de A cada quadro do jogo.',
            'Clique em Pontos:, apague e escreva Moedas:.',
            'O valor chega com 0. Abra Programação → Valores, pegue valor da variável e solte em cima do 0. Clique no x e escolha moedas.',
            'No x do placar, troque 12 por 38. No y, troque 30 por 60. A cor já vem branca; deixe assim. No tamanho, troque 24 por 20.',
          ],
      test: 'O número começa em 0 e sobe de um em um a cada moeda. Volte ao lugar de uma moeda pega: o número continua igual. Pressione R: o número volta para 0 e as moedas voltam.',
      correction:
        'Se aparecer sempre 0, o valor ficou com o número 0 em vez de valor da variável moedas. Se o número não aparecer, confira se o bloco está dentro do A cada quadro.',
    },
    {
      key: 'bau',
      title: 'O baú pede pelo menos 5',
      idea: 'O encontro com o baú pergunta se moedas é maior ou igual a 5. Sim escolhe o então, que abre o baú. Não escolhe o senão, que avisa o que falta.',
      steps: [
        three
          ? 'Em Quando acontecer, deixe à vista um espaço vazio depois do encontro com as moedas, fora do fazer dele. Abra Jogo 3D → Encostar, pegue Quando encostar em e encaixe nesse espaço. O primeiro nome já vem personagem; deixe assim. Clique em chave e escolha bau.'
          : 'Em Quando acontecer, deixe à vista um espaço vazio depois do encontro com as moedas, fora do fazer dele. Abra Jogo 2D → Colisões → Encostar e bloquear, pegue Quando o sprite começar a encostar no sprite e encaixe nesse espaço. Clique em jogador e escolha personagem. Clique em inimigo e escolha bau.',
        'Dentro do fazer desse encontro, encaixe Se, de Programação → Lógica e Se. Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.',
        'O Se chega com a pergunta x > 0. Clique no x e escolha moedas. Clique no sinal > e escolha ≥, o maior ou igual. Clique no 0 e coloque 5.',
        three
          ? 'Dentro do então, encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em Andar e escolha abrir. Clique em heroi e escolha bau. No modo, escolha uma vez.'
          : 'Dentro do então, encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha bau; no segundo, escolha bau-aberto.',
        'Embaixo dele, ainda no então, encaixe Alterar variável, de Programação → Variáveis. Escolha aviso. Solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva O baú abriu! Você juntou moedas suficientes.',
        'Dentro do senão, encaixe outro Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva O baú pede pelo menos 5 moedas.',
      ],
      test: 'Pressione R e vá direto ao baú, sem moedas: ele fica fechado e o aviso pede pelo menos 5. Pegue as cinco moedas do caminho e volte: ele abre. Pressione R: o baú volta fechado e o número volta para 0.',
      correction:
        'Se o baú abrir sem moedas, confira se a abertura está dentro do então e se a pergunta é moedas ≥ 5. Se com cinco ele não abrir, confira o sinal: com > (só maior) ele pediria seis; com = ele não abriria com seis.',
    },
  ]
}
