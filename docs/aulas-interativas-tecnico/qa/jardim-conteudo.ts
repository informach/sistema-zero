/**
 * A fonte editorial da missão "O Jardim Secreto": as falas gravadas (com as marcas do ElevenLabs),
 * as notas de tela, as falas do Zappy na página e o Passo a passo das duas dimensões. O gerador
 * (`gerar-jardim-secreto.ts`, com o gerador comum `poder-gerador.ts`) monta manifestos, roteiros e
 * caderno a partir daqui.
 *
 * Missão do posto (24/11/2026, pedido da Helena): o Jardim não ensina o passo a passo, porque montar
 * o jogo é o desafio para subir de posto, e tudo já foi ensinado nos cursos base (a Chave do Farol e a
 * Ilha do Farol), com outro tema. Cada aula tem a abertura com o jogo pronto, três etapas e o fim:
 * - cada etapa mostra o que o jogo precisa fazer (o jogo do começo da etapa e as animações da
 *   edição) e diz em que aula do curso base aquilo foi ensinado; nenhum bloco é montado no vídeo, e o
 *   Verificar projeto confere pelo que o jogo faz, então qualquer solução certa passa;
 * - a última etapa envia o projeto; depois do envio, o fim da Aula 1 entrega o Passo a passo do
 *   projeto (o caderno, com as duas aulas), para conferir e entender, e o fim da Aula 2 é só a
 *   comemoração;
 * - sem dicas e sem quiz: quem tiver dúvida volta na aula do curso base;
 * - a Debinha (Aula 1) e o Dedé (Aula 2) fazem as perguntas marcadas em `kids`.
 * Na publicação, o PDF entra na Aula 1 marcado como caderno do aluno para o Zappy: o passo a passo do
 * projeto é sempre o caderno e fica disponível para ele (decisão de 24/11/2026).
 *
 * Os caminhos das setas no Na tela contam a velocidade de cada jogo (`jardim-projeto.ts`). No 2D
 * (960 × 600), velocidade 5: 300 pixels por segundo. O personagem sai de x 130 e y 310 (72 × 72), o
 * regador fica em x 300 e y 190 (60 × 53; em x 390 depois da parte da posição) e a flor em x 740 e
 * y 265 (96 × 120). Na linha do começo (y 310), andar para a direita leva à flor sem passar pelo
 * regador. No 3D, 4 unidades por segundo: o personagem sai de x −7 e z 1, o regador fica em x −4 e
 * z −2 (em x −2 depois da parte da posição) e a flor em x 5 e z 1. A seta de cima leva para o fundo
 * (z menor). O jardim 3D não tem objetos sólidos no caminho. São estimativas: acertar no Verificar
 * plano.
 */
import type { JardimDimensao, JardimEtapa } from './jardim-projeto'
import type { PoderTrecho } from './poder-gerador'

export type JardimTrecho = PoderTrecho<JardimEtapa>

// ── Os pontos e os caminhos do 2D (960 × 600, 300 pixels por segundo) ───────
const PERSONAGEM_NA_PREVIA = '[apontar prévia 166 346]'
const REGADOR_NA_PREVIA = '[apontar prévia 330 216]'
const FLOR_NA_PREVIA = '[apontar prévia 788 325]'
const SOBE_ATE_O_REGADOR = '[segurar tecla ArrowUp por 0,4 s]'
const ATE_O_REGADOR_2D = `[segurar tecla ArrowRight por 0,5 s] ${SOBE_ATE_O_REGADOR}`
/** Do regador, desce para a linha do começo e anda até encostar na flor. */
const DO_REGADOR_A_FLOR_2D =
  '[segurar tecla ArrowDown por 0,4 s] [segurar tecla ArrowRight por 1,4 s]'

// ── Os pontos e os caminhos do 3D (4 unidades por segundo) ───────────────────
/** O aviso fica no alto, no meio do jogo (640 × 360 no Estúdio). */
const AVISO_NA_PREVIA_3D = '[apontar prévia 320 16]'
const ATE_O_REGADOR_3D = '[segurar tecla ArrowUp por 0,7 s] [segurar tecla ArrowRight por 0,7 s]'
const DO_REGADOR_A_FLOR_3D =
  '[segurar tecla ArrowDown por 0,7 s] [segurar tecla ArrowRight por 2,1 s]'
const DO_COMECO_A_FLOR_3D = '[segurar tecla ArrowRight por 2,8 s]'
const ESTIMATIVA =
  'Os tempos das setas são estimativas para a velocidade 4: acertar no Verificar plano.'

// ── A missão (24/11/2026): o vídeo mostra o que o jogo precisa fazer e nunca monta os blocos ──
/** O fim de uma etapa: a criança programa e verifica sozinha. */
const SUA_VEZ = (teste: string) =>
  `[upbeat, encouraging voice] Agora é com você! ${teste} [engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. [engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.`
/** O fim da última etapa, que envia o projeto. */
const ENVIE =
  '[upbeat, encouraging voice] Agora é com você! [engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. [engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. [engaging, energetic, conversational voice] Quando aparecer Projeto enviado!, clique em Próxima parte.'
const FIM_DA_ETAPA =
  'Nada de abrir a paleta nem mexer nos blocos: a montagem é da criança, e o vídeo termina com o Estúdio aberto.'
const FIM_DO_ENVIO =
  'Nada de abrir a paleta, mexer nos blocos nem enviar: a montagem e o envio são da criança, e o vídeo termina com o Estúdio aberto.'
