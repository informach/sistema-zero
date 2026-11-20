/**
 * Fonte editorial. A geração conserva a fala integral e os passos do caderno.
 *
 * Revisão de 20/11/2026, no molde do Cadê Todo Mundo? e de A Chave do Farol: uma ideia por
 * parágrafo, o porquê antes do como, a retomada "Tá vendo?" com a causa, "É este bloco que…",
 * cada clique na sua frase, e o Na tela pronto para a gravação automática (ESPEC-ROTEIRO, seção 9).
 * O envio fecha a aula na última parte de construção (sem parte só de fechamento nas aulas 1 e 2),
 * e nenhuma fala espera o "Salvo".
 *
 * Os caminhos das setas no Na tela contam a velocidade 4 (4 unidades por segundo) e os obstáculos
 * de `ilha-do-farol-observacao.ts`: andando reto para a direita na linha do começo (z 0,8), o
 * personagem bate na pedra. Por isso o caminho até a ponte desce um pouco (z 1,6), passa na frente
 * da pedra e sobe de novo para a linha da ponte. São estimativas: acertar no Verificar plano.
 */
export type IlhaTrecho = {
  key: string
  title: string
  kind: 'intro' | 'material' | 'experience' | 'build' | 'delivery' | 'closing'
  text: string
  screen: string
  steps?: string[]
  /** O recado do Zappy na página (não gravado), quando a parte não é uma experiência. */
  recado?: string
  /**
   * Só nas experiências (02/11/2026, convite à investigação): o recado do Zappy na página, a
   * instrução da atividade e as pistas, do aberto (o que observar) ao direto (os botões reais).
   * Nenhum deles conta o resultado antes do teste.
   */
  ponte?: string
  instrucao?: string
  pistas?: [string, string, string]
  /**
   * O que cada descoberta pede, na língua da tela livre (08/11/2026): vira o `goalCopy` do
   * manifesto (sem ele, a criança leria os pedidos do catálogo, com os botões de antes).
   */
  pedidos?: Record<string, string | { label: string; pedido: string }>
  /**
   * A cena da experiência, quando não é a experiência 3D de posição (02/11/2026): a pergunta com o
   * não usa a porta do farol (`lighthouse-key`), ligada ao modo do não pelas metas `not-flips-*`.
   * ⭐ 08/11/2026: ela acontece na ilha 3D do jogo do curso (cenário `ilha`), não no mapa 2D da
   * Chave do Farol (pedido dela: a cena é o jogo do curso).
   */
  cena?: { scene: 'lighthouse-key'; cenario: 'ilha'; goals: string[] }
}

/** A conferência depois do teste e a verificação, na fórmula comum (Diretrizes, seção 6). */
const verificar = (lista: string) =>
  `[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: ${lista}. [reassuring, encouraging voice] Depois de corrigir, teste de novo. [engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. [engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.`
/** Quando o efeito não aparece no jogo (uma variável sem mostrador), a conferência é a única. */
const conferir = (lista: string) =>
  `[reassuring, encouraging voice] Confira se ficou assim: ${lista}. [engaging, energetic, conversational voice] Agora clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. [engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.`
/** A conferência, a verificação e o envio da última montagem, com o reconhecimento no fim. */
const entregar = (lista: string, pronto: string, depois: string) =>
  `[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: ${lista}. [reassuring, encouraging voice] Depois de corrigir, teste de novo. [engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. [engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. [pleased, lively voice] ${pronto} [engaging, energetic, conversational voice] ${depois}`

/** Receita "Conferir os blocos" (ESPEC 9.8) e a saída de uma montagem. */
const telaDaConferencia = (mostrar: string, apontes: [string, string][]) =>
  `No "volte aos blocos e confira se ficou assim", deixar bem à vista os blocos conferidos [mostrar blocos ${mostrar}]. ${apontes
    .map(([citacao, bloco]) => `No "${citacao}", apontar o bloco [apontar bloco "${bloco}"].`)
    .join(' ')} No "Depois de corrigir, teste de novo", voltar a mão para o jogo [apontar prévia].`
const telaDaSaida =
  'No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", clicar em **Próxima parte** [próxima parte].'
const telaDoEnvio = (reconhecimento: string, saida: 'Concluir aula' | 'Próxima parte') =>
  `No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto", clicar em **Enviar meu projeto** [clicar "Enviar meu projeto"]. No "e confirme em Enviar", confirmar em **Enviar**, na janela que abriu [clicar "Enviar"]. No "${reconhecimento}", voltar ao tamanho da aula [reduzir estúdio]. No "Quando aparecer Projeto enviado!, clique em ${saida}", clicar em **${saida}** [${saida === 'Concluir aula' ? 'concluir aula' : 'próxima parte'}].`
/** Receita da experiência (ESPEC 9.8): só ampliar e mostrar o Zappy, sem tocar nos controles. */
const telaDaExperiencia = (cena: string) =>
  `No "Isso você vai testar na experiência", ampliar a experiência [ampliar experiência] e deixar a cena parada, ${cena}. No "O Zappy vai te mostrando", apontar o Zappy ao lado da fala dele [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", clicar em **Próxima parte** [próxima parte].`
const MOLDE =
  'Não falar de blocos nem de código. O vídeo explica a ideia e convida, sem mostrar os controles nem a ordem dos testes (molde do Cadê, 02/11/2026).'

/** Os caminhos do personagem, em teclas, com a chave em x −3 e z −2 (da Aula 2 em diante). */
const ATE_A_CHAVE = '[segurar tecla ArrowUp por 0,7 s] [segurar tecla ArrowRight por 0,9 s]'
const DA_CHAVE_AO_FAROL =
  '[segurar tecla ArrowLeft por 0,6 s] [segurar tecla ArrowDown por 0,9 s] [segurar tecla ArrowRight por 1,5 s] [segurar tecla ArrowUp por 0,2 s] [segurar tecla ArrowRight por 1,2 s]'
const DO_COMECO_AO_FAROL =
  '[segurar tecla ArrowDown por 0,2 s] [segurar tecla ArrowRight por 1,7 s] [segurar tecla ArrowUp por 0,2 s] [segurar tecla ArrowRight por 1,2 s]'
const DO_FAROL_A_CHAVE =
  '[segurar tecla ArrowLeft por 1,2 s] [segurar tecla ArrowDown por 0,2 s] [segurar tecla ArrowLeft por 1,5 s] [segurar tecla ArrowUp por 0,9 s] [segurar tecla ArrowRight por 0,6 s]'
/** O aviso fica no alto, no meio do jogo (640 × 360 sem jogo pronto na aula). */
const AVISO = '[apontar prévia 320 16]'
const ESTIMATIVA =
  'Os tempos das setas são estimativas para a velocidade 4: acertar no Verificar plano.'

/** Os blocos do farol, com o nome que o palco usa para achar cada um (ESPEC 9.5). */
const FAROL = 'Quando personagem encostar em farol'
const SE_FAROL = `Se dentro de ${FAROL}`
const SE_CHAVE = 'Se valor da variável temChave'
const SE_NAO = 'Se não valor da variável ganhou'

