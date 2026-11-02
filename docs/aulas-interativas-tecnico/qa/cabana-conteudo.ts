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

/**
 * O que a experiência investiga (Faísca, 02/11/2026), no formato da Ponte: a lista de descobertas
 * da tela, o recado, o Passo a passo e o caderno dizem o que comparar, sem contar o resultado.
 * ⚠️ `goals` tem a mesma ordem e o mesmo texto de `CABANA_DESCOBERTAS` (member-shell,
 * `scene-poder-cabana.tsx`).
 */
export const cabanaExperiencia = {
  title: 'A experiência: a porta com duas peças',
  idea: 'O jogo guarda em temChave e em temEmblema se o personagem já pegou cada peça, e a cabana faz uma pergunta quando ele encosta nela. Na experiência, você descobre quando a cabana abre e quando continua fechada.',
  goals: [
    'Encoste na cabana sem nenhuma peça e observe.',
    'Encoste na cabana com uma peça só e observe.',
    'Encoste na cabana com as duas peças e observe.',
    'Compare começando pela chave e começando pelo emblema.',
    'Faça a cabana pedir uma das peças e teste com uma peça só.',
  ],
  observe:
    'Você escolhe a ordem dos testes e pode repetir quantas vezes quiser. Antes e depois de cada teste, observe temChave, temEmblema, a porta e o aviso. O Zappy sugere o que observar.',
}

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
        text: '[upbeat, welcoming voice] O Farol ganhou um segredo! No canto do gramado tem a cabana do faroleiro, com a porta trancada. Para abrir, ela pede duas peças: a chave, que você já conhece, e um emblema novo, escondido do outro lado do caminho. [interested, animated voice] Olha aqui: o personagem encostou na cabana sem nada, e o aviso diz que ela pede a chave e o emblema. O farol continua como antes: com a chave, ele acende. [upbeat, encouraging voice] Agora é a sua vez de jogar. Clique no jogo aqui na página e use as setas do teclado. Tente a cabana sem nada, depois com uma peça só e depois com as duas. [reassuring, encouraging voice] A tecla R começa uma nova partida. Você pode seguir mesmo sem terminar a partida: é só clicar em Próxima parte.',
      },
      {
        key: 'material',
        title: 'O seu Passo a passo do projeto',
        kind: 'material',
        screen:
          'Abrir o Passo a passo do projeto no bloco Consulte. Mostrar a parte da experiência, a parte 2D e a parte 3D, os títulos das montagens e o botão Baixar. Não inventar anexo antes do PDF produzido.',
        ponte:
          'Este é o seu Passo a passo do projeto, com o que investigar na experiência e cada montagem. Se quiser, leia aqui mesmo ou clique em Baixar para guardar. Depois clique em Próxima parte.',
        text: '[engaging, energetic, conversational voice] Olha aqui: este é o seu Passo a passo do projeto! Ele tem o que investigar na experiência e cada montagem das duas aulas, com o caminho na paleta, o nome do bloco, onde encaixar e como testar. [engaging, energetic, conversational voice] Tem uma parte para o jogo 2D e outra para a ilha em 3D, que você vai fazer na próxima aula. [reassuring, encouraging voice] Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o material e consultar onde quiser. Depois clique em Próxima parte.',
      },
      {
        key: 'experiencia',
        title: 'A porta com duas peças',
        kind: 'experience',
        screen:
          'Vídeo conceitual. Meme ilustrado por 2 a 3 segundos: o Zappy de capacete, segurando uma bicicleta. Depois mostrar a experiência parada: a cabana fechada, as duas peças no chão, temChave e temEmblema em falso e a pergunta da cabana com as duas respostas ainda em "?". No "Olha aqui", apontar os botões das peças, Encostar na cabana, temChave e temEmblema, a pergunta e os dois botões do pedido [apontar botões das peças; apontar Encostar na cabana; apontar as variáveis; apontar a pergunta; apontar o pedido]. Não encostar na cabana: o que ela faz em cada caso, e se a ordem das peças importa, é a descoberta da criança. Não falar de blocos, regra, Se, então, senão nem dos blocos e e ou: eles ficam para a montagem (decisão de 02/11/2026).',
        ponte:
          'Sua vez! Investigue quando a cabana abre e quando continua fechada: sem nenhuma peça, com uma, com as duas e em ordens diferentes. Depois compare com a cabana que pede uma das peças. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.',
        text: '[curious] Sabe quando você vai andar de bicicleta? Para sair, você pega duas coisas: a bicicleta e o capacete. [engaging, energetic, conversational voice] No seu jogo, a cabana do faroleiro também pede duas coisas: a chave e o emblema. [engaging, energetic, conversational voice] Para saber o que o personagem já pegou, o jogo guarda duas informações em duas variáveis: temChave e temEmblema. Cada uma vale verdadeiro ou falso. [interested, animated voice] Quando o personagem encosta na cabana, ela faz uma pergunta. Uma pergunta que ajuda o jogo a decidir se chama condição. [curious] E a cabana do seu jogo? O que ela faz quando o personagem chega sem nenhuma peça? A ordem em que ele pega as peças importa? E se ela pedisse só uma das peças? O que você acha? Isso você vai testar na experiência. [interested, animated voice] Olha aqui: nesta atividade, estes botões pegam a chave e o emblema, e este leva o personagem até a cabana. Aqui ficam temChave e temEmblema, e embaixo do jogo fica a pergunta da cabana, com uma resposta para o sim e outra para o não. [interested, animated voice] E aqui você escolhe o que a cabana pede: as duas peças ou uma das peças. [upbeat, encouraging voice] Agora é a sua vez de investigar: tente a cabana sem nenhuma peça, com uma e com as duas. Observe temChave, temEmblema e a porta. [upbeat, encouraging voice] Depois pegue as peças em ordens diferentes. E compare com uma cabana que pede só uma das peças. [reassuring, encouraging voice] Você escolhe por onde começar, e o Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.',
      },
      {
        key: 'emblema',
        title: 'Guarde o emblema',
        kind: 'build',
        etapa: 'emblema',
        screen:
          'Começar pela retomada: levar o personagem até o emblema e, no "Tá vendo?", mostrar que nada acontece. Lembrar a experiência e a chave do Farol. Criar temEmblema no fim de Ao iniciar, com o bloco verdadeiro trocado para falso. Em Quando acontecer, montar o encontro com o emblema, Destruir o sprite, Alterar temEmblema para verdadeiro e Alterar aviso, um bloco por fala, com o destino à vista antes de cada peça. Testar pegando o emblema.',
        ponte:
          'Agora ensine o seu jogo a guardar o emblema: crie temEmblema começando em falso e, no encontro, faça o emblema sumir, guardar verdadeiro e mudar o aviso. Teste no jogo. Depois clique em Verificar projeto e em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora faça o emblema ficar guardado. Clique no jogo e leve o personagem até o emblema, no gramado de baixo. [engaging, energetic, conversational voice] Tá vendo? Ele passa por cima e não acontece nada, porque o encontro com o emblema ainda não tem nenhuma reação. [engaging, energetic, conversational voice] Lembra da experiência? A cabana conferia temChave e temEmblema. Só que o seu jogo ainda não guarda o emblema. [engaging, energetic, conversational voice] Lembra da chave, no Farol? Ela sumia do chão, e o jogo guardava em temChave que ela foi pega. O emblema vai funcionar do mesmo jeito! [engaging, energetic, conversational voice] Primeiro, a variável temEmblema. Ela precisa existir desde o começo da partida, por isso nasce na área Ao iniciar, que roda quando o jogo começa. [confident, clear, unhurried voice] Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco. [confident, clear, unhurried voice] Abra Programação e depois Variáveis, pegue o bloco Criar variável e encaixe no fim de Ao iniciar. É este bloco que cria a variável temEmblema. [engaging, energetic, conversational voice] Esse bloco chega com o nome contador. Clique em contador, apague e escreva temEmblema, tudo junto e com o E maiúsculo. Depois clique fora do campo. [engaging, energetic, conversational voice] O valor desse bloco vem com o número 0. Só que temEmblema guarda verdadeiro ou falso. Abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do 0. [confident, clear, unhurried voice] No menu desse bloco, troque verdadeiro por falso, porque o jogo começa sem o emblema. [confident, clear, unhurried voice] Agora o encontro. Encontre a área Quando acontecer e deixe à vista um espaço vazio depois do último evento dela, fora do fazer dos outros eventos. [confident, clear, unhurried voice] Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue o bloco Quando o sprite começar a encostar no sprite e encaixe nesse espaço. É este bloco que percebe quando o personagem encosta no emblema. [confident, clear, unhurried voice] Esse bloco chega com jogador e inimigo. Clique em jogador e escolha personagem. Depois clique em inimigo e escolha emblema. [confident, clear, unhurried voice] Deixe à vista o espaço ao lado da palavra fazer, dentro desse encontro. Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência, pegue o bloco Destruir o sprite e encaixe ali. É este bloco que tira o emblema do chão. [confident, clear, unhurried voice] Ele chega com o nome resposta: clique em resposta e escolha emblema. [confident, clear, unhurried voice] Logo abaixo de Destruir o sprite, encaixe Alterar variável, de Programação e Variáveis. Clique em contador e escolha temEmblema. É este bloco que guarda que o emblema foi pego. [confident, clear, unhurried voice] O valor vem com o número 1. Abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do 1. Desta vez, deixe em verdadeiro. [confident, clear, unhurried voice] Por último, ainda dentro do fazer, encaixe outro Alterar variável e escolha aviso. [confident, clear, unhurried voice] Abra Programação e depois Valores, pegue o bloco texto e solte em cima do 1. Clique em Olá, apague e escreva: Você pegou o emblema! [engaging, energetic, conversational voice] Agora teste. Clique no jogo e leve o personagem até o emblema. Olha só: ele some, e o aviso conta que você pegou o emblema. A cabana ainda não abre: ela vai aprender a perguntar na próxima parte. [reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: no fim de Ao iniciar está Criar variável temEmblema com valor falso, e no encontro entre personagem e emblema estão Destruir o sprite emblema, Alterar temEmblema para verdadeiro e Alterar aviso. Depois de corrigir, teste de novo. ${verificar}`,
      },
      {
        key: 'porta',
        title: 'A cabana pede as duas',
        kind: 'build',
        etapa: 'porta',
        screen:
          'Retomada: pegar as duas peças, encostar na cabana e, no "Tá vendo?", mostrar que nada acontece. Lembrar a experiência. Em Quando acontecer, montar o encontro com a cabana, o Se, levar a condição x maior que 0 para a lixeira, encaixar o bloco e com valor da variável temChave e temEmblema, abrir o senão pelo segundo sinal de mais, e montar o então e o senão, um bloco por fala. Testar sem peças, com uma de cada vez e com as duas.',
        ponte:
          'Hora de ensinar a cabana a perguntar! Se temChave e temEmblema, ela abre; senão, ela avisa. Teste sem peças, com uma de cada vez e com as duas. Depois clique em Verificar projeto e em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora faça a cabana pedir as duas peças. Clique no jogo, pegue a chave e o emblema e encoste na cabana. [engaging, energetic, conversational voice] Tá vendo? Não acontece nada, porque o encontro com a cabana ainda não faz nenhuma pergunta. [engaging, energetic, conversational voice] Lembra da experiência? Quando a cabana pedia as duas peças, sem nenhuma e com uma só ela ficava fechada e avisava. [engaging, energetic, conversational voice] Com as duas, ela abria, em qualquer ordem. Agora a gente vai montar essa pergunta no seu jogo! [confident, clear, unhurried voice] Primeiro, encontre a área Quando acontecer e deixe à vista um espaço vazio depois do encontro com o emblema, fora do fazer dele. [confident, clear, unhurried voice] Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue o bloco Quando o sprite começar a encostar no sprite e encaixe nesse espaço. É este bloco que percebe quando o personagem encosta na cabana. [confident, clear, unhurried voice] Clique em jogador e escolha personagem. Depois clique em inimigo e escolha cabana. [engaging, energetic, conversational voice] Quem faz uma pergunta no jogo é o bloco Se. Deixe à vista o espaço ao lado da palavra fazer, dentro do encontro com a cabana. [confident, clear, unhurried voice] Abra Programação e depois Lógica e Se, pegue o bloco Se e solte nesse espaço. É este bloco que faz a pergunta da cabana. [engaging, energetic, conversational voice] Repare que o Se já vem com uma condição pronta: x maior que 0. Condição é a pergunta que o Se faz, e a resposta dela é sim ou não. [confident, clear, unhurried voice] Não é isso que a cabana precisa perguntar. Por isso, segure essa pergunta pelo sinal de maior e arraste até a lixeira, no canto de baixo, à direita, do espaço dos blocos. [confident, clear, unhurried voice] O lugar ao lado de Se fica vazio. Deixe esse lugar à vista. [engaging, energetic, conversational voice] Agora vem o bloco novo, o que junta duas perguntas numa só. Abra Programação e depois Lógica e Se, e pegue o bloco que tem a palavra e no meio. Ele chega assim: 0, e, 0. Solte no lugar vazio ao lado de Se. [engaging, energetic, conversational voice] É este bloco que faz a cabana pedir as duas peças, como na experiência. Com a palavra e, a resposta só é sim quando as duas perguntas dão sim. A cabana que pedia uma das peças era a palavra ou. [confident, clear, unhurried voice] Agora as duas perguntas. Abra Programação e depois Valores, pegue o bloco valor da variável e solte em cima do primeiro 0. Clique no x e escolha temChave. [confident, clear, unhurried voice] Pegue outro valor da variável e solte em cima do segundo 0. Clique no x e escolha temEmblema. [engaging, energetic, conversational voice] Pronto: agora a pergunta é temChave e temEmblema. [engaging, energetic, conversational voice] A cabana tem duas respostas, uma para o sim e outra para o não. Por isso o Se precisa do senão, o espaço da resposta não. [confident, clear, unhurried voice] Olha aqui, na linha de baixo do bloco Se, depois do então: tem dois sinais de mais. Clique no segundo, antes da palavra senão. Não clique no primeiro. [engaging, energetic, conversational voice] Agora o então, que roda quando a resposta é sim. É este espaço que guarda a resposta sim da experiência: abrir a cabana. Deixe à vista o espaço dentro do então. [confident, clear, unhurried voice] Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência. Pegue o bloco Trocar imagem do sprite e encaixe ali. [confident, clear, unhurried voice] Ele chega com heroi duas vezes: clique no primeiro e escolha cabana; clique no segundo e escolha cabana-aberta. [confident, clear, unhurried voice] Logo abaixo, ainda dentro do então, encaixe Alterar variável, de Programação e Variáveis, e escolha aviso. [confident, clear, unhurried voice] Solte um texto, de Programação e Valores, em cima do 1, apague Olá e escreva: A cabana abriu! Você tinha as duas peças. [engaging, energetic, conversational voice] Agora o senão, que roda quando a resposta é não. É este espaço que guarda a resposta não da experiência: avisar o que a cabana pede. [confident, clear, unhurried voice] Dentro do senão, encaixe outro Alterar variável e escolha aviso. Solte um texto em cima do 1 e escreva: A cabana pede a chave e o emblema. [engaging, energetic, conversational voice] Agora teste todos os casos. Clique no jogo, toque na tecla R e vá direto à cabana: ela continua fechada e avisa. [engaging, energetic, conversational voice] Pegue só a chave e encoste: continua fechada. Toque na tecla R de novo, pegue só o emblema e encoste: continua fechada. [engaging, energetic, conversational voice] Agora pegue as duas peças e encoste. Olha só: a cabana abre! Toque na tecla R mais uma vez, pegue primeiro o emblema e depois a chave: a cabana abre do mesmo jeito. [reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o encontro usa personagem e cabana, a pergunta é temChave e temEmblema, com a palavra e no meio, a troca de imagem e o aviso de sucesso estão dentro do então, e o aviso que pede as duas peças está dentro do senão. Depois de corrigir, teste de novo. ${verificar}`,
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
        text: '[upbeat, welcoming voice] A cabana do faroleiro chegou à Ilha do Farol, em três dimensões! Ela funciona como no seu jogo 2D: pede a chave e o emblema. [engaging, energetic, conversational voice] Olha aqui: o emblema fica no gramado da frente, e a chave, atrás das pedras. E a cabana tem uma animação de abrir que já vem pronta: a porta gira e as janelas acendem. Você vai escolher quando ela toca. [upbeat, encouraging voice] Agora clique no jogo aqui na página e use as setas ou W, A, S e D. Tente a cabana sem nada, com uma peça e com as duas. [reassuring, encouraging voice] A tecla R começa uma nova partida. Depois clique em Próxima parte.',
      },
      {
        key: 'emblema',
        title: 'Guarde o emblema da ilha',
        kind: 'build',
        etapa: 'emblema',
        screen:
          'Projeto inicial 3D. Mostrar o emblema no gramado da frente e o fim de Ao iniciar; não montar os blocos no vídeo. Mostrar o Passo a passo do projeto, parte 3D.',
        ponte:
          'Agora guarde o emblema na ilha: crie temEmblema começando em falso e, no encontro, esconda o emblema, guarde verdadeiro e mude o aviso. A montagem completa está no Passo a passo do projeto. Teste no jogo. Depois clique em Verificar projeto e em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Na ilha, o emblema também precisa ficar guardado, como no seu jogo 2D. [engaging, energetic, conversational voice] Lembra? temEmblema nasce em falso, no fim de Ao iniciar. No encontro com o emblema, ele some, temEmblema vira verdadeiro e o aviso conta que você pegou. [interested, animated voice] O que muda no 3D é onde ficam alguns blocos. O encontro fica em Jogo 3D, na gaveta Encostar. [interested, animated voice] E, para o emblema sumir, você usa o bloco Esconder o objeto, como fez com a chave da ilha. É este bloco que tira o emblema do chão. [reassuring, encouraging voice] A montagem completa, bloco por bloco, está no Passo a passo do projeto, que fica na primeira aula. [upbeat, encouraging voice] Agora teste. Leve o personagem até o emblema: ele deve sumir e o aviso deve mudar. ${verificar}`,
      },
      {
        key: 'porta',
        title: 'A cabana da ilha abre',
        kind: 'build',
        etapa: 'porta',
        screen:
          'Mostrar a cabana fechada no começo da trilha e o nome do clipe abrir na ajuda. Não montar o encontro nem o Se no vídeo.',
        ponte:
          'Hora da cabana da ilha! Se temChave e temEmblema, ela toca a animação abrir; senão, ela avisa. Teste sem peças, com uma de cada vez e com as duas. Depois clique em Verificar projeto e em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora a cabana da ilha. Ela faz a mesma pergunta do 2D: temChave e temEmblema, com o bloco que tem a palavra e no meio. [interested, animated voice] Com o sim, a cabana toca a animação abrir uma vez, e o aviso conta que ela abriu. Com o não, o aviso diz que a cabana pede a chave e o emblema. [engaging, energetic, conversational voice] Os blocos você já conhece: o encontro com a cabana fica em Jogo 3D, na gaveta Encostar, e a animação abrir toca com Tocar a animação, em Objetos, na Animação do modelo. [interested, animated voice] A animação abrir já vem no modelo da cabana: a porta gira e as janelas acendem. Você só escolhe quando ela toca. [reassuring, encouraging voice] A montagem completa está no Passo a passo do projeto. [upbeat, encouraging voice] Teste todos os casos. Toque na tecla R e vá direto à cabana: ela fica fechada e avisa. [upbeat, encouraging voice] Tente só com a chave e só com o emblema. Depois pegue as duas e volte: ela abre. ${verificar}`,
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
    text: `[pleased, lively voice] ${three ? 'Pronto, você levou a mesma pergunta para outro mundo: na ilha, a cabana também só abre com a chave e o emblema.' : 'Olha só o que você programou: o jogo guarda as duas peças, e a cabana só abre quando as duas respostas são verdadeiras! Na próxima aula, você leva essa pergunta para a ilha, em três dimensões.'} [confident, clear, unhurried voice] Antes de enviar, jogue uma partida inteira: tente a cabana com uma peça só e depois com as duas${three ? '' : ', e acenda o farol com a chave'}. Depois toque na tecla R e confira que as peças voltam e a cabana volta fechada. [confident, clear, unhurried voice] Agora clique em Verificar projeto e corrija o que faltar. [confident, clear, unhurried voice] Quando os objetivos estiverem cumpridos, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.`,
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
      test: 'Leve o personagem até o emblema. Ele some só no encontro, e o aviso conta que você pegou o emblema. Toque na tecla R: o emblema volta.',
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
      test: 'Toque na tecla R e vá direto à cabana: ela fica fechada e avisa. Tente só com a chave e, numa partida nova, só com o emblema: continua fechada. Pegue as duas, em qualquer ordem, e encoste: ela abre. Toque na tecla R de novo: a cabana volta fechada e as peças voltam.',
      correction:
        'Se a cabana abrir com uma peça só, a pergunta usa ou no lugar de e, ou falta uma das variáveis. Se ela não abrir com as duas, confira se temEmblema muda para verdadeiro no encontro com o emblema e se a abertura está dentro do então.',
    },
  ]
}
