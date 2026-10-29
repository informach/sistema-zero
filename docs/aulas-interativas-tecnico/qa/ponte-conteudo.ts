/**
 * A fonte editorial do Poder "A ponte apressada": as falas gravadas (com as marcas do ElevenLabs),
 * as notas de tela, as falas do Zappy na página e o Passo a passo completo das duas dimensões. O
 * gerador (`gerar-ponte.ts`) monta manifestos, roteiros e caderno a partir daqui.
 *
 * A aula 1 (2D) ensina o conceito novo: vídeo do botão do semáforo, experiência e montagem guiada
 * completa em três partes. A aula 2 (3D) é a transferência: o vídeo lembra a regra e a ajuda
 * completa fica no Passo a passo.
 */
import type { PonteDimensao, PonteEtapa } from './ponte-projeto'

export type PonteTrecho = {
  key: string
  title: string
  kind: 'intro' | 'material' | 'experience' | 'build' | 'quiz' | 'delivery'
  etapa?: PonteEtapa
  /** Fala do Zappy na página, logo depois do vídeo (ou antes do quiz). Não é gravada. */
  ponte: string
  /** Fala gravada, com as marcas de interpretação. Vazia na seção sem vídeo. */
  text: string
  screen: string
}

const verificar =
  '[confident, clear, unhurried voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, leia a dica, corrija os blocos e clique novamente. Depois clique em Próxima parte.'

