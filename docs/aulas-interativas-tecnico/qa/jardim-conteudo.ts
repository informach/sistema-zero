import type { JardimDimensao, JardimEtapa } from './jardim-projeto'
export type JardimTrecho = {
  key: string
  title: string
  kind: 'intro' | 'material' | 'build' | 'quiz' | 'delivery'
  etapa?: JardimEtapa
  text: string
  screen: string
}
const conferir =
  '[reassuring, encouraging voice] Experimente quantas vezes quiser. Se precisar, abra o Passo a passo do projeto: a ajuda está disponível desde o começo. [confident, clear, unhurried voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. [confident, clear, unhurried voice] Quando os objetivos desta parte estiverem cumpridos e aparecer Salvo, clique em Próxima parte.'
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
        screen:
          'Referência jogável. Mostrar o jardim e deslocamento curto, sem mostrar os blocos nem resolver as duas respostas.',
        text: '[upbeat, welcoming voice] Sua missão do Faísca é criar O Jardim Secreto! A flor está fechada. Seu personagem precisa pegar o regador e chegar até ela para fazê-la abrir. Se chegar antes de pegar o regador, o jogo deve avisar o que falta. [interested, animated voice] Você já investigou essas ideias na Chave do Farol e na Ilha do Farol. Agora vai escolher e montar as regras de outro jogo, primeiro numa tela plana, em duas dimensões, e depois com profundidade, em três. [upbeat, encouraging voice] Conheça o jogo pronto aqui na página. Clique nele e use as setas do teclado. A tecla R começa uma nova partida. Você pode seguir sem terminar: clique em Próxima parte.',
      },
      {
        key: 'material',
        title: 'Ajuda quando você precisar',
        kind: 'material',
        screen:
          'Mostrar material textual, seus títulos por dificuldade e dimensão. Não fingir anexo antes da produção do PDF.',
        text: '[engaging, energetic, conversational voice] O cenário, os desenhos e o reinício da partida já vêm preparados. As regras da missão são suas, e você pode começar pela que preferir. [engaging, energetic, conversational voice] As próximas partes ajudam a conferir os resultados aos poucos, uma regra de cada vez. [reassuring, encouraging voice] Esqueceu um encaixe? O Passo a passo do projeto tem lembretes, montagem completa e testes para os dois jardins. Consultar essa ajuda faz parte de aprender. Ela fica aqui na aula e você pode voltar quando precisar. Depois clique em Próxima parte.',
      },
      {
        key: 'movimento',
        title: 'Faça o personagem andar',
        kind: 'build',
        etapa: 'movimento',
        screen:
          'Projeto inicial. Mostrar personagem parado e objetivos; não encaixar solução no vídeo principal.',
        text: `[curious] O jardim aparece, mas o personagem ainda não responde às setas. O que falta para ele andar? [engaging, energetic, conversational voice] Lembra da Chave do Farol? Em cada quadro, o jogo olha a seta. Se você está segurando a seta, o personagem dá um passinho para o lado dela. [engaging, energetic, conversational voice] No seu jardim, ainda faltam as setas e esse passinho. E, como o jogo olha a seta em todo quadro, o passinho precisa acontecer de novo em todo quadro. [upbeat, encouraging voice] Agora faça o personagem andar nas quatro direções. Para testar, clique no jogo e segure uma seta do teclado: ele deve andar para aquele lado e parar quando você soltar. ${conferir}`,
      },
      {
        key: 'limite',
        title: 'Fique dentro do jardim',
        kind: 'build',
        etapa: 'limite',
        screen:
          'No começo, levar o personagem até a beirada direita e continuar segurando a seta até parte dele sumir. Depois mostrar as quatro beiradas, sem retirar bloco de aluno e sem montar o limite no vídeo. Objetivos de movimento e limite.',
        text: `[engaging, energetic, conversational voice] Agora leve o personagem até a beirada da tela e continue segurando a seta. Se ele passar da beirada e for sumindo, falta o limite da tela no seu jardim. [engaging, energetic, conversational voice] Lembra como o limite funcionava na Chave do Farol? Em cada quadro, primeiro o personagem dá o passinho. Depois, o jogo confere se ele passou da beirada e, se passou, puxa ele de volta para dentro. [upbeat, encouraging voice] Monte o limite e teste os quatro lados. O personagem deve chegar à beirada, continuar visível e conseguir voltar. ${conferir}`,
      },
      {
        key: 'coleta',
        title: 'Recolha e guarde a informação',
        kind: 'build',
        etapa: 'coleta',
        screen:
          'Regador disponível. Indicar objetivo de coleta sem prometer ver memória antes da decisão.',
        text: `[engaging, energetic, conversational voice] Agora o regador. Quando o personagem encontrar o regador, o regador deve sair do chão, e um aviso deve contar que ele foi pego. [engaging, energetic, conversational voice] Mas sumir e lembrar são coisas diferentes. O regador some da tela, e o jogo ainda precisa guardar que ele foi pego. [interested, animated voice] Na Chave do Farol, uma variável guardava se a chave já tinha sido pega. Lembra? A variável é como um recado que o jogo anota para não esquecer. [engaging, energetic, conversational voice] Aqui, ela guarda o regador. No começo da partida, ele ainda não foi pego. Depois do encontro, foi, e o jogo continua lembrando disso quando o personagem se afasta. [upbeat, encouraging voice] Monte a coleta e essa memória. Nesta parte, confira o regador sumindo e o aviso. Na próxima, a flor vai mostrar se o jogo está usando o que guardou. ${conferir}`,
      },
      {
        key: 'decisao',
        title: 'Uma flor, duas respostas',
        kind: 'build',
        etapa: 'decisao',
        screen:
          'Indicar flor e dois percursos possíveis; não revelar encaixes. Mostrar que referência e projeto próprio são distintos.',
        text: `[curious] O que a flor deve fazer quando o personagem chega sem o regador? E quando ele já pegou? [engaging, energetic, conversational voice] Para responder, a flor olha o que o jogo guardou sobre o regador. Sem o regador, ela continua fechada, e o aviso pede o que falta. Com o regador, ela abre, e o aviso conta que deu certo. [interested, animated voice] É a mesma decisão da Chave do Farol: lá, com a chave, o farol acendia; sem a chave, um aviso pedia a chave. [upbeat, encouraging voice] Monte a decisão e teste os dois casos: primeiro sem o regador, depois com ele. [reassuring, encouraging voice] Já pegou o regador e quer testar sem ele? Clique no jogo e toque na tecla R. Isso começa outra partida, e os seus blocos continuam iguais. ${conferir}`,
      },
      {
        key: 'posicao',
        title: 'Escolha outro lugar',
        kind: 'build',
        etapa: 'posicao',
        screen: 'Criação do regador em Ao iniciar. Não prescrever coordenada única.',
        text: `[engaging, energetic, conversational voice] Lembra? Na tela do 2D, o x leva um objeto de um lado para o outro, e o y, para cima e para baixo. [upbeat, encouraging voice] Agora escolha outro lugar para o regador. Mude um valor, observe onde o regador apareceu e experimente de novo. Você pode mudar o x, o y ou os dois. [engaging, energetic, conversational voice] Escolha um lugar em que o regador fique visível, longe do personagem no começo e fácil de alcançar. Também precisa existir um caminho até a flor sem pegar o regador, para você testar a flor sem ele. [confident, clear, unhurried voice] Depois da mudança, teste uma partida desde o começo. Se a prévia já recomeçou sozinha, pode usar essa nova partida. Confira a coleta no novo lugar e as duas respostas da flor. [reassuring, encouraging voice] Começar outra partida com a tecla R mantém o lugar que você escolheu. ${conferir}`,
      },
      entrega('2d'),
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
        screen: 'Referência 3D e início do segundo projeto, sem copiar solução 2D.',
        text: '[upbeat, welcoming voice] Seu jardim agora tem profundidade! A missão continua: recolher o regador, guardar essa informação e fazer a flor responder. [engaging, energetic, conversational voice] Na Ilha do Farol, você descobriu que x e z indicam o lugar no chão, e y indica a altura. [engaging, energetic, conversational voice] Também viu que, no 3D, dois objetos podem parecer juntos na tela e estar separados, um mais alto que o outro. Por isso, o encontro só acontece quando eles se tocam de verdade. [reassuring, encouraging voice] Se precisar, a ajuda completa das duas versões continua na primeira aula, na parte Ajuda quando você precisar. [upbeat, encouraging voice] Conheça o jardim pronto: clique nele e use as setas ou as teclas W, A, S e D. A tecla R começa outra partida. Depois clique em Próxima parte.',
      },
      {
        key: 'movimento',
        title: 'Caminhe pelo jardim 3D',
        kind: 'build',
        etapa: 'movimento',
        screen:
          'Projeto inicial3D, Enquanto estiver rodando. Nenhuma tarefa de programar câmera ou walkArea.',
        text: `[engaging, energetic, conversational voice] A câmera, a área de caminhada e as animações já estão preparadas. Falta só o que faz o personagem andar. [engaging, energetic, conversational voice] É a mesma ideia da Ilha do Farol: em cada quadro, o jogo olha as setas e, se você está segurando uma delas, o personagem anda um pouquinho para aquele lado. Use o movimento com o teclado que você montou lá. [upbeat, encouraging voice] Teste cada direção e solte a tecla para conferir a parada. Depois explore o caminho até o regador e até a flor. ${conferir}`,
      },
      {
        key: 'coleta',
        title: 'Recolha o regador em 3D',
        kind: 'build',
        etapa: 'coleta',
        screen:
          'Indicar encontro real, sem novo exercício de eixos. Objetivos desta etapa não cobram flor.',
        text: `[engaging, energetic, conversational voice] No 3D, o encontro considera também a altura. Por isso, o regador já veio numa altura que o personagem alcança. [interested, animated voice] A ideia da memória continua a mesma do jardim 2D: a partida começa sem a coleta, e o jogo passa a lembrar dela no encontro. [confident, clear, unhurried voice] Agora monte a coleta. No encontro com o regador, esconda o regador, guarde que ele foi pego e mude o aviso. O regador não precisa aparecer na mão do personagem. [upbeat, encouraging voice] Depois jogue, recolha o regador e se afaste. Confira se o aviso continua. ${conferir}`,
      },
      {
        key: 'decisao',
        title: 'Faça a flor responder',
        kind: 'build',
        etapa: 'decisao',
        screen:
          'Flor inicialmente fechada; indicar nome do clipe na ajuda, sem montar no vídeo. Ao falar do farol, 2 a 3 segundos da Ilha: o farol aceso apagando e acendendo de novo na volta pelo cais.',
        text: `[engaging, energetic, conversational voice] Sua flor também tem duas respostas. Sem o regador, ela fica fechada, e o aviso pede a coleta. Com ele, ela abre as pétalas, e o aviso conta que deu certo. [engaging, energetic, conversational voice] Para abrir as pétalas, a flor já tem uma animação pronta, chamada florescer. Você escolhe quando ela toca. [curious] Lembra do farol da Ilha? Cada vez que o personagem voltava, ele acendia tudo de novo. [engaging, energetic, conversational voice] A flor é o fim deste jogo, como o farol era o fim daquele. Por isso, ela também deve abrir uma vez só: depois do apito final, a partida já foi ganha. [confident, clear, unhurried voice] Para o jogo lembrar disso, crie a variável ganhou, começando em falso. Quando a flor abrir, guarde verdadeiro nela. [confident, clear, unhurried voice] Depois coloque a pergunta do regador dentro de Se não ganhou, como você fez no farol. Assim, a flor só responde enquanto a partida ainda não foi ganha. [upbeat, encouraging voice] Monte a decisão no encontro com a flor. Teste uma partida sem a coleta e outra com a coleta. Depois que ela abrir, saia de perto e volte: a flor deve continuar aberta, sem florescer de novo. ${conferir}`,
      },
      {
        key: 'posicao',
        title: 'Encontre um novo lugar no chão',
        kind: 'build',
        etapa: 'posicao',
        screen: 'Posição do regador, x/z livres; y conservado. Mostrar câmera fixa e alcance.',
        text: `[engaging, energetic, conversational voice] Lembra? No 3D, x e z indicam o lugar no chão, e y indica a altura. [upbeat, encouraging voice] Agora escolha um novo lugar para o regador no jardim 3D. Mude x, z ou os dois, e mantenha a altura y que já veio preparada. Experimente mais de um lugar. [engaging, energetic, conversational voice] Deixe o regador visível e alcançável, longe do personagem no começo, e preserve um caminho direto até a flor sem passar por ele. [confident, clear, unhurried voice] Depois da mudança, teste uma partida desde o começo. Confira a coleta no lugar novo e as duas respostas da flor. ${conferir}`,
      },
      {
        key: 'revisao',
        title: 'Pense nos seus testes',
        kind: 'quiz',
        screen:
          'Quiz com alternativas neutras e demonstrações depois da escolha; pergunta 2 sem cena.',
        text: '',
      },
      entrega('3d'),
    ],
  },
]
function entrega(d: JardimDimensao): JardimTrecho {
  return {
    key: 'entrega',
    title: d === '2d' ? 'Envie seu jardim 2D' : 'Entregue sua missão',
    kind: 'delivery',
    etapa: 'posicao',
    screen:
      'Projeto atual, objetivos, Salvo, Enviar meu projeto, confirmação Enviar e Projeto enviado!. Não preencher Recado nem simular envio.',
    text: `[pleased, lively voice] ${d === '2d' ? 'Seu primeiro jardim já pode florescer! Na próxima aula, você vai construir a versão em três dimensões.' : 'Você usou a memória e a decisão em dois jardins e conferiu o que muda no espaço em três dimensões. [engaging, energetic, conversational voice] Quando você enviar este jardim, a sua missão fica registrada na jornada. Lá você confere o que falta para avançar de posto.'} [confident, clear, unhurried voice] Antes de enviar, confira o movimento, a coleta no lugar escolhido e as duas respostas da flor.${d === '3d' ? ' Confira também que, depois de aberta, ela não floresce de novo quando você volta.' : ''} [confident, clear, unhurried voice] Depois de um sucesso, clique no jogo e toque na tecla R. O regador deve voltar e a flor deve começar fechada, e os seus blocos continuam iguais. [confident, clear, unhurried voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. [confident, clear, unhurried voice] Quando os objetivos estiverem cumpridos e aparecer Salvo, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.`,
  }
}