export const ilhaAulas: { slug: string; title: string; trechos: IlhaTrecho[] }[] = [
  {
    slug: 'ilha-aula-1',
    title: 'Uma ilha com profundidade',
    trechos: [
      {
        key: 'abertura',
        title: 'Jogue na ilha',
        kind: 'intro',
        screen: `Do "Oi" até o "para o barco chegar", a tela mostra o título A Ilha do Farol sobre a cena inicial do jogo pronto [na edição: título A Ilha do Farol]. No "Para andar, clique dentro do jogo", ampliar o jogo pronto [ampliar jogo] e clicar no meio do jogo, para o teclado ir para ele [tocar jogo]. No "Olha aqui: com a seta da direita", segurar a seta da direita do teclado por um instante, sem chegar à pedra [segurar tecla ArrowRight por 0,5 s]. No "Com a seta de baixo", segurar a seta de baixo [segurar tecla ArrowDown por 0,5 s]. No "E com a seta de cima", segurar a seta de cima, de volta à linha do começo [segurar tecla ArrowUp por 0,5 s]. No "Será que a pedra está escondendo", manter a cena parada, sem procurar a chave. No "Repare também no aviso aqui em cima", apontar o aviso [apontar jogo 480 24]. No "Explore a ilha", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não pegar a chave nem ir ao farol: a partida é da criança. ${ESTIMATIVA}`,
        recado:
          'Sua vez! Jogue a versão pronta: segure as setas para andar e explore a ilha. A tecla R recomeça. Quando terminar, clique em Próxima parte.',
        text: '[upbeat, welcoming voice] Oi! Você já criou A Chave do Farol. Agora vamos levar essa ideia para uma ilha em três dimensões: A Ilha do Farol! O desafio continua: encontrar a chave e acender o farol para o barco chegar. [engaging, energetic, conversational voice] Para andar, clique dentro do jogo e segure uma seta do teclado. As letras W, A, S e D também funcionam. [interested, animated voice] Olha aqui: com a seta da direita, o personagem anda para a direita. [interested, animated voice] Com a seta de baixo, ele vem para a frente, mais perto de quem está olhando. E com a seta de cima, ele volta para o fundo da ilha. [engaging, energetic, conversational voice] Essa é a novidade de um jogo em três dimensões: a profundidade. Um objeto pode ficar mais perto ou mais longe, e o da frente pode esconder o que está atrás dele. [curious] Será que a pedra está escondendo alguma coisa? [engaging, energetic, conversational voice] Isso eu deixo para você descobrir. Repare também no aviso aqui em cima: ele diz o que fazer na partida. [engaging, energetic, conversational voice] Para começar outra partida, toque na tecla R. [upbeat, encouraging voice] Explore a ilha. Quando terminar, clique em Próxima parte.',
      },
      {
        key: 'material',
        title: 'Seu passo a passo do projeto',
        kind: 'material',
        screen:
          'O material é o Passo a passo do projeto, o caderno do bloco de materiais. No "Olha, aqui está o Passo a passo do projeto", apontar o material [apontar livro]. No "Nele estão os passos", colocar o livro em tela cheia [livro tela cheia]. Enquanto a fala segue, as páginas passam uma por trecho, para mostrar mais do caderno. No "para montar o seu jogo", passar da capa para a página seguinte [livro próxima]. No "nas três aulas", passar mais uma página [livro próxima]. No "com os blocos que você vai usar", passar mais uma página [livro próxima]. No "e o lugar de cada um", passar mais uma página [livro próxima]. No "Por isso, se você esquecer algum passo", passar mais uma página [livro próxima]. No "é só voltar aqui", passar mais uma página [livro próxima]. No "Se quiser", sair da tela cheia [livro sair da tela cheia]. No "você pode ler aqui mesmo", mostrar o livro no tamanho da aula [apontar livro]. No "também pode clicar em Baixar", clicar no botão **Baixar**, ao lado do nome do arquivo [baixar]. No "Agora clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não demonstrar a impressão nem os controles do leitor.',
        recado:
          'Este é o seu Passo a passo do projeto! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.',
        text: '[engaging, energetic, conversational voice] Olha, aqui está o Passo a passo do projeto. Nele estão os passos para montar o seu jogo nas três aulas, com os blocos que você vai usar e o lugar de cada um. Por isso, se você esquecer algum passo, é só voltar aqui e abrir o material. [upbeat, encouraging voice] Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o material e consultar onde quiser. [confident, clear, unhurried voice] Agora clique em Próxima parte.',
      },
      {
        key: 'ponto-de-vista',
        title: 'O que aparece quando você muda de lugar?',
        kind: 'experience',
        screen: `A experiência aparece no tamanho da aula, com a cena parada na vista de frente. Do "Sabe quando uma pessoa" até o "consegue olhar", a tela fica parada, e a edição troca esse trecho por um desenho nosso com o Zappy: uma pessoa na frente tapa a vista de outra, que pensa em mudar de lugar para olhar, sem mostrar o que está atrás [na edição: a pessoa que tapa a vista]. No "Na ilha, a câmera também pode mudar de lugar", a tela volta para a experiência. ${telaDaExperiencia('na vista de frente, com a pedra escondendo a chave, sem apontar controles nem trocar a vista')} O que muda e o que fica igual é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência. ${MOLDE}`,
        ponte:
          'Sua vez! Investigue o que muda na imagem e o que continua no mesmo lugar quando você olha a ilha de lugares diferentes. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
        instrucao:
          'Olhe a ilha de outro lugar, procure a chave e diga o que mudou quando ela apareceu. O Zappy te mostra o que testar, e você pode repetir quando quiser.',
        pistas: [
          'Olhe a ilha de outro lugar e procure a chave.',
          'Compare duas vistas. Repare na pedra e na chave em cada uma delas.',
          'Na câmera, toque em Lado e procure a chave. Volte para Frente e compare. Então responda: quando a chave apareceu, o que mudou?',
        ],
        pedidos: {
          'other-view': 'Troque o lugar da câmera e procure a chave.',
          'same-place': 'Responda o que mudou quando a chave apareceu.',
        },
        text: '[engaging, energetic, conversational voice] Lembra da pedra da ilha? No 3D, um objeto pode esconder o que está atrás dele. Por isso, o que você vê depende de onde você olha. [confident, clear, unhurried voice] O lugar de onde o jogo olha a ilha tem um nome: câmera. Ela funciona como os seus olhos dentro do jogo. [engaging, energetic, conversational voice] Sabe quando uma pessoa fica na sua frente e tapa o que você quer ver? Você muda de lugar e consegue olhar. [engaging, energetic, conversational voice] Na ilha, a câmera também pode mudar de lugar. E perto de uma pedra tem uma chave escondida. [curious] Se a câmera mudar de lugar, a chave também muda de lugar? [engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência. [upbeat, encouraging voice] Agora você vai investigar o que muda na imagem e o que continua no mesmo lugar quando você olha a ilha de lugares diferentes. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
      },
      {
        key: 'movimento',
        title: 'Faça o personagem andar',
        kind: 'delivery',
        screen: `A parte começa com o Estúdio expandido e o projeto inicial da aula [expandir estúdio]. No "clique em Rodar de novo, no alto do Estúdio", clicar em **Rodar de novo** [rodar de novo]. No "e segure uma seta do teclado", segurar a seta da direita do teclado [segurar tecla ArrowRight por 1 s]: o personagem não sai do lugar. No "O personagem fica parado", apontar o personagem parado [apontar prévia]. No "Encontre essa área", trazer a área para perto do meio [arrastar até "Enquanto estiver rodando"]. No "Repare: dentro de A cada quadro da cena já tem o bloco Escrever na tela", apontar o Escrever na tela [apontar bloco "Escrever na tela dentro de A cada quadro da cena"]. No "O bloco novo vai no começo", apontar o espaço ao lado de **fazer** [apontar encaixe em "A cada quadro da cena"]. No "Abra Jogo 3D", abrir **Jogo 3D** [abrir categoria Jogo 3D]. No "depois Movimento", abrir **Movimento** [abrir categoria Jogo 3D > Movimento]. No "e depois Andar com o teclado", abrir **Andar com o teclado** [abrir categoria Jogo 3D > Movimento > Andar com o teclado]. No "Arraste e solte no espaço ao lado de fazer", encaixar o bloco no começo de **A cada quadro da cena** [encaixar "Fazer personagem andar" em "A cada quadro da cena"]. No "o Escrever na tela desce", apontar o Escrever na tela, logo abaixo do bloco novo [apontar bloco "Escrever na tela dentro de A cada quadro da cena"]. No "É este bloco que faz o personagem andar", apontar o bloco novo [apontar bloco "Fazer personagem andar"]. No "Clique no 3", clicar no número [abrir campo "3" em "Fazer personagem andar"]. No "e troque por 4", escrever 4 e clicar fora do bloco [escolher "4" em "Fazer personagem andar"]. No "Clique em Rodar de novo mais uma vez", clicar em **Rodar de novo** [rodar de novo]. No "Depois segure a seta da direita", segurar a seta da direita do teclado, sem chegar à pedra [segurar tecla ArrowRight por 0,6 s]. No "Olha só: ele anda enquanto você segura a seta", apontar o personagem [apontar prévia]. No "Agora faça o mesmo com as outras três setas", andar para a frente, para a esquerda e um pouco para o fundo [segurar tecla ArrowDown por 0,5 s] [segurar tecla ArrowLeft por 0,5 s] [segurar tecla ArrowUp por 0,3 s]. No "Depois leve o personagem até a ponte", passar na frente da pedra, subir para a linha da ponte e entrar nela [segurar tecla ArrowRight por 1,6 s] [segurar tecla ArrowUp por 0,2 s] [segurar tecla ArrowRight por 0,6 s]. No "e até a beirada da ilha", segurar a seta de baixo até ele parar na beirada da ponte [segurar tecla ArrowDown por 0,5 s]. ${telaDaConferencia(
          '"A cada quadro da cena"',
          [
            ['primeiro vem Fazer personagem andar com as setas', 'Fazer personagem andar'],
            [
              'e logo abaixo dele está Escrever na tela',
              'Escrever na tela dentro de A cada quadro da cena',
            ],
          ],
        )} ${telaDoEnvio('agora ele anda pela ilha em três dimensões', 'Concluir aula')} ${ESTIMATIVA}`,
        recado:
          'Hora de fazer o seu personagem andar! Coloque o movimento no começo de A cada quadro da cena e troque a velocidade por 4. Teste as quatro setas e clique em Verificar projeto. Depois clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.',
        steps: [
          'Clique em Rodar de novo e segure uma seta: o personagem ainda fica parado.',
          'Em Enquanto estiver rodando, deixe à vista o bloco A cada quadro da cena. Dentro dele já está Escrever na tela.',
          'Abra Jogo 3D → Movimento → Andar com o teclado. Pegue Fazer personagem andar com as setas (ou WASD) e solte no espaço ao lado de fazer. Escrever na tela desce e fica logo abaixo.',
          'Clique no 3 e troque por 4.',
          'Clique em Rodar de novo e segure cada seta: o personagem anda e para quando você solta. Leve-o até a ponte e até a beirada.',
          'Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.',
        ],
        text:
          '[engaging, energetic, conversational voice] Aqui no seu jogo, clique em Rodar de novo, no alto do Estúdio, e segure uma seta do teclado. Tá vendo? O personagem fica parado, porque o jogo ainda não sabe que a seta faz ele andar. [engaging, energetic, conversational voice] Na experiência, quem mudava de lugar era a câmera. Agora quem vai sair do lugar é o personagem! [engaging, energetic, conversational voice] Lembra dos quadros do jogo 2D? O jogo desenha a cena muitas vezes por segundo, e cada desenho é um quadro. No 3D é igual. Para o personagem andar, o jogo precisa olhar as setas em todo quadro. [confident, clear, unhurried voice] Por isso, o bloco novo vai dentro do bloco A cada quadro da cena, na área Enquanto estiver rodando. Encontre essa área. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. [confident, clear, unhurried voice] Repare: dentro de A cada quadro da cena já tem o bloco Escrever na tela. O bloco novo vai no começo, no espaço ao lado da palavra fazer. [confident, clear, unhurried voice] Abra Jogo 3D, depois Movimento e depois Andar com o teclado, e pegue o bloco Fazer personagem andar com as setas. [confident, clear, unhurried voice] Arraste e solte no espaço ao lado de fazer. Repare: o Escrever na tela desce e fica logo abaixo do bloco novo. [engaging, energetic, conversational voice] É este bloco que faz o personagem andar: em todo quadro, ele olha qual seta você está segurando e leva o personagem para aquele lado. [engaging, energetic, conversational voice] O nome no bloco já é personagem, o objeto que vai andar. E o número é a velocidade: quanto maior, mais rápido o personagem anda. [confident, clear, unhurried voice] Clique no 3 e troque por 4. [upbeat, encouraging voice] Agora vamos testar! Clique em Rodar de novo mais uma vez. Depois segure a seta da direita por um tempo e solte. [interested, animated voice] Olha só: ele anda enquanto você segura a seta e para quando você solta. Andando, ele mexe as pernas e os braços. Parado, ele respira. [upbeat, encouraging voice] Agora faça o mesmo com as outras três setas. Depois leve o personagem até a ponte e até a beirada da ilha: ele não cai na água. ' +
          entregar(
            'dentro de A cada quadro da cena, primeiro vem Fazer personagem andar com as setas, com a velocidade 4, e logo abaixo dele está Escrever na tela',
            'Pronto, você programou o movimento do personagem: agora ele anda pela ilha em três dimensões!',
            'Na próxima aula, você vai escolher um lugar para a chave e ensinar o personagem a pegar a chave. Quando aparecer Projeto enviado!, clique em Concluir aula.',
          ),
      },
    ],
  },
  {
    slug: 'ilha-aula-2',
    title: 'A chave está ao seu alcance',
    trechos: [
      {
        key: 'posicao-3d',
        title: 'Para onde vai a chave?',
        kind: 'experience',
        screen: `A aula começa na experiência, no tamanho da aula, com a chave no lugar do começo. Do "Imagine procurar um livro" até o "três jeitos diferentes de mudar de lugar", a tela fica parada, e a edição troca esse trecho por um desenho nosso com o Zappy na estante de livros: andar para os lados, chegar mais perto ou mais longe e olhar numa prateleira mais alta [na edição: a estante de livros]. No "Na ilha, a chave também tem os seus três números", a tela volta para a experiência. ${telaDaExperiencia('com a chave no lugar do começo, sem apontar controles nem mudar nenhum número')} O que cada número muda é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência. ${MOLDE}`,
        ponte:
          'Sua vez! Investigue para onde a chave vai quando o x, o y e o z aumentam e diminuem. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
        instrucao:
          'Mude cada um dos três números da chave para mais e para menos e veja para onde ela vai. O Zappy te mostra o que testar, e você pode repetir quando quiser.',
        pistas: [
          'Escolha um dos três números da chave e observe para onde ela vai.',
          'Mude um número de cada vez, para mais e para menos. Compare com a marca dourada do lugar inicial.',
          'No x, toque no + e no −, observando a chave. Faça o mesmo no z e no y. Para ver melhor, troque a câmera para Lado ou Cima.',
        ],
        pedidos: {
          'axis-x': 'Mude o x para mais e para menos e observe a chave.',
          'axis-y': 'Mude o y para mais e para menos e observe a chave.',
          'axis-z': 'Mude o z para mais e para menos e observe a chave.',
        },
        text: '[upbeat, welcoming voice] Seu personagem já anda pela ilha. Agora a chave vai ganhar um lugar novo! [engaging, energetic, conversational voice] No jogo 2D, você usou dois números, x e y, para escolher um lugar na tela. [interested, animated voice] No 3D, o mundo tem profundidade. Por isso, o lugar de cada objeto tem três números: x, y e z. [engaging, energetic, conversational voice] Imagine procurar um livro numa estante. Você pode andar para os lados, chegar mais perto ou mais longe e ainda olhar numa prateleira mais alta. São três jeitos diferentes de mudar de lugar. [engaging, energetic, conversational voice] Na ilha, a chave também tem os seus três números, e cada um muda o lugar dela de um jeito. [curious] E o y, será que continua fazendo o que fazia no jogo 2D? [engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência. [upbeat, encouraging voice] Agora você vai investigar para onde a chave vai quando cada um dos três números aumenta e quando diminui. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
      },
      {
        key: 'posicao',
        title: 'Coloque a chave na ilha',
        kind: 'build',
        screen: `A parte começa com o Estúdio expandido e o projeto enviado na Aula 1 [expandir estúdio]. No "Encontre o bloco Colocar o objeto chave", trazer o bloco para perto do meio [arrastar até "Colocar o objeto chave"]. No "É este bloco que coloca a chave na ilha", apontar o bloco [apontar bloco "Colocar o objeto chave"]. No "Clique no menos 3", clicar no número do z [abrir campo "-3" em "Colocar o objeto chave"]. No "e troque por menos 2", escrever -2 e clicar fora do bloco [escolher "-2" em "Colocar o objeto chave"]. No "Clique em Rodar de novo, no alto do Estúdio", clicar em **Rodar de novo** [rodar de novo]. No "e observe a chave", deixar a mão sobre o jogo, sem tocar [apontar prévia]. No "Clique no menos 2", clicar no número do x, o primeiro dos dois menos 2 [abrir campo "-2" em "Colocar o objeto chave"]. No "e troque por menos 3", escrever -3 e clicar fora do bloco [escolher "-3" em "Colocar o objeto chave"]. No "Clique em Rodar de novo mais uma vez", clicar em **Rodar de novo** [rodar de novo]. No "Depois leve o personagem até perto da chave", subir pela esquerda da pedra e andar até perto da chave [segurar tecla ArrowUp por 0,7 s] [segurar tecla ArrowRight por 0,7 s]. No "a chave foi um pouco para a esquerda", apontar a chave, ao lado do personagem [apontar prévia]. ${telaDaConferencia(
          '"Colocar o objeto chave"',
          [['o bloco Colocar o objeto chave está com x menos 3', 'Colocar o objeto chave']],
        )} ${telaDaSaida} ${ESTIMATIVA}`,
        recado:
          'Agora escolha um lugar novo para a chave! No bloco Colocar o objeto chave, troque o z por −2 e o x por −3. Teste e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        steps: [
          'Em Ao iniciar, encontre Colocar o objeto chave em x −2 y 1 z −3.',
          'Clique no −3 depois de z e troque por −2. Clique em Rodar de novo: a chave vem um pouco para a frente.',
          'Clique no −2 depois de x e troque por −3. Deixe o y em 1.',
          'Clique em Rodar de novo e leve o personagem até perto da chave.',
          'Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        ],
        text:
          '[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? O x e o z levavam a chave pelo chão, e o y mudava a altura dela. No jogo 2D era diferente: lá, o y mudava o lugar na tela. [engaging, energetic, conversational voice] Agora você vai escolher um lugar novo para a chave no seu jogo! [confident, clear, unhurried voice] O lugar da chave fica na área Ao iniciar. Encontre o bloco Colocar o objeto chave. Se ele não estiver aparecendo, arraste um espaço vazio entre os blocos até ele aparecer. [engaging, energetic, conversational voice] É este bloco que coloca a chave na ilha. Repare nos três números dele: x menos 2, y 1 e z menos 3. São o x, o y e o z que você investigou na experiência. [confident, clear, unhurried voice] Primeiro mude só o z. Clique no menos 3, que fica depois de z, e troque por menos 2. [upbeat, encouraging voice] Clique em Rodar de novo, no alto do Estúdio, e observe a chave. [interested, animated voice] Olha só: a chave veio um pouco para a frente, mais perto de quem está olhando. [confident, clear, unhurried voice] Agora mude o x. Clique no menos 2, que fica depois de x, e troque por menos 3. Deixe o y em 1. [upbeat, encouraging voice] Clique em Rodar de novo mais uma vez. Depois leve o personagem até perto da chave. [interested, animated voice] Olha só: a chave foi um pouco para a esquerda e continuou na mesma altura, porque você não mexeu no y. [engaging, energetic, conversational voice] Por enquanto, encostar na chave não faz nada. Essa reação vem daqui a pouco, depois da experiência do contato. ' +
          verificar(
            'em Ao iniciar, o bloco Colocar o objeto chave está com x menos 3, y 1 e z menos 2',
          ),
      },
      {
        key: 'contato-3d',
        title: 'Parece junto, mas está encostando?',
        kind: 'experience',
        screen: `A experiência aparece no tamanho da aula, na vista de cima, com a chave alta parecendo estar sobre o personagem. Do "Sabe quando você bate palmas" até o "só fazem barulho quando se tocam de verdade", a tela fica parada, e a edição troca esse trecho por um desenho nosso com o Zappy batendo palmas [na edição: as mãos batendo palmas]. No "Na ilha, olhando de cima", a tela volta para a experiência. ${telaDaExperiencia('na vista de cima, sem apontar controles nem testar')} O resultado é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência. ${MOLDE}`,
        ponte:
          'Sua vez! Investigue quando a chave e o personagem estão encostando de verdade e quando só parecem juntos na imagem. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
        instrucao:
          'De cima, o personagem e a chave parecem juntos: olhe de outro lugar e descubra quando eles se encostam de verdade. O Zappy te mostra o que testar, e você pode repetir quando quiser.',
        pistas: [
          'Antes de olhar de outro lugar, pense: a chave e o personagem estão encostando?',
          'Olhe o resultado do encontro na cena e compare a câmera de cima com a de lado.',
          'Na câmera, toque em Lado. Na altura da chave, toque no − até ela chegar perto do personagem e olhe o resultado do encontro. Se quiser, mostre as caixas do encontro.',
        ],
        pedidos: {
          // O rótulo do catálogo fala de "áreas" (as caixas de colisão); aqui é o que a criança vê.
          'contact-apart': {
            label: 'Parecer junto não é encostar',
            pedido: 'Olhe de lado o personagem e a chave que de cima parecem juntos.',
          },
          'contact-touch': {
            label: 'Encostar é se tocar de verdade',
            pedido: 'Baixe a chave até ela encostar no personagem.',
          },
        },
        text: '[engaging, energetic, conversational voice] Agora a chave tem um lugar novo. Falta o personagem pegar a chave quando chegar nela. [confident, clear, unhurried voice] Para isso, o jogo precisa perceber quando os dois se encostam. Encostar é quando duas coisas do jogo se tocam de verdade. [engaging, energetic, conversational voice] Sabe quando você bate palmas? As mãos só fazem barulho quando se tocam de verdade. [engaging, energetic, conversational voice] Na ilha, olhando de cima, a chave pode parecer estar em cima do personagem. [curious] Será que eles estão encostando? [engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência. [upbeat, encouraging voice] Agora você vai investigar quando a chave e o personagem estão encostando de verdade e quando só parecem juntos na imagem. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
      },
      {
        key: 'recolher',
        title: 'Recolha a chave',
        kind: 'build',
        screen: `A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo]. No "e leve o personagem até a chave", subir pela esquerda da pedra e andar até a chave [segurar tecla ArrowUp por 0,7 s] [segurar tecla ArrowRight por 0,9 s]. No "A chave continua ali", apontar a chave, ao lado do personagem [apontar prévia]. No "Encontre essa área", trazer a área para perto do meio [arrastar até "Quando acontecer"]. No "Lá dentro já tem o evento da tecla R", apontar o evento [apontar bloco "Quando apertar a tecla"]. No "O encontro novo vai logo abaixo dele", apontar o lugar logo abaixo do evento [apontar abaixo de "Quando apertar a tecla"]. No "Abra Jogo 3D", abrir **Jogo 3D** [abrir categoria Jogo 3D]. No "depois Encostar", abrir **Encostar** [abrir categoria Jogo 3D > Encostar]. No "e depois Encostar de novo", abrir a subcategoria **Encostar**, dentro da categoria de mesmo nome [abrir categoria Jogo 3D > Encostar > Encostar]. No "Arraste e solte logo abaixo do evento da tecla R", levar o encontro para logo abaixo do evento, fora do fazer dele [encaixar "Quando personagem encostar em chave" abaixo de "Quando apertar a tecla"]. No "É este bloco que percebe o encontro", apontar o encontro [apontar bloco "Quando personagem encostar em chave"]. No "Ela vai no espaço ao lado da palavra fazer", apontar o espaço ao lado de **fazer** do encontro [apontar encaixe em "Quando personagem encostar em chave"]. No "Abra Jogo 3D", mostrar **Jogo 3D** já aberta, sem recolher [abrir categoria Jogo 3D]. No "depois Objetos", abrir **Objetos** [abrir categoria Jogo 3D > Objetos]. No "e depois Aparência", abrir **Aparência** [abrir categoria Jogo 3D > Objetos > Aparência]. No "Arraste e solte no espaço ao lado de fazer", encaixar o bloco no encontro [encaixar "Mostrar o objeto" em "Quando personagem encostar em chave"]. No "Clique em Mostrar", clicar no campo [abrir campo "Mostrar" em "Mostrar o objeto"]. No "e escolha Esconder", escolher **Esconder** [escolher "Esconder" em "Esconder o objeto"]. No "Depois clique em objeto", clicar no nome [abrir campo "objeto" em "Esconder o objeto"]. No "e escolha chave", escolher **chave** [escolher "chave" em "Esconder o objeto chave"]. No "Clique em Rodar de novo e leve o personagem até a chave", clicar em **Rodar de novo** [rodar de novo] e levar o personagem até a chave pelo mesmo caminho ${ATE_A_CHAVE}. No "a chave some quando o personagem encosta nela", apontar o lugar onde a chave estava [apontar prévia]. No "Toque na tecla R", tocar a tecla R [tecla r]. ${telaDaConferencia(
          '"Quando apertar a tecla", "Quando personagem encostar em chave"',
          [
            [
              'logo abaixo do evento da tecla R, está o encontro',
              'Quando personagem encostar em chave',
            ],
            ['e dentro dele está Esconder o objeto chave', 'Esconder o objeto'],
          ],
        )} ${telaDaSaida} ${ESTIMATIVA}`,
        recado:
          'Agora faça o personagem pegar a chave! Coloque o encontro logo abaixo do evento da tecla R e, dentro dele, Esconder o objeto chave. Teste e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        steps: [
          'Clique em Rodar de novo e leve o personagem até a chave: ela continua ali.',
          'Em Quando acontecer, deixe à vista o espaço logo abaixo do evento da tecla R, fora do fazer dele.',
          'Abra Jogo 3D → Encostar → Encostar. Pegue Quando personagem encostar em chave e solte nesse espaço.',
          'Abra Jogo 3D → Objetos → Aparência. Pegue Mostrar o objeto e solte no espaço ao lado de fazer do encontro novo.',
          'Clique em Mostrar e escolha Esconder. Clique em objeto e escolha chave.',
          'Clique em Rodar de novo e caminhe até a chave: ela some no encontro. Toque na tecla R e pegue de novo por outro caminho.',
          'Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        ],
        text:
          '[engaging, energetic, conversational voice] Aqui no seu jogo, clique em Rodar de novo e leve o personagem até a chave. Tá vendo? A chave continua ali, porque o jogo ainda não tem nenhuma reação para esse encontro. [engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Só valia encostar quando o personagem e a chave se encontravam no chão e também na altura. Agora a gente vai fazer o seu jogo perceber esse encontro! [engaging, energetic, conversational voice] Os encontros ficam na área Quando acontecer. Encontre essa área. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. [confident, clear, unhurried voice] Lá dentro já tem o evento da tecla R, que recomeça a partida. O encontro novo vai logo abaixo dele, fora do fazer dele. Deixe esse espaço à vista. [confident, clear, unhurried voice] Abra Jogo 3D, depois Encostar e depois Encostar de novo, e pegue o bloco Quando personagem encostar em chave. [confident, clear, unhurried voice] Arraste e solte logo abaixo do evento da tecla R. Não coloque um evento dentro do outro. [engaging, energetic, conversational voice] É este bloco que percebe o encontro. Como na experiência do contato, ele confere o lugar no chão e a altura. [confident, clear, unhurried voice] Repare: ele já chega com os nomes certos, personagem e chave. [engaging, energetic, conversational voice] Agora falta a reação: a chave sumir. Ela vai no espaço ao lado da palavra fazer, dentro do encontro novo. Deixe esse espaço à vista. [confident, clear, unhurried voice] Abra Jogo 3D, depois Objetos e depois Aparência, e pegue o bloco Mostrar o objeto. [confident, clear, unhurried voice] Arraste e solte no espaço ao lado de fazer. [confident, clear, unhurried voice] Repare: ele chega com Mostrar. Clique em Mostrar e escolha Esconder. [confident, clear, unhurried voice] Depois clique em objeto e escolha chave. [upbeat, encouraging voice] Agora vamos testar! Clique em Rodar de novo e leve o personagem até a chave. [interested, animated voice] Olha só: a chave some quando o personagem encosta nela! [upbeat, encouraging voice] Toque na tecla R. A chave volta, e você pode pegar de novo por outro caminho. ' +
          verificar(
            'dentro de Quando acontecer, logo abaixo do evento da tecla R, está o encontro Quando personagem encostar em chave, e dentro dele está Esconder o objeto chave',
          ),
      },
      {
        key: 'memoria',
        title: 'Guarde que você pegou a chave',
        kind: 'build',
        screen:
          'A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "Encontre a área Ao iniciar", trazer para perto do meio o bloco que cria aviso [arrastar até "Criar variável aviso"]. No "Abra Programação", abrir **Programação** [abrir categoria Programação]. No "e depois Variáveis", abrir **Variáveis** [abrir categoria Programação > Variáveis]. No "Arraste e solte logo abaixo do bloco que cria aviso", encaixar o bloco [encaixar "Criar variável" abaixo de "Criar variável aviso"]. No "Clique em contador", clicar no nome [abrir campo "contador" em "Criar variável contador"]. No "e escreva", escrever temChave e clicar fora do bloco [escolher "temChave" em "Criar variável temChave"]. No "Abra Programação", mostrar **Programação** já aberta, sem recolher [abrir categoria Programação]. No "e depois Lógica", abrir **Lógica & Se** [abrir categoria Programação > Lógica & Se]. No "Solte em cima do 0", soltar **verdadeiro** sobre o 0 [soltar "verdadeiro" em cima do "0" em "Criar variável temChave"]. No "Depois clique em verdadeiro", clicar no campo [abrir campo "verdadeiro" em "Criar variável temChave"]. No "e escolha falso", escolher **falso** [escolher "falso" em "Criar variável temChave"]. No "Isso acontece no encontro com a chave", trazer o encontro para perto do meio [arrastar até "Esconder o objeto"]. No "logo abaixo de Esconder o objeto chave", apontar o lugar logo abaixo [apontar abaixo de "Esconder o objeto"]. No "Abra Programação", mostrar **Programação** já aberta, sem recolher [abrir categoria Programação]. No "e depois Variáveis", abrir **Variáveis** [abrir categoria Programação > Variáveis]. No "Arraste e solte logo abaixo de Esconder", encaixar o bloco [encaixar "Alterar variável" abaixo de "Esconder o objeto"]. No "Clique em contador", clicar no campo [abrir campo "contador" em "Alterar variável contador"]. No "e escolha", escolher temChave na lista [escolher "temChave" em "Alterar variável temChave"]. No "Abra Programação", mostrar **Programação** já aberta, sem recolher [abrir categoria Programação]. No "e depois Lógica", abrir **Lógica & Se** [abrir categoria Programação > Lógica & Se]. No "Solte em cima do 1", soltar **verdadeiro** sobre o 1, mantendo **verdadeiro** [soltar "verdadeiro" em cima do "1" em "Alterar variável temChave"]. No "ao começar, falso", trazer o bloco de Ao iniciar para perto do meio [arrastar até "Criar variável temChave"]. No "Ao pegar a chave, verdadeiro", trazer o bloco do encontro para perto do meio [arrastar até "Alterar variável temChave"]. No "Confira se ficou assim", trazer de novo o bloco de Ao iniciar [arrastar até "Criar variável temChave"]. No "em Ao iniciar está Criar variável", apontar o bloco [apontar bloco "Criar variável temChave"]. No "e no encontro com a chave", trazer o encontro [arrastar até "Alterar variável temChave"] e apontar o bloco [apontar bloco "Alterar variável temChave"]. No "Agora clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Nenhum mostrador de variável inventado: o resultado aparece pelos objetivos.',
        recado:
          'Agora faça o jogo guardar que o personagem pegou a chave! Crie temChave com falso em Ao iniciar e mude para verdadeiro no encontro com a chave. Depois clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        steps: [
          'Em Ao iniciar, deixe à vista o bloco que cria aviso. Em Programação → Variáveis, pegue Criar variável e solte logo abaixo dele.',
          'Clique em contador e escreva temChave.',
          'Em Programação → Lógica e Se, pegue verdadeiro e solte em cima do 0. Clique em verdadeiro e escolha falso: a partida começa sem a chave.',
          'No encontro com a chave, deixe à vista o lugar logo abaixo de Esconder o objeto chave. Em Programação → Variáveis, pegue Alterar variável para e solte ali.',
          'Clique em contador e escolha temChave. Em Programação → Lógica e Se, pegue verdadeiro e solte em cima do 1. Deixe verdadeiro.',
          'Confira os dois lugares e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        ],
        text:
          '[engaging, energetic, conversational voice] A chave já some. Mas lembra do jogo 2D? Sumir não é a mesma coisa que guardar que o personagem pegou a chave. [engaging, energetic, conversational voice] Para guardar, a gente usa de novo temChave, a variável que responde se o personagem tem a chave. [confident, clear, unhurried voice] Primeiro, a partida precisa começar sem a chave. Encontre a área Ao iniciar e deixe à vista o bloco que cria aviso. [confident, clear, unhurried voice] Abra Programação e depois Variáveis, e pegue o bloco Criar variável. [confident, clear, unhurried voice] Arraste e solte logo abaixo do bloco que cria aviso. [confident, clear, unhurried voice] Repare: ele chega com o nome contador. Clique em contador e escreva temChave. [engaging, energetic, conversational voice] Agora o valor. Ele chega com o número 0, mas temChave guarda sim ou não: verdadeiro ou falso. [confident, clear, unhurried voice] Abra Programação e depois Lógica e Se, e pegue o bloco verdadeiro. [confident, clear, unhurried voice] Solte em cima do 0. Depois clique em verdadeiro e escolha falso, porque a partida começa sem a chave. [engaging, energetic, conversational voice] Agora a outra metade: quando o personagem pega a chave, temChave vira verdadeiro. Isso acontece no encontro com a chave, logo abaixo de Esconder o objeto chave. Deixe esse lugar à vista. [confident, clear, unhurried voice] Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para. [confident, clear, unhurried voice] Arraste e solte logo abaixo de Esconder o objeto chave. [confident, clear, unhurried voice] Repare: ele chega com contador. Clique em contador e escolha temChave. [confident, clear, unhurried voice] Abra Programação e depois Lógica e Se, e pegue outro bloco verdadeiro. [confident, clear, unhurried voice] Solte em cima do 1 e deixe verdadeiro, porque o personagem acabou de pegar a chave. [interested, animated voice] Olha os dois lugares: ao começar, falso. Ao pegar a chave, verdadeiro. [engaging, energetic, conversational voice] Esse valor não aparece na ilha. Na próxima aula, o farol vai consultar essa informação. ' +
          conferir(
            'em Ao iniciar está Criar variável temChave com valor falso, e no encontro com a chave, logo abaixo de Esconder o objeto chave, está Alterar variável temChave para verdadeiro',
          ),
      },
      {
        key: 'aviso',
        title: 'Conte que a chave foi recolhida',
        kind: 'delivery',
        screen: `A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo]. No "e pegue a chave", subir pela esquerda da pedra e andar até a chave ${ATE_A_CHAVE}. No "mas o aviso lá em cima continua o mesmo", apontar o aviso ${AVISO}. No "No encontro com a chave, deixe à vista", trazer o encontro para perto do meio [arrastar até "Alterar variável temChave"]. No "o lugar logo abaixo do bloco que muda", apontar o lugar logo abaixo [apontar abaixo de "Alterar variável temChave"]. No "Abra Programação", abrir **Programação** [abrir categoria Programação]. No "e depois Variáveis", abrir **Variáveis** [abrir categoria Programação > Variáveis]. No "Arraste e solte logo abaixo do bloco de", encaixar o bloco [encaixar "Alterar variável" abaixo de "Alterar variável temChave"]. No "Clique em contador", clicar no campo [abrir campo "contador" em "Alterar variável contador"]. No "e escolha aviso", escolher **aviso** [escolher "aviso" em "Alterar variável aviso"]. No "Abra Programação", mostrar **Programação** já aberta, sem recolher [abrir categoria Programação]. No "e depois Valores", abrir **Valores** [abrir categoria Programação > Valores]. No "Solte em cima do número", soltar o bloco **texto** sobre o 1 [soltar "texto" em cima do "1" em "Alterar variável aviso"]. No "o texto chega com Olá", apontar o bloco [apontar bloco "Alterar variável aviso"]. No "Clique em Olá", clicar no texto [abrir campo "Olá" em "Alterar variável aviso"]. No "apague e escreva", escrever a mensagem que a fala dita e clicar fora do bloco [escolher "Você pegou a chave! Agora vá ao farol." em "Alterar variável aviso"]. No "Clique em Rodar de novo mais uma vez", clicar em **Rodar de novo** [rodar de novo]. No "e pegue a chave", andar até a chave pelo mesmo caminho ${ATE_A_CHAVE}. No "o aviso novo aparece lá em cima", apontar o aviso ${AVISO}. No "Toque na tecla R", tocar a tecla R [tecla r]. No "A chave e o aviso do começo voltam", apontar o aviso ${AVISO}. ${telaDaConferencia(
          '"Quando personagem encostar em chave"',
          [
            ['dentro do encontro com a chave estão Esconder o objeto chave', 'Esconder o objeto'],
            ['e o aviso com o texto novo', 'Alterar variável aviso'],
          ],
        )} ${telaDoEnvio('Pronto, você escolheu um lugar em três dimensões', 'Concluir aula')} ${ESTIMATIVA}`,
        recado:
          'Agora mostre na tela que a chave foi pega! No encontro com a chave, mude o aviso para Você pegou a chave! Agora vá ao farol. Teste e clique em Verificar projeto. Depois clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.',
        steps: [
          'Clique em Rodar de novo e pegue a chave: o aviso ainda não muda.',
          'No encontro com a chave, deixe à vista o lugar logo abaixo de Alterar variável temChave. Em Programação → Variáveis, pegue Alterar variável para e solte ali.',
          'Clique em contador e escolha aviso.',
          'Em Programação → Valores, pegue texto e solte em cima do número. Clique em Olá, apague e escreva Você pegou a chave! Agora vá ao farol.',
          'Clique em Rodar de novo e pegue a chave: o aviso novo aparece. Toque na tecla R: a chave e o aviso do começo voltam.',
          'Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.',
        ],
        text:
          '[engaging, energetic, conversational voice] Aqui no seu jogo, clique em Rodar de novo e pegue a chave. Tá vendo? A chave some, mas o aviso lá em cima continua o mesmo, porque nada muda o aviso no encontro. [engaging, energetic, conversational voice] O aviso mostra o texto guardado na variável aviso. Por isso, para mudar o aviso, basta mudar esse texto no encontro com a chave. [confident, clear, unhurried voice] No encontro com a chave, deixe à vista o lugar logo abaixo do bloco que muda temChave. [confident, clear, unhurried voice] Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para. [confident, clear, unhurried voice] Arraste e solte logo abaixo do bloco de temChave. [confident, clear, unhurried voice] Repare: ele chega com contador. Clique em contador e escolha aviso. [engaging, energetic, conversational voice] O valor vem com um número, mas o aviso é uma mensagem. Por isso, troque o número por um texto. [confident, clear, unhurried voice] Abra Programação e depois Valores, e pegue o bloco texto. [confident, clear, unhurried voice] Solte em cima do número. Ele entra no lugar do número. [confident, clear, unhurried voice] Repare: o texto chega com Olá. Clique em Olá, apague e escreva: Você pegou a chave! Agora vá ao farol. [upbeat, encouraging voice] Agora vamos testar! Clique em Rodar de novo mais uma vez e pegue a chave. [interested, animated voice] Olha só: a chave some, e o aviso novo aparece lá em cima. [upbeat, encouraging voice] Toque na tecla R. A chave e o aviso do começo voltam. ' +
          entregar(
            'dentro do encontro com a chave estão Esconder o objeto chave, temChave verdadeiro e o aviso com o texto novo',
            'Pronto, você escolheu um lugar em três dimensões para a chave e ensinou o personagem a pegar a chave!',
            'Na próxima aula, o farol vai conferir se o personagem está com a chave. Quando aparecer Projeto enviado!, clique em Concluir aula.',
          ),
      },
    ],
  },
  {
    slug: 'ilha-aula-3',
    title: 'A luz volta ao farol',
    trechos: [
      {
        key: 'sem-chave',
        title: 'O farol precisa conferir a chave',
        kind: 'build',
        screen: `A parte começa com o Estúdio expandido e o projeto enviado na Aula 2 [expandir estúdio]. No "clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo]. No "e leve o personagem até o farol", passar na frente da pedra, sem pegar a chave, e atravessar a ponte até o farol ${DO_COMECO_AO_FAROL}. No "Nada acontece", apontar o farol apagado, ao lado do personagem [apontar prévia]. No "Encontre essa área", trazer a área para perto do meio [arrastar até "Quando acontecer"]. No "Lá dentro está o encontro com a chave", apontar o encontro [apontar bloco "Quando personagem encostar em chave"]. No "O encontro novo vai logo abaixo dele", apontar o lugar logo abaixo [apontar abaixo de "Quando personagem encostar em chave"]. No "Abra Jogo 3D", abrir **Jogo 3D** [abrir categoria Jogo 3D]. No "depois Encostar", abrir **Encostar** [abrir categoria Jogo 3D > Encostar]. No "e depois Encostar de novo", abrir a subcategoria **Encostar**, dentro da categoria de mesmo nome [abrir categoria Jogo 3D > Encostar > Encostar]. No "Arraste e solte logo abaixo do encontro com a chave", levar o encontro novo para logo abaixo do outro, fora do fazer dele [encaixar "Quando personagem encostar em chave" abaixo de "Quando personagem encostar em chave"]. No "o bloco chega com chave no segundo nome", trazer o encontro novo, o de baixo, para perto do meio [arrastar até "Quando personagem encostar em chave abaixo de Quando personagem encostar em chave"]. No "Clique em chave", clicar no segundo nome do encontro novo [abrir campo "chave" em "Quando personagem encostar em chave abaixo de Quando personagem encostar em chave"]. No "e escolha farol", escolher **farol** [escolher "farol" em "${FAROL}"]. No "É este bloco que percebe quando o personagem chega ao farol", apontar o encontro novo [apontar bloco "${FAROL}"]. No "Ela vai no espaço ao lado da palavra fazer", apontar o espaço ao lado de **fazer** [apontar encaixe em "${FAROL}"]. No "Abra Programação", abrir **Programação** [abrir categoria Programação]. No "e depois Lógica", abrir **Lógica & Se** [abrir categoria Programação > Lógica & Se]. No "Arraste e solte no espaço ao lado de fazer", encaixar o **Se** no encontro com o farol [encaixar "Se" em "${FAROL}"]. No "chega com uma pergunta pronta", trazer o **Se** para perto do meio [arrastar até "${SE_FAROL}"]. No "segure essa pergunta pelo sinal de maior", levar a pergunta pelo sinal de maior até a lixeira, no canto de baixo, à direita, da área de código [jogar na lixeira ">" em "${SE_FAROL}"]. No "É ali que vai a pergunta certa", apontar o lugar vazio ao lado de **Se** [apontar encaixe em "${SE_FAROL}" no "Se"]. No "Abra Programação", mostrar **Programação** já aberta, sem recolher [abrir categoria Programação]. No "e depois Valores", abrir **Valores** [abrir categoria Programação > Valores]. No "Arraste e solte no lugar vazio ao lado de Se", encaixar **valor da variável** ao lado de **Se** [encaixar "valor da variável" em "${SE_FAROL}" no "Se"]. No "Clique no x", clicar no campo e escolher temChave na lista [abrir campo "x" em "${SE_FAROL}"] [escolher "temChave" em "${SE_FAROL}"]. No "No bloco Se, cada resposta tem o seu espaço", apontar o **Se** pronto [apontar bloco "${SE_FAROL}"]. No "A resposta do sim fica no espaço do então", apontar o espaço do **então**, ainda vazio [apontar encaixe em "${SE_FAROL}" no "então"]. No "O primeiro fica antes de", apontar o primeiro sinal de mais [apontar mais de "senão se" em "${SE_FAROL}"]. No "e o segundo fica antes da palavra", apontar o segundo [apontar mais de "senão" em "${SE_FAROL}"]. No "Clique no segundo sinal de mais", clicar no segundo, o de antes da palavra **senão** [abrir "senão" em "${SE_FAROL}"]. No "Repare: apareceu o espaço do", trazer o **Se** para perto do meio: o espaço novo nasce na borda de baixo [arrastar até "${SE_FAROL}"]. No "Deixe esse espaço à vista", apontar o espaço do **senão** [apontar encaixe em "${SE_FAROL}" no "senão"]. No "Abra Programação", mostrar **Programação** já aberta, sem recolher [abrir categoria Programação]. No "e depois Variáveis", abrir **Variáveis** [abrir categoria Programação > Variáveis]. No "Arraste e solte dentro do", encaixar o bloco no espaço do **senão** [encaixar "Alterar variável" em "${SE_FAROL}" no "senão"]. No "Clique em contador", clicar no campo [abrir campo "contador" em "Alterar variável contador"]. No "e escolha aviso", escolher **aviso** na lista [escolher "aviso" em "Alterar variável aviso dentro de ${FAROL}"]. No "Abra Programação", mostrar **Programação** já aberta, sem recolher [abrir categoria Programação]. No "e depois Valores", abrir **Valores** [abrir categoria Programação > Valores]. No "Solte em cima do número", soltar o bloco **texto** sobre o 1 [soltar "texto" em cima do "1" em "Alterar variável aviso dentro de ${FAROL}"]. No "o texto chega com Olá", apontar o bloco [apontar bloco "Alterar variável aviso dentro de ${FAROL}"]. No "Clique em Olá", clicar no texto [abrir campo "Olá" em "Alterar variável aviso dentro de ${FAROL}"]. No "apague e escreva", escrever a mensagem que a fala dita e clicar fora do bloco [escolher "Falta a chave. Procure na ilha antes de voltar." em "Alterar variável aviso dentro de ${FAROL}"]. No "O espaço do então fica vazio por enquanto", apontar o espaço do **então** [apontar encaixe em "${SE_FAROL}" no "então"]. No "Clique em Rodar de novo mais uma vez", clicar em **Rodar de novo** [rodar de novo]. No "e vá direto ao farol", ir ao farol pelo mesmo caminho, sem pegar a chave ${DO_COMECO_AO_FAROL}. No "e o aviso pede a chave", apontar o aviso ${AVISO}. ${telaDaConferencia(
          `"${FAROL}"`,
          [
            ['está o encontro do personagem com o farol', FAROL],
            ['dentro dele está o Se', SE_FAROL],
            ['e dentro do senão está o aviso', `Alterar variável aviso dentro de ${FAROL}`],
          ],
        )} ${telaDaSaida} ${ESTIMATIVA}`,
        recado:
          'Agora ensine o farol a avisar quando falta a chave! Monte o encontro com o farol, o bloco Se com temChave e o aviso no espaço do senão. Depois vá ao farol sem pegar a chave. Funcionou? Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        steps: [
          'Clique em Rodar de novo e vá ao farol sem pegar a chave: nada acontece.',
          'Em Quando acontecer, deixe à vista o espaço logo abaixo do encontro com a chave, fora do fazer dele.',
          'Abra Jogo 3D → Encostar → Encostar. Pegue Quando personagem encostar em chave e solte nesse espaço. Clique em chave e escolha farol.',
          'Em Programação → Lógica e Se, pegue Se e solte no espaço ao lado de fazer do encontro novo.',
          'Arraste a pergunta x maior que 0 até a lixeira. Em Programação → Valores, pegue valor da variável e solte no lugar vazio ao lado de Se. Clique no x e escolha temChave.',
          'Na linha de baixo do Se, clique no segundo sinal de mais, o de antes da palavra senão.',
          'Em Programação → Variáveis, pegue Alterar variável para e solte dentro do senão. Clique em contador e escolha aviso.',
          'Em Programação → Valores, pegue texto e solte em cima do número. Escreva Falta a chave. Procure na ilha antes de voltar. Deixe o então vazio.',
          'Clique em Rodar de novo e vá direto ao farol: ele continua apagado e o aviso pede a chave.',
          'Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        ],
        text:
          '[upbeat, welcoming voice] Seu personagem já pega a chave. Agora é a vez do farol! [engaging, energetic, conversational voice] Aqui no seu jogo, clique em Rodar de novo e leve o personagem até o farol, sem passar pela chave. Tá vendo? Nada acontece, porque o jogo ainda não sabe o que fazer quando o personagem chega ao farol. [engaging, energetic, conversational voice] Lembra da porta do jogo 2D? Ela fazia uma pergunta: o personagem está com a chave? Com a resposta sim, o farol acendia. Com a resposta não, o aviso dizia que falta a chave. Agora a gente vai montar essa pergunta no farol da ilha, começando pelo aviso! [engaging, energetic, conversational voice] Primeiro, o jogo precisa perceber quando o personagem chega ao farol. Chegar ao farol é um encontro, como pegar a chave, e os encontros ficam na área Quando acontecer. [confident, clear, unhurried voice] Encontre essa área. Lá dentro está o encontro com a chave. O encontro novo vai logo abaixo dele, fora do fazer dele. Deixe esse espaço à vista. [confident, clear, unhurried voice] Abra Jogo 3D, depois Encostar e depois Encostar de novo, e pegue o bloco Quando personagem encostar em chave. [confident, clear, unhurried voice] Arraste e solte logo abaixo do encontro com a chave. Não coloque um encontro dentro do outro. [confident, clear, unhurried voice] Repare: o bloco chega com chave no segundo nome. Clique em chave e escolha farol. [engaging, energetic, conversational voice] É este bloco que percebe quando o personagem chega ao farol. [engaging, energetic, conversational voice] Agora, dentro desse encontro, o farol vai fazer a pergunta. Ela vai no espaço ao lado da palavra fazer. Deixe esse espaço à vista. [engaging, energetic, conversational voice] Para fazer uma pergunta, o seu jogo usa o bloco Se. [confident, clear, unhurried voice] Abra Programação e depois Lógica e Se, e pegue o bloco Se. [confident, clear, unhurried voice] Arraste e solte no espaço ao lado de fazer. [confident, clear, unhurried voice] Repare: o Se chega com uma pergunta pronta, x maior que 0. Não é isso que o farol precisa perguntar. [confident, clear, unhurried voice] Por isso, segure essa pergunta pelo sinal de maior e arraste até a lixeira, no canto de baixo, à direita, do espaço dos blocos. [confident, clear, unhurried voice] Agora o lugar ao lado de Se ficou vazio. É ali que vai a pergunta certa. [engaging, energetic, conversational voice] A pergunta certa é sobre temChave. O bloco que traz o que temChave guarda se chama valor da variável. [confident, clear, unhurried voice] Abra Programação e depois Valores, e pegue o bloco valor da variável. [confident, clear, unhurried voice] Arraste e solte no lugar vazio ao lado de Se. [confident, clear, unhurried voice] Repare: esse bloco chega com x. Clique no x e escolha temChave. [engaging, energetic, conversational voice] Pronto: agora o Se pergunta se temChave é verdadeiro. Ou seja: o personagem pegou a chave? [engaging, energetic, conversational voice] No bloco Se, cada resposta tem o seu espaço. A resposta do sim fica no espaço do então. A resposta do não fica no espaço do senão. [engaging, energetic, conversational voice] O aviso de que falta a chave é a resposta do não. Só que o Se chega sem o senão, e você vai abrir esse espaço agora. [interested, animated voice] Olha aqui, na linha de baixo do bloco Se: tem dois sinais de mais. O primeiro fica antes de senão se, e o segundo fica antes da palavra senão, no fim da linha. [confident, clear, unhurried voice] Clique no segundo sinal de mais. Não clique no primeiro. [confident, clear, unhurried voice] Repare: apareceu o espaço do senão. Deixe esse espaço à vista. [confident, clear, unhurried voice] Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para. [confident, clear, unhurried voice] Arraste e solte dentro do senão. [confident, clear, unhurried voice] Esse bloco chega com contador. Clique em contador e escolha aviso. [engaging, energetic, conversational voice] Agora troque o número por um texto, como você fez na aula passada. [confident, clear, unhurried voice] Abra Programação e depois Valores, e pegue o bloco texto. [confident, clear, unhurried voice] Solte em cima do número. [confident, clear, unhurried voice] Repare: o texto chega com Olá. Clique em Olá, apague e escreva: Falta a chave. Procure na ilha antes de voltar. [engaging, energetic, conversational voice] O espaço do então fica vazio por enquanto. Você completa a resposta do sim na próxima parte. [upbeat, encouraging voice] Agora vamos testar! Clique em Rodar de novo mais uma vez e vá direto ao farol, sem passar pela chave. [interested, animated voice] Olha só: o farol continua apagado, e o aviso pede a chave. É a resposta do senão funcionando! ' +
          verificar(
            'dentro de Quando acontecer está o encontro do personagem com o farol, dentro dele está o Se com temChave, e dentro do senão está o aviso de que falta a chave',
          ),
      },
      {
        key: 'decisao',
        title: 'Acenda o farol com a chave',
        kind: 'build',
        screen: `A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo]. No "pegue a chave", subir pela esquerda da pedra e andar até a chave ${ATE_A_CHAVE}. No "e leve o personagem até o farol", voltar pela esquerda da pedra, passar na frente dela e atravessar a ponte ${DA_CHAVE_AO_FAROL}. No "A luz não acende", apontar o farol apagado [apontar prévia]. No "Continue no Se", trazer o **Se** do encontro com o farol para perto do meio [arrastar até "${SE_FAROL}"]. No "e deixe à vista o espaço do então", apontar o espaço do **então**, ainda vazio [apontar encaixe em "${SE_FAROL}" no "então"]. No "Abra Jogo 3D", abrir **Jogo 3D** [abrir categoria Jogo 3D]. No "depois Objetos", abrir **Objetos** [abrir categoria Jogo 3D > Objetos]. No "e depois Animação do modelo", abrir **Animação do modelo** [abrir categoria Jogo 3D > Objetos > Animação do modelo]. No "Arraste e solte dentro do então", encaixar o bloco no espaço do **então** [encaixar "Tocar a animação" em "${SE_FAROL}" no "então"]. No "ele chega com Andar", apontar o bloco [apontar bloco "Tocar a animação"]. No "clique em heroi", clicar no nome [abrir campo "heroi" em "Tocar a animação"]. No "e escolha farol", escolher **farol** [escolher "farol" em "Tocar a animação"]. No "Depois clique em Andar", clicar no nome da animação [abrir campo "Andar" em "Tocar a animação"]. No "e escolha acender", escolher **acender** [escolher "acender" em "Tocar a animação"]. No "Por último, clique em repetindo", clicar no campo [abrir campo "repetindo" em "Tocar a animação"]. No "e escolha uma vez", escolher **uma vez** [escolher "uma vez" em "Tocar a animação"]. No "tem uma regra pronta que olha ganhou", trazer para perto do meio o **Se** de **A cada quadro da cena** [arrastar até "Se dentro de A cada quadro da cena"] e apontar o bloco [apontar bloco "Se dentro de A cada quadro da cena"]. No "Volte ao então", trazer de volta o encontro com o farol [arrastar até "Tocar a animação"]. No "logo abaixo de Tocar a animação", apontar o lugar logo abaixo [apontar abaixo de "Tocar a animação"]. No "Abra Programação", abrir **Programação** [abrir categoria Programação]. No "e depois Variáveis", abrir **Variáveis** [abrir categoria Programação > Variáveis]. No "Arraste e solte logo abaixo de Tocar a animação", encaixar o bloco [encaixar "Alterar variável" abaixo de "Tocar a animação"]. No "Clique em contador", clicar no campo [abrir campo "contador" em "Alterar variável contador"]. No "e escolha ganhou", escolher **ganhou** [escolher "ganhou" em "Alterar variável ganhou dentro de ${FAROL}"]. No "Abra Programação", mostrar **Programação** já aberta, sem recolher [abrir categoria Programação]. No "e depois Lógica", abrir **Lógica & Se** [abrir categoria Programação > Lógica & Se]. No "Solte em cima do número e deixe em verdadeiro", soltar **verdadeiro** sobre o número [soltar "verdadeiro" em cima do "1" em "Alterar variável ganhou dentro de ${FAROL}"]. No "Ele vai logo abaixo do bloco de ganhou", apontar o lugar logo abaixo [apontar abaixo de "Alterar variável ganhou dentro de ${FAROL}"]. No "Abra Programação", mostrar **Programação** já aberta, sem recolher [abrir categoria Programação]. No "e depois Variáveis", abrir **Variáveis** [abrir categoria Programação > Variáveis]. No "Arraste e solte logo abaixo do bloco de ganhou", encaixar o bloco [encaixar "Alterar variável" abaixo de "Alterar variável ganhou dentro de ${FAROL}"]. No "Clique em contador", clicar no campo [abrir campo "contador" em "Alterar variável contador"]. No "e escolha aviso", escolher **aviso** [escolher "aviso" em "Alterar variável aviso abaixo de Alterar variável ganhou"]. No "Abra Programação", mostrar **Programação** já aberta, sem recolher [abrir categoria Programação]. No "e depois Valores", abrir **Valores** [abrir categoria Programação > Valores]. No "Solte em cima do número", soltar o bloco **texto** sobre o 1 [soltar "texto" em cima do "1" em "Alterar variável aviso abaixo de Alterar variável ganhou"]. No "Clique em Olá", clicar no texto [abrir campo "Olá" em "Alterar variável aviso abaixo de Alterar variável ganhou"]. No "apague e escreva", escrever a mensagem que a fala dita e clicar fora do bloco [escolher "Você acendeu o farol! O barco pode chegar." em "Alterar variável aviso abaixo de Alterar variável ganhou"]. No "Clique em Rodar de novo mais uma vez", clicar em **Rodar de novo** [rodar de novo]. No "e vá ao farol sem a chave", ir ao farol sem pegar a chave ${DO_COMECO_AO_FAROL}. No "A luz continua apagada", apontar o aviso de que falta a chave ${AVISO}. No "Depois busque a chave", voltar pela ponte e subir pela esquerda da pedra até a chave ${DO_FAROL_A_CHAVE}. No "e volte ao farol", voltar ao farol pelo mesmo caminho ${DA_CHAVE_AO_FAROL}. No "a luz acende", apontar o farol aceso [apontar prévia]. No "o aviso muda", apontar o aviso novo ${AVISO}. ${telaDaConferencia(
          `"${SE_FAROL}"`,
          [
            ['dentro do então estão Tocar a animação', 'Tocar a animação'],
            ['ganhou verdadeiro', `Alterar variável ganhou dentro de ${FAROL}`],
            ['e o aviso da vitória', 'Alterar variável aviso abaixo de Alterar variável ganhou'],
          ],
        )} ${telaDaSaida} ${ESTIMATIVA}`,
        recado:
          'Agora acenda o farol! No espaço do então, ponha Tocar a animação acender em farol uma vez, ganhou verdadeiro e o aviso da vitória. Teste sem a chave e com a chave. Depois clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        steps: [
          'Clique em Rodar de novo, pegue a chave e vá ao farol: a luz ainda não acende.',
          'No Se do encontro com o farol, deixe à vista o espaço do então.',
          'Abra Jogo 3D → Objetos → Animação do modelo. Pegue Tocar a animação e solte dentro do então.',
          'Clique em heroi e escolha farol. Clique em Andar e escolha acender. Clique em repetindo e escolha uma vez.',
          'Logo abaixo, solte Alterar variável para, de Programação → Variáveis. Clique em contador e escolha ganhou. Em cima do número, solte verdadeiro, de Programação → Lógica e Se.',
          'Logo abaixo de ganhou, solte outro Alterar variável para e escolha aviso. Em cima do número, solte texto, de Programação → Valores, e escreva Você acendeu o farol! O barco pode chegar.',
          'Clique em Rodar de novo. Vá ao farol sem a chave: ele continua apagado. Depois busque a chave e volte: a luz acende, o feixe gira e o barco chega.',
          'Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        ],
        text:
          '[engaging, energetic, conversational voice] Aqui no seu jogo, clique em Rodar de novo, pegue a chave e leve o personagem até o farol. Tá vendo? A luz não acende, porque o espaço do então, o da resposta do sim, ainda está vazio. [engaging, energetic, conversational voice] Agora a gente vai pôr a resposta do sim no então do seu jogo! [engaging, energetic, conversational voice] A resposta do sim vai ter três blocos, um embaixo do outro: um que acende a luz, um que guarda que a partida foi ganha e um aviso para quem está jogando. [interested, animated voice] No jogo 2D, a gente trocava a imagem do farol apagado pela do farol aceso. Aqui o farol é um modelo 3D, e ele sabe acender: o modelo tem uma animação de acender. [confident, clear, unhurried voice] Continue no Se, dentro do encontro com o farol, e deixe à vista o espaço do então. [confident, clear, unhurried voice] Abra Jogo 3D, depois Objetos e depois Animação do modelo, e pegue o bloco Tocar a animação. [confident, clear, unhurried voice] Arraste e solte dentro do então. [confident, clear, unhurried voice] Repare: ele chega com Andar, heroi e repetindo. Primeiro diga quem vai tocar a animação: clique em heroi e escolha farol. [confident, clear, unhurried voice] Depois clique em Andar e escolha acender. [confident, clear, unhurried voice] Por último, clique em repetindo e escolha uma vez. [engaging, energetic, conversational voice] Uma vez quer dizer que a luz acende e fica acesa no fim. Repetindo faria a animação recomeçar sem parar. [engaging, energetic, conversational voice] O segundo bloco guarda que a partida foi ganha. Para isso existe a variável ganhou: ela começa falso e vira verdadeiro quando o farol acende. [interested, animated voice] Olha aqui, em Enquanto estiver rodando: tem uma regra pronta que olha ganhou. Quando ganhou é verdadeiro, ela deixa o farol aceso, com o feixe girando, e traz o barco. [confident, clear, unhurried voice] Volte ao então e deixe à vista o lugar logo abaixo de Tocar a animação. [confident, clear, unhurried voice] Abra Programação e depois Variáveis, e pegue o bloco Alterar variável para. [confident, clear, unhurried voice] Arraste e solte logo abaixo de Tocar a animação. [confident, clear, unhurried voice] Clique em contador e escolha ganhou. [confident, clear, unhurried voice] Abra Programação e depois Lógica e Se, e pegue o bloco verdadeiro. [confident, clear, unhurried voice] Solte em cima do número e deixe em verdadeiro. [curious] E quem está jogando vai saber que deu certo? [engaging, energetic, conversational voice] Vai, sim! É para isso que serve o terceiro bloco: o aviso. Ele vai logo abaixo do bloco de ganhou, ainda dentro do então. [confident, clear, unhurried voice] Abra Programação e depois Variáveis, e pegue outro bloco Alterar variável para. [confident, clear, unhurried voice] Arraste e solte logo abaixo do bloco de ganhou. [confident, clear, unhurried voice] Clique em contador e escolha aviso. [confident, clear, unhurried voice] Abra Programação e depois Valores, e pegue o bloco texto. [confident, clear, unhurried voice] Solte em cima do número. [confident, clear, unhurried voice] Clique em Olá, apague e escreva: Você acendeu o farol! O barco pode chegar. [upbeat, encouraging voice] Agora vamos testar! Clique em Rodar de novo mais uma vez e vá ao farol sem a chave. A luz continua apagada. [upbeat, encouraging voice] Depois busque a chave e volte ao farol. [interested, animated voice] Olha só: a luz acende, o feixe começa a girar, o aviso muda e o barco vem chegando! ' +
          verificar(
            'dentro do então estão Tocar a animação acender em farol uma vez, ganhou verdadeiro e o aviso da vitória',
          ),
      },
      {
        key: 'pergunta-com-nao',
        title: 'O que muda com o não?',
        kind: 'experience',
        screen: `A experiência aparece no tamanho da aula, com a ilha 3D parada, o personagem longe do farol e a pergunta sem o não. Do "Sabe a plaquinha" até o "uma palavrinha de diferença", a tela fica parada, e a edição troca esse trecho por um desenho nosso com o Zappy, sem foto de pessoa real nem meme da internet: duas lojas lado a lado, uma com a plaquinha Pode entrar e outra com Não pode entrar, com a palavra não destacada, sem mostrar ninguém entrando nem barrado [na edição: as duas plaquinhas de loja]. No "Imagine uma porta", a tela volta para a experiência. ${telaDaExperiencia('sem apontar controles e sem andar')} Qual resposta a porta dá em cada situação é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência. Não falar de blocos, de Se, de então, de senão nem de variáveis. O vídeo explica a ideia e convida, sem mostrar os controles nem a ordem dos testes (molde do Cadê, 02/11/2026).`,
        ponte:
          'Sua vez! Investigue o que a palavra não faz com a resposta da porta, com a chave e sem a chave. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
        instrucao:
          'Leve o personagem até o farol com a chave e sem ela e compare a resposta da porta com o "não" e sem ele. O Zappy te mostra o que testar, e você pode repetir quando quiser.',
        pistas: [
          'Antes de ir ao farol, repare se o personagem tem a chave e qual pergunta a porta faz.',
          'Com a mesma chave, ouça a porta com as duas perguntas e compare as respostas.',
          'Leve o personagem até o farol sem a chave. Encaixe o "não" na pergunta e ouça a resposta de novo. Então pegue a chave e compare as duas perguntas outra vez.',
        ],
        pedidos: {
          'not-flips-without-key': 'Sem a chave, ouça a porta com o "não" e sem ele.',
          'not-flips-with-key': 'Com a chave, ouça a porta com o "não" e sem ele.',
        },
        cena: {
          scene: 'lighthouse-key',
          cenario: 'ilha',
          goals: ['not-flips-with-key', 'not-flips-without-key'],
        },
        text: '[engaging, energetic, conversational voice] Seu farol já acende! Daqui a pouco, ele vai precisar de uma palavrinha nova numa pergunta: o não. [engaging, energetic, conversational voice] Sabe a plaquinha na porta de uma loja? Tem loja que escreve “Pode entrar” e tem loja que escreve “Não pode entrar”. As duas frases só têm uma palavrinha de diferença. [engaging, energetic, conversational voice] Imagine uma porta que pergunta: a porta está trancada? E que abre quando a resposta é sim. [curious] Com o não na pergunta, o que a porta faz? [engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência. [upbeat, encouraging voice] Agora você vai investigar o que a palavra não faz com a resposta da porta, com a chave e sem a chave. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
      },
      {
        key: 'uma-vez',
        title: 'O farol acende uma vez só',
        kind: 'build',
        screen: `A parte começa com o Estúdio expandido e o projeto da parte anterior [expandir estúdio]. No "Clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo]. No "pegue a chave", subir pela esquerda da pedra e andar até a chave ${ATE_A_CHAVE}. No "e acenda o farol", levar o personagem até o farol ${DA_CHAVE_AO_FAROL}. No "Depois ande um pouco para trás pelo cais", segurar a seta da esquerda por um instante [segurar tecla ArrowLeft por 0,5 s]. No "e volte até o farol", segurar a seta da direita até o farol [segurar tecla ArrowRight por 0,6 s]. No "A luz apagou e acendeu tudo de novo", apontar o farol [apontar prévia]. Do "Sabe o apito final" até o "porque a partida acabou", a tela fica parada, e a edição troca esse trecho por um desenho nosso de 2 a 3 segundos: o Zappy de juiz apitando e a bola entrando no gol depois, com o placar parado [na edição: o apito final e o gol que não vale]. No "No seu jogo, o apito final", a tela volta para o Estúdio. Na lembrança da porta da experiência, só a fala: não refazer a experiência. No "Nos blocos, encontre o encontro com o farol", trazer o encontro para perto do meio [arrastar até "${FAROL}"]. No "Abra Programação", abrir **Programação** [abrir categoria Programação]. No "e depois Lógica", abrir **Lógica & Se** [abrir categoria Programação > Lógica & Se]. No "Arraste e solte no espaço ao lado de fazer", soltar o **Se** novo no espaço ao lado de **fazer**, em cima do Se que já está lá [encaixar "Se" em "${FAROL}"]. No "o Se novo entrou no lugar", apontar o **Se** novo [apontar bloco "${SE_FAROL}"]. No "Ele ficou logo abaixo do Se novo", apontar o Se de antes, logo abaixo [apontar bloco "${SE_CHAVE}"]. No "O Se novo chega com a pergunta", trazer o **Se** novo para perto do meio [arrastar até "${SE_FAROL}"]. No "Segure essa pergunta pelo sinal de maior", levar a pergunta até a lixeira [jogar na lixeira ">" em "${SE_FAROL}"]. No "Abra Programação", mostrar **Programação** já aberta, sem recolher [abrir categoria Programação]. No "e depois Lógica", abrir **Lógica & Se** [abrir categoria Programação > Lógica & Se]. No "Solte no lugar vazio ao lado do Se novo", encaixar o **não** [encaixar "não" em "${SE_FAROL}" no "Se"]. No "Abra Programação", mostrar **Programação** já aberta, sem recolher [abrir categoria Programação]. No "e depois Valores", abrir **Valores** [abrir categoria Programação > Valores]. No "Solte no espaço do não", encaixar **valor da variável** no **não** [encaixar "valor da variável" em "não" no "não"]. No "Depois clique no x", clicar no campo [abrir campo "x" em "não"]. No "e escolha ganhou", escolher **ganhou** [escolher "ganhou" em "não"]. No "o Se novo pergunta não ganhou", apontar o **Se** novo [apontar bloco "${SE_NAO}"]. No "Segure o Se", levar o Se de antes, pela palavra **Se**, até o espaço do **então** do Se novo [mover "${SE_CHAVE}" para "${SE_NAO}" no "então"]. No "Tudo o que está dentro dele vai junto", apontar o Se de antes, já dentro do Se novo [apontar bloco "${SE_CHAVE}"]. No "Olha aqui: o encontro primeiro pergunta", deixar o encontro inteiro à vista [mostrar blocos "${FAROL}"]. No "Clique em Rodar de novo mais uma vez", clicar em **Rodar de novo** [rodar de novo]. No "pegue a chave e acenda o farol", levar o personagem até a chave e depois até o farol ${ATE_A_CHAVE} ${DA_CHAVE_AO_FAROL}. No "Ande para trás pelo cais e volte", segurar a seta da esquerda e depois a da direita [segurar tecla ArrowLeft por 0,5 s] [segurar tecla ArrowRight por 0,6 s]. No "a luz continua acesa", apontar o farol aceso [apontar prévia]. No "Toque na tecla R", tocar a tecla R [tecla r]. No "e vá ao farol sem a chave", ir ao farol sem pegar a chave ${DO_COMECO_AO_FAROL}. No "ele continua pedindo a chave", apontar o aviso ${AVISO}. ${telaDaConferencia(
          `"${FAROL}"`,
          [
            ['dentro do encontro com o farol está o Se com não', SE_NAO],
            ['inteiro está dentro do então dele', SE_CHAVE],
          ],
        )} ${telaDaSaida} ${ESTIMATIVA}`,
        recado:
          'Agora faça o farol acender uma vez só! Ponha um Se novo com não ganhou no encontro com o farol e leve o Se temChave para dentro do então dele. Teste: acenda o farol, ande para trás e volte. Depois clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        steps: [
          'Clique em Rodar de novo, pegue a chave e acenda o farol. Ande para trás pelo cais e volte: a luz apaga e acende de novo.',
          'Em Quando acontecer, deixe à vista o encontro com o farol.',
          'Em Programação → Lógica e Se, pegue Se e solte no espaço ao lado de fazer do encontro com o farol. O Se temChave desce e fica logo abaixo do Se novo.',
          'Arraste a pergunta x maior que 0 do Se novo até a lixeira. Em Programação → Lógica e Se, pegue não e solte no lugar vazio ao lado do Se novo.',
          'Em Programação → Valores, pegue valor da variável e solte no espaço do não. Clique no x e escolha ganhou.',
          'Segure o Se temChave pela palavra Se e arraste até o espaço do então do Se novo. Tudo o que está dentro dele vai junto.',
          'Clique em Rodar de novo. Pegue a chave, acenda o farol, ande para trás e volte: a luz continua acesa. Toque na tecla R e vá ao farol sem a chave: ele continua pedindo a chave.',
          'Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        ],
        text:
          '[engaging, energetic, conversational voice] Seu farol já acende com a chave. Agora vamos conferir uma coisa no seu jogo. Clique em Rodar de novo, pegue a chave e acenda o farol. Depois ande um pouco para trás pelo cais e volte até o farol. [interested, animated voice] Tá vendo? A luz apagou e acendeu tudo de novo. Isso acontece porque, cada vez que o personagem encosta no farol, o encontro acontece de novo e manda acender outra vez. [engaging, energetic, conversational voice] Sabe o apito final de um jogo de futebol? Depois dele, chutar a bola no gol não vale mais, porque a partida acabou. [engaging, energetic, conversational voice] No seu jogo, o apito final é ganhou ficar verdadeiro. Depois disso, a partida já foi vencida, e o farol não precisa responder outra vez. [engaging, energetic, conversational voice] Por isso, o encontro vai fazer uma pergunta antes de tudo: a partida ainda não foi ganha? Para fazer essa pergunta, a gente usa a palavra não. [engaging, energetic, conversational voice] Lembra da porta da experiência? Com o não na pergunta, a resposta virava ao contrário. [engaging, energetic, conversational voice] No seu jogo é igual. Enquanto ganhou é falso, a partida ainda não foi ganha: a resposta é sim, e o farol responde. Quando ganhou vira verdadeiro, a resposta passa a ser não, e o farol para de responder. [confident, clear, unhurried voice] Nos blocos, encontre o encontro com o farol, na área Quando acontecer. [confident, clear, unhurried voice] Abra Programação e depois Lógica e Se, e pegue o bloco Se. [confident, clear, unhurried voice] Arraste e solte no espaço ao lado de fazer, no encontro com o farol, em cima do Se que já está lá. [interested, animated voice] Repare: o Se novo entrou no lugar, e o Se temChave desceu. Ele ficou logo abaixo do Se novo. [confident, clear, unhurried voice] O Se novo chega com a pergunta x maior que 0. Segure essa pergunta pelo sinal de maior e arraste até a lixeira. [confident, clear, unhurried voice] Abra Programação e depois Lógica e Se, e pegue o bloco não. [confident, clear, unhurried voice] Solte no lugar vazio ao lado do Se novo. [confident, clear, unhurried voice] Abra Programação e depois Valores, e pegue o bloco valor da variável. [confident, clear, unhurried voice] Solte no espaço do não. Depois clique no x e escolha ganhou. [interested, animated voice] Pronto: o Se novo pergunta não ganhou. Ou seja: a partida ainda não foi ganha? [engaging, energetic, conversational voice] Agora a pergunta da chave vai ficar dentro dessa pergunta nova. Assim, o farol só confere a chave enquanto a partida ainda não foi ganha. [confident, clear, unhurried voice] Segure o Se temChave pela palavra Se e arraste até o espaço do então do Se novo. Tudo o que está dentro dele vai junto. [interested, animated voice] Olha aqui: o encontro primeiro pergunta se a partida ainda não foi ganha, e só depois confere a chave. [upbeat, encouraging voice] Agora vamos testar! Clique em Rodar de novo mais uma vez, pegue a chave e acenda o farol. Ande para trás pelo cais e volte. [interested, animated voice] Olha só: a luz continua acesa, o feixe segue girando e o barco continua chegando. [upbeat, encouraging voice] Toque na tecla R e vá ao farol sem a chave: ele continua pedindo a chave. ' +
          verificar(
            'dentro do encontro com o farol está o Se com não ganhou, e o Se temChave inteiro está dentro do então dele',
          ),
      },
      {
        key: 'aparencia',
        title: 'Deixe o jogo com a sua cara',
        kind: 'build',
        screen: `A gravação desta parte começa na revisão, que não tem vídeo: clicar em **Próxima parte** [próxima parte] e expandir o Estúdio, com o projeto da parte do farol que acende uma vez [expandir estúdio]. Do "E agora chegou uma surpresa" até o "e até outro cenário", a tela fica parada, e a edição troca esse trecho por dois clipes curtos, de 3 a 4 segundos cada, gravados antes em perfis de teste, com o farol acendendo e o barco chegando: robo, lancha, chave-prateada, farol-colorido e ilha-nevada; depois mergulhador, veleiro, chave-dourada, farol-de-madeira e costa-rochosa [na edição: duas combinações prontas]. No "Encontre a área Ao iniciar", trazer para perto do meio o bloco do personagem [arrastar até "Criar o objeto personagem"]. No "Clique em aventureiro", abrir a lista dos modelos [abrir campo "aventureiro" em "Criar o objeto personagem"]. No "Eu escolho o pirata", escolher **pirata** [escolher "pirata" em "Criar o objeto personagem"]. No "ele aparece no mesmo lugar", apontar o personagem novo [apontar prévia]. No "Repare que o nome do objeto continua personagem", apontar o bloco [apontar bloco "Criar o objeto personagem"]. No "No barco, eu escolho barco pirata", trocar o modelo do barco [abrir campo "veleiro" em "Criar o objeto barco"] [escolher "barco-pirata" em "Criar o objeto barco"]. No "Na chave, chave de estrela", trocar o modelo da chave [abrir campo "chave-dourada" em "Criar o objeto chave"] [escolher "chave-de-estrela" em "Criar o objeto chave"]. No "E no farol, farol de pedra", trocar o modelo do farol [abrir campo "farol-listrado" em "Criar o objeto farol"] [escolher "farol-de-pedra" em "Criar o objeto farol"]. No "O primeiro Criar o objeto, o cenario", trazer o bloco do cenário para perto do meio [arrastar até "Criar o objeto cenario"]. No "Clique em praia tropical", abrir a lista [abrir campo "praia-tropical" em "Criar o objeto cenario"]. No "Eu vou usar noite na ilha", escolher **noite-na-ilha** [escolher "noite-na-ilha" em "Criar o objeto cenario"]. No "o caminho, a ponte e o lugar do farol continuam os mesmos", apontar o jogo [apontar prévia]. No "Clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo]. No "pegue a chave", subir pela esquerda da pedra e andar até a chave ${ATE_A_CHAVE}. No "e vá até o farol", levar o personagem até o farol ${DA_CHAVE_AO_FAROL}. No "o farol de pedra acende", apontar o farol aceso [apontar prévia]. ${telaDaConferencia(
          '"Criar o objeto personagem", "Criar o objeto barco"',
          [
            ['personagem no personagem', 'Criar o objeto personagem'],
            ['barco no barco', 'Criar o objeto barco'],
          ],
        )} ${telaDaSaida} Não mudar nome do objeto nem tamanho. ${ESTIMATIVA}`,
        recado:
          'A surpresa chegou! Que combinação você vai criar? Troque o que quiser: personagem, barco, chave, farol ou cenário. Troque só o modelo e deixe o nome e o tamanho como estão. Teste e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        steps: [
          'Em Ao iniciar, deixe à vista Criar o objeto personagem com o modelo aventureiro. Clique em aventureiro e escolha outro personagem.',
          'Faça o mesmo em Criar o objeto barco, chave e farol: clique no nome do modelo e escolha outro.',
          'Em Criar o objeto cenario, troque praia-tropical por costa-rochosa, ilha-nevada ou noite-na-ilha.',
          'Troque só o modelo. Deixe o nome do objeto, a cena e o tamanho como estão.',
          'Clique em Rodar de novo, pegue a chave e vá ao farol. Confira a luz e o barco.',
          'Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
        ],
        text:
          '[curious] O seu farol já acende! E agora chegou uma surpresa: o seu jogo pode ter outras versões. Outro personagem, outro barco, outra chave, outro farol e até outro cenário. [interested, animated voice] São as mesmas opções da Chave do Farol, com os mesmos nomes, agora em três dimensões. [engaging, energetic, conversational voice] Eu vou mostrar com o pirata. Você escolhe o que quiser, e o que você gostou pode ficar como está. [confident, clear, unhurried voice] Encontre a área Ao iniciar e o bloco Criar o objeto personagem com o modelo aventureiro. [confident, clear, unhurried voice] Clique em aventureiro para abrir a lista e escolha outro. Eu escolho o pirata. [interested, animated voice] Olha só: ele aparece no mesmo lugar e do mesmo tamanho, porque todos os personagens deste jogo foram feitos com a mesma medida. E ele também anda e respira, como o aventureiro. [confident, clear, unhurried voice] Repare que o nome do objeto continua personagem, porque os outros blocos usam esse nome. Troque só o modelo e deixe o nome e o tamanho como estão. [engaging, energetic, conversational voice] Os blocos Criar o objeto barco, chave e farol funcionam do mesmo jeito: clique no nome do modelo e escolha outro. [confident, clear, unhurried voice] No barco, eu escolho barco pirata. [confident, clear, unhurried voice] Na chave, chave de estrela. [confident, clear, unhurried voice] E no farol, farol de pedra. [interested, animated voice] No 2D, o farol tinha duas imagens, apagada e acesa. Aqui cada farol é um modelo só, e todos sabem acender. Por isso basta trocar num lugar. [engaging, energetic, conversational voice] Agora falta o lugar onde a história acontece. O primeiro Criar o objeto, o cenario, é a ilha inteira: o mar, o chão, a ponte, as árvores e o céu. [confident, clear, unhurried voice] Clique em praia tropical e escolha outro. Eu vou usar noite na ilha. [interested, animated voice] Olha só: o caminho, a ponte e o lugar do farol continuam os mesmos. [upbeat, encouraging voice] Agora teste a sua combinação! Clique em Rodar de novo, pegue a chave e vá até o farol. [interested, animated voice] Olha só: o farol de pedra acende, e o barco pirata vem chegando! ' +
          verificar(
            'você trocou só o modelo, e cada modelo está no bloco do mesmo tipo: personagem no personagem, barco no barco',
          ),
      },
      {
        key: 'personalizar',
        title: 'Escolha seu esconderijo e teste de verdade',
        kind: 'delivery',
        screen: `A parte começa com o Estúdio expandido e o projeto da parte anterior, com a combinação do pirata [expandir estúdio]. No "encontre de novo o bloco Colocar o objeto chave", trazer o bloco para perto do meio [arrastar até "Colocar o objeto chave"]. No "Eu vou usar x menos 8", trocar o x [abrir campo "-3" em "Colocar o objeto chave"] [escolher "-8" em "Colocar o objeto chave"]. No "e z 3", trocar o z [abrir campo "-2" em "Colocar o objeto chave"] [escolher "3" em "Colocar o objeto chave"]. No "Clique em Rodar de novo", clicar em **Rodar de novo** [rodar de novo]. No "e vá até o lugar que você escolheu", andar até a chave, na frente da pedra, perto da praia [segurar tecla ArrowLeft por 0,4 s] [segurar tecla ArrowDown por 0,55 s]. No "o personagem alcança a chave", apontar o personagem [apontar prévia]. No "escreva também os seus próprios avisos", apontar um dos blocos que mudam o aviso [apontar bloco "Alterar variável aviso"]. No "Toque na tecla R", tocar a tecla R [tecla r]. No "e vá ao farol sem pegar a chave", ir ao farol sem pegar a chave ${DO_COMECO_AO_FAROL}. No "ele fica apagado e pede a chave", apontar o aviso ${AVISO}. No "Depois pegue a chave no esconderijo novo", voltar pela ponte e ir até a chave [segurar tecla ArrowLeft por 1,2 s] [segurar tecla ArrowDown por 0,55 s] [segurar tecla ArrowLeft por 2,1 s]. No "e volte ao farol", voltar ao farol [segurar tecla ArrowRight por 2,1 s] [segurar tecla ArrowUp por 0,55 s] [segurar tecla ArrowRight por 1,2 s]. No "a luz acende", apontar o farol aceso [apontar prévia]. ${telaDaConferencia(
          '"Colocar o objeto chave"',
          [['o bloco Colocar o objeto chave tem o x e o z', 'Colocar o objeto chave']],
        )} ${telaDoEnvio('o seu jogo em três dimensões está completo', 'Próxima parte')} ${ESTIMATIVA}`,
        recado:
          'Agora escolha o esconderijo da chave! Mude o x e o z no bloco Colocar o objeto chave e teste se o personagem alcança. Se quiser, escreva os seus avisos. Depois clique em Verificar projeto, em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.',
        steps: [
          'Em Ao iniciar, no bloco Colocar o objeto chave, mude o x e o z para um lugar no chão da ilha. Exemplo: x −8 e z 3, perto da praia. Deixe o y em 1.',
          'Clique em Rodar de novo e vá até a chave: o personagem precisa alcançar e pegar.',
          'Se não conseguir, mude um número de cada vez e teste de novo.',
          'Se quiser, escreva os seus avisos nos blocos que mudam aviso, sem mudar o papel de cada um: começo, chave pega, falta a chave e vitória.',
          'Toque na tecla R e vá ao farol sem a chave: ele pede a chave. Depois pegue a chave e volte: o farol acende.',
          'Clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.',
        ],
        text:
          '[upbeat, encouraging voice] Agora a chave vai para o esconderijo que você escolher! [engaging, energetic, conversational voice] Lembra do x, do y e do z? O x e o z levam a chave pelo chão, e o y muda a altura. [confident, clear, unhurried voice] Em Ao iniciar, encontre de novo o bloco Colocar o objeto chave. [confident, clear, unhurried voice] Mude o x e o z para escolher um lugar no chão da ilha. Eu vou usar x menos 8 e z 3, perto da praia. [thoughtful] Ver a chave não basta. Ela pode estar alta demais ou do outro lado da água, e aí o personagem não alcança. [engaging, energetic, conversational voice] Por isso, teste sempre. Clique em Rodar de novo e vá até o lugar que você escolheu. [interested, animated voice] Olha só: o personagem alcança a chave e pega a chave. [reassuring, encouraging voice] Se não conseguir pegar, volte ao bloco, mude um número de cada vez e teste novamente. [engaging, energetic, conversational voice] Se quiser, escreva também os seus próprios avisos, nos blocos que mudam aviso. Só conserve o papel de cada mensagem: começo, chave pega, falta a chave e vitória. [upbeat, encouraging voice] Agora faça uma partida completa. Toque na tecla R e vá ao farol sem pegar a chave: ele fica apagado e pede a chave. [upbeat, encouraging voice] Depois pegue a chave no esconderijo novo e volte ao farol. [interested, animated voice] Olha só: a luz acende e o barco vem chegando! ' +
          entregar(
            'em Ao iniciar, o bloco Colocar o objeto chave tem o x e o z do seu esconderijo, e o y em 1',
            'Pronto, o seu jogo em três dimensões está completo!',
            'Quando aparecer Projeto enviado!, clique em Próxima parte.',
          ),
      },
      {
        key: 'fecho',
        title: 'Sua ilha está pronta',
        kind: 'closing',
        screen:
          'A parte começa com o projeto já enviado na parte anterior, no mesmo Estúdio, expandido [expandir estúdio]. Do "Você transformou a ideia" até o "deixou o jogo com a sua cara", a tela fica parada, e a edição troca esse trecho por cenas curtas do jogo pronto: o personagem andando, a chave sumindo, o farol acendendo e o barco chegando [na edição: o jogo pronto, do movimento ao barco]. No "Seu jogo está pronto!", a tela volta para o Estúdio. No "Para publicar, clique em Compartilhar", abrir o Compartilhar, no alto do Estúdio [compartilhar]; na aula, o botão costuma aparecer só como ícone (uma setinha para cima saindo de uma bandeja), e a janela se chama **Compartilhar no Mural dos Criadores**. No "o resumo do projeto já vem preenchido", mostrar o resumo, sem editar [apontar "Resumo do projeto"]. No "Clique em Gerar capa", gerar a capa [clicar "Gerar capa"]. No "Olha só: essa é a capa do seu jogo", manter à vista a imagem. Não demonstrar upload nem outra capa. No "clique em Publicar", publicar [clicar "Publicar"] e esperar **Seu jogo está no Mural!**. No "clique em Copiar link de jogar", copiar o link [clicar "Copiar link de jogar"]. No "clique em Fechar", fechar a janela [clicar "Fechar"]. No "e, por fim, em Concluir aula", voltar ao tamanho da aula [reduzir estúdio] e clicar em **Concluir aula** [concluir aula]. Sem certificado, venda ou autoria das artes.',
        recado:
          'Seu jogo está pronto! Se quiser, publique no Mural, copie o link de jogar e mande para a sua família e os seus amigos. Se precisar, peça ajuda a um adulto. Você também pode clicar em Concluir aula e continuar a jornada sem publicar.',
        text: '[pleased, lively voice] Você transformou a ideia da Chave do Farol em um jogo em três dimensões! Programou o movimento, escolheu o lugar da chave, fez o farol acender com a chave e deixou o jogo com a sua cara. [pleased, lively voice] Seu jogo está pronto! Agora, se quiser, você pode publicar o seu jogo no Mural. [engaging, energetic, conversational voice] O Mural é o lugar da plataforma onde ficam os jogos publicados. Lá, a sua família e os seus amigos podem jogar o seu jogo. [engaging, energetic, conversational voice] Você também pode clicar em Concluir aula e continuar a jornada sem publicar. [engaging, energetic, conversational voice] Para publicar, clique em Compartilhar, no alto do Estúdio. Ele pode aparecer só como uma setinha para cima. [confident, clear, unhurried voice] Abre uma janela. Repare: o resumo do projeto já vem preenchido, por isso pode deixar como está. [engaging, energetic, conversational voice] Agora o seu jogo precisa de uma capa, a imagem que apresenta o jogo no Mural. Clique em Gerar capa e espere a imagem aparecer. [interested, animated voice] Olha só: essa é a capa do seu jogo! [confident, clear, unhurried voice] Confira se a capa ficou boa e clique em Publicar. Depois espere a publicação terminar. [pleased, lively voice] Seu jogo está no Mural! Agora você, a sua família e os seus amigos podem jogar o jogo que você criou. [engaging, energetic, conversational voice] Para mandar o jogo para eles, clique em Copiar link de jogar. Depois mande esse link para a sua família e os seus amigos, com a ajuda de um adulto se precisar. [engaging, energetic, conversational voice] Quem receber o link pode jogar direto, no computador, com o teclado. [engaging, energetic, conversational voice] Depois de copiar o link, clique em Fechar e, por fim, em Concluir aula.',
      },
    ],
  },
]
