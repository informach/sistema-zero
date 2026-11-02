/**
 * A fonte editorial do Poder "O baú dos símbolos": as falas gravadas (com as marcas do ElevenLabs),
 * as notas de tela, as falas do Zappy na página e o Passo a passo completo das duas dimensões. O
 * gerador (`gerar-simbolos.ts`) monta manifestos, roteiros e caderno a partir daqui.
 *
 * A aula 1 (2D) ensina o conceito novo: vídeo da senha do cadeado, experiência e montagem guiada
 * completa em três partes. A aula 2 (3D) é a transferência: o vídeo lembra a regra e a ajuda
 * completa fica no Passo a passo.
 */
import type { SimbolosDimensao, SimbolosEtapa } from './simbolos-projeto'

export type SimbolosTrecho = {
  key: string
  title: string
  kind: 'intro' | 'material' | 'experience' | 'build' | 'quiz' | 'delivery'
  etapa?: SimbolosEtapa
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
 * ⚠️ `goals` tem a mesma ordem e o mesmo texto de `SIMBOLOS_DESCOBERTAS` (member-shell,
 * `scene-poder-simbolos.tsx`).
 */
export const simbolosExperiencia = {
  title: 'A experiência: a ordem dos símbolos',
  idea: 'O jogo guarda em passo até onde a sequência chegou, e cada símbolo, quando é tocado, pergunta: é a minha vez? Na experiência, você descobre o que acontece com passo na ordem da placa, fora da vez e num baú que só conta.',
  goals: [
    'Toque o sol e depois a lua e observe passo.',
    'Toque os três símbolos na ordem da placa e observe o baú.',
    'Com o sol aceso, pule um símbolo e observe passo.',
    'Comece pelo meio, sem nada aceso, e observe passo.',
    'Depois de errar, tente a ordem da placa sem recomeçar a partida.',
    'No baú que só conta, toque os símbolos fora da ordem e compare.',
  ],
  observe:
    'Você escolhe a ordem dos testes e pode repetir quantas vezes quiser. Antes e depois de cada toque, observe passo, os símbolos acesos e o baú. Para comparar com o baú que só conta, veja antes o baú que confere a vez responder. O Zappy sugere o que observar.',
}

/**
 * O senão das pedras, falado em partes (2D): o porquê primeiro, depois um encaixe por fala. É o
 * espaço da resposta "não" da experiência: a tentativa recomeça.
 */
const senao2d = (aviso: string) =>
  [
    '[engaging, energetic, conversational voice] Agora o senão, que roda quando não é a vez. É este espaço que guarda a resposta não da experiência: a tentativa recomeça.',
    '[confident, clear, unhurried voice] Dentro do senão, encaixe Alterar variável, de Programação e Variáveis, escolha passo e, no valor, troque o 1 por 0.',
    '[confident, clear, unhurried voice] Logo abaixo, ainda no senão, encaixe Trocar imagem do sprite. No primeiro heroi escolha sol; no segundo, escolha pedra-sol.',
    '[confident, clear, unhurried voice] Embaixo dele, encaixe outro Trocar imagem do sprite. No primeiro heroi escolha lua; no segundo, escolha pedra-lua.',
    `[confident, clear, unhurried voice] Por último, ainda no senão, encaixe Alterar variável, de Programação e Variáveis, e escolha aviso. Solte um texto, de Programação e Valores, em cima do 1, apague Olá e escreva: ${aviso}`,
  ].join(' ')

/** O encontro com uma pedra (2D), em três falas: destino, bloco e campos. */
const encontro2d = (nome: string, depois: string, ideia: string) =>
  [
    `[confident, clear, unhurried voice] Encontre a área Quando acontecer e deixe à vista um espaço vazio depois ${depois}, fora do fazer dele.`,
    `[confident, clear, unhurried voice] Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue o bloco Quando o sprite começar a encostar no sprite e encaixe nesse espaço. ${ideia}`,
    `[confident, clear, unhurried voice] Clique em jogador e escolha personagem. Depois clique em inimigo e escolha ${nome}.`,
  ].join(' ')

export const simbolosAulas: {
  slug: string
  title: string
  dimension: SimbolosDimensao
  trechos: SimbolosTrecho[]
}[] = [
  {
    slug: 'aula-1',
    title: 'Na ordem certa',
    dimension: '2d',
    trechos: [
      {
        key: 'abertura',
        title: 'Os símbolos do Farol',
        kind: 'intro',
        screen:
          'Jogo pronto 2D. Mostrar as três pedras no gramado de baixo, a placa da ordem e o baú na areia. Tocar sol, lua e estrela e abrir o baú. Não errar a ordem no vídeo (é o que a criança testa jogando) e não mostrar os blocos.',
        ponte:
          'Sua vez! Clique no jogo e use as setas do teclado. Toque os símbolos na ordem da placa e abra o baú; depois erre a ordem de propósito e veja o que acontece. A tecla R começa outra partida. Depois clique em Próxima parte.',
        text: '[upbeat, welcoming voice] O Farol ganhou um baú misterioso! No gramado de baixo tem três pedras com símbolos: o sol, a lua e a estrela. E tem uma placa que mostra a ordem certa. [interested, animated voice] Olha aqui: o personagem encosta no sol, e o sol acende. Depois na lua, e ela acende. Depois na estrela, e o baú abre! [curious] E se ele tocar um símbolo fora da ordem? Isso você vai descobrir jogando. O farol continua como antes: com a chave, ele acende. [upbeat, encouraging voice] Agora é a sua vez de jogar. Clique no jogo aqui na página e use as setas do teclado. Toque os símbolos na ordem da placa e abra o baú. Depois erre a ordem de propósito e veja o que acontece. [reassuring, encouraging voice] A tecla R começa uma nova partida. Você pode seguir mesmo sem terminar a partida: é só clicar em Próxima parte.',
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
        title: 'A ordem dos símbolos',
        kind: 'experience',
        screen:
          'Vídeo conceitual. Meme ilustrado por 2 a 3 segundos: o Zappy girando os números de um cadeado de bicicleta, pensativo, sem mostrar o cadeado abrindo. No convite, ampliar a experiência e mostrar a cena parada: as três pedras, a placa, o baú, o número passo e a pergunta "É a minha vez?" com as duas respostas ainda em "?", sem apontar controles. Não tocar nenhum símbolo: o que passo faz a cada toque, o que acontece fora da vez e o que muda em cada jeito de o baú conferir é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência. Não falar de blocos, regra, Se, então nem senão: eles ficam para a montagem (decisão de 02/11/2026). O vídeo explica a ideia e convida, sem mostrar os controles nem a ordem dos testes (molde do Cadê, 02/11/2026).',
        ponte:
          'Sua vez! Investigue o que acontece com passo quando os símbolos vêm na ordem da placa e quando vêm fora da vez, em cada jeito de o baú conferir. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.',
        text: '[engaging, energetic, conversational voice] No seu jogo, o baú abre com uma senha de símbolos. Para conferir a senha, o jogo precisa lembrar até onde você chegou. Ele guarda isso numa variável: um lugar onde o jogo guarda uma informação para usar depois. [curious] Sabe o cadeado de bicicleta com números? A senha dele é uma sequência de números. [engaging, energetic, conversational voice] No seu jogo, os símbolos são os números da senha, e a placa mostra a sequência. A variável que lembra até onde você chegou se chama passo. [interested, animated voice] E cada símbolo, quando é tocado, faz uma pergunta: é a minha vez? [engaging, energetic, conversational voice] O baú pode conferir a senha de dois jeitos: só contando os símbolos tocados ou conferindo a vez de cada um. [curious] E o que acontece com passo quando um símbolo vem fora da vez? [engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência. [upbeat, encouraging voice] Agora você vai investigar o que acontece com passo quando os símbolos vêm na ordem da placa e quando vêm fora da vez, em cada jeito de o baú conferir. Você escolhe por onde começar e pode repetir os testes. O Zappy ajuda a observar as diferenças. Quando terminar, clique em Próxima parte.',
      },
      {
        key: 'sol',
        title: 'O sol começa',
        kind: 'build',
        etapa: 'sol',
        screen:
          'Começar pela retomada: levar o personagem até o sol e, no "Tá vendo?", mostrar que nada acontece. Depois lembrar a experiência. Criar passo no fim de Ao iniciar, com o valor 0. Em Quando acontecer, montar o encontro com o sol, Alterar passo para 1, Trocar imagem do sol e Alterar aviso, um bloco por vez, com o destino à vista antes de cada peça. Testar encostando no sol.',
        ponte:
          'Agora faça o sol começar a sequência: crie passo começando em 0 e, no encontro com o sol, guarde 1, acenda o sol e mude o aviso. Teste no jogo. Depois clique em Verificar projeto e em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora faça o sol começar a sequência. Clique no jogo e leve o personagem até o sol, a primeira pedra. [engaging, energetic, conversational voice] Tá vendo? Ele encosta na pedra e não acontece nada, porque o encontro com o sol ainda não tem nenhuma reação. [engaging, energetic, conversational voice] Lembra da experiência? Antes do primeiro toque, passo era 0. Depois do sol, passo virou 1, e o sol acendeu. É isso que o seu jogo vai fazer agora. [engaging, energetic, conversational voice] Primeiro, a variável passo. Ela precisa existir desde o começo da partida, por isso nasce na área Ao iniciar, que roda quando o jogo começa. [confident, clear, unhurried voice] Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco. [confident, clear, unhurried voice] Abra Programação e depois Variáveis, pegue o bloco Criar variável e encaixe no fim de Ao iniciar. É este bloco que cria a variável passo. [engaging, energetic, conversational voice] Esse bloco chega com o nome contador. Clique em contador, apague e escreva passo, tudo em minúsculas. Depois clique fora do campo. [engaging, energetic, conversational voice] O valor já vem com o número 0, e é isso mesmo: antes de começar, a sequência está no passo zero. [confident, clear, unhurried voice] Agora o encontro. Encontre a área Quando acontecer e deixe à vista um espaço vazio depois do último evento dela, fora do fazer dos outros eventos. [confident, clear, unhurried voice] Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue o bloco Quando o sprite começar a encostar no sprite e encaixe nesse espaço. É este bloco que percebe o toque no símbolo, como na experiência. [confident, clear, unhurried voice] Esse bloco chega com jogador e inimigo. Clique em jogador e escolha personagem. Depois clique em inimigo e escolha sol. [confident, clear, unhurried voice] Deixe à vista o espaço ao lado da palavra fazer, dentro desse encontro. Abra Programação e depois Variáveis, pegue o bloco Alterar variável e encaixe ali. É este bloco que faz passo andar. [confident, clear, unhurried voice] Clique em contador e escolha passo. O valor vem com o número 1, e é isso mesmo: depois do sol, passo é um. [confident, clear, unhurried voice] Logo abaixo, encaixe Trocar imagem do sprite, de Jogo 2D, Sprites e Criar e trocar aparência. É este bloco que acende o sol. [confident, clear, unhurried voice] Ele chega com heroi duas vezes: clique no primeiro e escolha sol; clique no segundo e escolha pedra-sol-acesa. [confident, clear, unhurried voice] Por último, ainda dentro do fazer, encaixe outro Alterar variável e escolha aviso. [confident, clear, unhurried voice] Abra Programação e depois Valores, pegue o bloco texto e solte em cima do 1. Clique em Olá, apague e escreva: O sol acendeu! Agora a lua. [engaging, energetic, conversational voice] Agora teste. Clique no jogo e leve o personagem até o sol. Olha só: o sol acende e o aviso muda. A lua e a estrela ainda não fazem nada: isso vem nas próximas partes. [reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: no fim de Ao iniciar está Criar variável passo com valor 0, e no encontro entre personagem e sol estão Alterar passo para 1, a troca de imagem do sol e Alterar aviso. Depois de corrigir, teste de novo. ${verificar}`,
      },
      {
        key: 'lua',
        title: 'A lua pergunta a vez',
        kind: 'build',
        etapa: 'lua',
        screen:
          'Retomada: tocar o sol e depois a lua e, no "Tá vendo?", mostrar que a lua não acende. Lembrar a experiência (sim e não). Em Quando acontecer, montar o encontro com a lua, o Se, trocar x por passo, maior por igual e 0 por 1, abrir o senão pelo segundo sinal de mais e montar o então e o senão, um bloco por fala. Testar sol e lua, e lua primeiro.',
        ponte:
          'Agora a lua pergunta se é a vez dela: se passo = 1, guarde 2, acenda a lua e mude o aviso; senão, volte passo a 0, apague o sol e a lua e avise. Teste a ordem certa e a lua primeiro. Depois clique em Verificar projeto e em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora a lua. Clique no jogo, toque o sol e depois a lua. [engaging, energetic, conversational voice] Tá vendo? A lua não acende, porque o encontro com a lua ainda não faz nenhuma pergunta. [engaging, energetic, conversational voice] Lembra da experiência? Quando a lua perguntava se era a vez dela, a resposta era sim só com passo igual a 1, ou seja, depois do sol. [engaging, energetic, conversational voice] E, quando a resposta era não, passo voltava para 0 e tudo apagava. Agora o seu jogo vai fazer essa pergunta. ${encontro2d('lua', 'do encontro com o sol', 'É este bloco que percebe o toque na lua.')} [engaging, energetic, conversational voice] Quem faz uma pergunta no jogo é o bloco Se. Deixe à vista o espaço ao lado da palavra fazer, dentro do encontro com a lua. [confident, clear, unhurried voice] Abra Programação e depois Lógica e Se, pegue o bloco Se e solte nesse espaço. É este bloco que faz a pergunta da lua: é a minha vez? [engaging, energetic, conversational voice] Repare que o Se já vem com uma comparação pronta: x maior que 0. Uma comparação confere dois valores, e a resposta é sim ou não. Desta vez, a gente aproveita essa comparação. [confident, clear, unhurried voice] Clique no x e escolha passo. Clique no sinal de maior e escolha o sinal de igual. Depois clique no 0, apague e escreva 1. [engaging, energetic, conversational voice] Agora a pergunta é: passo igual a 1? É ela que diz se é a vez da lua. [engaging, energetic, conversational voice] A lua tem duas respostas, uma para o sim e outra para o não. Por isso o Se precisa do senão, o espaço da resposta não. [confident, clear, unhurried voice] Olha aqui, na linha de baixo do bloco Se, depois do então: tem dois sinais de mais. Clique no segundo, antes da palavra senão. Não clique no primeiro. [engaging, energetic, conversational voice] Agora o então, que roda quando é a vez da lua. É este espaço que guarda a resposta sim da experiência. Deixe à vista o espaço dentro do então. [confident, clear, unhurried voice] Encaixe Alterar variável, de Programação e Variáveis, escolha passo e, no valor, troque o 1 por 2. [confident, clear, unhurried voice] Logo abaixo, ainda no então, encaixe Trocar imagem do sprite, de Jogo 2D, Sprites e Criar e trocar aparência. No primeiro heroi escolha lua; no segundo, escolha pedra-lua-acesa. [confident, clear, unhurried voice] Embaixo dele, encaixe Alterar variável, de Programação e Variáveis, e escolha aviso. Solte um texto, de Programação e Valores, em cima do 1, apague Olá e escreva: A lua acendeu! Agora a estrela. ${senao2d('Fora da ordem. Comece de novo pelo sol.')} [engaging, energetic, conversational voice] Agora teste a ordem certa. Clique no jogo, toque na tecla R, toque o sol e depois a lua: as duas acendem. [engaging, energetic, conversational voice] Teste também fora da vez. Toque na tecla R de novo e toque a lua primeiro: nada acende, e o aviso pede para começar pelo sol. [reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o encontro usa personagem e lua, a pergunta do Se é passo igual a 1, no então estão Alterar passo para 2, a troca da lua e o aviso, e no senão estão Alterar passo para 0, as duas trocas de volta e o aviso de recomeçar. Depois de corrigir, teste de novo. ${verificar}`,
      },
      {
        key: 'estrela',
        title: 'A estrela abre o baú',
        kind: 'build',
        etapa: 'estrela',
        screen:
          'Retomada: tocar sol, lua e estrela e, no "Tá vendo?", mostrar que o baú não abre. Lembrar a experiência. Montar o encontro com a estrela, o Se com passo igual a 2, o senão e, no então, a troca da estrela, a troca do baú e o aviso, um bloco por fala. Testar a ordem certa, sol e estrela, e recomeçar depois de errar.',
        ponte:
          'Agora a estrela abre o baú: se passo = 2, acenda a estrela, abra o baú e mude o aviso; senão, recomece como na lua. Teste a ordem certa, uma ordem errada e recomeçar depois de errar. Depois clique em Verificar projeto e em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora a estrela. Clique no jogo e toque o sol, a lua e a estrela. [engaging, energetic, conversational voice] Tá vendo? O baú não abre, porque o encontro com a estrela ainda não faz nenhuma pergunta. [engaging, energetic, conversational voice] Lembra da experiência? A estrela abria o baú só quando era a vez dela, com passo igual a 2. Fora da vez, a tentativa recomeçava, como na lua. ${encontro2d('estrela', 'do encontro com a lua', 'É este bloco que percebe o toque na estrela.')} [confident, clear, unhurried voice] Deixe à vista o espaço ao lado da palavra fazer. Abra Programação e depois Lógica e Se e solte um Se nesse espaço. É este bloco que faz a pergunta da estrela: é a minha vez? [confident, clear, unhurried voice] Na comparação, clique no x e escolha passo. Troque o sinal de maior pelo sinal de igual e troque o 0 por 2. Agora a pergunta é: passo igual a 2? [confident, clear, unhurried voice] Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão. [engaging, energetic, conversational voice] Agora o então, que roda quando é a vez da estrela. Deixe à vista o espaço dentro do então. [confident, clear, unhurried voice] Encaixe Trocar imagem do sprite, de Jogo 2D, Sprites e Criar e trocar aparência. No primeiro heroi escolha estrela; no segundo, escolha pedra-estrela-acesa. [confident, clear, unhurried voice] Logo abaixo, ainda no então, encaixe outro Trocar imagem do sprite. No primeiro heroi escolha bau; no segundo, escolha bau-aberto. É este bloco que abre o baú. [confident, clear, unhurried voice] Embaixo, ainda no então, encaixe Alterar variável, de Programação e Variáveis, e escolha aviso. Solte um texto, de Programação e Valores, em cima do 1 e escreva: Na ordem certa! O baú abriu. ${senao2d('Fora da ordem. Comece de novo pelo sol.')} [engaging, energetic, conversational voice] Agora teste todos os casos. Clique no jogo e toque o sol, a lua e a estrela: o baú abre! [engaging, energetic, conversational voice] Toque na tecla R. Toque o sol e depois a estrela, pulando a lua: tudo apaga e o baú continua fechado. [engaging, energetic, conversational voice] Agora, sem começar outra partida, toque o sol, a lua e a estrela de novo: recomeçar pelo sol abre o baú. [reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: o encontro usa personagem e estrela, a pergunta do Se é passo igual a 2, no então estão a troca da estrela, a troca do baú e o aviso, e no senão estão Alterar passo para 0, as duas trocas de volta e o aviso de recomeçar. Se o baú abrir só com a estrela, confira o número da comparação. Depois de corrigir, teste de novo. ${verificar}`,
      },
      {
        key: 'revisao',
        title: 'Pense na ordem',
        kind: 'quiz',
        screen: 'Quiz com quatro perguntas: duas previsões com cena e dois diagnósticos.',
        ponte:
          'Hora de pensar na ordem! As perguntas retomam a vez da estrela, um símbolo fora da vez e o que pode estar errado nas perguntas do Se. Em cada uma tem uma explicação, e você pode tentar de novo. Nas perguntas com cena, escolha e clique em Ver o que acontece; nas outras, clique em Responder.',
        text: '',
      },
      entrega('2d'),
    ],
  },
  {
    slug: 'aula-2',
    title: 'Os símbolos da ilha',
    dimension: '3d',
    trechos: [
      {
        key: 'abertura',
        title: 'Os símbolos chegaram à ilha',
        kind: 'intro',
        screen:
          'Jogo pronto 3D. Mostrar a placa da ordem, as três pedras no gramado da frente e o baú. Tocar sol, lua e estrela e abrir o baú; não mostrar os blocos.',
        ponte:
          'Sua vez! Clique no jogo e use as setas ou W, A, S e D. Toque os símbolos na ordem da placa e abra o baú; depois erre a ordem. R começa outra partida. Depois clique em Próxima parte.',
        text: '[upbeat, welcoming voice] O baú dos símbolos chegou à Ilha do Farol, em três dimensões! Ele funciona como no seu jogo 2D: o jogo guarda passo, e cada símbolo pergunta se é a vez dele. [engaging, energetic, conversational voice] Olha aqui: as pedras e o baú têm animações que já vêm prontas. Cada pedra acende e apaga, e o baú abre. Você vai escolher quando cada uma toca. [upbeat, encouraging voice] Agora clique no jogo aqui na página e use as setas ou W, A, S e D. Toque os símbolos na ordem da placa e abra o baú. Depois erre a ordem. [reassuring, encouraging voice] A tecla R começa uma nova partida. Depois clique em Próxima parte.',
      },
      {
        key: 'lua',
        title: 'O sol e a lua',
        kind: 'build',
        etapa: 'lua',
        screen:
          'Projeto inicial 3D. Mostrar as três pedras e o fim de Ao iniciar; não montar os blocos no vídeo. Mostrar os nomes dos clipes acender e apagar no Passo a passo do projeto, parte 3D.',
        ponte:
          'Agora o sol e a lua da ilha: crie passo começando em 0; no sol, guarde 1, toque acender e mude o aviso; na lua, se passo = 1, guarde 2 e acenda; senão, volte a 0 e apague o sol e a lua. A montagem completa está no Passo a passo do projeto. Teste no jogo. Depois clique em Verificar projeto e em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Na ilha, o sol e a lua funcionam como no seu jogo 2D. [engaging, energetic, conversational voice] Lembra? passo começa em 0, no fim de Ao iniciar. O sol faz passo virar 1 e acende. [interested, animated voice] A lua pergunta se é a vez dela: passo igual a 1? Com o sim, passo vira 2 e ela acende. Com o não, a tentativa recomeça: passo volta a 0 e o sol e a lua apagam. [engaging, energetic, conversational voice] O que muda no 3D é onde ficam alguns blocos. O encontro fica em Jogo 3D, na gaveta Encostar. [engaging, energetic, conversational voice] Para acender e apagar, você usa Tocar a animação, em Objetos, na Animação do modelo. É este bloco que acende e apaga as pedras da ilha. [reassuring, encouraging voice] A montagem completa, bloco por bloco, está no Passo a passo do projeto, que fica na primeira aula. [upbeat, encouraging voice] Agora teste. Toque o sol e a lua: os dois acendem. Toque na tecla R e toque a lua primeiro: nada acende. ${verificar}`,
      },
      {
        key: 'estrela',
        title: 'A estrela abre o baú da ilha',
        kind: 'build',
        etapa: 'estrela',
        screen:
          'Mostrar a estrela e o baú fechado, e o nome do clipe abrir na ajuda. Não montar o encontro nem o Se no vídeo.',
        ponte:
          'Hora de abrir o baú da ilha! Se passo = 2, a estrela acende, o baú toca abrir e o aviso muda; senão, recomece como na lua. Teste a ordem certa, uma ordem errada e recomeçar depois de errar. Depois clique em Verificar projeto e em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Agora a estrela da ilha. Ela pergunta se é a vez dela, como no 2D: passo igual a 2? [interested, animated voice] Com o sim, a estrela acende, o baú toca a animação abrir e o aviso conta que o baú abriu. Com o não, a tentativa recomeça, como na lua. [engaging, energetic, conversational voice] Os blocos você já conhece: o encontro com a estrela fica em Jogo 3D, na gaveta Encostar, e a estrela e o baú tocam as animações com Tocar a animação, em Objetos, na Animação do modelo. A montagem completa está no Passo a passo do projeto. [upbeat, encouraging voice] Teste todos os casos. Toque o sol, a lua e a estrela: o baú abre. [upbeat, encouraging voice] Toque na tecla R e toque o sol e a estrela: tudo apaga e o baú fica fechado. Depois, sem começar outra partida, recomece pelo sol: o baú abre. ${verificar}`,
      },
      {
        key: 'revisao',
        title: 'Pense nos símbolos da ilha',
        kind: 'quiz',
        screen: 'Quiz com duas perguntas: uma previsão com cena 3D e uma sem cena.',
        ponte:
          'Hora de pensar nos símbolos da ilha! As perguntas retomam recomeçar depois de errar e onde fica a animação abrir. Em cada uma tem uma explicação, e você pode tentar de novo. Na pergunta com cena, clique em Ver o que acontece; na outra, clique em Responder.',
        text: '',
      },
      entrega('3d'),
    ],
  },
]

function entrega(d: SimbolosDimensao): SimbolosTrecho {
  const three = d === '3d'
  return {
    key: 'entrega',
    title: three ? 'Envie a sua ilha com o baú' : 'Envie o seu jogo com o baú',
    kind: 'delivery',
    etapa: 'estrela',
    screen:
      'Projeto atual, objetivos, Enviar meu projeto, confirmação Enviar e Projeto enviado!. Não preencher Recado nem simular o envio.',
    ponte:
      'Confira os objetivos e clique em Enviar meu projeto. Confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.',
    text: `[pleased, lively voice] ${three ? 'Pronto, você levou o passo para outro mundo: na ilha, o baú também só abre na ordem certa.' : 'Olha só o que você programou: o jogo lembra até onde a sequência chegou, cada símbolo pergunta se é a vez dele, e só a ordem certa abre o baú! Na próxima aula, você leva essa regra para a ilha, em três dimensões.'} [confident, clear, unhurried voice] Antes de enviar, jogue uma partida inteira: abra o baú na ordem certa, erre a ordem e recomece pelo sol${three ? '' : '. Acenda o farol com a chave também'}. Depois toque na tecla R e confira que o baú volta fechado. [confident, clear, unhurried voice] Agora clique em Verificar projeto e corrija o que faltar. [confident, clear, unhurried voice] Quando os objetivos estiverem cumpridos, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.`,
  }
}

/** A montagem completa, opcional, das duas dimensões (o Passo a passo do projeto). */
export function simbolosAjuda(d: SimbolosDimensao): {
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
  const acender = (simbolo: string) =>
    three ? animacao('acender', simbolo) : imagem(simbolo, `pedra-${simbolo}-acesa`)
  const apagar = (simbolo: string) =>
    three ? animacao('apagar', simbolo) : imagem(simbolo, `pedra-${simbolo}`)
  const se = (n: number) =>
    `Dentro do fazer, encaixe Se, de Programação → Lógica e Se. Na comparação x > 0, clique no x e escolha passo, troque o sinal de maior pelo sinal de igual e troque o 0 por ${n}. Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.`
  const recomeco = [
    'Dentro do senão, encaixe Alterar variável, escolha passo e troque o 1 por 0.',
    `Logo abaixo, ainda no senão, ${apagar('sol')}`,
    `Embaixo, ${apagar('lua')}`,
    'Por último, ainda no senão, encaixe Alterar variável, escolha aviso, solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva Fora da ordem. Comece de novo pelo sol.',
  ]
  return [
    {
      key: 'sol',
      title: 'O sol começa',
      idea: 'A variável passo guarda até onde a sequência chegou. Toda partida começa com 0; o encontro com o sol muda para 1 e acende o sol.',
      steps: [
        'Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco.',
        'Abra Programação → Variáveis. Pegue Criar variável e encaixe no fim de Ao iniciar. Clique em contador, apague e escreva passo. Deixe o valor 0.',
        encontro('sol', 'depois do último evento'),
        'Dentro do fazer, encaixe Alterar variável, de Programação → Variáveis. Escolha passo e deixe o valor 1.',
        `Logo abaixo, ${acender('sol')}`,
        'Ainda no fazer, encaixe outro Alterar variável e escolha aviso. Solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva O sol acendeu! Agora a lua.',
      ],
      test: 'Leve o personagem até o sol. O sol acende e o aviso muda. Toque na tecla R: o sol volta apagado.',
      correction:
        'Se nada acontecer, confira se o encontro usa personagem e sol. Não crie passo dentro do encontro: ela nasce em Ao iniciar, com 0, e o encontro só muda para 1.',
    },
    {
      key: 'lua',
      title: 'A lua pergunta a vez',
      idea: 'A lua só acende se o sol veio antes, ou seja, se passo é 1. Então ela pergunta com um Se: passo = 1? Se for, passo vira 2; senão, a tentativa recomeça.',
      steps: [
        encontro('lua', 'depois do encontro com o sol'),
        se(1),
        'Dentro do então, encaixe Alterar variável, escolha passo e troque o 1 por 2.',
        `Logo abaixo, ainda no então, ${acender('lua')}`,
        'Embaixo, ainda no então, encaixe Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva A lua acendeu! Agora a estrela.',
        ...recomeco,
      ],
      test: 'Toque o sol e depois a lua: as duas acendem. Toque na tecla R e toque a lua primeiro: nada acende e o aviso pede para começar pelo sol.',
      correction:
        'Se a lua acender sem o sol, confira a comparação: passo, o sinal de igual e o 1.',
    },
    {
      key: 'estrela',
      title: 'A estrela abre o baú',
      idea: 'A estrela pergunta passo = 2. Se for a vez dela, ela acende e o baú abre; senão, a tentativa recomeça, como na lua.',
      steps: [
        encontro('estrela', 'depois do encontro com a lua'),
        se(2),
        `Dentro do então, ${acender('estrela')}`,
        three
          ? `Logo abaixo, ainda no então, ${animacao('abrir', 'bau')}`
          : `Logo abaixo, ainda no então, ${imagem('bau', 'bau-aberto')}`,
        'Embaixo, ainda no então, encaixe Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva Na ordem certa! O baú abriu.',
        `Dentro do senão, monte o mesmo recomeço da lua: Alterar passo para 0, ${three ? 'Tocar a animação apagar no sol e na lua' : 'as trocas de volta do sol (pedra-sol) e da lua (pedra-lua)'} e o aviso Fora da ordem. Comece de novo pelo sol.`,
      ],
      test: 'Toque o sol, a lua e a estrela: o baú abre. Toque na tecla R, toque o sol e a estrela: tudo apaga e o baú fica fechado. Sem começar outra partida, toque o sol, a lua e a estrela: o baú abre.',
      correction:
        'Se o baú abrir só com a estrela, confira se a pergunta do Se é passo igual a 2. Se ele nunca abrir, confira se a abertura do baú está dentro do então e não no senão.',
    },
  ]
}