/** Complete optional assembly, separate from the mission's main narration. */
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
        `Abra ${ext} → ${three ? 'Encostar' : 'Colisões → Encostar e bloquear'}. Pegue ${three ? 'Quando personagem encostar em chave' : 'Quando o sprite jogador começar a encostar no sprite inimigo'} e encaixe nesse espaço. Escolha personagem no primeiro nome e regador no segundo.`,
        three
          ? 'No fazer desse encontro, encaixe Jogo 3D → Objetos → Aparência → Esconder o objeto. Escolha regador.'
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
        `Dentro de Quando acontecer, deixe à vista um espaço depois do evento da coleta e fora do fazer dele. Pegue outro evento de encontro em ${ext}${three ? ' → Encostar.' : ' → Colisões → Encostar e bloquear.'} Escolha personagem e flor.`,
        'No fazer do encontro com a flor, encaixe Programação → Lógica e Se → Se. Clique em + senão para abrir o outro caminho.',
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
              'Em Ao iniciar, depois de temRegador, crie a variável ganhou com o valor falso, do mesmo jeito que criou temRegador.',
              'No então do Se temRegador, depois de Tocar a animação, encaixe Alterar variável. Escolha ganhou, encaixe o bloco verdadeiro no valor e deixe verdadeiro.',
              'Em Quando acontecer, deixe à vista um espaço vazio ao lado do encontro com flor, fora do fazer. Em Programação → Lógica e Se, pegue Se e solte nesse espaço.',
              'Arraste a comparação que veio na pergunta do Se novo até a lixeira. Em Programação → Lógica e Se, pegue não e encaixe no lugar vazio. Em Programação → Valores, pegue valor da variável, encaixe dentro do não e escolha ganhou.',
              'Pegue o Se temRegador pela palavra Se e arraste até o então do Se novo; tudo o que está dentro dele vai junto. Depois encaixe o Se novo no fazer do encontro com flor, que ficou vazio.',
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
          ? 'Em Ao iniciar, encontre Colocar o objeto regador. Escolha outro valor de x ou z; deixe y em 0.54, como está. Um exemplo é x −2, com o mesmo z.'
          : 'Em Ao iniciar, encontre a criação do sprite regador. Ele começa em x 300 e y 190. Escolha outro x ou y. Um exemplo é x 390, mantendo y 190.',
        'Observe onde ele apareceu. Pode experimentar vários lugares e escolher outro diferente do exemplo. Deixe-o dentro do jardim, visível, separado do personagem no começo e alcançável.',
        'Preserve um caminho até a flor sem passar pelo regador. Comece uma partida com a mudança. Se a prévia já reiniciou ao editar, ela já serve para esse teste; senão clique no jogo e toque na tecla R.',
      ],
      test: 'Vá primeiro à flor sem o regador. Depois recolha no lugar novo e volte. Depois do sucesso, toque na tecla R: regador disponível, flor fechada e a posição escolhida conservada.',
      correction:
        'Se não conseguir chegar ao regador, ajuste o lugar; no 3D confira também se você manteve a altura. Reiniciar a partida conserva o programa. Não use restaurar o projeto inicial para esse teste.',
    },
  ]
}
