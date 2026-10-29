/**
 * A fonte editorial do Poder "O segredo da cabana": as falas gravadas (com as marcas do
 * ElevenLabs), as notas de tela, as falas do Zappy na página e o Passo a passo completo das duas
 * dimensões. O gerador (`gerar-cabana.ts`) monta manifestos, roteiros e caderno a partir daqui.
 *
 * A aula 1 (2D) ensina o conceito novo: vídeo da bicicleta e do capacete, experiência e montagem
 * guiada completa. A aula 2 (3D) é a transferência: o vídeo lembra a regra e a ajuda completa fica
 * no Passo a passo.
 */
import type { CabanaDimensao, CabanaEtapa } from './cabana-projeto'

export type CabanaTrecho = {
  key: string
  title: string
  kind: 'intro' | 'material' | 'experience' | 'build' | 'quiz' | 'delivery'
  etapa?: CabanaEtapa
  /** Fala do Zappy na página, logo depois do vídeo (ou antes do quiz). Não é gravada. */
  ponte: string
  /** Fala gravada, com as marcas de interpretação. Vazia na seção sem vídeo. */
  text: string
  screen: string
}

const verificar =
  '[confident, clear, unhurried voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, leia a dica, corrija os blocos e clique novamente. Depois clique em Próxima parte.'

