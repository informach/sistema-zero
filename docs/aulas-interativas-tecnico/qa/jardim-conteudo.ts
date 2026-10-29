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
  '[reassuring, encouraging voice] Experimente quantas vezes quiser. Se precisar, abra o Passo a passo do projeto: a ajuda está disponível desde o começo. [confident, clear, unhurried voice] Clique em Verificar projeto, leia o que falta e ajuste. Quando os objetivos desta parte estiverem cumpridos e aparecer Salvo, clique em Próxima parte.'
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
        text: '[upbeat, welcoming voice] Sua missão do Faísca é criar O Jardim Secreto! A flor está fechada. Seu personagem precisa pegar o regador e chegar até ela para fazê-la abrir. Se chegar antes de pegar o regador, o jogo deve avisar o que falta. [interested, animated voice] Você já investigou essas ideias nos Faróis. Agora vai escolher e montar as regras de outro jogo, primeiro em duas dimensões e depois em três. [upbeat, encouraging voice] Conheça o jogo pronto aqui na página. Clique nele e use as setas do teclado. A tecla R começa uma nova partida. Você pode seguir sem terminar: clique em Próxima parte.',
      },
      {
        key: 'material',
        title: 'Ajuda quando você precisar',
        kind: 'material',
        screen:
          'Mostrar material textual, seus títulos por dificuldade e dimensão. Não fingir anexo antes da produção do PDF.',
        text: '[engaging, energetic, conversational voice] Você pode começar pela regra que preferir. As próximas partes ajudam a conferir os resultados aos poucos. O cenário, os desenhos e o reinício já estão preparados; as regras da missão são suas. [reassuring, encouraging voice] Esqueceu um encaixe? O Passo a passo do projeto tem lembretes, montagem completa e testes para os dois jardins. Consultar essa ajuda faz parte de aprender. Ela fica aqui na aula e você pode voltar quando precisar. Depois clique em Próxima parte.',
      },
      {
        key: 'movimento',
        title: 'Faça o personagem andar',
        kind: 'build',
        etapa: 'movimento',
        screen:
          'Projeto inicial. Mostrar personagem parado e objetivos; não encaixar solução no vídeo principal.',
        text: `[curious] O jardim aparece, mas o personagem ainda não responde às setas. O que falta para ele andar? [engaging, energetic, conversational voice] No Farol, os controles recebiam a direção e o comando de movimento era executado a cada quadro. Use essa ideia no jardim. Colocar o comando nos blocos muda a regra; pressionar uma seta no teclado testa essa regra. [upbeat, encouraging voice] Faça o personagem andar nas quatro direções e parar quando você soltar a tecla. ${conferir}`,
      },
      {
        key: 'limite',
        title: 'Fique dentro do jardim',
        kind: 'build',
        etapa: 'limite',
        screen:
          'Mostrar quatro bordas sem retirar bloco de aluno. Objetivos de movimento e limite.',
        text: `[engaging, energetic, conversational voice] Agora confira as bordas da tela. Seu personagem deve chegar até elas, continuar visível e conseguir voltar. Lembra da ordem dos comandos no Farol? O limite precisa conferir a posição depois do movimento. [upbeat, encouraging voice] Monte essa regra e experimente os quatro lados. Não basta chegar à borda: tente voltar também. ${conferir}`,
      },
      {
        key: 'coleta',
        title: 'Recolha e guarde a informação',
        kind: 'build',
        etapa: 'coleta',
        screen:
          'Regador disponível. Indicar objetivo de coleta sem prometer ver memória antes da decisão.',
        text: `[engaging, energetic, conversational voice] Quando o personagem encontrar o regador, o regador deve sair do chão e um aviso deve contar que ele foi pego. Mas sumir e lembrar são coisas diferentes. [interested, animated voice] No Farol, uma variável guardava a coleta da chave. Aqui, o jogo precisa guardar a coleta do regador. No começo, ele ainda não foi pego. Depois do encontro, foi. Essa informação continua valendo quando o personagem se afasta. [upbeat, encouraging voice] Monte a coleta e essa memória. Nesta parte, confira o regador sumindo e o aviso. Na próxima, a flor vai mostrar se o jogo está usando a informação. ${conferir}`,
      },
      {
        key: 'decisao',
        title: 'Uma flor, duas respostas',
        kind: 'build',
        etapa: 'decisao',
        screen:
          'Indicar flor e dois percursos possíveis; não revelar encaixes. Mostrar que referência e projeto próprio são distintos.',
        text: `[curious] O que a flor deve fazer quando o personagem chega sem o regador? E quando ele já pegou? [engaging, energetic, conversational voice] A flor precisa consultar a informação da coleta. Sem o regador, continua fechada e o aviso pede o que falta. Com o regador, ela abre e o aviso conta que deu certo. Use a decisão que você já montou no Farol. [upbeat, encouraging voice] Teste os dois casos. Para testar sem o regador depois de já ter pegado, clique no jogo e pressione R. Isso começa outra partida e conserva seus blocos. ${conferir}`,
      },
      {
        key: 'posicao',
        title: 'Escolha outro lugar',
        kind: 'build',
        etapa: 'posicao',
        screen: 'Criação do regador em Ao iniciar. Não prescrever coordenada única.',
        text: `[upbeat, encouraging voice] Agora escolha outro lugar para o regador. No 2D, você pode mudar x, y ou os dois. Mude um valor, observe e experimente de novo. [engaging, energetic, conversational voice] Deixe o regador visível, separado do personagem no começo e num lugar que dê para alcançar. Também precisa existir um caminho até a flor sem pegar o regador. Depois da mudança, teste uma partida desde o começo. Se a prévia já recomeçou sozinha, pode usar essa nova partida. [confident, clear, unhurried voice] Confira a coleta no novo lugar e as duas respostas da flor. Reiniciar a partida mantém a posição que você escolheu. ${conferir}`,
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
        text: '[upbeat, welcoming voice] Seu jardim agora tem profundidade! A missão continua: recolher o regador, guardar essa informação e fazer a flor responder. [engaging, energetic, conversational voice] Na Ilha do Farol, você descobriu que x e z indicam o lugar no chão, e y indica a altura. Também viu que dois desenhos parecerem juntos não garante o encontro em 3D. Vamos usar essas descobertas. [upbeat, encouraging voice] Conheça o jardim pronto com as setas ou W, A, S e D. R recomeça a partida. Depois clique em Próxima parte. A ajuda completa das duas versões continua na primeira aula, na parte Ajuda quando você precisar.',
      },
      {
        key: 'movimento',
        title: 'Caminhe pelo jardim 3D',
        kind: 'build',
        etapa: 'movimento',
        screen:
          'Projeto inicial3D, Enquanto estiver rodando. Nenhuma tarefa de programar câmera ou walkArea.',
        text: `[engaging, energetic, conversational voice] A câmera, a área de caminhada e as animações já estão preparadas. Falta você colocar o comando que faz o personagem andar. Use o movimento com o teclado que montou na Ilha do Farol. [upbeat, encouraging voice] Teste cada direção e solte a tecla para conferir a parada. Explore o caminho até o regador e até a flor. ${conferir}`,
      },
      {
        key: 'coleta',
        title: 'Recolha o regador em 3D',
        kind: 'build',
        etapa: 'coleta',
        screen:
          'Indicar encontro real, sem novo exercício de eixos. Objetivos desta etapa não cobram flor.',
        text: `[engaging, energetic, conversational voice] No 3D, o encontro considera também a altura. O regador já está numa altura alcançável. Monte a coleta: no encontro, esconda o regador, guarde que ele foi pego e mude o aviso. [interested, animated voice] A ideia da memória continua a mesma: a partida começa sem a coleta e passa a lembrar dela no encontro. O regador não precisa aparecer na mão do personagem. [upbeat, encouraging voice] Jogue, recolha e se afaste. Confira se o aviso continua. ${conferir}`,
      },
      {
        key: 'decisao',
        title: 'Faça a flor responder',
        kind: 'build',
        etapa: 'decisao',
        screen:
          'Flor inicialmente fechada; indicar nome do clipe na ajuda, sem montar no vídeo. Ao falar do farol, 2 a 3 segundos da Ilha: o farol aceso apagando e acendendo de novo na volta pelo cais.',
        text: `[engaging, energetic, conversational voice] Sua flor também tem duas respostas. Sem o regador, ela fica fechada e o aviso pede a coleta. Com ele, a animação florescer abre as pétalas e o aviso conta que deu certo. A animação veio pronta; você escolhe quando ela toca. [curious] Lembra do farol da Ilha, que acendia tudo de novo quando o personagem voltava? A flor é o fim deste jogo, então ela também abre uma vez só. Crie a variável ganhou começando em falso, guarde verdadeiro quando a flor abrir e coloque a pergunta do regador dentro de Se não ganhou, como você fez no farol. [upbeat, encouraging voice] Monte a decisão no encontro com a flor. Teste uma partida sem a coleta e outra com a coleta. Depois que ela abrir, saia de perto e volte: a flor deve continuar aberta, sem florescer de novo. ${conferir}`,
      },
      {
        key: 'posicao',
        title: 'Encontre um novo lugar no chão',
        kind: 'build',
        etapa: 'posicao',
        screen: 'Posição do regador, x/z livres; y conservado. Mostrar câmera fixa e alcance.',
        text: `[engaging, energetic, conversational voice] Escolha um novo lugar para o regador no jardim 3D. Mude x, z ou os dois; mantenha a altura y que já veio preparada. Lembra? No chão do 3D usamos x e z. [upbeat, encouraging voice] Experimente mais de um lugar. Deixe o regador visível e alcançável, separado do personagem no começo, e preserve um caminho direto à flor sem passar por ele. Depois da mudança, comece a testar desde o início da partida. Confira a coleta no lugar novo e as duas respostas da flor. ${conferir}`,
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
    text: `[pleased, lively voice] ${d === '2d' ? 'Seu primeiro jardim já pode florescer! Na próxima aula, você vai construir a versão em três dimensões.' : 'Você usou a memória e a decisão em dois jardins e conferiu o que muda no espaço em três dimensões.'} [confident, clear, unhurried voice] Antes de enviar, confira o movimento, a coleta no lugar escolhido e as duas respostas da flor.${d === '3d' ? ' Confira também que, depois de aberta, ela não floresce de novo quando você volta.' : ''} Pressione R no jogo depois de um sucesso: o regador deve voltar e a flor deve começar fechada. Seus blocos continuam iguais. Clique em Verificar projeto e corrija o que faltar. Quando os objetivos estiverem cumpridos e aparecer Salvo, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula. ${d === '3d' ? '[upbeat, encouraging voice] Sua missão fica registrada na jornada. Confira lá o que falta para avançar de posto.' : ''}`.trim(),
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
      idea: 'O teclado fornece a direção. O comando dentro do quadro transforma essa direção em movimento.',
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
      test: 'Clique no jogo. Pressione e solte cada seta do teclado. O personagem deve andar nas quatro direções e parar quando você soltar.',
      correction:
        'Se não andar, confira o nome personagem e o encaixe dentro do quadro. No 2D, confira também os controles em Ao iniciar. Apertar uma tecla não adiciona o comando aos blocos.',
    },
    ...(!three
      ? [
          {
            key: 'limite',
            title: 'O personagem sai da tela',
            idea: 'Primeiro o jogo move o personagem; depois corrige a posição quando ele passa da borda.',
            steps: [
              'Deixe à vista o comando de movimento dentro de A cada quadro do jogo.',
              'Em Jogo 2D → Movimento → Bordas e rebatidas, pegue Manter o sprite dentro da tela. Encaixe imediatamente depois do movimento e antes de desenhar os sprites. Escolha personagem.',
            ],
            test: 'Ande até cada uma das quatro bordas, continue pressionando e depois volte. O personagem deve continuar visível e conseguir sair da borda.',
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
      test: 'Comece uma partida, observe o regador no chão e caminhe até ele. Só no encontro ele deve desaparecer. Pressione R para repetir.',
      correction:
        'Se o regador sumir logo no começo, confira se remover ou esconder está no encontro, não em Ao iniciar. Se não sumir, confira os dois nomes do evento e a altura no 3D.',
    },
    {
      key: 'memoria',
      title: 'O jogo precisa lembrar da coleta',
      idea: 'Sumir com o desenho e guardar uma informação são ações diferentes. Use uma variável com dois valores: falso antes da coleta e verdadeiro depois.',
      steps: [
        'Deixe à vista o fim de Ao iniciar. Em Programação → Variáveis, pegue Criar variável e encaixe ali. Escreva temRegador no nome. Pode escolher outro nome e usá-lo em todos os lugares.',
        'Em Programação → Lógica e Se, pegue verdadeiro ou falso. Encaixe no valor da nova variável e escolha falso.',
        'Deixe à vista o fazer do encontro com regador. Depois de remover ou esconder, encaixe Programação → Variáveis → Alterar variável. Escolha temRegador.',
        'Encaixe verdadeiro ou falso no valor dessa alteração e escolha verdadeiro. Confira: Ao iniciar usa falso; o encontro com o regador usa verdadeiro.',
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
      idea: 'O encontro com a flor pergunta se a coleta já aconteceu. Verdadeiro escolhe então; falso escolhe senão.',
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
      test: 'Pressione R e vá direto à flor, sem recolher: ela fica fechada e o aviso pede o regador. Depois recolha, afaste-se e volte à flor: ela abre e o aviso conta o sucesso. Continue andando para conferir que ela permanece aberta.',
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
              'No então do Se temRegador, depois de Tocar a animação, encaixe Alterar variável. Escolha ganhou, encaixe verdadeiro ou falso no valor e escolha verdadeiro.',
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
        'Preserve um caminho até a flor sem passar pelo regador. Comece uma partida com a mudança. Se a prévia já reiniciou ao editar, ela já serve para esse teste; senão clique no jogo e pressione R.',
      ],
      test: 'Vá primeiro à flor sem o regador. Depois recolha no lugar novo e volte. Pressione R após o sucesso: regador disponível, flor fechada e a posição escolhida conservada.',
      correction:
        'Se não conseguir chegar ao regador, ajuste o lugar; no 3D confira também se você manteve a altura. Reiniciar a partida conserva o programa. Não use restaurar o projeto inicial para esse teste.',
    },
  ]
}