export const ponteAulas: {
  slug: string
  title: string
  dimension: PonteDimensao
  trechos: PonteTrecho[]
}[] = [
  {
    slug: 'aula-1',
    title: 'Aberta por um tempo',
    dimension: '2d',
    trechos: [
      {
        key: 'abertura',
        title: 'A ponte do laguinho',
        kind: 'intro',
        screen:
          'Jogo pronto 2D. Mostrar o laguinho no gramado de baixo, a pedra do sino no meio da água, a ponte levantada e a alavanca na areia. Puxar a alavanca e atravessar a tempo; não mostrar os blocos.',
        ponte:
          'Sua vez! Clique no jogo e use as setas do teclado. Puxe a alavanca e atravesse a ponte; depois tente chegar atrasado. A tecla R começa outra partida. Depois clique em Próxima parte.',
        text: '[upbeat, welcoming voice] O Farol ganhou um laguinho! No meio da água tem uma pedra com um sino, e para chegar lá existe uma ponte levadiça. Só que ela é apressada: começa levantada. [interested, animated voice] Olha aqui: o personagem puxa a alavanca, na areia, e a ponte baixa. Se ele for direto, atravessa e o sino toca. Mas, se demorar, a ponte sobe sozinha antes de ele chegar. O farol continua como antes: com a chave, ele acende. [upbeat, encouraging voice] Agora é a sua vez de jogar. Clique no jogo aqui na página e use as setas do teclado. Puxe a alavanca e atravesse. Depois tente chegar atrasado e veja o que acontece. A tecla R começa uma nova partida. Você pode seguir mesmo sem terminar a partida: é só clicar em Próxima parte.',
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
        title: 'A ponte apressada',
        kind: 'experience',
        screen:
          'Vídeo conceitual. Meme ilustrado por 2 a 3 segundos: o Zappy esperando na faixa de pedestre, olhando um relógio. Depois mostrar a alavanca, a ponte baixada e a ponte subindo sozinha. Não percorrer os controles da experiência.',
        ponte:
          'Hora de investigar! Puxe a alavanca, conte os segundos e veja o que acontece com a ponte quando o tempo acaba. Tente chegar a tempo e atrasado, e mude o lugar do "depois de". Depois clique em Próxima parte.',
        text: '[curious] Sabe o botão do semáforo de pedestre? Você aperta, e o sinal fica verde por um tempo. Depois ele volta para o vermelho sozinho. Ninguém precisa apertar outro botão para ficar vermelho: o semáforo já sabe esperar. E, se você apertar de novo, ele abre de novo. [engaging, energetic, conversational voice] No seu jogo vai ser igual. A alavanca é o botão. A ponte baixada é o sinal verde. E o jogo guarda numa variável, ponteAberta, se a ponte está baixada ou não. [interested, animated voice] O que faz a ponte subir sozinha é um bloco que sabe esperar: depois de 4 segundos, fazer. Tudo o que estiver dentro dele acontece só quando o tempo acaba. [upbeat, encouraging voice] Na experiência, puxe a alavanca e conte os segundos, um de cada vez. Observe o que muda quando o tempo acaba, e o que acontece se você chegar atrasado. Depois clique em Próxima parte.',
      },
      {
        key: 'alavanca',
        title: 'A alavanca baixa a ponte',
        kind: 'build',
        etapa: 'alavanca',
        screen:
          'Começar pela retomada: levar o personagem até a alavanca e mostrar que nada acontece. Criar ponteAberta no fim de Ao iniciar, com o bloco verdadeiro trocado para falso. Em Quando acontecer, montar o encontro com a alavanca, as duas trocas de imagem, Alterar ponteAberta para verdadeiro e Alterar aviso, um bloco por vez. Testar puxando a alavanca.',
        ponte:
          'Agora faça a alavanca baixar a ponte: crie ponteAberta começando em falso e, no encontro com a alavanca, troque as duas imagens, guarde verdadeiro e mude o aviso. Teste, clique em Verificar projeto e depois em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora faça a alavanca baixar a ponte. Clique no jogo e leve o personagem até a alavanca, na areia, ao lado da ponte. Tá vendo? Ele passa por ela e não acontece nada, porque o encontro com a alavanca ainda não tem nenhuma reação. [engaging, energetic, conversational voice] Primeiro, a gente precisa criar a variável ponteAberta, que guarda se a ponte está baixada. Ela nasce quando o jogo começa. Por isso, encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco. [confident, clear, unhurried voice] Abra Programação e depois Variáveis, pegue o bloco Criar variável e encaixe no fim de Ao iniciar. [engaging, energetic, conversational voice] Esse bloco chega com o nome contador. Clique em contador, apague e escreva ponteAberta, tudo junto e com o A maiúsculo. Depois clique fora do campo. [engaging, energetic, conversational voice] O valor desse bloco vem com o número 0. Só que ponteAberta guarda verdadeiro ou falso. Abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do 0. [confident, clear, unhurried voice] No menu desse bloco, troque verdadeiro por falso, porque o jogo começa com a ponte levantada. [confident, clear, unhurried voice] Agora o encontro. Encontre a área Quando acontecer e deixe à vista um espaço vazio depois do último evento dela, fora do fazer dos outros eventos. [confident, clear, unhurried voice] Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue o bloco Quando o sprite começar a encostar no sprite e encaixe nesse espaço. [confident, clear, unhurried voice] Esse bloco chega com jogador e inimigo. Clique em jogador e escolha personagem. Depois clique em inimigo e escolha alavanca. [confident, clear, unhurried voice] Deixe à vista o espaço ao lado da palavra fazer, dentro desse encontro. Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência. Pegue o bloco Trocar imagem do sprite e encaixe ali. Ele chega com heroi duas vezes: clique no primeiro e escolha alavanca; clique no segundo e escolha alavanca-baixo. [confident, clear, unhurried voice] Logo abaixo, encaixe outro Trocar imagem do sprite. Clique no primeiro heroi e escolha ponte; clique no segundo e escolha ponte-baixada. [confident, clear, unhurried voice] Embaixo dele, encaixe Alterar variável, de Programação e Variáveis. Clique em contador e escolha ponteAberta. O valor vem com o número 1: abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do 1. Desta vez, deixe em verdadeiro. [confident, clear, unhurried voice] Por último, ainda dentro do fazer, encaixe outro Alterar variável e escolha aviso. Abra Programação e depois Valores, pegue o bloco texto e solte em cima do 1. Clique em Olá, apague e escreva: A ponte baixou! Atravesse antes que ela suba. [engaging, energetic, conversational voice] Agora teste. Clique no jogo e leve o personagem até a alavanca. Olha só: a alavanca desce, a ponte baixa e o aviso muda. A ponte ainda não sobe sozinha, e ainda não dá para atravessar: isso vem nas próximas partes. [reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: no fim de Ao iniciar está Criar variável ponteAberta com valor falso, e no encontro entre personagem e alavanca estão as duas trocas de imagem, Alterar ponteAberta para verdadeiro e Alterar aviso. Depois de corrigir, teste de novo. ${verificar}`,
      },
      {
        key: 'sobe',
        title: 'A ponte sobe sozinha',
        kind: 'build',
        etapa: 'sobe',
        screen:
          'Retomada: puxar a alavanca, esperar e mostrar que a ponte fica baixada para sempre. Dentro do encontro com a alavanca, depois do aviso, encaixar o bloco depois de 1 segundos, trocar 1 por 4 e montar dentro dele as duas trocas de imagem, Alterar ponteAberta para falso e Alterar aviso, um bloco por vez. Testar puxando a alavanca e contando até 4.',
        ponte:
          'Agora a ponte vai saber esperar: dentro do encontro com a alavanca, coloque o depois de 4 segundos e, dentro dele, desfaça o que a alavanca fez. Teste puxando e contando até 4, puxe de novo, clique em Verificar projeto e depois em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora faça a ponte subir sozinha. Clique no jogo, puxe a alavanca e espere. Tá vendo? A ponte baixa e fica baixada para sempre, porque nada no jogo manda ela subir. Lembra da experiência? Depois de 4 segundos, a ponte subia sozinha, e o relógio só começava quando a alavanca era puxada. Agora a gente vai montar esse relógio no seu jogo! [engaging, energetic, conversational voice] O relógio tem que começar quando a alavanca é puxada. Por isso ele fica dentro do encontro com a alavanca, logo depois do aviso. Encontre esse encontro em Quando acontecer e deixe à vista o espaço embaixo do último bloco do fazer, o Alterar aviso. [confident, clear, unhurried voice] Abra Programação e depois Repetições. Pegue o bloco depois de 1 segundos, fazer e encaixe embaixo do Alterar aviso, ainda dentro do encontro com a alavanca. [confident, clear, unhurried voice] Repare que ele chega com o número 1. Clique no 1, apague e escreva 4. [engaging, energetic, conversational voice] Tudo o que ficar dentro do fazer desse bloco acontece só quando os 4 segundos acabam. E o que tem que acontecer é desfazer o que a alavanca fez. [confident, clear, unhurried voice] Deixe à vista o espaço ao lado da palavra fazer, dentro do depois de 4 segundos. Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência. Pegue o bloco Trocar imagem do sprite e encaixe ali. Clique no primeiro heroi e escolha alavanca; clique no segundo e escolha alavanca-cima. [confident, clear, unhurried voice] Logo abaixo, ainda dentro do depois de 4 segundos, encaixe outro Trocar imagem do sprite. Clique no primeiro heroi e escolha ponte; clique no segundo e escolha ponte-levantada. [confident, clear, unhurried voice] Embaixo dele, encaixe Alterar variável, de Programação e Variáveis, e escolha ponteAberta. Solte o bloco verdadeiro, de Programação e Lógica e Se, em cima do 1, e no menu troque para falso. [confident, clear, unhurried voice] Por último, ainda dentro do depois de 4 segundos, encaixe outro Alterar variável e escolha aviso. Solte um texto, de Programação e Valores, em cima do 1, apague Olá e escreva: A ponte subiu. Puxe a alavanca de novo. [engaging, energetic, conversational voice] Agora teste. Clique no jogo, puxe a alavanca e conte: um, dois, três, quatro. Olha só: a ponte sobe sozinha, a alavanca volta para cima e o aviso muda. Agora puxe a alavanca de novo: a ponte baixa outra vez, e o relógio começa de novo. [reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o depois de 4 segundos está dentro do encontro com a alavanca, embaixo do aviso, e dentro dele estão as duas trocas de imagem de volta, Alterar ponteAberta para falso e Alterar aviso. Se ele ficar fora do encontro, o relógio não começa quando a alavanca é puxada. Depois de corrigir, teste de novo. ${verificar}`,
      },
      {
        key: 'atravessar',
        title: 'Atravesse a ponte',
        kind: 'build',
        etapa: 'atravessar',
        screen:
          'Retomada: puxar a alavanca, ir até a ponte baixada e mostrar que nada acontece. Em Quando acontecer, montar o encontro com a ponte, o Se, levar x maior que 0 para a lixeira, encaixar valor da variável ponteAberta, abrir o senão pelo segundo sinal de mais e montar o então e o senão. Testar a tempo, atrasado e sem puxar.',
        ponte:
          'Hora de atravessar! Se ponteAberta, o personagem vai até a pedra e o sino toca; senão, o aviso diz que a ponte está levantada. Teste a tempo, atrasado e sem puxar, clique em Verificar projeto e depois em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora faça o personagem atravessar. Clique no jogo, puxe a alavanca e vá até a ponte baixada. Tá vendo? Ele chega na ponte e não acontece nada, porque o encontro com a ponte ainda não tem uma regra. Lembra da experiência? Com a ponte baixada, o personagem atravessava. Com ela levantada, o aviso pedia para puxar a alavanca. [confident, clear, unhurried voice] Primeiro, encontre a área Quando acontecer e deixe à vista um espaço vazio depois do encontro com a alavanca, fora do fazer dele. [confident, clear, unhurried voice] Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue o bloco Quando o sprite começar a encostar no sprite e encaixe nesse espaço. Clique em jogador e escolha personagem. Depois clique em inimigo e escolha ponte. [engaging, energetic, conversational voice] A ponte faz uma pergunta: ela está baixada? Quem faz uma pergunta no jogo é o bloco Se. Deixe à vista o espaço ao lado da palavra fazer, dentro do encontro com a ponte. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte nesse espaço. [confident, clear, unhurried voice] Repare que o Se já vem com uma condição pronta: x maior que 0. Não é isso que a ponte precisa perguntar, por isso segure essa pergunta pelo sinal de maior e arraste até a lixeira, no canto de baixo, à direita, do espaço dos blocos. O lugar ao lado de Se fica vazio. [confident, clear, unhurried voice] Abra Programação e depois Valores, pegue o bloco valor da variável e solte no lugar vazio ao lado de Se. Clique no x e escolha ponteAberta. [engaging, energetic, conversational voice] A ponte tem duas respostas, por isso o Se precisa do senão. Olha aqui, na linha de baixo do bloco Se, depois do então: tem dois sinais de mais. Clique no segundo, antes da palavra senão. Não clique no primeiro. [confident, clear, unhurried voice] Agora o então, que roda quando a ponte está baixada. Deixe à vista o espaço dentro do então. Abra Jogo 2D, depois Movimento e depois Posição e tamanho. Pegue o bloco Mudar a posição do sprite e encaixe ali. Clique em jogador e escolha personagem. Clique no número do x, que vem com 0, e coloque 96. Depois clique no número do y e coloque 240. Esse é o lugar em cima da pedra. [confident, clear, unhurried voice] Logo abaixo, ainda dentro do então, encaixe Trocar imagem do sprite, de Jogo 2D, Sprites e Criar e trocar aparência. Clique no primeiro heroi e escolha sino; clique no segundo e escolha pedra-do-sino-tocando. [confident, clear, unhurried voice] Embaixo dele, encaixe Alterar variável, de Programação e Variáveis, e escolha aviso. Solte um texto, de Programação e Valores, em cima do 1, apague Olá e escreva: Você atravessou e tocou o sino! [confident, clear, unhurried voice] Agora o senão, que roda quando a ponte está levantada. Dentro do senão, encaixe outro Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva: A ponte está levantada. Puxe a alavanca primeiro. [engaging, energetic, conversational voice] Agora teste todos os casos. Pressione R e vá direto à ponte, sem puxar: o aviso pede para puxar a alavanca. Puxe a alavanca e vá logo para a ponte: o personagem atravessa e o sino toca! Pressione R, puxe a alavanca e espere a ponte subir antes de encostar nela: ele fica na praia, e o aviso aparece. [reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o encontro usa personagem e ponte, a pergunta do Se é ponteAberta, a mudança de posição, a troca do sino e o aviso de sucesso estão dentro do então, e o aviso da ponte levantada está dentro do senão. Depois de corrigir, teste de novo. ${verificar}`,
      },
      {
        key: 'revisao',
        title: 'Pense na ponte',
        kind: 'quiz',
        screen: 'Quiz com quatro perguntas: duas previsões com cena e dois diagnósticos.',
        ponte:
          'Hora de pensar na ponte! As perguntas retomam chegar a tempo, chegar atrasado e o que pode estar errado no "depois de". Em cada uma tem uma explicação, e você pode tentar de novo. Nas perguntas com cena, escolha e clique em Ver o que acontece; nas outras, clique em Responder.',
        text: '',
      },
      entrega('2d'),
    ],
  },
  {
    slug: 'aula-2',
    title: 'A ponte da ilha',
    dimension: '3d',
    trechos: [
      {
        key: 'abertura',
        title: 'A ponte chegou à ilha',
        kind: 'intro',
        screen:
          'Jogo pronto 3D. Mostrar o laguinho no gramado da frente, a pedra do sino, a ponte levantada e a alavanca. Puxar a alavanca e atravessar a tempo; não mostrar os blocos.',
        ponte:
          'Sua vez! Clique no jogo e use as setas ou W, A, S e D. Puxe a alavanca e atravesse; depois tente chegar atrasado. R começa outra partida. Depois clique em Próxima parte.',
        text: '[upbeat, welcoming voice] A ponte apressada chegou à Ilha do Farol, em três dimensões! A regra é a mesma do seu jogo 2D: a alavanca baixa a ponte, e 4 segundos depois ela sobe sozinha. [engaging, energetic, conversational voice] Olha aqui: a alavanca, a ponte e o sino têm animações que já vêm prontas. A alavanca puxa e solta, a ponte baixa e sobe, e o sino balança. Você vai escolher quando cada uma toca. [upbeat, encouraging voice] Agora clique no jogo aqui na página e use as setas ou W, A, S e D. Puxe a alavanca e atravesse. Depois tente chegar atrasado. A tecla R começa uma nova partida. Depois clique em Próxima parte.',
      },
      {
        key: 'alavanca',
        title: 'A alavanca e a ponte que sobe sozinha',
        kind: 'build',
        etapa: 'sobe',
        screen:
          'Projeto inicial 3D. Mostrar a alavanca, a ponte levantada e o fim de Ao iniciar; não montar os blocos no vídeo. Mostrar os nomes dos clipes puxar, baixar, soltar e subir no Passo a passo do projeto, parte 3D.',
        ponte:
          'Agora a alavanca da ilha: crie ponteAberta começando em falso e, no encontro, toque puxar e baixar, guarde verdadeiro, mude o aviso e coloque o depois de 4 segundos que desfaz tudo. Se precisar, a montagem completa está no Passo a passo do projeto. Teste, clique em Verificar projeto e depois em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Na ilha, a regra é a mesma do seu jogo 2D. Crie a variável ponteAberta começando em falso, no fim de Ao iniciar. Depois, no encontro do personagem com a alavanca, a alavanca toca a animação puxar, a ponte toca a animação baixar, ponteAberta vira verdadeiro e o aviso muda. [interested, animated voice] E, dentro desse mesmo encontro, vem o depois de 4 segundos. Dentro dele, a alavanca toca soltar, a ponte toca subir, ponteAberta volta a falso e o aviso pede para puxar de novo. No 3D, o encontro fica em Jogo 3D, na gaveta Encostar, e as animações ficam em Objetos, na Animação do modelo. O depois de 4 segundos é o mesmo bloco de Programação, em Repetições. [upbeat, encouraging voice] Agora teste. Puxe a alavanca e conte até 4: a ponte baixa e depois sobe sozinha. Puxe de novo: ela baixa outra vez. Se precisar, o Passo a passo do projeto, que está na primeira aula, tem a montagem completa da ilha. ${verificar}`,
      },
      {
        key: 'atravessar',
        title: 'Atravesse até o sino',
        kind: 'build',
        etapa: 'atravessar',
        screen:
          'Mostrar a ponte baixada e a pedra do sino, e o nome do clipe tocar na ajuda. Não montar o encontro nem o Se no vídeo.',
        ponte:
          'Hora de atravessar na ilha! Se ponteAberta, o personagem vai até a pedra e o sino toca; senão, o aviso diz que a ponte está levantada. Teste a tempo, atrasado e sem puxar, clique em Verificar projeto e depois em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora a travessia da ilha. Monte o encontro do personagem com a ponte e, dentro dele, um Se com senão. A pergunta é a mesma do 2D: ponteAberta. No então, o personagem vai até a pedra, com o bloco Colocar o objeto, o sino toca a animação tocar uma vez, e o aviso conta que você atravessou. No senão, o aviso diz que a ponte está levantada. [interested, animated voice] Na ilha, a água não deixa o personagem andar até a pedra: o único caminho é a regra da ponte. Os números do lugar em cima da pedra estão no Passo a passo do projeto. [upbeat, encouraging voice] Teste todos os casos. Pressione R e vá direto à ponte: o aviso pede para puxar a alavanca. Puxe e vá logo: o personagem atravessa e o sino toca. Depois puxe, espere a ponte subir e encoste nela: ele fica na margem. ${verificar}`,
      },
      {
        key: 'revisao',
        title: 'Pense na ponte da ilha',
        kind: 'quiz',
        screen: 'Quiz com duas perguntas: uma previsão com cena 3D e uma sem cena.',
        ponte:
          'Hora de pensar na ponte da ilha! As perguntas retomam puxar a alavanca de novo e onde fica a animação subir. Em cada uma tem uma explicação, e você pode tentar de novo. Na pergunta com cena, clique em Ver o que acontece; na outra, clique em Responder.',
        text: '',
      },
      entrega('3d'),
    ],
  },
]