export const cabanaAulas: {
  slug: string
  title: string
  dimension: CabanaDimensao
  trechos: CabanaTrecho[]
}[] = [
  {
    slug: 'aula-1',
    title: 'Duas peças para abrir',
    dimension: '2d',
    trechos: [
      {
        key: 'abertura',
        title: 'A cabana do faroleiro',
        kind: 'intro',
        screen:
          'Jogo pronto 2D. Mostrar a chave no gramado de cima, o emblema no de baixo e a cabana no canto, com a porta fechada. Encostar na cabana sem nada e mostrar o aviso; não abrir a cabana nem mostrar os blocos.',
        ponte:
          'Sua vez! Clique no jogo e use as setas do teclado. Tente a cabana sem nada, só com uma peça e com as duas. A tecla R começa outra partida. Depois clique em Próxima parte.',
        text: '[upbeat, welcoming voice] O Farol ganhou um segredo! No canto do gramado tem a cabana do faroleiro, com a porta trancada. Para abrir, ela pede duas peças: a chave, que você já conhece, e um emblema novo, escondido do outro lado do caminho. [interested, animated voice] Olha aqui: o personagem encostou na cabana sem nada, e o aviso diz que ela pede a chave e o emblema. O farol continua como antes: com a chave, ele acende. [upbeat, encouraging voice] Agora é a sua vez de jogar. Clique no jogo aqui na página e use as setas do teclado. Tente a cabana sem nada, depois com uma peça só e depois com as duas. A tecla R começa uma nova partida. Você pode seguir mesmo sem terminar a partida: é só clicar em Próxima parte.',
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
        title: 'A porta com duas peças',
        kind: 'experience',
        screen:
          'Vídeo conceitual. Meme ilustrado por 2 a 3 segundos: o Zappy de capacete, segurando uma bicicleta. Depois mostrar a cabana fechada e as duas peças, a chave e o emblema. Não percorrer os controles da experiência.',
        ponte:
          'Hora de investigar! Observe quando a cabana abre e quando continua fechada, pegue as peças em ordens diferentes e compare o "e" com o "ou". Depois clique em Próxima parte.',
        text: '[curious] Sabe quando você vai andar de bicicleta? Você precisa da bicicleta e do capacete. Só a bicicleta não vale. Só o capacete também não. É preciso ter as duas coisas ao mesmo tempo. [engaging, energetic, conversational voice] No seu jogo vai ser igual. A cabana faz duas perguntas: o personagem tem a chave? E o personagem tem o emblema? Cada resposta fica guardada numa variável: temChave e temEmblema. E um bloco novo junta as duas perguntas numa só, com a palavra e no meio. [interested, animated voice] Com e, a resposta só é sim quando as duas são verdadeiras. [upbeat, encouraging voice] Na experiência, tente a cabana sem nada, com uma peça só e com as duas. Pegue as peças em ordens diferentes e compare com a regra ou. Depois clique em Próxima parte.',
      },
      {
        key: 'emblema',
        title: 'Guarde o emblema',
        kind: 'build',
        etapa: 'emblema',
        screen:
          'Começar pela retomada: levar o personagem até o emblema e mostrar que nada acontece. Criar temEmblema no fim de Ao iniciar, com o bloco verdadeiro trocado para falso. Em Quando acontecer, montar o encontro com o emblema, Destruir o sprite, Alterar temEmblema para verdadeiro e Alterar aviso, um bloco por vez. Testar pegando o emblema.',
        ponte:
          'Agora ensine o seu jogo a guardar o emblema: crie temEmblema começando em falso e, no encontro, faça o emblema sumir, guardar verdadeiro e mudar o aviso. Teste, clique em Verificar projeto e depois em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora faça o emblema ficar guardado. Clique no jogo e leve o personagem até o emblema, no gramado de baixo. Tá vendo? Ele passa por cima e não acontece nada, porque o encontro com o emblema ainda não tem nenhuma reação. Lembra da chave, no Farol? Ela sumia do chão e o jogo guardava em temChave que ela foi pega. O emblema vai funcionar do mesmo jeito! [engaging, energetic, conversational voice] Primeiro, a gente precisa criar a variável temEmblema. Ela nasce quando o jogo começa. Por isso, encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco. [confident, clear, unhurried voice] Abra Programação e depois Variáveis, pegue o bloco Criar variável e encaixe no fim de Ao iniciar. [engaging, energetic, conversational voice] Esse bloco chega com o nome contador. Clique em contador, apague e escreva temEmblema, tudo junto e com o E maiúsculo. Depois clique fora do campo. [engaging, energetic, conversational voice] O valor desse bloco vem com o número 0. Só que temEmblema guarda verdadeiro ou falso. Abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do 0. [confident, clear, unhurried voice] No menu desse bloco, troque verdadeiro por falso, porque o jogo começa sem o emblema. [confident, clear, unhurried voice] Agora o encontro. Encontre a área Quando acontecer e deixe à vista um espaço vazio depois do último evento dela, fora do fazer dos outros eventos. [confident, clear, unhurried voice] Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue o bloco Quando o sprite começar a encostar no sprite e encaixe nesse espaço. [confident, clear, unhurried voice] Esse bloco chega com jogador e inimigo. Clique em jogador e escolha personagem. Depois clique em inimigo e escolha emblema. [confident, clear, unhurried voice] Deixe à vista o espaço ao lado da palavra fazer, dentro desse encontro. Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência, pegue o bloco Destruir o sprite e encaixe ali. Ele chega com o nome resposta: clique em resposta e escolha emblema. [confident, clear, unhurried voice] Logo abaixo de Destruir o sprite, encaixe Alterar variável, de Programação e Variáveis. Clique em contador e escolha temEmblema. O valor vem com o número 1: abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do 1. Desta vez, deixe em verdadeiro. [confident, clear, unhurried voice] Por último, ainda dentro do fazer, encaixe outro Alterar variável e escolha aviso. Abra Programação e depois Valores, pegue o bloco texto e solte em cima do 1. Clique em Olá, apague e escreva: Você pegou o emblema! [engaging, energetic, conversational voice] Agora teste. Clique no jogo e leve o personagem até o emblema. Olha só: ele some, e o aviso conta que você pegou o emblema. A cabana ainda não abre: ela vai aprender a perguntar na próxima parte. [reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: no fim de Ao iniciar está Criar variável temEmblema com valor falso, e no encontro entre personagem e emblema estão Destruir o sprite emblema, Alterar temEmblema para verdadeiro e Alterar aviso. Depois de corrigir, teste de novo. ${verificar}`,
      },
      {
        key: 'porta',
        title: 'A cabana pede as duas',
        kind: 'build',
        etapa: 'porta',
        screen:
          'Retomada: pegar as duas peças, encostar na cabana e mostrar que nada acontece. Em Quando acontecer, montar o encontro com a cabana, o Se, levar a comparação x maior que 0 para a lixeira, encaixar o bloco e com valor da variável temChave e temEmblema, abrir o senão pelo segundo sinal de mais, e montar o então e o senão. Testar sem peças, com uma de cada vez e com as duas.',
        ponte:
          'Hora de ensinar a cabana a perguntar! Se temChave e temEmblema, ela abre; senão, ela avisa. Teste sem peças, com uma de cada vez e com as duas, clique em Verificar projeto e depois em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora faça a cabana pedir as duas peças. Clique no jogo, pegue a chave e o emblema e encoste na cabana. Tá vendo? Não acontece nada, porque o encontro com a cabana ainda não tem uma regra. Lembra da experiência? Sem peça e com uma só, a cabana ficava fechada. Com as duas, ela abria, em qualquer ordem. Agora a gente vai montar essa pergunta no seu jogo! [confident, clear, unhurried voice] Primeiro, encontre a área Quando acontecer e deixe à vista um espaço vazio depois do encontro com o emblema, fora do fazer dele. [confident, clear, unhurried voice] Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue o bloco Quando o sprite começar a encostar no sprite e encaixe nesse espaço. Clique em jogador e escolha personagem. Depois clique em inimigo e escolha cabana. [engaging, energetic, conversational voice] Quem faz uma pergunta no jogo é o bloco Se. Deixe à vista o espaço ao lado da palavra fazer, dentro do encontro com a cabana. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte nesse espaço. [confident, clear, unhurried voice] Repare que o Se já vem com uma condição pronta: x maior que 0. Não é isso que a cabana precisa perguntar, por isso segure essa pergunta pelo sinal de maior e arraste até a lixeira, no canto de baixo, à direita, do espaço dos blocos. O lugar ao lado de Se fica vazio. Deixe esse lugar à vista. [engaging, energetic, conversational voice] Agora vem o bloco novo, o que junta duas perguntas numa só. Abra Programação e depois Lógica e Se, e pegue o bloco que tem a palavra e no meio. Ele chega assim: 0, e, 0. Solte no lugar vazio ao lado de Se. [confident, clear, unhurried voice] Agora as duas perguntas. Abra Programação e depois Valores, pegue o bloco valor da variável e solte em cima do primeiro 0. Clique no x e escolha temChave. [confident, clear, unhurried voice] Pegue outro valor da variável e solte em cima do segundo 0. Clique no x e escolha temEmblema. [engaging, energetic, conversational voice] Pronto: agora a pergunta é temChave e temEmblema. Ela só dá sim quando as duas são verdadeiras. [engaging, energetic, conversational voice] A cabana tem duas respostas, por isso o Se precisa do senão. Olha aqui, na linha de baixo do bloco Se, depois do então: tem dois sinais de mais. Clique no segundo, antes da palavra senão. Não clique no primeiro. [confident, clear, unhurried voice] Agora o então, que roda quando a resposta é sim. Deixe à vista o espaço dentro do então. Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência. Pegue o bloco Trocar imagem do sprite e encaixe ali. Ele chega com heroi duas vezes: clique no primeiro e escolha cabana; clique no segundo e escolha cabana-aberta. [confident, clear, unhurried voice] Logo abaixo, ainda dentro do então, encaixe Alterar variável, de Programação e Variáveis, e escolha aviso. Solte um texto, de Programação e Valores, em cima do 1, apague Olá e escreva: A cabana abriu! Você tinha as duas peças. [confident, clear, unhurried voice] Agora o senão, que roda quando a resposta é não. Dentro do senão, encaixe outro Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva: A cabana pede a chave e o emblema. [engaging, energetic, conversational voice] Agora teste todos os casos. Pressione R e vá direto à cabana: ela continua fechada e avisa. Pegue só a chave e encoste: continua fechada. Pressione R, pegue só o emblema e encoste: continua fechada. Agora pegue as duas peças e encoste. Olha só: a cabana abre! Pressione R mais uma vez, pegue primeiro o emblema e depois a chave: a cabana abre do mesmo jeito. [reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o encontro usa personagem e cabana, a pergunta é temChave e temEmblema, com a palavra e no meio, a troca de imagem e o aviso de sucesso estão dentro do então, e o aviso que pede as duas peças está dentro do senão. Depois de corrigir, teste de novo. ${verificar}`,
      },
      {
        key: 'revisao',
        title: 'Pense na cabana',
        kind: 'quiz',
        screen:
          'Quiz com quatro perguntas: duas previsões com cena, um diagnóstico e uma escolha de teste.',
        ponte:
          'Hora de pensar na cabana! As perguntas retomam uma peça só, o "ou", o que pode estar errado e os testes. Em cada uma tem uma explicação, e você pode tentar de novo. Nas perguntas com cena, escolha e clique em Ver o que acontece; nas outras, clique em Responder.',
        text: '',
      },
      entrega('2d'),
    ],
  },
  {
    slug: 'aula-2',
    title: 'Duas peças na ilha',
    dimension: '3d',
    trechos: [
      {
        key: 'abertura',
        title: 'A cabana chegou à ilha',
        kind: 'intro',
        screen:
          'Jogo pronto 3D. Mostrar a cabana no começo da trilha, o emblema no gramado da frente e a chave atrás das pedras. Encostar na cabana sem nada e mostrar o aviso; não abrir a cabana nem mostrar os blocos.',
        ponte:
          'Sua vez! Clique no jogo e use as setas ou W, A, S e D. Tente a cabana sem nada, com uma peça e com as duas. R começa outra partida. Depois clique em Próxima parte.',
        text: '[upbeat, welcoming voice] A cabana do faroleiro chegou à Ilha do Farol, em três dimensões! A regra é a mesma do seu jogo 2D: a cabana só abre com a chave e o emblema, em qualquer ordem. [engaging, energetic, conversational voice] Olha aqui: o emblema fica no gramado da frente, e a chave, atrás das pedras. E a cabana tem uma animação de abrir que já vem pronta: a porta gira e as janelas acendem. Você vai escolher quando ela toca. [upbeat, encouraging voice] Agora clique no jogo aqui na página e use as setas ou W, A, S e D. Tente a cabana sem nada, com uma peça e com as duas. A tecla R começa uma nova partida. Depois clique em Próxima parte.',
      },
      {
        key: 'emblema',
        title: 'Guarde o emblema da ilha',
        kind: 'build',
        etapa: 'emblema',
        screen:
          'Projeto inicial 3D. Mostrar o emblema no gramado da frente e o fim de Ao iniciar; não montar os blocos no vídeo. Mostrar o Passo a passo do projeto, parte 3D.',
        ponte:
          'Agora guarde o emblema na ilha: crie temEmblema começando em falso e, no encontro, esconda o emblema, guarde verdadeiro e mude o aviso. Se precisar, a montagem completa está no Passo a passo do projeto. Teste, clique em Verificar projeto e depois em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Na ilha, o emblema também precisa ficar guardado. Por isso a regra é a mesma do seu jogo 2D. Crie a variável temEmblema começando em falso, no fim de Ao iniciar. Depois, no encontro do personagem com o emblema, o emblema some, temEmblema vira verdadeiro e o aviso conta que você pegou. [interested, animated voice] No 3D, o encontro fica em Jogo 3D, na gaveta Encostar. E, para o emblema sumir, você usa o bloco Esconder o objeto, como fez com a chave da ilha. [upbeat, encouraging voice] Agora teste. Leve o personagem até o emblema: ele deve sumir e o aviso deve mudar. Se precisar, o Passo a passo do projeto, que está na primeira aula, tem a montagem completa da ilha. ${verificar}`,
      },
      {
        key: 'porta',
        title: 'A cabana da ilha abre',
        kind: 'build',
        etapa: 'porta',
        screen:
          'Mostrar a cabana fechada no começo da trilha e o nome do clipe abrir na ajuda. Não montar o encontro nem o Se no vídeo.',
        ponte:
          'Hora da cabana da ilha! Se temChave e temEmblema, ela toca a animação abrir; senão, ela avisa. Teste sem peças, com uma de cada vez e com as duas, clique em Verificar projeto e depois em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora a cabana da ilha. Monte o encontro do personagem com a cabana e, dentro dele, um Se com senão. A pergunta é a mesma do 2D: temChave e temEmblema, com o bloco que tem a palavra e no meio. No então, a cabana toca a animação abrir uma vez, e o aviso conta que ela abriu. No senão, o aviso diz que a cabana pede a chave e o emblema. [interested, animated voice] A animação abrir já vem no modelo da cabana: a porta gira e as janelas acendem. Você só escolhe quando ela toca. [upbeat, encouraging voice] Teste todos os casos. Pressione R e vá direto à cabana: ela fica fechada e avisa. Tente só com a chave e só com o emblema. Depois pegue as duas e volte: ela abre. ${verificar}`,
      },
      {
        key: 'revisao',
        title: 'Pense na cabana da ilha',
        kind: 'quiz',
        screen: 'Quiz com duas perguntas: uma previsão com cena 3D e uma sem cena.',
        ponte:
          'Hora de pensar na cabana da ilha! As perguntas retomam a ordem das peças e onde fica a animação da cabana. Em cada uma tem uma explicação, e você pode tentar de novo. Na pergunta com cena, clique em Ver o que acontece; na outra, clique em Responder.',
        text: '',
      },
      entrega('3d'),
    ],
  },
]