/** O Passo a passo chega no fim da aula, depois do envio: para conferir e entender, não para copiar. */
const FALA_DO_CADERNO =
  '[engaging, energetic, conversational voice] Aqui está o Passo a passo do projeto. Nele está um jeito de montar cada etapa da missão, bloco por bloco. [engaging, energetic, conversational voice] Use para conferir o seu jogo e entender cada escolha. O seu jeito pode ser diferente e estar certo também, porque o Verificar projeto confere o que o jogo faz. [upbeat, encouraging voice] Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o material.'
const TELA_DO_CADERNO = (saida: 'Concluir aula') =>
  `No "Aqui está o Passo a passo do projeto", apontar o material [apontar livro]. No "Nele está um jeito de montar", colocar o livro em tela cheia [livro tela cheia]. No "cada etapa da missão", passar da capa para a página seguinte [livro próxima]. No "bloco por bloco", passar mais uma página [livro próxima]. No "Use para conferir o seu jogo", passar mais uma página [livro próxima]. No "O seu jeito pode ser diferente", passar mais uma página [livro próxima]. No "Se quiser", sair da tela cheia [livro sair da tela cheia]. No "você pode ler aqui mesmo", mostrar o livro no tamanho da aula [apontar livro]. No "também pode clicar em Baixar", clicar no botão **Baixar**, ao lado do nome do arquivo [baixar]. No "Agora clique em ${saida}", clicar em **${saida}** [concluir aula]. Não demonstrar a impressão nem os controles do leitor.`