function entrega(d: PonteDimensao): PonteTrecho {
  const three = d === '3d'
  return {
    key: 'entrega',
    title: three ? 'Envie a sua ilha com a ponte' : 'Envie o seu jogo com a ponte',
    kind: 'delivery',
    etapa: 'atravessar',
    screen:
      'Projeto atual, objetivos, Enviar meu projeto, confirmação Enviar e Projeto enviado!. Não preencher Recado nem simular o envio.',
    ponte:
      'Confira os objetivos e clique em Enviar meu projeto. Confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.',
    text: `[pleased, lively voice] ${three ? 'Pronto, você levou o relógio para outro mundo: na ilha, a ponte também baixa, espera 4 segundos e sobe sozinha.' : 'Olha só o que você programou: a ponte baixa com a alavanca, espera 4 segundos e sobe sozinha, e só dá para atravessar a tempo! Na próxima aula, você leva essa regra para a ilha, em três dimensões.'} [confident, clear, unhurried voice] Antes de enviar, jogue uma partida inteira: atravesse a tempo, chegue atrasado e puxe a alavanca de novo${three ? '' : '. Acenda o farol com a chave também'}. Depois pressione R e confira que a ponte volta levantada. Clique em Verificar projeto e corrija o que faltar. Quando os objetivos estiverem cumpridos, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.`,
  }
}