function entrega(d: CabanaDimensao): CabanaTrecho {
  const three = d === '3d'
  return {
    key: 'entrega',
    title: three ? 'Envie a sua ilha com a cabana' : 'Envie o seu jogo com a cabana',
    kind: 'delivery',
    etapa: 'porta',
    screen:
      'Projeto atual, objetivos, Enviar meu projeto, confirmação Enviar e Projeto enviado!. Não preencher Recado nem simular o envio.',
    ponte:
      'Confira os objetivos e clique em Enviar meu projeto. Confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.',
    text: `[pleased, lively voice] ${three ? 'Pronto, você levou a mesma pergunta para outro mundo: na ilha, a cabana também só abre com a chave e o emblema.' : 'Olha só o que você programou: o jogo guarda as duas peças, e a cabana só abre quando as duas respostas são verdadeiras! Na próxima aula, você leva essa pergunta para a ilha, em três dimensões.'} [confident, clear, unhurried voice] Antes de enviar, jogue uma partida inteira: tente a cabana com uma peça só e depois com as duas${three ? '' : ', e acenda o farol com a chave'}. Depois pressione R e confira que as peças voltam e a cabana volta fechada. Clique em Verificar projeto e corrija o que faltar. Quando os objetivos estiverem cumpridos, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.`,
  }
}