export const jardimAulas: {
  slug: string
  title: string
  dimension: JardimDimensao
  trechos: JardimTrecho[]
}[] = [
  {
    slug: 'aula-1',
    title: 'Faça o jardim florescer em 2D',
    dimension: '2d',
    trechos: [
      {
        key: 'abertura',
        title: 'Conheça sua missão',
        kind: 'intro',
        kids: ['E se eu pegar o regador antes, a flor abre?'],
        screen:
          'Do "Oi" até o "criar O Jardim Secreto", a tela mostra o título O Jardim Secreto sobre a cena inicial do jogo pronto [na edição: título O Jardim Secreto]. No "Para andar, use as setas", ampliar o jogo pronto [ampliar jogo] e apontar as quatro setas no canto de baixo do jogo [apontar setas]. No "Olha aqui: quando eu seguro a seta da direita", segurar a seta da direita da tela até o personagem encostar na flor, sem pegar o regador [segurar seta da direita por 1,9 s]. No "E repare no aviso aqui em cima", apontar o aviso, que agora pede o regador [apontar jogo 200 31]. No "E se eu pegar o regador antes", manter a cena parada, sem pegar o regador. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não pegar o regador nem abrir a flor: a partida é da criança.',
        ponte:
          'Sua vez! Jogue a versão pronta: use as setas para andar, pegue o regador e leve o personagem até a flor. A tecla R recomeça. Quando terminar, clique em Próxima parte.',
        text: '[upbeat, welcoming voice] Oi! Você já criou A Chave do Farol e A Ilha do Farol. Agora chegou a sua missão do Faísca: criar O Jardim Secreto! [engaging, energetic, conversational voice] No jardim tem uma flor fechada. Para ela abrir, o personagem precisa pegar o regador e depois chegar até a flor. [engaging, energetic, conversational voice] Para andar, use as setas no canto de baixo do jogo. No computador, você também pode clicar dentro do jogo e usar as setas do teclado. [interested, animated voice] Olha aqui: quando eu seguro a seta da direita, o personagem anda até a flor. [interested, animated voice] E repare no aviso aqui em cima: a flor continua fechada, e o aviso diz o que falta. [curious] E se eu pegar o regador antes, a flor abre? [engaging, energetic, conversational voice] Isso eu deixo para você descobrir. Para começar outra partida, toque na tecla R. [confident, clear, unhurried voice] Esta missão é diferente das aulas que você já fez: agora, quem programa o jogo é você, sem eu montar os blocos junto. Em cada parte, eu mostro o que o jogo precisa fazer, e você programa no Estúdio. [reassuring, encouraging voice] Você já sabe tudo o que precisa, porque aprendeu na Chave do Farol. Se esquecer como se faz alguma coisa, eu digo em qual aula você aprendeu, e é só voltar lá. [engaging, energetic, conversational voice] Nesta aula, o jardim é numa tela plana, em duas dimensões. Na próxima, ele ganha profundidade, em três dimensões. [upbeat, encouraging voice] Agora é a sua vez: jogue até a flor abrir. Quando terminar, clique em Próxima parte.',
      },
      {
        key: 'andar',
        title: 'Ande pelo jardim',
        kind: 'build',
        etapa: 'limite',
        screen: `A parte começa com o Estúdio expandido e o projeto do começo da aula [expandir estúdio]. No "clique em Rodar de novo, no alto do Estúdio", clicar em **Rodar de novo** [rodar de novo]. No "e segure uma seta do teclado", segurar a seta da direita do teclado [segurar tecla ArrowRight por 1 s]. No "O personagem não sai do lugar", apontar o personagem parado ${PERSONAGEM_NA_PREVIA}. No "e não aparece nenhuma seta", apontar o canto de baixo do jogo, ainda sem setas [apontar setas na prévia]. No "Primeira: as setas aparecem", a edição mostra o jogo pronto [na edição: animação do jogo pronto, com as quatro setas no canto de baixo e o personagem andando para cada lado e parando ao soltar]. No "Segunda: o personagem não sai do jardim", a edição mostra a borda [na edição: animação do personagem chegando à borda do jardim, parando ali e voltando]. No "aprendeu na Chave do Farol, Aula 1", a edição mostra de onde vem [na edição: capa da Chave do Farol, Aula 1, com as partes Faça o personagem andar e Mantenha o personagem na tela]. No "Para saber se deu certo, clique em Verificar projeto", verificar [verificar projeto]. No "ele mostra o que ainda falta", apontar os objetivos [apontar "Objetivos do projeto"]. No "Programe no Estúdio", apontar a paleta [apontar paleta]. No "Funcionou? Clique em Verificar projeto", apontar o botão, sem clicar [apontar "Verificar projeto"]. ${FIM_DA_ETAPA}`,
        ponte:
          'Sua vez de programar! As setas aparecem só nas quatro direções, o personagem anda e para quando você solta, e ele não sai do jardim. Esqueceu como faz? Volte na Chave do Farol, Aula 1. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Primeira etapa da missão: o personagem precisa andar pelo jardim. [engaging, energetic, conversational voice] Aqui no seu jogo, clique em Rodar de novo, no alto do Estúdio, e segure uma seta do teclado. [interested, animated voice] Tá vendo? O personagem não sai do lugar, e não aparece nenhuma seta no canto de baixo do jogo. [confident, clear, unhurried voice] Nesta etapa, o seu jogo precisa fazer duas coisas. [engaging, energetic, conversational voice] Primeira: as setas aparecem no canto de baixo do jogo, só nas quatro direções. Quando você segura uma seta, o personagem anda para aquele lado, e quando solta, ele para. [engaging, energetic, conversational voice] Segunda: o personagem não sai do jardim. Quando chega na borda, ele fica ali e consegue voltar. [reassuring, encouraging voice] Você já sabe fazer as duas coisas: aprendeu na Chave do Farol, Aula 1, nas partes Faça o personagem andar e Mantenha o personagem na tela. Se esquecer como faz, volte lá. [engaging, energetic, conversational voice] Para saber se deu certo, clique em Verificar projeto. Olha: ele mostra o que ainda falta no seu jogo. ${SUA_VEZ('Programe no Estúdio e teste com as setas.')}`,
      },
      {
        key: 'regador-e-flor',
        title: 'A flor só abre com o regador',
        kind: 'build',
        etapa: 'decisao',
        kids: ['E se o personagem chegar na flor sem o regador?'],
        screen: `A parte começa com o Estúdio expandido e o projeto da etapa anterior [expandir estúdio]. No "Clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo]. No "pegue o regador", levar o personagem até o regador ${ATE_O_REGADOR_2D}. No "e leve o personagem até a flor", levar o personagem até a flor ${DO_REGADOR_A_FLOR_2D}. No "O personagem passa pelo regador", apontar o regador, que continua no lugar ${REGADOR_NA_PREVIA}. No "e nada acontece", apontar a flor fechada ${FLOR_NA_PREVIA}. No "Primeira: quando o personagem encosta no regador", a edição mostra o jogo pronto [na edição: animação do personagem encostando no regador, o regador sumindo e o aviso contando que ele pegou]. No "Segunda: o jogo lembra", a edição mostra a memória [na edição: animação de uma memória de sim ou não, que começa em não e vira sim quando o regador some]. No "Essa é a terceira", a edição mostra a flor fechada [na edição: animação do personagem chegando à flor sem o regador, com a flor fechada e o aviso pedindo o regador]. No "Quarta: com o regador, a flor abre", a edição mostra a flor abrindo [na edição: animação da flor abrindo e do aviso comemorando]. No "Você aprendeu tudo isso na Chave do Farol", a edição mostra de onde vem [na edição: capas da Chave do Farol, Aulas 2 e 3]. No "Programe no Estúdio", apontar a paleta [apontar paleta]. No "Funcionou? Clique em Verificar projeto", apontar o botão, sem clicar [apontar "Verificar projeto"]. ${FIM_DA_ETAPA}`,
        ponte:
          'Agora o regador e a flor! O regador some quando o personagem encosta nele, e um aviso conta. O jogo lembra se ele pegou o regador. Sem o regador, a flor fica fechada e o aviso diz o que falta; com ele, a flor abre e o aviso comemora. Esqueceu como faz? Volte na Chave do Farol, Aulas 2 e 3. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Segunda etapa: o regador e a flor. [engaging, energetic, conversational voice] Clique em Rodar de novo, pegue o regador e leve o personagem até a flor. [interested, animated voice] Tá vendo? O personagem passa pelo regador e chega na flor, e nada acontece. [confident, clear, unhurried voice] Nesta etapa, o seu jogo precisa fazer quatro coisas. [engaging, energetic, conversational voice] Primeira: quando o personagem encosta no regador, o regador some, e um aviso conta que ele pegou. [engaging, energetic, conversational voice] Segunda: o jogo lembra se o personagem já pegou o regador. No começo da partida, ele ainda não pegou. [curious] E se o personagem chegar na flor sem o regador? [engaging, energetic, conversational voice] Essa é a terceira: sem o regador, a flor continua fechada, e o aviso diz o que falta. [engaging, energetic, conversational voice] Quarta: com o regador, a flor abre, e o aviso comemora. [reassuring, encouraging voice] Você aprendeu tudo isso na Chave do Farol: a recolher e guardar a chave, na Aula 2, e a porta que confere a chave, na Aula 3. Se esquecer como faz, volte lá. ${SUA_VEZ('Programe no Estúdio e teste sem o regador e com ele. Para começar outra partida, toque na tecla R.')}`,
      },
      {
        key: 'posicao',
        title: 'Um lugar novo para o regador',
        kind: 'delivery',
        etapa: 'posicao',
        screen: `A parte começa com o Estúdio expandido e o projeto da etapa anterior [expandir estúdio]. No "Clique em Rodar de novo e repare", clicar em **Rodar de novo** [rodar de novo]. No "o regador está sempre no mesmo lugar", apontar o regador ${REGADOR_NA_PREVIA}. No "escolha outro lugar para o regador", a edição mostra a troca [na edição: animação do regador indo para outro lugar do jardim, ainda ao alcance do personagem]. No "sem o regador, a flor fica fechada", a edição mostra os dois testes [na edição: animação dos dois testes, com a flor fechada sem o regador e aberta com ele]. No "na Chave do Farol, Aula 3", a edição mostra de onde vem [na edição: capa da Chave do Farol, Aula 3, com a parte Escolha onde fica a chave]. No "Funcionou? Clique em Verificar projeto", apontar o botão, sem clicar [apontar "Verificar projeto"]. No "clique em Enviar meu projeto", apontar o botão, sem clicar [apontar "Enviar meu projeto"]. ${FIM_DO_ENVIO}`,
        ponte:
          'Última etapa! Escolha outro lugar para o regador, aonde o personagem consiga chegar, e teste a flor sem ele e com ele. Esqueceu como faz? Volte na Chave do Farol, Aula 3. Depois clique em Verificar projeto, em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Última etapa da missão: um lugar novo para o regador. [engaging, energetic, conversational voice] Clique em Rodar de novo e repare: o regador está sempre no mesmo lugar do jardim. [confident, clear, unhurried voice] Nesta etapa, escolha outro lugar para o regador, um lugar aonde o personagem consiga chegar. [engaging, energetic, conversational voice] Depois teste de novo os dois casos: sem o regador, a flor fica fechada; com ele, a flor abre. [reassuring, encouraging voice] Você aprendeu a mudar o lugar de um objeto na Chave do Farol, Aula 3, na parte Escolha onde fica a chave. Se esquecer como faz, volte lá. ${ENVIE}`,
      },
      {
        key: 'missao-cumprida',
        title: 'Seu jardim 2D está pronto',
        kind: 'material',
        screen: `No "Pronto, o seu jardim", a edição mostra o jogo pronto [na edição: o jardim 2D com a flor aberta]. ${TELA_DO_CADERNO('Concluir aula')}`,
        ponte:
          'Seu jardim 2D está pronto! Este é o seu Passo a passo do projeto: confira como cada etapa pode ser montada. Você pode ler aqui mesmo ou baixar para guardar. Quando terminar, clique em Concluir aula.',
        text: `[pleased, lively voice] Pronto, o seu jardim em duas dimensões está programado e enviado! Você fez a primeira parte da missão sozinho. ${FALA_DO_CADERNO} [engaging, energetic, conversational voice] Na próxima aula, o seu jardim ganha profundidade, em três dimensões. [confident, clear, unhurried voice] Agora clique em Concluir aula.`,
      },
    ],
  },
  {
    slug: 'aula-2',
    title: 'Leve sua missão para o 3D',
    dimension: '3d',
    trechos: [
      {
        key: 'abertura',
        title: 'O mesmo desafio, com profundidade',
        kind: 'intro',
        kids: ['Será que o regador está no mesmo lugar do jardim 2D?'],
        screen: `Do "Oi" até o "em três dimensões", a tela mostra o título O Jardim Secreto sobre a cena inicial do jogo pronto [na edição: título O Jardim Secreto]. No "Para andar, clique dentro do jogo", ampliar o jogo pronto [ampliar jogo] e clicar no meio do jogo, para o teclado ir para ele [tocar jogo]. No "Olha aqui: quando eu seguro a seta da direita", segurar a seta da direita do teclado até o personagem encostar na flor, sem pegar o regador ${DO_COMECO_A_FLOR_3D}. No "Repare no aviso aqui em cima", apontar o aviso, que agora pede o regador [apontar jogo 480 24]. No "Será que o regador está", manter a cena parada, sem procurar o regador. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não pegar o regador nem abrir a flor: a partida é da criança. ${ESTIMATIVA}`,
        ponte:
          'Sua vez! Jogue a versão pronta: segure as setas para andar, pegue o regador e leve o personagem até a flor. A tecla R recomeça. Quando terminar, clique em Próxima parte.',
        text: '[upbeat, welcoming voice] Oi! Na Aula 1, você programou O Jardim Secreto numa tela plana, em duas dimensões. Agora o jardim ganhou profundidade, em três dimensões! [engaging, energetic, conversational voice] A missão continua a mesma: pegar o regador e chegar até a flor para ela abrir. [engaging, energetic, conversational voice] Para andar, clique dentro do jogo e segure uma seta do teclado. As letras W, A, S e D também funcionam. [interested, animated voice] Olha aqui: quando eu seguro a seta da direita, o personagem anda até a flor. [interested, animated voice] Repare no aviso aqui em cima: a flor continua fechada, e o aviso diz o que falta. [curious] Será que o regador está no mesmo lugar do jardim 2D? [engaging, energetic, conversational voice] Isso eu deixo para você descobrir. Para começar outra partida, toque na tecla R. [confident, clear, unhurried voice] Como na Aula 1, quem programa é você. Em cada parte, eu mostro o que o jogo precisa fazer, e você programa no Estúdio. [reassuring, encouraging voice] Tudo o que você precisa, aprendeu na Ilha do Farol. Se esquecer como se faz alguma coisa, eu digo em qual aula está, e é só voltar lá. [upbeat, encouraging voice] Agora é a sua vez: jogue até a flor abrir. Quando terminar, clique em Próxima parte.',
      },
      {
        key: 'andar',
        title: 'Ande e recolha o regador',
        kind: 'build',
        etapa: 'coleta',
        screen: `A parte começa com o Estúdio expandido e o projeto do começo da aula [expandir estúdio]. No "clique em Rodar de novo, no alto do Estúdio", clicar em **Rodar de novo**, que também dá ao jogo o foco do teclado [rodar de novo]. No "e segure uma seta do teclado", segurar a seta da direita do teclado [segurar tecla ArrowRight por 1 s]. No "O personagem não sai do lugar", a câmera continua parada no começo do jardim. No "Primeira: quando você segura uma seta", a edição mostra o jogo pronto [na edição: animação do jogo 3D pronto, com o personagem andando pelo chão para os quatro lados e parando ao soltar a seta]. No "Segunda: quando o personagem encosta no regador", a edição mostra a coleta [na edição: animação do personagem encostando no regador, o regador sumindo e o aviso contando que ele pegou]. No "aprendeu na Ilha do Farol", a edição mostra de onde vem [na edição: capas da Ilha do Farol, Aulas 1 e 2, com as partes Faça o personagem andar e Recolha a chave]. No "Para saber se deu certo, clique em Verificar projeto", verificar [verificar projeto]. No "ele mostra o que ainda falta", apontar os objetivos [apontar "Objetivos do projeto"]. No "Programe no Estúdio", apontar a paleta [apontar paleta]. No "Funcionou? Clique em Verificar projeto", apontar o botão, sem clicar [apontar "Verificar projeto"]. ${FIM_DA_ETAPA} ${ESTIMATIVA}`,
        ponte:
          'Sua vez de programar o jardim 3D! O personagem anda pelo chão com as setas e para quando você solta. Quando ele encosta no regador, o regador some e um aviso conta. Esqueceu como faz? Volte na Ilha do Farol, Aulas 1 e 2. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Primeira etapa da missão no 3D: andar pelo jardim e recolher o regador. [engaging, energetic, conversational voice] Aqui no seu jogo, clique em Rodar de novo, no alto do Estúdio, e segure uma seta do teclado. [interested, animated voice] Tá vendo? O personagem não sai do lugar. [confident, clear, unhurried voice] Nesta etapa, o seu jogo precisa fazer duas coisas. [engaging, energetic, conversational voice] Primeira: quando você segura uma seta, o personagem anda pelo chão para aquele lado, e quando solta, ele para. [engaging, energetic, conversational voice] Segunda: quando o personagem encosta no regador, o regador some, e um aviso conta que ele pegou. [reassuring, encouraging voice] Você já sabe fazer as duas coisas: aprendeu na Ilha do Farol, Aula 1, na parte Faça o personagem andar, e na Aula 2, na parte Recolha a chave. Se esquecer como faz, volte lá. [engaging, energetic, conversational voice] Para saber se deu certo, clique em Verificar projeto. Olha: ele mostra o que ainda falta no seu jogo. ${SUA_VEZ('Programe no Estúdio e teste com as setas.')}`,
      },
      {
        key: 'regador-e-flor',
        title: 'A flor abre uma vez só',
        kind: 'build',
        etapa: 'decisao',
        kids: ['E se o personagem voltar na flor depois que ela abriu?'],
        screen: `A parte começa com o Estúdio expandido e o projeto da etapa anterior [expandir estúdio]. No "Clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo] e tocar no chão do jogo, para o teclado ir para ele: sem isso, as setas de cima e de baixo rolam a página [tocar prévia 320 300]. No "pegue o regador", levar o personagem até o regador ${ATE_O_REGADOR_3D}. No "e leve o personagem até a flor", levar o personagem até a flor ${DO_REGADOR_A_FLOR_3D}. No "e nada acontece", apontar o aviso, que não muda ${AVISO_NA_PREVIA_3D}. No "Primeira: o jogo lembra", a edição mostra a memória [na edição: animação de uma memória de sim ou não, que começa em não e vira sim quando o regador some]. No "Segunda: sem o regador", a edição mostra a flor fechada [na edição: animação do personagem chegando à flor sem o regador, com a flor fechada e o aviso pedindo o regador]. No "Terceira: com o regador, a flor floresce", a edição mostra a flor abrindo [na edição: animação da flor florescendo e do aviso comemorando]. No "Essa é a quarta", a edição mostra a volta [na edição: animação do personagem saindo da flor aberta e voltando, e a flor continua aberta, sem florescer de novo]. No "Você aprendeu tudo isso na Ilha do Farol", a edição mostra de onde vem [na edição: capas da Ilha do Farol, Aulas 2 e 3]. No "Programe no Estúdio", apontar a paleta [apontar paleta]. No "Funcionou? Clique em Verificar projeto", apontar o botão, sem clicar [apontar "Verificar projeto"]. ${FIM_DA_ETAPA} ${ESTIMATIVA}`,
        ponte:
          'Agora a flor! O jogo lembra se o personagem pegou o regador. Sem o regador, a flor fica fechada e o aviso diz o que falta; com ele, a flor floresce e o aviso comemora. E ela floresce uma vez só. Esqueceu como faz? Volte na Ilha do Farol, Aulas 2 e 3. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Segunda etapa: a flor. [engaging, energetic, conversational voice] Clique em Rodar de novo, pegue o regador e leve o personagem até a flor. [interested, animated voice] Tá vendo? O regador some, o personagem chega na flor, e nada acontece. [confident, clear, unhurried voice] Nesta etapa, o seu jogo precisa fazer quatro coisas. [engaging, energetic, conversational voice] Primeira: o jogo lembra se o personagem já pegou o regador. No começo da partida, ele ainda não pegou. [engaging, energetic, conversational voice] Segunda: sem o regador, a flor continua fechada, e o aviso diz o que falta. [engaging, energetic, conversational voice] Terceira: com o regador, a flor floresce, e o aviso comemora. [curious] E se o personagem voltar na flor depois que ela abriu? [engaging, energetic, conversational voice] Essa é a quarta: a flor continua aberta e não floresce de novo. Ela abre uma vez só. [reassuring, encouraging voice] Você aprendeu tudo isso na Ilha do Farol: a guardar que pegou a chave, na Aula 2, e o farol que confere a chave e acende uma vez só, na Aula 3. Se esquecer como faz, volte lá. ${SUA_VEZ('Programe no Estúdio e teste sem o regador, com ele e voltando à flor. Para começar outra partida, toque na tecla R.')}`,
      },
      {
        key: 'posicao',
        title: 'Um lugar novo no chão',
        kind: 'delivery',
        etapa: 'posicao',
        screen: `A parte começa com o Estúdio expandido e o projeto da etapa anterior [expandir estúdio]. No "Clique em Rodar de novo e repare", clicar em **Rodar de novo** [rodar de novo]. No "o regador está sempre no mesmo lugar", a câmera mostra o regador no começo do jardim, sem andar. No "escolha outro lugar no chão para o regador", a edição mostra a troca [na edição: animação do regador indo para outro lugar do chão, ainda ao alcance do personagem]. No "sem o regador, a flor fica fechada", a edição mostra os dois testes [na edição: animação dos dois testes, com a flor fechada sem o regador e florescendo com ele]. No "na Ilha do Farol, Aula 3", a edição mostra de onde vem [na edição: capa da Ilha do Farol, Aula 3, com a parte Escolha seu esconderijo e teste de verdade]. No "Funcionou? Clique em Verificar projeto", apontar o botão, sem clicar [apontar "Verificar projeto"]. No "clique em Enviar meu projeto", apontar o botão, sem clicar [apontar "Enviar meu projeto"]. ${FIM_DO_ENVIO}`,
        ponte:
          'Última etapa! Escolha outro lugar no chão para o regador, aonde o personagem consiga chegar, e teste a flor sem ele e com ele. Esqueceu como faz? Volte na Ilha do Farol, Aula 3. Depois clique em Verificar projeto, em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.',
        text: `[engaging, energetic, conversational voice] Última etapa da missão: um lugar novo para o regador no jardim 3D. [engaging, energetic, conversational voice] Clique em Rodar de novo e repare: o regador está sempre no mesmo lugar. [confident, clear, unhurried voice] Nesta etapa, escolha outro lugar no chão para o regador, um lugar aonde o personagem consiga chegar. [engaging, energetic, conversational voice] Depois teste de novo os dois casos: sem o regador, a flor fica fechada; com ele, a flor floresce. [reassuring, encouraging voice] Você aprendeu a mudar o lugar de um objeto no 3D na Ilha do Farol, Aula 3, na parte Escolha seu esconderijo e teste de verdade. Se esquecer como faz, volte lá. ${ENVIE}`,
      },
      {
        key: 'missao-cumprida',
        title: 'Missão cumprida!',
        kind: 'fecho',
        screen:
          'No "Missão cumprida!", a edição mostra o jogo pronto [na edição: o jardim 3D com a flor aberta]. No "o Passo a passo do projeto está no fim da Aula 1", a edição mostra a capa do caderno [na edição: capa do Passo a passo do projeto]. No "Agora clique em Concluir aula", clicar em **Concluir aula** [concluir aula].',
        ponte:
          'Missão cumprida! Você programou O Jardim Secreto em 2D e em 3D. Se quiser conferir como cada etapa pode ser montada, o Passo a passo do projeto está no fim da Aula 1. Clique em Concluir aula.',
        text: '[pleased, lively voice] Missão cumprida! Você programou O Jardim Secreto em duas e em três dimensões, sozinho. [engaging, energetic, conversational voice] Com as duas aulas concluídas, a sua missão do Faísca está completa. [upbeat, encouraging voice] Se quiser conferir como cada etapa pode ser montada, o Passo a passo do projeto está no fim da Aula 1. [confident, clear, unhurried voice] Agora clique em Concluir aula.',
      },
    ],
  },
]