/** A montagem completa, opcional, das duas dimensões (o Passo a passo do projeto). */
export function ponteAjuda(d: PonteDimensao): {
  key: string
  title: string
  idea: string
  steps: string[]
  test: string
  correction: string
}[] {
  const three = d === '3d'
  const encontro = (nome: string, onde: string) =>
    three
      ? `Em Quando acontecer, deixe à vista um espaço vazio ${onde}, fora do fazer dos outros. Abra Jogo 3D → Encostar → Encostar e pegue Quando personagem encostar em. O primeiro nome já vem personagem; deixe assim. No segundo, escolha ${nome}.`
      : `Em Quando acontecer, deixe à vista um espaço vazio ${onde}, fora do fazer dos outros. Abra Jogo 2D → Colisões → Encostar e bloquear e pegue Quando o sprite começar a encostar no sprite. Clique em jogador e escolha personagem; clique em inimigo e escolha ${nome}.`
  const animacao = (clipe: string, objeto: string) =>
    `encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em Andar e escolha ${clipe}. Clique em heroi e escolha ${objeto}. No modo, escolha uma vez.`
  const imagem = (sprite: string, arte: string) =>
    `encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha ${sprite}; no segundo, escolha ${arte}.`
  return [
    {
      key: 'alavanca',
      title: 'A alavanca baixa a ponte',
      idea: 'A variável ponteAberta guarda se a ponte está baixada. Toda partida começa com falso; o encontro com a alavanca baixa a ponte e muda para verdadeiro.',
      steps: [
        'Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco.',
        'Abra Programação → Variáveis. Pegue Criar variável e encaixe no fim de Ao iniciar. Clique em contador, apague e escreva ponteAberta.',
        'O valor chega com 0. Abra Programação → Lógica e Se, pegue verdadeiro e solte em cima do 0. No menu, escolha falso.',
        encontro('alavanca', 'depois do último evento'),
        three
          ? `Dentro do fazer, ${animacao('puxar', 'alavanca')}`
          : `Dentro do fazer, ${imagem('alavanca', 'alavanca-baixo')}`,
        three
          ? `Logo abaixo, ${animacao('baixar', 'ponte')}`
          : `Logo abaixo, ${imagem('ponte', 'ponte-baixada')}`,
        'Embaixo, encaixe Alterar variável, de Programação → Variáveis. Escolha ponteAberta e solte verdadeiro, de Programação → Lógica e Se, em cima do 1. Deixe em verdadeiro.',
        'Ainda no fazer, encaixe outro Alterar variável e escolha aviso. Solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva A ponte baixou! Atravesse antes que ela suba.',
      ],
      test: 'Leve o personagem até a alavanca. A alavanca desce, a ponte baixa e o aviso muda. Pressione R: a ponte volta levantada.',
      correction:
        'Se nada acontecer, confira se o encontro usa personagem e alavanca. Não crie ponteAberta dentro do encontro: ela nasce em Ao iniciar, com falso, e o encontro só muda para verdadeiro.',
    },
    {
      key: 'sobe',
      title: 'A ponte sobe sozinha',
      idea: 'O bloco depois de 4 segundos espera e só então roda o que está dentro dele. Dentro do encontro com a alavanca, o relógio começa a cada puxada, e o que vai dentro dele desfaz o que a alavanca fez.',
      steps: [
        'No encontro com a alavanca, deixe à vista o espaço embaixo do último bloco do fazer, o Alterar aviso.',
        'Abra Programação → Repetições. Pegue depois de 1 segundos, fazer e encaixe embaixo do Alterar aviso, ainda dentro do encontro. Clique no 1, apague e escreva 4.',
        three
          ? `Dentro do fazer do depois de 4 segundos, ${animacao('soltar', 'alavanca')}`
          : `Dentro do fazer do depois de 4 segundos, ${imagem('alavanca', 'alavanca-cima')}`,
        three
          ? `Logo abaixo, ${animacao('subir', 'ponte')}`
          : `Logo abaixo, ${imagem('ponte', 'ponte-levantada')}`,
        'Embaixo, ainda dentro do depois de 4 segundos, encaixe Alterar variável. Escolha ponteAberta, solte verdadeiro em cima do 1 e, no menu, escolha falso.',
        'Por último, encaixe outro Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva A ponte subiu. Puxe a alavanca de novo.',
      ],
      test: 'Puxe a alavanca e conte até 4: a ponte sobe sozinha e o aviso muda. Puxe de novo: a ponte baixa outra vez e sobe de novo depois de 4 segundos.',
      correction:
        'Se a ponte nunca subir, confira se o depois de 4 segundos tem os blocos dentro do fazer dele. Se ela subir só uma vez, logo no começo, o depois de está fora do encontro com a alavanca: arraste-o para dentro, embaixo do aviso.',
    },
    {
      key: 'atravessar',
      title: 'Atravesse a ponte',
      idea: 'O encontro com a ponte pergunta ponteAberta. Verdadeiro escolhe o então, que leva o personagem à pedra e toca o sino; falso escolhe o senão, que avisa.',
      steps: [
        encontro('ponte', 'depois do encontro com a alavanca'),
        'Dentro do fazer, encaixe Se, de Programação → Lógica e Se. Segure a pergunta x > 0 pelo sinal de maior e arraste até a lixeira.',
        'Abra Programação → Valores e solte valor da variável no lugar vazio ao lado de Se. Clique no x e escolha ponteAberta.',
        'Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.',
        three
          ? 'Dentro do então, encaixe Colocar o objeto, de Jogo 3D → Objetos → Posição, giro e tamanho. Clique em caixa e escolha personagem. Coloque x -3.9, y 1.42 e z 3.8 (o número negativo começa com o sinal de menos; use ponto no lugar da vírgula).'
          : 'Dentro do então, encaixe Mudar a posição do sprite, de Jogo 2D → Movimento → Posição e tamanho. Clique em jogador e escolha personagem. Coloque x 96 e y 240.',
        three
          ? `Logo abaixo, ainda no então, ${animacao('tocar', 'sino')}`
          : `Logo abaixo, ainda no então, ${imagem('sino', 'pedra-do-sino-tocando')}`,
        'Embaixo, ainda no então, encaixe Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva Você atravessou e tocou o sino!',
        'Dentro do senão, encaixe outro Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva A ponte está levantada. Puxe a alavanca primeiro.',
      ],
      test: 'Pressione R e vá direto à ponte: o aviso pede para puxar a alavanca. Puxe e vá logo: o personagem atravessa e o sino toca. Pressione R, puxe e espere a ponte subir antes de encostar: ele não atravessa.',
      correction:
        'Se o personagem atravessar sem puxar, confira se a pergunta do Se é ponteAberta e se ponteAberta começa falso. Se ele nunca atravessar, confira se a mudança de lugar está dentro do então e não no senão.',
    },
  ]
}