/** A montagem completa, opcional, das duas dimensões (o Passo a passo do projeto). */
export function cabanaAjuda(d: CabanaDimensao): {
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
      key: 'emblema',
      title: 'Guarde o emblema',
      idea: 'A variável temEmblema guarda se o personagem já pegou o emblema. Toda partida começa com falso; o encontro com o emblema faz ele sumir e muda para verdadeiro, como a chave.',
      steps: [
        'Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco.',
        'Abra Programação → Variáveis. Pegue Criar variável e encaixe no fim de Ao iniciar. Clique em contador, apague e escreva temEmblema.',
        'O valor chega com 0. Abra Programação → Lógica e Se, pegue verdadeiro e solte em cima do 0. No menu, escolha falso.',
        three
          ? 'Em Quando acontecer, deixe à vista um espaço vazio depois do último evento, fora do fazer dos outros. Abra Jogo 3D → Encostar → Encostar e pegue Quando personagem encostar em. O primeiro nome já vem personagem; deixe assim. No segundo, escolha emblema.'
          : 'Em Quando acontecer, deixe à vista um espaço vazio depois do último evento, fora do fazer dos outros. Abra Jogo 2D → Colisões → Encostar e bloquear e pegue Quando o sprite começar a encostar no sprite. Clique em jogador e escolha personagem; clique em inimigo e escolha emblema.',
        three
          ? 'Dentro do fazer, encaixe Esconder o objeto, de Jogo 3D → Objetos → Aparência, e escolha emblema.'
          : 'Dentro do fazer, encaixe Destruir o sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique em resposta e escolha emblema.',
        'Logo abaixo, encaixe Alterar variável, de Programação → Variáveis. Escolha temEmblema e solte verdadeiro, de Programação → Lógica e Se, em cima do 1. Deixe em verdadeiro.',
        'Ainda no fazer, encaixe outro Alterar variável e escolha aviso. Solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva Você pegou o emblema!',
      ],
      test: 'Leve o personagem até o emblema. Ele some só no encontro, e o aviso conta que você pegou o emblema. Pressione R: o emblema volta.',
      correction:
        'Se o emblema não sumir, confira se o encontro usa personagem e emblema. Não crie temEmblema dentro do encontro: ela nasce em Ao iniciar, com falso, e o encontro só muda para verdadeiro.',
    },
    {
      key: 'porta',
      title: 'A cabana pede as duas',
      idea: 'O encontro com a cabana pergunta temChave e temEmblema. O bloco e só responde sim quando as duas são verdadeiras: sim escolhe o então, que abre a cabana; não escolhe o senão, que avisa.',
      steps: [
        three
          ? 'Em Quando acontecer, deixe à vista um espaço vazio depois do encontro com o emblema, fora do fazer dele. Abra Jogo 3D → Encostar → Encostar, pegue Quando personagem encostar em e encaixe ali. O primeiro nome já vem personagem; no segundo, escolha cabana.'
          : 'Em Quando acontecer, deixe à vista um espaço vazio depois do encontro com o emblema, fora do fazer dele. Abra Jogo 2D → Colisões → Encostar e bloquear, pegue Quando o sprite começar a encostar no sprite e encaixe ali. Clique em jogador e escolha personagem; clique em inimigo e escolha cabana.',
        'Dentro do fazer, encaixe Se, de Programação → Lógica e Se. Segure a pergunta x > 0 pelo sinal de maior e arraste até a lixeira.',
        'Abra Programação → Lógica e Se e pegue o bloco que tem a palavra e no meio (ele chega como 0 e 0). Solte no lugar vazio ao lado de Se.',
        'Abra Programação → Valores e solte valor da variável em cima do primeiro 0; escolha temChave. Solte outro valor da variável em cima do segundo 0; escolha temEmblema.',
        'Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.',
        three
          ? 'Dentro do então, encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em Andar e escolha abrir. Clique em heroi e escolha cabana. No modo, escolha uma vez.'
          : 'Dentro do então, encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha cabana; no segundo, escolha cabana-aberta.',
        'Embaixo dele, ainda no então, encaixe Alterar variável, de Programação → Variáveis. Escolha aviso. Solte um texto, de Programação → Valores, em cima do 1 e escreva A cabana abriu! Você tinha as duas peças.',
        'Dentro do senão, encaixe outro Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva A cabana pede a chave e o emblema.',
      ],
      test: 'Pressione R e vá direto à cabana: ela fica fechada e avisa. Tente só com a chave e, depois de R, só com o emblema: continua fechada. Pegue as duas, em qualquer ordem, e encoste: ela abre. Pressione R: a cabana volta fechada e as peças voltam.',
      correction:
        'Se a cabana abrir com uma peça só, a pergunta usa ou no lugar de e, ou falta uma das variáveis. Se ela não abrir com as duas, confira se temEmblema muda para verdadeiro no encontro com o emblema e se a abertura está dentro do então.',
    },
  ]
}