/** A montagem completa, opcional, das duas dimensões (o Passo a passo do projeto). */
export function jardimAjuda(d: JardimDimensao): {
  key: string
  title: string
  idea: string
  steps: string[]
  test: string
  correction: string
}[] {
  const three = d === '3d',
    ext = three ? 'Jogo 3D' : 'Jogo 2D'
  return [
    {
      key: 'movimento',
      title: 'O personagem não anda',
      idea: 'Em cada quadro, o jogo olha a seta. Se você está segurando a seta, o personagem dá um passinho para o lado dela. Por isso, o movimento fica dentro do bloco que se repete a cada quadro.',
      steps: three
        ? [
            'Abra Enquanto estiver rodando. Deixe à vista A cada quadro da cena cena e o aviso dentro dele.',
            'Abra Jogo 3D → Movimento → Andar com o teclado. Arraste Fazer personagem andar com as setas (ou WASD), velocidade 3 para dentro do quadro, antes de Escrever na tela.',
            'Escolha personagem no nome e coloque 4 na velocidade. A câmera, a caminhada permitida e as animações já estão em Ao iniciar; conserve esses blocos.',
          ]
        : [
            'Deixe à vista o fim de Ao iniciar. Abra Jogo 2D → Controles → Teclado, ações e toque. Arraste Ativar controles clássicos até esse fim e escolha só as quatro direções.',
            'Abra Enquanto estiver rodando. Dentro de A cada quadro do jogo, deixe à vista o espaço depois do fundo e antes dos desenhos dos sprites.',
            'Abra Jogo 2D → Movimento → Movimentos prontos. Arraste Mover sprite em 4 direções com setas para esse espaço. Escolha personagem e coloque velocidade 5.',
          ],
      test: 'Clique no jogo. Segure e depois solte cada seta do teclado. O personagem deve andar nas quatro direções e parar quando você soltar.',
      correction:
        'Se não andar, confira o nome personagem e o encaixe dentro do quadro. No 2D, confira também os controles em Ao iniciar. Segurar uma seta não acrescenta nada aos blocos: ela só testa o que você montou.',
    },
    ...(!three
      ? [
          {
            key: 'limite',
            title: 'O personagem sai da tela',
            idea: 'Em cada quadro, primeiro o personagem dá o passinho. Depois, o jogo confere se ele passou da beirada e, se passou, puxa ele de volta para dentro.',
            steps: [
              'Deixe à vista o comando de movimento dentro de A cada quadro do jogo.',
              'Em Jogo 2D → Movimento → Bordas e rebatidas, pegue Manter o sprite dentro da tela. Encaixe imediatamente depois do movimento e antes de desenhar os sprites. Escolha personagem.',
            ],
            test: 'Ande até cada uma das quatro beiradas, continue segurando a seta e depois volte. O personagem deve continuar visível e conseguir sair da beirada.',
            correction:
              'Se ele escapar ou tremer, confira se o limite está depois do movimento e se os dois usam personagem.',
          },
        ]
      : []),
    {
      key: 'coleta',
      title: 'O regador precisa sumir no encontro',
      idea: 'O evento reconhece o encontro; os comandos dentro dele são a reação.',
      steps: [
        'Deixe à vista um espaço dentro de Quando acontecer, depois do evento da tecla R e fora do fazer dele.',
        `Abra ${ext} → ${three ? 'Encostar → Encostar' : 'Colisões → Encostar e bloquear'}. Pegue ${three ? 'Quando personagem encostar em chave' : 'Quando o sprite jogador começar a encostar no sprite inimigo'} e encaixe nesse espaço. Escolha personagem no primeiro nome e regador no segundo.`,
        three
          ? 'No fazer desse encontro, encaixe Jogo 3D → Objetos → Aparência → Mostrar o objeto. Escolha Esconder e regador.'
          : 'No fazer desse encontro, encaixe o comando Destruir o sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Escolha regador.',
      ],
      test: 'Comece uma partida, observe o regador no chão e caminhe até ele. Só no encontro ele deve desaparecer. Para repetir, toque na tecla R.',
      correction:
        'Se o regador sumir logo no começo, confira se remover ou esconder está no encontro, não em Ao iniciar. Se não sumir, confira os dois nomes do evento e a altura no 3D.',
    },
    {
      key: 'memoria',
      title: 'O jogo precisa lembrar da coleta',
      idea: 'Sumir com o desenho e guardar uma informação são ações diferentes. Use uma variável com dois valores: falso antes da coleta e verdadeiro depois.',
      steps: [
        'Deixe à vista o fim de Ao iniciar. Em Programação → Variáveis, pegue Criar variável e encaixe ali. Escreva temRegador no nome. Pode escolher outro nome e usá-lo em todos os lugares.',
        'Em Programação → Lógica e Se, pegue o bloco verdadeiro. Encaixe no valor da nova variável, clique em verdadeiro e escolha falso.',
        'Deixe à vista o fazer do encontro com regador. Depois de remover ou esconder, encaixe Programação → Variáveis → Alterar variável. Escolha temRegador.',
        'Encaixe outro bloco verdadeiro, de Programação → Lógica e Se, no valor dessa alteração e deixe verdadeiro. Confira: Ao iniciar usa falso; o encontro com o regador usa verdadeiro.',
      ],
      test: 'Recolha o regador e se afaste. A decisão da flor, montada adiante, vai usar essa informação mesmo longe do regador.',
      correction:
        'Não recrie temRegador dentro do quadro. Isso apagaria a memória repetidamente. Use o mesmo nome na criação, na alteração e na pergunta da flor.',
    },
    {
      key: 'aviso',
      title: 'Conte o que aconteceu',
      idea: 'A área de avisos já lê a variável aviso. Mudar seu texto muda o que aparece no jogo.',
      steps: [
        'No fazer do encontro com regador, deixe à vista o espaço depois da alteração de temRegador.',
        'Em Programação → Variáveis, pegue Alterar variável e encaixe ali. Escolha aviso.',
        'Em Programação → Valores, pegue Texto, encaixe no valor e escreva Você pegou o regador! Agora vá até a flor. Você pode escrever outro aviso claro com essa mesma informação.',
      ],
      test: 'Recolha o regador e se afaste. O novo aviso deve aparecer no encontro e continuar depois dele.',
      correction:
        'Se o aviso não mudar, confira se você alterou aviso, sem criar uma segunda variável, e se o texto está dentro do encontro.',
    },
    {
      key: 'decisao',
      title: 'A flor precisa escolher uma resposta',
      idea: 'No encontro com a flor, o Se pergunta se o regador já foi pego. Quando a resposta é verdadeiro, o jogo faz o que está no então; quando é falso, faz o que está no senão.',
      steps: [
        `Dentro de Quando acontecer, deixe à vista um espaço depois do evento da coleta e fora do fazer dele. Pegue outro evento de encontro em ${ext}${three ? ' → Encostar → Encostar.' : ' → Colisões → Encostar e bloquear.'} Escolha personagem e flor.`,
        'No fazer do encontro com a flor, encaixe Programação → Lógica e Se → Se. Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o outro caminho.',
        'Retire a comparação que veio na pergunta do Se, arrastando pelo sinal da comparação até a lixeira. Em Programação → Valores, pegue valor da variável e encaixe na pergunta vazia. Escolha temRegador, ou o nome que você usou na memória.',
        'Dentro do senão, encaixe Alterar variável de Programação → Variáveis. Escolha aviso. Encaixe Texto de Programação → Valores e escreva Busque o regador primeiro. A flor espera por você.',
        three
          ? 'Deixe à vista o então. Em Jogo 3D → Objetos → Animação do modelo, pegue Tocar a animação e encaixe ali. Escolha flor, clipe florescer e uma vez.'
          : 'Deixe à vista o então. Em Jogo 2D → Sprites → Criar e trocar aparência, pegue Trocar imagem do sprite e encaixe ali. Escolha flor e a imagem flor-aberta.',
        'Depois desse comando, ainda dentro do então, encaixe Alterar variável, escolha aviso e acrescente Texto com A flor abriu! Você fez o jardim florescer. Pode escolher outra mensagem de sucesso clara.',
      ],
      test: 'Toque na tecla R e vá direto à flor, sem recolher: ela fica fechada e o aviso pede o regador. Depois recolha, afaste-se e volte à flor: ela abre e o aviso conta o sucesso. Continue andando para conferir que ela permanece aberta.',
      correction:
        'Se abrir cedo, confira se a reação está dentro do então e se a pergunta lê a mesma memória da coleta. Se nunca abrir, confira a alteração para verdadeiro e o nome da imagem ou do clipe.',
    },
    ...(three
      ? [
          {
            key: 'uma-vez',
            title: 'A flor abre uma vez só',
            idea: 'A flor é o fim do jogo. Como no farol da Ilha, o encontro roda de novo a cada volta do personagem; a variável ganhou guarda que a partida já foi vencida, e o Se não ganhou faz a flor parar de responder.',
            steps: [
              'Em Ao iniciar, logo abaixo de temRegador, crie a variável ganhou com o valor falso, do mesmo jeito que criou temRegador.',
              'No então do Se temRegador, logo abaixo de Tocar a animação, encaixe Alterar variável. Escolha ganhou, encaixe o bloco verdadeiro no valor e deixe verdadeiro.',
              'Em Programação → Lógica e Se, pegue Se e solte no espaço ao lado de fazer do encontro com flor, em cima do Se que já está lá. O Se temRegador desce e fica logo abaixo do Se novo.',
              'Arraste a comparação que veio na pergunta do Se novo até a lixeira. Em Programação → Lógica e Se, pegue não e encaixe no lugar vazio. O não também chega com uma comparação: arraste essa comparação até a lixeira. Em Programação → Valores, pegue valor da variável, encaixe dentro do não e escolha ganhou.',
              'Pegue o Se temRegador pela palavra Se e arraste até o então do Se novo; tudo o que está dentro dele vai junto.',
            ],
            test: 'Recolha o regador e vá à flor: ela abre. Saia de perto e volte: ela continua aberta, sem florescer de novo. Numa partida nova, vá à flor sem o regador: ela continua pedindo o regador.',
            correction:
              'Se a flor florescer de novo ao voltar, confira se ganhou fica verdadeiro no então e se o Se temRegador inteiro está dentro de Se não ganhou. Se nunca abrir, confira se ganhou começa em falso.',
          },
        ]
      : []),
    {
      key: 'posicao',
      title: 'Escolha seu lugar para o regador',
      idea: three
        ? 'X e Z mudam o lugar no chão. Y muda a altura, que já está preparada para o encontro.'
        : 'X e Y mudam o lugar do regador na tela. Mudar um valor por vez ajuda a perceber o efeito.',
      steps: [
        three
          ? 'Em Ao iniciar, encontre Colocar o objeto regador. Escolha outro valor de x ou z e deixe o y como está. Um exemplo é x −2, com o mesmo z.'
          : 'Em Ao iniciar, encontre a criação do sprite regador. Ele começa em x 300 e y 190. Escolha outro x ou y. Um exemplo é x 390, mantendo y 190.',
        'Observe onde ele apareceu. Pode experimentar vários lugares e escolher outro diferente do exemplo. Deixe-o dentro do jardim, visível, separado do personagem no começo e alcançável.',
        'Preserve um caminho até a flor sem passar pelo regador. Comece uma partida com a mudança. Se a prévia já reiniciou ao editar, ela já serve para esse teste; senão clique no jogo e toque na tecla R.',
        `Teste a flor sem o regador e com ele. Depois clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em ${three ? 'Próxima parte e responda às perguntas sobre o seu jardim. Quando terminar, clique em Concluir aula.' : 'Concluir aula.'}`,
      ],
      test: 'Vá primeiro à flor sem o regador. Depois recolha no lugar novo e volte. Depois do sucesso, toque na tecla R: regador disponível, flor fechada e a posição escolhida conservada.',
      correction:
        'Se não conseguir chegar ao regador, ajuste o lugar; no 3D confira também se você manteve a altura. Reiniciar a partida conserva o programa. Não use restaurar o projeto inicial para esse teste.',
    },
  ]
}
