/** Fonte editorial. A geração conserva a fala integral e os passos do caderno. */
export type IlhaTrecho = {
  key: string
  title: string
  kind: 'intro' | 'material' | 'experience' | 'build' | 'delivery' | 'closing'
  text: string
  screen: string
  steps?: string[]
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
/**
 * A conferência depois do teste, com a lista do que precisa estar lá, e a verificação na fórmula
 * comum a todos os cursos (Diretrizes, seção 6).
 */
const verificar = (lista: string) =>
  `[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: ${lista}. Depois de corrigir, teste de novo. [engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido! e depois Salvo, clique em Próxima parte.`
/** Quando o efeito não aparece no jogo (uma variável sem mostrador), a conferência é a única. */
const conferir = (lista: string) =>
  `[reassuring, encouraging voice] Confira se ficou assim: ${lista}. [engaging, energetic, conversational voice] Agora clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido! e depois Salvo, clique em Próxima parte.`
const enviar =
  '[engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. [confident, clear, unhurried voice] Quando aparecer Objetivo cumprido! e depois Salvo, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.'
export const ilhaAulas: { slug: string; title: string; trechos: IlhaTrecho[] }[] = [
  {
    slug: 'ilha-aula-1',
    title: 'Uma ilha com profundidade',
    trechos: [
      {
        key: 'abertura',
        title: 'Jogue na ilha',
        kind: 'intro',
        screen:
          'Jogo final. Mostrar o personagem andando alguns passos e a ponte, sem resolver a partida. Foco no jogo para receber as teclas.',
        text: '[upbeat, welcoming voice] Você já criou A Chave do Farol. Agora vamos levar essa ideia para uma ilha em três dimensões: A Ilha do Farol! O desafio continua: encontrar a chave e acender o farol para o barco chegar. [interested, animated voice] Olha aqui: eu caminho pelo chão e posso passar na frente ou atrás dos objetos. Repare nas pedras: atrás delas pode ter alguma coisa escondida. [upbeat, encouraging voice] Sua vez! Clique dentro do jogo e segure uma seta do teclado, ou uma das letras W, A, S e D, para andar. Para começar outra partida, toque na tecla R. [upbeat, encouraging voice] Explore a ilha. Você pode seguir mesmo sem terminar a partida. Depois clique em Próxima parte.',
      },
      {
        key: 'material',
        title: 'Seu passo a passo do projeto',
        kind: 'material',
        screen: 'Abrir o PDF e mostrar uma página de montagem e o botão Baixar. Consulta opcional.',
        text: '[upbeat, welcoming voice] Este é o seu Passo a passo do projeto! Ele guarda os blocos, os encaixes e os testes das três aulas. Se você esquecer um passo, pode voltar aqui e consultar. [engaging, energetic, conversational voice] Você pode ler aqui mesmo ou clicar em Baixar para guardar. O Como Fazer também tem ajuda para usar o Estúdio. Quando quiser continuar, clique em Próxima parte.',
      },
      {
        key: 'ponto-de-vista',
        title: 'O que aparece quando você muda de lugar?',
        kind: 'experience',
        screen:
          'Vídeo conceitual. Ilustrar a comparação: uma pessoa na frente tapa a vista de alguém, que pensa em mudar de lugar para olhar, sem mostrar o que está atrás. Depois ampliar a experiência e mostrar a cena parada, na vista de frente, com a pedra escondendo a chave, sem apontar controles nem trocar a vista: o que muda e o que fica igual é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência. Não falar de blocos nem de código. O vídeo explica a ideia e convida, sem mostrar os controles nem a ordem dos testes (molde do Cadê, 02/11/2026).',
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
        text: '[engaging, energetic, conversational voice] No jogo 3D, a câmera é o lugar de onde a gente olha a ilha. Ela funciona como os seus olhos dentro do jogo. [curious] Sabe quando uma pessoa fica na sua frente e tapa o que você quer ver? Você pode mudar de lugar para olhar. [engaging, energetic, conversational voice] Na Ilha do Farol, a câmera pode olhar a ilha de lugares diferentes. E, perto de uma pedra, tem uma chave escondida. [curious] Se a câmera mudar de lugar, a chave também muda de lugar? [engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência. [upbeat, encouraging voice] Agora você vai investigar o que muda na imagem e o que continua no mesmo lugar quando você olha a ilha de lugares diferentes. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
      },
      {
        key: 'movimento',
        title: 'Faça o personagem andar',
        kind: 'build',
        screen:
          'Projeto inicio da revisão de números simples: usar os exemplos atuais, com no máximo uma casa decimal também nos blocos de preparação. Começar pela retomada: clicar em Atualizar e segurar uma seta no jogo, com o personagem parado no Tá vendo?. Depois mostrar Enquanto estiver rodando e o bloco A cada quadro da cena. Encaixar Fazer personagem andar com as setas antes de Escrever na tela. Trocar a velocidade 3 por 4. Testar as quatro setas, a ponte e a beirada.',
        steps: [
          'Em Enquanto estiver rodando, deixe à vista o bloco A cada quadro da cena. Dentro dele, encontre Escrever na tela: o novo bloco vai logo antes dele.',
          'Abra Jogo 3D → Movimento → Andar com o teclado. Pegue Fazer personagem andar com as setas (ou WASD) e solte antes de Escrever na tela.',
          'Confira se o nome do bloco é personagem. Clique no número 3 e troque por 4.',
          'Clique em Atualizar. Clique dentro do jogo e segure cada seta por um tempo: o personagem anda nas quatro direções e para quando você solta. Leve-o até a ponte e até a beirada.',
          'Clique em Verificar projeto, corrija se necessário e espere Salvo.',
        ],
        text:
          '[engaging, energetic, conversational voice] Aqui no seu jogo, clique em Atualizar, logo acima do jogo. Depois clique dentro do jogo e segure uma seta do teclado. Tá vendo? O personagem fica parado, porque o jogo ainda não sabe que a seta faz ele andar. [engaging, energetic, conversational voice] Na experiência da parte anterior, quem mudava de lugar era a câmera. Agora quem vai sair do lugar é o personagem! [engaging, energetic, conversational voice] Lembra dos quadros do jogo 2D? O jogo desenha a cena muitas vezes por segundo, e cada desenho é um quadro. Para o personagem andar, o jogo precisa olhar as setas em todo quadro. [confident, clear, unhurried voice] Por isso, o novo bloco vai dentro do bloco A cada quadro da cena. Nos blocos, encontre a área Enquanto estiver rodando e deixe à vista o bloco A cada quadro da cena. [confident, clear, unhurried voice] Dentro dele, encontre o bloco Escrever na tela. O novo bloco vai logo antes dele. [confident, clear, unhurried voice] Agora abra Jogo 3D, depois Movimento e depois Andar com o teclado. Pegue o bloco Fazer personagem andar com as setas, ou WASD. [confident, clear, unhurried voice] Arraste até o lugar antes de Escrever na tela e solte quando aparecer o encaixe. [engaging, energetic, conversational voice] É este bloco que faz o personagem andar: em todo quadro, ele olha qual seta você está segurando e leva o personagem para aquele lado. [confident, clear, unhurried voice] Repare que o nome do bloco já é personagem. Se aparecer outro nome, clique nele e escolha personagem. [engaging, energetic, conversational voice] O número do bloco é a velocidade: quanto maior, mais rápido o personagem anda. Clique no 3 e troque por 4. [upbeat, encouraging voice] Agora vamos testar! Clique em Atualizar. Depois clique dentro do jogo, segure a seta da direita por um tempo e solte. [interested, animated voice] Olha só: ele anda enquanto você segura a seta e para quando você solta. [upbeat, encouraging voice] Faça o mesmo com as outras três setas. Leve o personagem até a ponte e até a beirada da ilha. [interested, animated voice] E repare: enquanto anda, ele mexe as pernas e os braços. Parado, ele respira. ' +
          verificar(
            'dentro de A cada quadro da cena está o bloco Fazer personagem andar com as setas, antes de Escrever na tela, com o nome personagem e a velocidade 4',
          ),
      },
      {
        key: 'entrega',
        title: 'Confira seu primeiro percurso',
        kind: 'delivery',
        screen:
          'Percurso com as quatro setas, parada e a tecla R. Sem exigir coleta ainda. Mostrar objetivos, Salvo, envio e confirmação.',
        steps: [
          'Segure cada seta e solte para parar: ande nas quatro direções.',
          'Atravesse a ponte e volte. Toque na tecla R para começar de novo.',
          'Verificar projeto → aguardar Salvo → Enviar meu projeto → Enviar → Projeto enviado!.',
        ],
        text:
          '[pleased, lively voice] Você programou o movimento do personagem na ilha! [upbeat, encouraging voice] Agora faça um percurso: segure as setas para andar nas quatro direções, solte para parar e atravesse a ponte. Depois toque na tecla R para voltar ao começo. [engaging, energetic, conversational voice] A chave ainda não é recolhida. Essa reação vem na próxima aula. ' +
          enviar,
      },
      {
        key: 'fecho',
        title: 'Seu personagem já explora a ilha',
        kind: 'closing',
        screen: 'Reconhecer o movimento após envio, saída Concluir aula.',
        text: '[pleased, lively voice] Seu personagem já anda pelo mundo em 3D. Você também descobriu que olhar de outro lugar pode revelar algo escondido. Na próxima aula, vamos escolher um lugar para a chave e programar o encontro com ela. Clique em Concluir aula.',
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
        screen:
          'Vídeo conceitual. Ilustrar a estante de livros: andar para os lados, chegar mais perto ou mais longe e olhar numa prateleira mais alta. Depois ampliar a experiência e mostrar a cena parada, com a chave no lugar inicial, sem apontar controles nem mudar nenhum valor: o que cada número muda é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência. Não falar de blocos nem de código. O vídeo explica a ideia e convida, sem mostrar os controles nem a ordem dos testes (molde do Cadê, 02/11/2026).',
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
        text: '[engaging, energetic, conversational voice] No jogo 2D, você usou dois números, x e y, para escolher um lugar na tela. [interested, animated voice] No 3D, o mundo tem profundidade, e o lugar de cada objeto tem três números. [curious] Imagine procurar um livro numa estante. Você pode andar para os lados, chegar mais perto ou mais longe e ainda olhar numa prateleira mais alta. São três jeitos diferentes de mudar de lugar. [engaging, energetic, conversational voice] No seu jogo, o lugar da chave na ilha também tem três números: x, y e z. [curious] E o y, será que continua fazendo o que fazia no jogo 2D? [engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência. [upbeat, encouraging voice] Agora você vai investigar para onde a chave vai quando cada um dos três números aumenta e quando diminui. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
      },
      {
        key: 'posicao',
        title: 'Coloque a chave na ilha',
        kind: 'build',
        screen:
          'Ao iniciar, posição da chave; editar um eixo por vez, com teste intermediário. Solução canônica x −3, y 1, z −2, diferente da entrada.',
        steps: [
          'Em Ao iniciar, deixe à vista Colocar o objeto chave em x −2 y 1 z −3.',
          'Clique no −2 depois de x e troque por −3. Clique em Atualizar e observe para onde a chave foi.',
          'Clique no −3 depois de z e troque por −2. Deixe y em 1.',
          'Clique em Atualizar e leve o personagem até perto da chave.',
        ],
        text:
          '[engaging, energetic, conversational voice] Lembra da experiência da parte anterior? O x e o z levaram a chave pelo chão, e o y mudou a altura. No jogo 2D era diferente: lá, o y mudava o lugar na tela. [engaging, energetic, conversational voice] Agora você vai escolher um lugar novo para a chave no seu jogo! [confident, clear, unhurried voice] Nos blocos, abra a área Ao iniciar e encontre o bloco Colocar o objeto chave em x menos 2, y 1 e z menos 3. Se ele não estiver aparecendo, arraste um espaço vazio entre os blocos até ele aparecer. [engaging, energetic, conversational voice] É este bloco que coloca a chave na ilha. Os três números dele são o x, o y e o z que você investigou na experiência. [confident, clear, unhurried voice] Primeiro mude só o x. Clique no menos 2 que fica depois de x e troque por menos 3. [upbeat, encouraging voice] Clique em Atualizar, logo acima do jogo, e observe para onde a chave foi. [confident, clear, unhurried voice] Agora mude o z. Clique no menos 3 que fica depois de z e troque por menos 2. Deixe o y em 1. [upbeat, encouraging voice] Clique em Atualizar de novo. Depois clique dentro do jogo e leve o personagem até perto da chave. [interested, animated voice] Olha só: a chave mudou de lugar no chão e continuou na mesma altura, porque você não mexeu no y. [engaging, energetic, conversational voice] Por enquanto, encostar na chave não faz nada. Essa reação vem daqui a pouco, depois da experiência do contato. ' +
          verificar(
            'em Ao iniciar, o bloco Colocar o objeto chave está com x menos 3, y 1 e z menos 2',
          ),
      },
      {
        key: 'contato-3d',
        title: 'Parece junto, mas está encostando?',
        kind: 'experience',
        screen:
          'Vídeo conceitual. Ilustrar duas mãos batendo palmas, desenho nosso com o Zappy. Depois ampliar a experiência e mostrar a cena parada, na vista de cima, com a chave alta parecendo estar sobre o personagem, sem apontar controles nem testar: o resultado é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência. Não falar de blocos nem de código. O vídeo explica a ideia e convida, sem mostrar os controles nem a ordem dos testes (molde do Cadê, 02/11/2026).',
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
        text: '[engaging, energetic, conversational voice] Encostar é quando duas coisas do jogo se tocam de verdade. No seu jogo, o personagem vai pegar a chave quando encostar nela. [curious] Sabe quando você bate palmas? As mãos só fazem barulho quando se tocam de verdade. [engaging, energetic, conversational voice] Na ilha, olhando de cima, a chave pode parecer estar em cima do personagem. [curious] Será que eles estão encostando? [engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência. [upbeat, encouraging voice] Agora você vai investigar quando a chave e o personagem estão encostando de verdade e quando só parecem juntos na imagem. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
      },
      {
        key: 'recolher',
        title: 'Recolha a chave',
        kind: 'build',
        screen:
          'Começar pela retomada: clicar em Atualizar e levar o personagem até a chave, que continua ali no Tá vendo?. Mostrar Quando acontecer com o evento da tecla R. Novo encontro fica fora do evento R. O evento escolhe diretamente personagem e chave, sem grupo nem nome de item. O bloco de visibilidade chega como Mostrar o objeto: trocar para Esconder e escolher chave.',
        steps: [
          'Em Quando acontecer, deixe à vista o espaço logo abaixo do evento da tecla R, fora do fazer dele.',
          'Abra Jogo 3D → Encostar → Encostar. Pegue Quando personagem encostar em chave e solte nesse espaço.',
          'Deixe à vista o fazer do novo encontro. Abra Jogo 3D → Objetos → Aparência, pegue Mostrar o objeto e solte dentro desse fazer.',
          'Clique em Mostrar e escolha Esconder. Clique no nome do objeto e escolha chave.',
          'Clique em Atualizar e caminhe até a chave: ela some só no encontro. Toque na tecla R e repita por outro caminho.',
        ],
        text:
          '[engaging, energetic, conversational voice] Aqui no seu jogo, clique em Atualizar e leve o personagem até a chave. Tá vendo? A chave continua ali, porque o jogo ainda não tem nenhuma reação para esse encontro. [engaging, energetic, conversational voice] Lembra da experiência da parte anterior? Só valia encostar quando o personagem e a chave se encontravam no chão e também na altura. Agora a gente vai fazer o seu jogo perceber esse encontro! [confident, clear, unhurried voice] Os encontros ficam na área Quando acontecer. Encontre essa área nos blocos. Repare: ali já tem o evento da tecla R, que recomeça a partida. [confident, clear, unhurried voice] Deixe à vista o espaço logo abaixo desse evento, fora do fazer dele. [confident, clear, unhurried voice] Agora abra Jogo 3D, depois Encostar e depois Encostar de novo. Pegue o bloco Quando personagem encostar em chave e solte nesse espaço. [engaging, energetic, conversational voice] É este bloco que percebe o encontro. Como o jogo na experiência do contato, ele confere o lugar no chão e a altura. [confident, clear, unhurried voice] Repare que ele já chega com personagem no primeiro nome e chave no segundo. Se aparecer outro nome, clique nele e escolha o certo. [engaging, energetic, conversational voice] Agora falta a reação: a chave sumir. Deixe à vista o espaço ao lado da palavra fazer, dentro do novo encontro. [confident, clear, unhurried voice] Abra Jogo 3D, depois Objetos e depois Aparência. Pegue o bloco Mostrar o objeto e solte dentro desse fazer. [confident, clear, unhurried voice] Repare que ele chega com Mostrar. Clique em Mostrar e escolha Esconder. Depois clique no nome do objeto e escolha chave. [upbeat, encouraging voice] Agora vamos testar! Clique em Atualizar e caminhe até a chave. [interested, animated voice] Olha só: ela some quando o personagem encosta. [upbeat, encouraging voice] Toque na tecla R e repita por outro caminho. ' +
          verificar(
            'em Quando acontecer, fora do evento da tecla R, está o encontro Quando personagem encostar em chave, e dentro do fazer dele está Esconder o objeto chave',
          ),
      },
      {
        key: 'memoria',
        title: 'Guarde que você pegou a chave',
        kind: 'build',
        screen:
          'Criar temChave falso em Ao iniciar. Atribuir verdadeiro depois de esconder no encontro. Nenhum mostrador de variável inventado: verificar estrutura e resultado pelo objetivo.',
        steps: [
          'Deixe à vista Ao iniciar, depois da linha que cria aviso. Em Programação → Variáveis, pegue Criar variável e encaixe ali. Ele chega com o nome contador: clique em contador e escreva temChave.',
          'Em Programação → Lógica e Se, pegue o bloco verdadeiro e solte em cima do 0, no valor da variável. Clique em verdadeiro e escolha falso: a partida começa sem chave.',
          'Deixe à vista o encontro com chave, depois de Esconder o objeto chave. Em Programação → Variáveis, pegue Alterar variável para e encaixe ali. Repare que ele chega com o nome contador. Clique em contador e escolha temChave.',
          'Em Programação → Lógica e Se, pegue o bloco verdadeiro e solte em cima do 1, no valor. Deixe verdadeiro.',
          'Confira os dois lugares: ao começar, falso; ao recolher, verdadeiro.',
        ],
        text:
          '[engaging, energetic, conversational voice] A chave já some. Mas lembra do jogo 2D? Sumir não é a mesma coisa que guardar que o personagem pegou a chave. [engaging, energetic, conversational voice] Para guardar, a gente usa de novo temChave, a variável que responde se o personagem tem a chave. [confident, clear, unhurried voice] Nos blocos, deixe à vista o fim da área Ao iniciar, logo depois da linha que cria aviso. [confident, clear, unhurried voice] Abra Programação e depois Variáveis, pegue o bloco Criar variável e solte ali. Repare que ele chega com o nome contador. Clique em contador e escreva temChave. [confident, clear, unhurried voice] Agora abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do 0, no valor dessa variável. Clique em verdadeiro e escolha falso, porque a partida começa sem a chave. [confident, clear, unhurried voice] Agora deixe à vista o encontro do personagem com a chave, logo depois de Esconder o objeto chave. [confident, clear, unhurried voice] Abra Programação e depois Variáveis, pegue o bloco Alterar variável para e solte ali. Repare que ele chega com o nome contador. Clique em contador e escolha temChave. [confident, clear, unhurried voice] Abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do 1, no valor. Aqui ele fica verdadeiro, porque o personagem acabou de pegar a chave. [interested, animated voice] Olha os dois lugares: ao começar, falso; ao recolher, verdadeiro. [engaging, energetic, conversational voice] Esse valor não aparece na ilha. Na próxima aula, o farol vai consultar essa informação. ' +
          conferir(
            'em Ao iniciar está Criar variável temChave com valor falso, e no encontro com a chave, depois de Esconder o objeto chave, está Alterar variável temChave para verdadeiro',
          ),
      },
      {
        key: 'aviso',
        title: 'Conte que a chave foi recolhida',
        kind: 'delivery',
        screen:
          'Começar pela retomada: clicar em Atualizar e recolher a chave, com o aviso de sempre no Tá vendo?. Atribuição aviso dentro da coleta; os blocos chegam com contador e 1. HUD existente lê aviso a cada quadro. Envio desta aula.',
        steps: [
          'Deixe à vista o encontro com chave, depois de temChave verdadeiro. Em Programação → Variáveis, pegue Alterar variável para e encaixe ali. Repare que ele chega com o nome contador. Clique em contador e escolha aviso.',
          'Em Programação → Valores, pegue o bloco texto e solte em cima do 1, no valor. Ele chega com Olá: apague Olá e escreva Você pegou a chave! Agora vá ao farol.',
          'Clique em Atualizar, recolha a chave e se afaste: o aviso continua. Toque na tecla R: a chave e o aviso inicial voltam.',
          'Verifique, aguarde Salvo e envie o projeto com confirmação.',
        ],
        text:
          '[engaging, energetic, conversational voice] Aqui no seu jogo, clique em Atualizar e recolha a chave. Tá vendo? A chave some, mas o aviso continua o mesmo, porque nada muda o aviso no encontro. [engaging, energetic, conversational voice] Agora a gente vai mostrar na tela quando a coleta acontece! Repare no aviso no alto do jogo: ele mostra o texto guardado na variável aviso. [engaging, energetic, conversational voice] Por isso, para mudar o aviso, basta mudar esse texto no encontro com a chave. [confident, clear, unhurried voice] Nos blocos, deixe à vista o encontro com a chave, logo depois da linha temChave verdadeiro. [confident, clear, unhurried voice] Abra Programação e depois Variáveis, pegue o bloco Alterar variável para e solte ali. Repare que ele chega com o nome contador. Clique em contador e escolha aviso. [confident, clear, unhurried voice] Agora abra Programação e depois Valores, pegue o bloco texto e solte em cima do 1, no valor. Ele chega com Olá: apague Olá e escreva: Você pegou a chave! Agora vá ao farol. [upbeat, encouraging voice] Agora vamos testar! Clique em Atualizar, recolha a chave e se afaste. [interested, animated voice] Olha só: a chave some, e o novo aviso continua na tela. [upbeat, encouraging voice] Toque na tecla R. A chave e o aviso do começo voltam. [reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: dentro do encontro com a chave estão Esconder o objeto chave, temChave verdadeiro e o aviso com o texto novo. Depois de corrigir, teste de novo. ' +
          enviar,
      },
      {
        key: 'fecho',
        title: 'A chave já pode ser encontrada',
        kind: 'closing',
        screen: 'Projeto enviado, encerrar aula.',
        text: '[pleased, lively voice] Você escolheu uma posição em 3D e programou a coleta. Agora sabe por que olhar de lado pode ajudar a descobrir se dois objetos realmente encostam. Na próxima aula, o farol vai consultar a chave e responder. Clique em Concluir aula.',
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
        screen:
          'Partida sem chave primeiro, com o Tá vendo? no farol apagado. Encontro com farol como irmão da coleta. Se temChave com então vazio, senão aviso. Retomada breve da porta do jogo 2D, sem experiência nova de memória ou condição. Para abrir o senão, apontar o segundo sinal de mais, antes da palavra senão, no fim da linha.',
        steps: [
          'Em Quando acontecer, deixe à vista o espaço logo abaixo do encontro com chave, fora do fazer dele.',
          'Abra Jogo 3D → Encostar → Encostar. Pegue Quando personagem encostar em chave e solte nesse espaço. Clique em chave e escolha farol.',
          'No fazer desse encontro, solte Se, de Programação → Lógica e Se.',
          'Arraste a pergunta x maior que 0 do Se até a lixeira. No lugar vazio, solte valor da variável, de Programação → Valores. Clique no x e escolha temChave.',
          'Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.',
          'Dentro do senão, solte Alterar variável para, de Programação → Variáveis, e escolha aviso. Em cima do 1, no valor, solte texto, de Programação → Valores, com Falta a chave. Procure na ilha antes de voltar. Deixe o então vazio nesta parte.',
          'Clique em Atualizar e vá direto ao farol, sem recolher a chave: a luz continua apagada e o aviso pede a chave.',
        ],
        text:
          '[engaging, energetic, conversational voice] Aqui no seu jogo, clique em Atualizar e leve o personagem até o farol, sem passar pela chave. Tá vendo? Nada acontece, porque o farol ainda não confere se o personagem está com a chave. [engaging, energetic, conversational voice] Lembra da porta do jogo 2D? Ela fazia uma pergunta: o personagem está com a chave? Para o sim, ela tinha uma resposta, e para o não, outra. Agora a gente vai montar essa pergunta no farol da ilha, começando pela resposta do não! [engaging, energetic, conversational voice] Chegar ao farol também é um encontro, e os encontros ficam na área Quando acontecer. Encontre lá o encontro com a chave e deixe à vista o espaço logo abaixo dele, fora do fazer dele. [confident, clear, unhurried voice] Abra Jogo 3D, depois Encostar e depois Encostar de novo. Pegue o bloco Quando personagem encostar em chave e solte nesse espaço. [confident, clear, unhurried voice] Repare que ele chega com chave no segundo nome. Clique em chave e escolha farol. [engaging, energetic, conversational voice] Agora deixe à vista o espaço ao lado da palavra fazer, dentro desse novo encontro. [engaging, energetic, conversational voice] Quem faz uma pergunta no jogo é o bloco Se. Abra Programação e depois Lógica e Se, pegue o bloco Se e solte nesse espaço. [confident, clear, unhurried voice] Repare que o Se já vem com uma pergunta pronta: x maior que 0. Não é isso que o farol precisa perguntar. Segure essa pergunta pelo sinal de maior e arraste até a lixeira, no canto de baixo, à direita, do espaço dos blocos. [confident, clear, unhurried voice] O lugar ao lado de Se ficou vazio. Abra Programação e depois Valores, pegue o bloco valor da variável e solte nesse lugar. [confident, clear, unhurried voice] Repare que ele chega com x. Clique no x e escolha temChave. [engaging, energetic, conversational voice] Pronto: quando o personagem encostar no farol, o jogo pergunta se temChave é verdadeiro. Ou seja: o personagem pegou a chave? [engaging, energetic, conversational voice] Como a porta, o Se tem um lugar para cada resposta. A resposta do sim fica no então. A resposta do não fica no senão. [engaging, energetic, conversational voice] O aviso de que falta a chave é a resposta do não, por isso ele vai no senão. Só que o Se chega sem esse espaço. [engaging, energetic, conversational voice] Olha aqui, na linha de baixo do bloco Se, depois do então: tem dois sinais de mais. O primeiro fica antes de senão se, e o segundo fica antes da palavra senão, no fim da linha. Clique no segundo. [confident, clear, unhurried voice] Repare: apareceu o espaço do senão. Deixe esse espaço à vista. [confident, clear, unhurried voice] Abra Programação e depois Variáveis, pegue o bloco Alterar variável para e solte dentro do senão. Repare que ele chega com o nome contador. Clique em contador e escolha aviso. [confident, clear, unhurried voice] Agora abra Programação e depois Valores, pegue o bloco texto e solte em cima do 1, no valor. Ele chega com Olá: apague Olá e escreva: Falta a chave. Procure na ilha antes de voltar. [engaging, energetic, conversational voice] O então fica vazio por enquanto. Ele guarda a resposta do sim, que você monta na próxima parte. [upbeat, encouraging voice] Agora vamos testar! Clique em Atualizar e vá direto ao farol, sem passar pela chave. [interested, animated voice] Olha só: o farol continua apagado, e o aviso pede a chave. É a resposta do senão funcionando! ' +
          verificar(
            'em Quando acontecer está o encontro do personagem com o farol, dentro dele está o Se com temChave, e dentro do senão está o aviso de que falta a chave',
          ),
      },
      {
        key: 'decisao',
        title: 'Acenda o farol com a chave',
        kind: 'build',
        screen:
          'Projeto sem-chave. Começar pela retomada: pegar a chave e ir ao farol, com a luz apagada no Tá vendo?. Montar três ações no então: Tocar a animação acender em farol uma vez, ganhou verdadeiro e aviso. Explicar ganhou antes de escolhê-la e mostrar a regra pronta em Enquanto estiver rodando que troca para aceso repetindo e aproxima o barco. Testar sem chave e com chave; o feixe gira depois de acender.',
        steps: [
          'No encontro com farol, deixe à vista o então do Se temChave.',
          'Jogo 3D → Objetos → 🎬 Animação do modelo: solte Tocar a animação dentro do então.',
          'No primeiro espaço, escolha acender. No objeto, escolha farol. No último, escolha uma vez.',
          'Logo abaixo, solte Alterar variável para, de Programação → Variáveis. Repare que ele chega com o nome contador. Clique em contador e escolha ganhou. Em cima do 1, no valor, solte o bloco verdadeiro, de Programação → Lógica e Se.',
          'Ainda no então, solte mais um Alterar variável para e escolha aviso. Em cima do 1, no valor, solte texto, de Programação → Valores, e escreva Você acendeu o farol! O barco pode chegar.',
          'Clique em Atualizar. Vá ao farol sem a chave; depois recolha a chave e volte. Confira a luz acendendo, o feixe girando e a chegada do barco.',
        ],
        text:
          '[engaging, energetic, conversational voice] Aqui no seu jogo, clique em Atualizar, pegue a chave e leve o personagem até o farol. Tá vendo? A luz não acende, porque a resposta do sim, no então, ainda está vazia. [engaging, energetic, conversational voice] Agora a gente vai montar essa resposta, para quem chega com a chave! [interested, animated voice] No jogo 2D, a gente trocava a imagem do farol apagado pela do farol aceso. Aqui o farol é um modelo só, e ele sabe acender: o modelo tem uma animação de acender. [confident, clear, unhurried voice] Nos blocos, encontre o encontro com farol e deixe à vista o então do Se temChave. [confident, clear, unhurried voice] Abra Jogo 3D, depois Objetos e depois Animação do modelo. Pegue o bloco Tocar a animação e solte dentro do então. [confident, clear, unhurried voice] No primeiro espaço, escolha acender. No objeto, escolha farol. No último espaço, escolha uma vez. [engaging, energetic, conversational voice] Uma vez quer dizer que a luz acende e fica acesa no fim. Repetindo faria a animação recomeçar sem parar. [engaging, energetic, conversational voice] Quando o farol acende, a partida está ganha. O jogo guarda isso numa variável chamada ganhou: ela começa falso e precisa virar verdadeiro agora. [interested, animated voice] Olha aqui, em Enquanto estiver rodando: tem uma regra que olha ganhou. Quando ganhou é verdadeiro e a luz termina de acender, ela deixa o farol aceso, com o feixe girando, e traz o barco. [confident, clear, unhurried voice] Volte ao então e deixe à vista o lugar logo abaixo de Tocar a animação. Abra Programação e depois Variáveis, pegue o bloco Alterar variável para e solte ali. Repare que ele chega com o nome contador. Clique em contador e escolha ganhou. [confident, clear, unhurried voice] Agora abra Programação e depois Lógica e Se, pegue o bloco verdadeiro e solte em cima do 1, no valor desse bloco. [confident, clear, unhurried voice] Ainda dentro do então, logo abaixo de ganhou, solte mais um bloco Alterar variável para. Repare que ele chega com o nome contador. Clique em contador e escolha aviso. [confident, clear, unhurried voice] Abra Programação e depois Valores, pegue o bloco texto e solte em cima do 1, no valor. Ele chega com Olá: apague Olá e escreva: Você acendeu o farol! O barco pode chegar. [upbeat, encouraging voice] Agora vamos testar! Clique em Atualizar e visite o farol sem a chave: ele continua apagado. [upbeat, encouraging voice] Depois pegue a chave e volte ao farol. [interested, animated voice] Olha só: a luz acende, o feixe começa a girar, o aviso muda e o barco se aproxima. [upbeat, encouraging voice] Toque na tecla R para começar outra partida e confira que tudo volta ao começo. ' +
          verificar(
            'dentro do então estão Tocar a animação acender em farol uma vez, ganhou verdadeiro e o aviso da vitória',
          ),
      },
      {
        key: 'pergunta-com-nao',
        title: 'O que muda com o não?',
        kind: 'experience',
        screen:
          'Vídeo conceitual. Ilustrar a comparação por 2 a 3 segundos, desenho nosso com o Zappy, sem foto de pessoa real nem meme da internet e sem cobrir a experiência: duas lojas lado a lado, uma com a plaquinha Pode entrar e outra com a plaquinha Não pode entrar, com a palavra não destacada, sem mostrar ninguém entrando nem barrado. Depois ampliar a experiência e mostrar a ilha 3D parada, com o personagem longe do farol e a pergunta sem o não, sem apontar controles e sem andar: qual resposta a porta dá em cada situação é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência. Não falar de blocos, de Se, de então, de senão nem de variáveis. O vídeo explica a ideia e convida, sem mostrar os controles nem a ordem dos testes (molde do Cadê, 02/11/2026).',
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
        text: '[engaging, energetic, conversational voice] No jogo, uma pergunta também pode ter a palavra não. [curious] Sabe a plaquinha na porta de uma loja? Tem loja que escreve “Pode entrar” e tem loja que escreve “Não pode entrar”. As duas frases só têm uma palavrinha de diferença. [engaging, energetic, conversational voice] Daqui a pouco, o farol do seu jogo vai usar o não. Imagine uma porta que pergunta: a porta está trancada? E que abre quando a resposta é sim. [curious] Com o não na pergunta, o que a porta faz? [engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência. [upbeat, encouraging voice] Agora você vai investigar o que a palavra não faz com a resposta da porta, com a chave e sem a chave. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
      },
      {
        key: 'uma-vez',
        title: 'O farol acende uma vez só',
        kind: 'build',
        screen:
          'Projeto decisao. Ao vivo: partida com a chave, farol aceso, andar para trás pelo cais e voltar; mostrar a luz apagando e acendendo de novo. Meme de 2 a 3 segundos no apito final: Zappy de juiz apitando e a bola entrando no gol depois, com o placar parado. Na lembrança da porta da experiência, só a fala: não refazer a experiência nem mostrar a tabela dela. Montar Se não ganhou: Se novo num espaço vazio ao lado do encontro com farol, a pergunta x maior que zero na lixeira, não no lugar da pergunta, valor da variável ganhou dentro do não, o Se temChave arrastado para o então do Se novo e o Se novo no fazer do encontro. Testar de novo: ao voltar, a luz continua acesa e o feixe segue girando.',
        steps: [
          'Teste antes de montar: clique em Atualizar, pegue a chave e acenda o farol. Ande para trás pelo cais e volte ao farol. Repare: a luz apaga e acende de novo.',
          'Em Quando acontecer, deixe à vista o encontro com farol e um espaço vazio ao lado dele, fora do fazer.',
          'Em Programação → Lógica e Se, pegue Se e solte nesse espaço vazio.',
          'Arraste a pergunta x maior que 0 do Se novo até a lixeira. Em Programação → Lógica e Se, pegue não e solte no lugar vazio da pergunta.',
          'Em Programação → Valores, pegue valor da variável e solte no espaço do não. Clique no x e escolha ganhou.',
          'No encontro com farol, segure o Se temChave pela palavra Se e arraste até o então do Se novo. Tudo o que está dentro dele vai junto.',
          'Segure o Se novo pela palavra Se e solte dentro do fazer do encontro com farol, que ficou vazio.',
          'Clique em Atualizar. Pegue a chave, acenda o farol, ande para trás pelo cais e volte: a luz continua acesa e o feixe segue girando. Toque na tecla R e vá ao farol sem a chave: ele continua pedindo a chave.',
        ],
        text:
          '[engaging, energetic, conversational voice] Seu farol já acende com a chave. Agora vamos conferir uma coisa no seu jogo. Clique em Atualizar, pegue a chave e acenda o farol. Depois ande um pouco para trás pelo cais e volte até o farol. [interested, animated voice] Tá vendo? A luz apagou e acendeu tudo de novo. Isso acontece porque, cada vez que o personagem encosta no farol, o encontro acontece de novo e manda acender outra vez. [curious] Sabe o apito final de um jogo de futebol? Depois dele, chutar a bola no gol não vale mais gol, porque a partida acabou. [engaging, energetic, conversational voice] No seu jogo, o apito final é ganhou ficar verdadeiro. Depois disso, a partida já foi vencida, e o farol não precisa responder outra vez. [engaging, energetic, conversational voice] Por isso, o encontro vai fazer uma pergunta antes de tudo: a partida ainda não foi ganha? Para fazer essa pergunta, a gente usa a palavra não. [engaging, energetic, conversational voice] Lembra da porta da experiência? Com o não na pergunta, a resposta virava ao contrário, e a porta só abria quando não estava trancada. [engaging, energetic, conversational voice] No seu jogo é igual. Enquanto ganhou é falso, a partida ainda não foi ganha: a resposta é sim, e o farol responde. [engaging, energetic, conversational voice] Quando ganhou vira verdadeiro, a resposta passa a ser não, e o farol não responde mais. [confident, clear, unhurried voice] Nos blocos, em Quando acontecer, deixe à vista o encontro com farol e um espaço vazio ao lado dele, fora do fazer. Se ele não estiver aparecendo, arraste um espaço vazio entre os blocos até ele aparecer. [confident, clear, unhurried voice] Abra Programação e depois Lógica e Se, pegue o bloco Se e solte nesse espaço vazio. [confident, clear, unhurried voice] Repare que o Se chega com a pergunta x maior que 0. Segure essa pergunta pelo sinal de maior e arraste até a lixeira. [confident, clear, unhurried voice] Abra de novo Programação e depois Lógica e Se, pegue o bloco não e solte no lugar vazio ao lado de Se. [confident, clear, unhurried voice] Agora abra Programação e depois Valores, pegue o bloco valor da variável e solte no espaço do não. Clique no x e escolha ganhou. [interested, animated voice] Pronto: o Se novo pergunta não ganhou. Ou seja: a partida ainda não foi ganha? [engaging, energetic, conversational voice] Agora a pergunta da chave vai ficar dentro dessa pergunta nova. Assim, o farol só confere a chave enquanto a partida ainda não foi ganha. [confident, clear, unhurried voice] Volte ao encontro com farol. Segure o Se temChave pela palavra Se e arraste até o espaço do então do Se novo. Tudo o que estava dentro dele vai junto. [interested, animated voice] Repare: o fazer do encontro com farol ficou vazio. [confident, clear, unhurried voice] Agora segure o Se novo pela palavra Se e solte dentro desse fazer vazio. [interested, animated voice] Olha aqui: o encontro primeiro pergunta se a partida ainda não foi ganha, e só depois confere a chave. [upbeat, encouraging voice] Agora vamos testar! Clique em Atualizar, pegue a chave e acenda o farol. Ande para trás pelo cais e volte. [interested, animated voice] Olha só: a luz continua acesa, o feixe segue girando e o barco continua chegando. [upbeat, encouraging voice] Toque na tecla R e vá ao farol sem a chave: ele continua pedindo a chave. ' +
          verificar(
            'dentro do encontro com farol está o Se com não ganhou, e o Se temChave inteiro está dentro do então dele',
          ),
      },
      {
        key: 'aparencia',
        title: 'Deixe o jogo com a sua cara',
        kind: 'build',
        screen:
          'Projeto uma-vez. Antes de gravar, preparar duas combinações em perfis de teste (robo, lancha, chave-prateada, farol-colorido, ilha-nevada; mergulhador, veleiro, chave-dourada, farol-de-madeira, costa-rochosa) e gravar 3 a 4 segundos de cada com o farol acendendo e o barco chegando. Depois, ao vivo: em Ao iniciar, abrir a lista do modelo de cada Criar o objeto e escolher pirata, barco-pirata, chave-de-estrela, farol-de-pedra e noite-na-ilha. Não mudar nome do objeto nem tamanho.',
        steps: [
          'Em Ao iniciar, deixe à vista Criar o objeto personagem com o modelo aventureiro. Clique em aventureiro e escolha outro personagem da lista.',
          'Faça o mesmo em Criar o objeto barco, chave e farol: clique no nome do modelo e escolha outro.',
          'Em Criar o objeto cenario, troque praia-tropical por outro cenário: costa-rochosa, ilha-nevada ou noite-na-ilha.',
          'Troque só o modelo. Deixe o nome do objeto, a cena e o tamanho como estão.',
          'Clique em Atualizar e teste a combinação: vá ao farol sem a chave, depois busque a chave e volte. Confira a luz e o barco.',
          'Verifique o projeto e aguarde Salvo.',
        ],
        text:
          '[curious] O seu farol já acende! E agora chegou uma surpresa: olha quantas versões o seu jogo pode ter. Outro personagem, outro barco, outra chave, outro farol e até outro cenário. [interested, animated voice] São as mesmas opções da Chave do Farol, com os mesmos nomes, agora em 3D. [engaging, energetic, conversational voice] Eu vou mostrar com o pirata. Você escolhe o que quiser, e o que você gostou pode ficar como está. [confident, clear, unhurried voice] Nos blocos, abra Ao iniciar e deixe à vista Criar o objeto personagem com o modelo aventureiro. Clique no nome aventureiro para abrir a lista e escolha outro. Eu escolho o pirata. [interested, animated voice] Olha só: ele aparece no mesmo lugar e do mesmo tamanho, porque todos os personagens deste jogo foram feitos com a mesma medida. E ele também anda e respira, como o aventureiro. [confident, clear, unhurried voice] Repare que o nome do objeto continua personagem, porque os outros blocos usam esse nome. Troque só o modelo e deixe o nome e o tamanho como estão. [engaging, energetic, conversational voice] Os blocos Criar o objeto barco, chave e farol funcionam do mesmo jeito: clique no nome do modelo e escolha outro. Eu vou escolher barco pirata, chave de estrela e farol de pedra. [interested, animated voice] No 2D, o farol tinha duas imagens, apagada e acesa. Aqui cada farol é um modelo só, e todos sabem acender. Por isso basta trocar num lugar. [engaging, energetic, conversational voice] Agora falta o lugar onde a história acontece. O primeiro Criar o objeto, o cenario, é a ilha inteira: o mar, o chão, a ponte, as árvores e o céu. Clique em praia tropical e escolha outro. Eu vou usar noite na ilha. [interested, animated voice] Olha só: o caminho, a ponte e o lugar do farol continuam os mesmos. [upbeat, encouraging voice] Agora teste a sua combinação! Clique em Atualizar e vá até o farol sem a chave: ele continua apagado. Depois busque a chave e volte. [interested, animated voice] Olha só: o farol de pedra acende, e o barco pirata vem chegando! ' +
          verificar(
            'você trocou só o modelo, e cada modelo está no bloco do mesmo tipo: personagem no personagem, barco no barco',
          ),
      },
      {
        key: 'personalizar',
        title: 'Escolha seu esconderijo e teste de verdade',
        kind: 'delivery',
        screen:
          'Projeto aparencia, com a combinação escolhida na parte anterior. Personalizar posição da chave e mensagens. Valor inicial exemplo −3,1,−2. Testar acesso pelo chão e ambos os ramos; envio atualizado.',
        steps: [
          'Em Ao iniciar → Colocar o objeto chave, escolha x e z dentro da ilha. Mantenha uma altura que o personagem alcance.',
          'Se quiser, escreva seus próprios avisos nas linhas de atribuição, conservando a função de cada mensagem.',
          'Clique em Atualizar. Vá ao farol sem chave. Depois alcance a chave escolhida e volte ao farol.',
          'Toque na tecla R depois de vencer: o farol apaga, a chave volta e você pode jogar novamente.',
          'Verifique, aguarde Salvo, envie o projeto e confirme o envio.',
        ],
        text:
          '[upbeat, encouraging voice] Agora escolha outro lugar para a chave. Nos blocos, abra Ao iniciar e encontre Colocar o objeto chave. [confident, clear, unhurried voice] Mude o x e o z para escolher o lugar no chão. Você também pode ajustar o y, mas o personagem precisa conseguir encostar na chave. [thoughtful] Ver a chave não basta. Ela pode estar alta demais ou do outro lado da água. [engaging, energetic, conversational voice] Por isso, clique em Atualizar e vá até o lugar que você escolheu. Confira se a coleta acontece e se dá para voltar ao farol. [reassuring, encouraging voice] Se não conseguir, volte à posição da chave, mude um número de cada vez e teste novamente. [engaging, energetic, conversational voice] Se quiser, escreva seus próprios avisos nas linhas que mudam aviso. Só conserve o papel de cada mensagem: começo, coleta, falta da chave e vitória. [upbeat, encouraging voice] Agora faça uma partida sem pegar a chave: o farol deve ficar apagado e pedir que você procure. Depois recolha a chave e acenda o farol. [upbeat, encouraging voice] Toque na tecla R e confira se tudo volta ao começo. ' +
          enviar,
      },
      {
        key: 'fecho',
        title: 'Sua ilha está pronta',
        kind: 'closing',
        screen:
          'Depois do envio final, mostrar o Estúdio e a publicação opcional: Compartilhar, resumo, Gerar capa, Publicar, confirmação e Fechar. Sem certificado, venda ou autoria das artes. Concluir aula.',
        text: '[pleased, lively voice] Você transformou a ideia da Chave do Farol em um jogo 3D! Programou o movimento, escolheu um lugar alcançável para a chave, fez o farol acender com a coleta e deixou o jogo com a sua cara. Também aprendeu a mudar o ponto de vista para investigar o que a imagem não mostra de primeira. [upbeat, encouraging voice] Seu jogo está pronto! Se quiser publicar no Mural, clique em Compartilhar no Estúdio. O título já vem preenchido. Escreva um resumo, clique em Gerar capa e confira a imagem. Depois clique em Publicar e espere aparecer Seu jogo está no Mural! [pleased, lively voice] Olha só: seu jogo ganhou um lugar para outras pessoas jogarem! Clique em Copiar link de jogar para mostrar à família e aos amigos. Se precisar, peça ajuda a um adulto. [confident, clear, unhurried voice] Clique em Fechar para voltar. Você também pode continuar sem publicar. Para terminar, clique em Concluir aula.',
      },
    ],
  },
]
