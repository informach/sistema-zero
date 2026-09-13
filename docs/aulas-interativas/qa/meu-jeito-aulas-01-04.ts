import type { Recipe } from './meu-jeito-editorial'

export const earlyRecipes: Record<number, Recipe> = {
  1: {
    title: 'Seu jogo no Estúdio Completo',
    tool: 'estudio',
    entry:
      'O jogo do Dia 5 está pronto na aula do Desafio. Vamos levá-lo ao Estúdio Completo e aprender a reencontrá-lo.',
    exit: 'Projeto do Dia 5 importado, reconhecível pelo nome, jogável e guardado na conta; projeto de teste separado.',
    opening:
      'Oi! O seu jogo da nave já está pronto. Hoje vamos levar uma cópia para o Estúdio Completo, onde você poderá continuar mexendo nele. Vamos conhecer a lista, preparar um projeto de teste e trazer o jogo. No final, você vai saber qual cartão abrir para continuar.',
    closing:
      'Agora você tem o seu jogo no Estúdio Completo e sabe onde encontrá-lo. Exportar leva uma cópia para um arquivo; importar traz essa cópia para um projeto. A aula original continua lá. Na próxima aula vamos desenhar a nave no Pinta. Antes, duas perguntas para guardar o caminho.',
    choices:
      'Nome do projeto de teste e do jogo importado. Não criar versões adicionais nesta aula.',
    steps: [
      {
        key: 'lista',
        title: 'Observe: onde os projetos ficam',
        kind: 'observe',
        part: 1,
        focus:
          'Distinguir projeto da aula e projeto livre antes de procurar o jogo no lugar errado.',
        reason:
          'A lista vazia é novidade. Uma visita curta evita pedir que a criança importe antes de entender o destino.',
        say: 'Esta é a lista dos projetos do Estúdio. O jogo do Desafio ainda está na aula. Por isso ele pode não aparecer aqui. Daqui a pouco vamos trazer uma cópia.',
        edit: 'Manter a apresentação de Meus Jogos e dos dois botões; retirar “Primeiro passo concluído”. Não afirmar que a lista de toda criança estará vazia.',
        visual:
          'Destacar Meus Jogos, Novo projeto e Importar um de cada vez. Mostrar dois lugares nomeados: aula do Desafio e Estúdio Completo.',
        criteria: ['Reconhecer que a aula e a lista de projetos são lugares distintos.'],
        help: 'O jogo que você enviou no Desafio continua dentro daquela aula.',
      },
      {
        key: 'projeto-teste',
        title: 'Crie um projeto e encontre os blocos',
        kind: 'build',
        part: 2,
        focus: 'Criar o projeto de teste, instalar Jogo 2D e voltar à lista.',
        reason: 'É uma ação completa com começo e fim, separada da importação do jogo verdadeiro.',
        say: 'Crie Meu jogo novo. Abra Mais opções → Exibição → Extensões e instale Jogo 2D. Feche a janela e volte à lista pelo botão Sistema Zero Studio. Guarde esse projeto de teste separado do jogo da nave.',
        edit: 'Reaproveitar o caminho completo. Atualizar a lista de categorias e extensões conforme o perfil de gravação; não prometer que haverá um único cartão.',
        visual:
          'Zoom em Instalada, Fechar e na marca clicável de retorno. Mostrar o cartão do projeto de teste.',
        criteria: [
          'Projeto de teste aparece em Meus Jogos.',
          'Jogo 2D aparece na paleta depois de instalado.',
        ],
        help: 'Se a categoria não apareceu, confira Instalada e feche a janela de extensões.',
        question: [
          'Num projeto novo, os blocos de Jogo 2D não apareceram. O que conferir?',
          'Se a extensão Jogo 2D está instalada nesse projeto.',
          'Se o nome do projeto tem a palavra nave.',
          'A extensão acrescenta os blocos. Dar nome ao projeto ajuda a encontrá-lo, mas não instala uma extensão.',
        ],
      },
      {
        key: 'ponte',
        title: 'Observe: uma cópia faz a ponte',
        kind: 'observe',
        part: 3,
        from: 'É isso que exportar quer dizer:',
        to: 'É o seu jogo, com os seus blocos, rodando fora da aula pela primeira vez.',
        focus: 'Entender exportar e importar como cópia, antes de navegar até o Desafio.',
        reason: 'A criança precisa visualizar a direção da ponte antes de percorrer várias telas.',
        say: 'O jogo fica na aula. Exportar cria um arquivo com uma cópia dele. Importar usa esse arquivo para criar um projeto no Estúdio. Não é preciso apagar o jogo da aula.',
        edit: 'Usar só as definições de exportar e importar com a imagem do arquivo. O gesto completo de navegação fica na próxima seção; substituir as ordens de clicar por esta narração de observação.',
        visual:
          'Diagrama simples: aula → arquivo .szproject.json → Estúdio. A miniatura original permanece visível na aula; não mostrar movimento que sugira exclusão.',
        criteria: ['A origem permanece; o destino recebe uma cópia.'],
        help: 'Imagine fotocopiar uma página: o original continua no lugar.',
      },
      {
        key: 'importar',
        title: 'Traga o jogo do Dia 5',
        kind: 'build',
        part: 3,
        focus: 'Encontrar o Dia 5 pelo nome, exportar, importar, testar e nomear o projeto.',
        reason:
          'É um percurso de navegação contínuo: não interromper entre baixar e escolher o arquivo.',
        say: 'Na aba da ferramenta, abra Cursos → Faísca → Desafio do Primeiro Jogo → Dia 5. Exporte para o Estúdio, volte ao Estúdio e importe o arquivo .szproject.json. Abra o jogo, teste os controles e dê um nome que você reconheça.',
        edit: 'Preservar todas as telas do caminho. Encurtar as definições já demonstradas. Manter recuperação por Sincronizar com o enviado como ajuda condicional, não ação obrigatória. O puxador do menu entra como dica breve ao fim.',
        visual:
          'Mostrar o nome da aula, a extensão do arquivo, o botão Importar e o projeto abrindo. Renomear pela barra; evitar confundir com Meu jogo novo.',
        criteria: [
          'O projeto importado contém os blocos, nave, tiros e asteroides do Dia 5.',
          'O nome do cartão permite distingui-lo do projeto de teste.',
          'A nave responde aos controles do jogo.',
        ],
        help: 'Se o Dia 5 estiver vazio, confira o trabalho enviado e use Sincronizar com o enviado apenas para recuperar aquela entrega. Não importe um arquivo de imagem.',
        question: [
          'Há um cartão vazio e outro com o jogo completo. Qual usaremos nas aulas 6 e 7?',
          'O cartão do jogo importado, conferindo o nome e o conteúdo.',
          'O cartão vazio, porque é o mais novo.',
          'A continuidade está no projeto que já contém o jogo. O projeto vazio fica reservado.',
        ],
      },
      {
        key: 'guardar',
        title: 'Reencontre o mesmo jogo',
        kind: 'build',
        part: 4,
        to: 'Se você entrar na sua conta em outro computador, eles estão lá.',
        focus: 'Conferir salvamento na conta e reabrir o projeto certo.',
        reason:
          'Reabrir comprova o caminho de retorno; isso será necessário após quatro aulas no Pinta.',
        say: 'Espere aparecer Guardado na sua conta. Volte a Meus Jogos e abra o mesmo cartão. Confira se o jogo continua completo. É aqui que vamos voltar depois de desenhar.',
        edit: 'Manter retorno à lista e aviso Guardado na sua conta. Retirar cena antiga de lista vazia em outro navegador, limites numéricos, exclusão e remix; cópia publicada será retomada na aula 8.',
        visual:
          'Mostrar o aviso real, voltar à lista e reabrir o jogo. Não substituir um aviso de sincronização pendente por cartela de sucesso.',
        criteria: [
          'Aviso Guardado na sua conta confirmado.',
          'Mesmo projeto reaberto com os blocos e recursos esperados.',
        ],
        help: 'Se o salvamento estiver pendente, mantenha a ferramenta aberta e confira a conexão antes de sair.',
        question: [
          'A ferramenta ainda está guardando seu jogo. O que fazer antes de fechar?',
          'Esperar o aviso de que ficou guardado na conta.',
          'Criar outro projeto com o mesmo nome.',
          'Uma cópia vazia não termina o salvamento. Confira o aviso do projeto em que trabalhou.',
        ],
      },
    ],
    delivery:
      'Selecione o jogo importado do Dia 5 na galeria do Estúdio e envie. O projeto de teste fica na lista, mas não é a entrega.',
    rubric: [
      'Receber o jogo completo, não o projeto vazio.',
      'Abrir a partida e conferir nave, tiros, asteroides, pontos/vidas, telas e reinício conforme o Dia 5.',
      'Confirmar que a criança reconhece a diferença entre a criação na aula, o arquivo e o projeto livre.',
    ],
    corrections: [
      'Não fixar “mais de cem jogos”; usar o indicador atual de armazenamento.',
      'Não mostrar lista vazia em outro navegador como comportamento esperado após salvar na conta.',
      'Não demonstrar Fazer a minha versão agora: evitar um terceiro projeto quase igual.',
      'Conferir permissões da Carreira no perfil de revisão; não prometer desbloqueios específicos.',
    ],
    quiz: [
      [
        'Depois de exportar o jogo, o que aconteceu com o original da aula?',
        'Continua na aula; o arquivo contém uma cópia.',
        'Foi removido da aula e virou o arquivo.',
        'Exportar preserva a origem.',
      ],
      [
        'Você recebeu o arquivo .szproject.json e quer abri-lo no Estúdio. Qual ação usa?',
        'Importar.',
        'Instalar extensão.',
        'Importar traz o projeto. Instalar extensão disponibiliza os blocos usados para construí-lo.',
      ],
    ],
  },
  2: {
    title: 'Desenhe a sua nave no Pinta',
    tool: 'pinta',
    entry:
      'O jogo ficou no Estúdio. Hoje a criança abre o Pinta pela primeira vez e desenha a nave.',
    exit: 'Nave em pixel art, Personagem 32 × 32, com silhueta, cor, luz/sombra e espaço inferior para o motor; salva na galeria.',
    opening:
      'Oi! Eu vou contar o caminho e o Júlio vai desenhar na tela. Hoje você cria a sua nave: primeiro o formato, depois as cores e a luz. As escolhas de desenho são suas. Vamos guardar um espaço embaixo para o motor da próxima aula.',
    closing:
      'Sua nave tem um formato que você escolheu, cores e volume. O espelho ajudou no contorno; a luz e a sombra ajudaram a enxergar as partes. O desenho fica no Pinta, esperando o motor da próxima aula. Agora vamos guardar duas ideias.',
    choices:
      'Escolher entre referências já oferecidas, combinando corpo e asas; formato, cores, lado da luz e um ou dois detalhes. Manter Pixel art, Personagem, 32 × 32, nome nave e cerca de quatro fileiras livres embaixo.',
    steps: [
      {
        key: 'novo-desenho',
        title: 'Prepare a tela da sua nave',
        kind: 'build',
        part: 1,
        focus: 'Criar nave como personagem em pixel art de 32 × 32.',
        reason:
          'Os estilos são apresentados no momento em que seus cartões aparecem, não numa palestra antes da ação.',
        say: 'Abra o Pinta e escolha Criar novo → Pixel art → Personagem → Médio, 32 × 32. Escreva nave e comece a desenhar. Confira o número embaixo de Médio antes de clicar.',
        edit: 'Manter assistente e breve explicação dos dois estilos. Retirar a afirmação não fundamentada de que os retratos de Celeste são vetoriais; usar um exemplo produzido no Pinta. Não ensinar exportações.',
        visual:
          'Mostrar grade com 32 colunas e 32 linhas sem contá-las uma a uma. Destacar que Pequeno vem marcado e precisa trocar.',
        criteria: ['Pixel art e Personagem.', 'Quadro 32 × 32 e nome nave.'],
        help: 'Se aparecer 16 × 16, você ficou no Pequeno; confira o tamanho antes de desenhar.',
        question: [
          'Para escolher o tamanho certo, o que você deve olhar?',
          'O número 32 × 32 embaixo de Médio.',
          'A cor do cartão do tamanho.',
          'Os números indicam largura e altura do quadro, que usaremos depois na folha de animação.',
        ],
      },
      {
        key: 'espelho',
        title: 'Experimente: um traço, dois lados',
        kind: 'experiment',
        part: 2,
        experiment: 'espelho',
        focus: 'Comparar o mesmo traço de Linha com Espelho lado a lado desligado e ligado.',
        reason:
          'Uma comparação curta prepara a ferramenta sem pedir que a criança refaça o próprio desenho.',
        say: 'Neste exemplo, faça o mesmo traço com o espelho desligado e ligado. Registre os dois resultados. O que apareceu do outro lado? Depois vamos usar essa ideia na sua nave.',
        edit: 'Substitui a repetição explicativa do espelho; manter o clique real no vídeo do contorno.',
        visual:
          'Grade ampliada, eixo central tracejado e o mesmo traço fixo à esquerda. Única escolha: espelho ligado/desligado. Não oferecer pincel livre.',
        criteria: [
          'Mesma linha em ambos os testes.',
          'Com espelho, traço correspondente à direita.',
        ],
        help: 'Compare os dois lados do eixo. Este exemplo usa Linha; o balde tem outro comportamento.',
        question: [
          'O que o espelho mudou neste teste?',
          'Criou o traço correspondente do outro lado.',
          'Virou o desenho inteiro de cabeça para baixo.',
          'Espelho lado a lado repete o traço enquanto você desenha. Espelhar na horizontal ou na vertical transforma algo já desenhado.',
        ],
      },
      {
        key: 'contorno',
        title: 'Desenhe o contorno e reserve o motor',
        kind: 'build',
        part: 2,
        focus: 'Fazer a silhueta com espaço inferior reservado.',
        reason:
          'O primeiro resultado é o formato inteiro; cor e detalhes vêm depois para evitar retrabalho.',
        say: 'Escolha um corpo e um par de asas entre as referências desta aula. Com preto e Linha, use Espelho lado a lado para fazer o contorno. Deixe cerca de quatro fileiras vazias embaixo. Se um traço não ficou bom, desfaça e ajuste.',
        edit: 'Oferecer duas ou três referências na própria aula, sem mandar pesquisar na internet. Encurtar a teoria já experimentada; preservar botão aceso, Linha, Desfazer e reserva para o motor.',
        visual:
          'Júlio combina corpo e asas de duas referências. Zoom no espelho aceso e na faixa livre inferior. Não exigir cópia do contorno dele.',
        criteria: [
          'Contorno reconhecível de nave com partes que podem receber cor.',
          'Cerca de quatro fileiras livres embaixo para o fogo.',
          'Desfazer permite corrigir sem começar outro desenho.',
        ],
        help: 'Se ocupou a parte inferior, ajuste agora. O fogo da próxima aula precisa caber dentro do quadro.',
        question: [
          'Por que deixamos uma faixa vazia embaixo da nave?',
          'Para desenhar e aumentar o fogo do motor dentro do quadro.',
          'Porque o Pinta não consegue pintar os pixels de baixo.',
          'O espaço é uma decisão do desenho para preparar a animação.',
        ],
      },
      {
        key: 'cor-base',
        title: 'Pinte o corpo, a cabine e os detalhes',
        kind: 'build',
        part: 3,
        focus: 'Escolher uma base média e distinguir balde de lápis.',
        reason:
          'O balde aparece quando existem áreas fechadas; a diferença do espelho é explicada no gesto real.',
        say: 'Desligue Espelho lado a lado. Escolha uma cor média para o corpo e pinte cada área fechada com o Balde. Use outra cor na cabine e o Lápis para um ou dois detalhes pequenos. As suas cores podem ser diferentes das do Júlio.',
        edit: 'Manter clique em cada área e aviso de que o espelho não atua no balde. Corrigir referências a “verde escuro” caso a paleta ativa não tenha esse tom.',
        visual:
          'Mostrar um clique que preenche apenas a região conectada. Se a tinta escapar, mostrar Desfazer e fechamento da abertura do contorno.',
        criteria: [
          'Cor base ocupa a maior parte do corpo.',
          'Cabine distinguível e detalhes pequenos.',
          'Fundo e espaço do motor permanecem transparentes.',
        ],
        help: 'O balde preenche uma região conectada. Se a tinta escapar, desfaça e procure uma abertura no contorno.',
        question: [
          'O Balde pintou só uma das asas. O que isso indica?',
          'A outra asa está em outra região fechada e precisa de seu próprio clique.',
          'O desenho precisa ser apagado e criado novamente.',
          'O balde preenche a região conectada do clique; não repete o preenchimento pelo espelho.',
        ],
      },
      {
        key: 'luz-demo',
        title: 'Observe: a luz dá volume',
        kind: 'observe',
        part: 4,
        to: 'Na nave do Júlio a luz vem da esquerda.',
        focus: 'Visualizar direção da luz e sombra antes de pintar.',
        reason:
          'Comparar a mesma nave chapada e iluminada explica o objetivo antes de acrescentar traços.',
        say: 'Olhe a mesma nave antes e depois. A luz vem deste lado; o outro recebe a sombra. Agora repare na cabine: a cor mais clara continua da família do azul. Poucos pixels já mudam o volume.',
        edit: 'Usar o antes/depois previsto na Parte 4 e complementar com seta da luz e close nas famílias de cor. Não mandar a criança mexer durante a demonstração.',
        visual:
          'Mesma nave, posição e escala em comparação; seta fica fora da arte. Mostrar corpo e cabine separadamente.',
        criteria: ['Sombra do lado oposto à luz.', 'Tom de luz da própria família da cor.'],
        help: 'A seta mostra de onde vem a luz; ela não faz parte da nave.',
      },
      {
        key: 'volume',
        title: 'Dê luz e sombra à sua nave',
        kind: 'build',
        part: 4,
        from: 'Sabendo o lado, é uma regra só:',
        focus: 'Aplicar poucos traços de luz e sombra com uma direção consistente.',
        reason:
          'A regra visual demonstrada vira uma ação na própria nave, com escolhas restritas ao volume.',
        say: 'Escolha um lado para a luz. Com o Lápis, ponha primeiro as sombras, depois as luzes. Use tons da família de cada cor e poucos pixels. Desligue o espelho: luz e sombra não precisam ser iguais dos dois lados.',
        edit: 'Manter ordem sombras → luzes e exceção para detalhes muito pequenos. Não exigir sombra adicional numa cabine já escura. Evitar dizer que toda cor da Arcade tem duas vizinhas da mesma família.',
        visual:
          'Zoom em corpo, cabine e detalhe, com a nave inteira disponível ao lado para conferir proporção. Retirar a seta auxiliar se desenhada dentro da arte.',
        criteria: [
          'Uma direção de luz consistente.',
          'Sombra e luz preservam a família da cor ou usam o tom disponível mais adequado.',
          'Silhueta, cabine e espaço inferior continuam legíveis.',
        ],
        help: 'Se a nave ficou muito escura, desfaça alguns traços. Um detalhe de dois pixels pode receber só luz ou só sombra.',
        question: [
          'A cabine já está azul-escura. Como realçar o lado iluminado?',
          'Acrescentar poucos pixels de um azul mais claro.',
          'Cobrir a cabine inteira com a sombra roxa do corpo.',
          'O tom mais claro preserva a cor da cabine e dá a indicação de luz.',
        ],
      },
      {
        key: 'salvamento',
        title: 'Observe: salvo e guardado na conta',
        kind: 'observe',
        part: 5,
        to: 'os seus desenhos estão lá te esperando.',
        focus: 'Distinguir o salvamento do editor e a confirmação na conta.',
        reason: 'Esta orientação prepara a entrega e a retomada da mesma nave na aula seguinte.',
        say: 'O Pinta salva o desenho enquanto você trabalha. Antes de sair, procure também Guardado na sua conta, na barra acima do editor. Depois use Voltar para encontrar o cartão da nave na galeria.',
        edit: 'Retirar cota numérica e explicações sobre apagar desenhos. Acrescentar o retorno pela setinha, previsto no fim desta Parte. Não mostrar os dois avisos lado a lado.',
        visual:
          'Localização real dos dois avisos, em barras distintas. Voltar à galeria; miniatura estática.',
        criteria: ['Identificar a confirmação na conta e o cartão nave.'],
        help: 'Salvo no editor e sincronizado na conta são confirmações em lugares diferentes.',
      },
    ],
    delivery:
      'Selecione apenas nave na galeria do Pinta e envie o desenho. Não precisa baixar uma imagem nem montar a nave no jogo hoje.',
    rubric: [
      'Personagem pixel art 32 × 32 chamado nave.',
      'Silhueta legível, áreas de cor, direção de luz e espaço inferior transparente.',
      'Não comparar beleza, simetria perfeita, cor ou fidelidade ao modelo como nota.',
      'Orientar uma correção de cada vez quando faltar espaço, houver contorno aberto ou a luz apagar a forma.',
    ],
    corrections: [
      'Preservar uma única aula, como solicitado no roteiro original; a divisão é em seções, não em aulas novas.',
      'A paleta pode não oferecer uma rampa escura/média/clara para toda cor; mostrar os tons realmente disponíveis.',
      'Retirar Celeste como prova de vetor; visual rasterizado não comprova a técnica original.',
      'Referências visuais serão fornecidas na edição, evitando saída para busca livre.',
      'O espelho não atua no balde; não confundir com os comandos de virar o desenho.',
    ],
    quiz: [
      [
        'Você quer mudar apenas um detalhe pequeno na asa. Qual ferramenta cabe melhor?',
        'Lápis.',
        'Balde em todo o fundo.',
        'O Lápis atua pixel a pixel e permite uma alteração pequena.',
      ],
      [
        'Com a luz vindo da direita, onde faz sentido colocar a sombra principal?',
        'Do lado esquerdo, oposto à luz.',
        'Do mesmo lado da luz em todas as partes.',
        'Uma direção consistente ajuda a perceber volume. O lado escolhido pode ser seu.',
      ],
    ],
  },
  3: {
    title: 'O motor da nave ganha movimento',
    tool: 'pinta',
    entry: 'Abrir a mesma nave 32 × 32 da aula 2, ainda com um quadro e espaço para o motor.',
    exit: 'Animação voando com dois quadros, fogo pequeno/grande saindo do mesmo ponto, corpo estável e 8 fps.',
    opening:
      'A sua nave está pronta para ganhar um motor. Vamos desenhar o fogo no primeiro quadro, fazer uma cópia e mudar só um pedacinho no segundo. A nave fica no lugar; o fogo pulsa. Hoje terminamos com dois quadros.',
    closing:
      'Você fez o fogo uma vez, duplicou e mudou a cópia. Essa diferença faz o motor pulsar. O fantasma ajudou a comparar os quadros e o nome voando vai acompanhar sua animação. Na próxima aula desenhamos o asteroide. Agora, duas ideias para conferir.',
    choices:
      'Cor e formato do fogo dentro da faixa reservada; manter exatamente dois quadros, 8 fps e nome voando. Sem convite a quadros adicionais nesta aula.',
    steps: [
      {
        key: 'livrinho',
        title: 'Observe: cada quadro é um desenho',
        kind: 'observe',
        part: 1,
        from: 'Abriu. Agora olha a faixa lá embaixo da tela.',
        to: 'ela é uma folha só.',
        focus: 'Entender quadro de animação como um desenho da sequência.',
        reason: 'A analogia do livrinho antecede a primeira edição na faixa de animação.',
        say: 'Cada quadradinho desta faixa guarda um desenho inteiro. Por enquanto há apenas um. Veja dois desenhos diferentes alternando: parece movimento, mas cada quadro continua sendo uma imagem parada.',
        edit: 'Usar a faixa real do Pinta e um complemento visual do livrinho. Evitar dizer que uma nave de um quadro nunca pode se mover no jogo; aqui estamos falando de animação do desenho.',
        visual:
          'Mostrar quadro 1 e quadro 2 lado a lado, depois alternância breve, com nave fixa. Sem controles.',
        criteria: ['Diferenciar imagem de um quadro e sequência de imagens.'],
        help: 'O movimento da nave pelo jogo e a troca dos desenhos do motor são coisas distintas.',
      },
      {
        key: 'fogo-base',
        title: 'Desenhe o fogo no primeiro quadro',
        kind: 'build',
        part: 1,
        from: 'Antes de fazer o segundo quadro,',
        focus: 'Preparar a base da animação sem ocupar todo o espaço de crescimento.',
        reason: 'Duplicar uma base pronta reduz desenho de memória e preserva alinhamento.',
        say: 'Abra nave na galeria. No primeiro quadro, desenhe um fogo pequeno encostado no motor, deixando espaço para crescer. Use o Lápis e uma ou duas cores. O corpo da nave fica como está.',
        edit: 'Preservar cor, Lápis e miolo como escolha estética. Não explicar cor do fogo como regra física universal.',
        visual:
          'Realce no primeiro quadro e zoom no espaço reservado; deixar pixels transparentes depois da ponta.',
        criteria: [
          'Fogo presente no primeiro quadro.',
          'Ponto de saída fixo e espaço para alongar.',
          'Corpo da nave preservado.',
        ],
        help: 'Se a ponta já encostou na borda inferior, encurte um pouco antes de duplicar.',
        question: [
          'O primeiro fogo já ocupa até a última linha. O que preparar antes da cópia?',
          'Encurtar um pouco para o segundo poder crescer dentro do quadro.',
          'Duplicar muitas vezes para aumentar a tela.',
          'Duplicar cria outro desenho do mesmo tamanho; não aumenta a área disponível.',
        ],
      },
      {
        key: 'diferenca',
        title: 'Experimente: o que faz o fogo pulsar?',
        kind: 'experiment',
        part: 2,
        experiment: 'quadros',
        focus: 'Comparar quadros iguais e quadros com diferença só no fogo.',
        reason: 'Separa o efeito de duplicar do efeito de alterar, antes da própria edição.',
        say: 'Compare uma sequência com dois fogos iguais e outra com fogo pequeno e grande. A velocidade é a mesma nas duas. Registre os resultados e repare no que precisou mudar para o motor pulsar.',
        edit: 'Usa a relação descrita no começo da Parte 2; não exige outra narração em vídeo.',
        visual:
          'Quadros 1 e 2 e prévia no mesmo tamanho. Apenas “iguais” ou “fogo diferente”; sem controle de velocidade ou de posição da nave.',
        criteria: [
          'Mesmo ritmo nas duas situações.',
          'Quadros iguais não mudam a aparência; pequena diferença no fogo gera pulsação.',
        ],
        help: 'Olhe os dois desenhos parados, além da prévia. O corpo é idêntico nas duas situações.',
        question: [
          'Duplicar o quadro já basta para o fogo parecer pulsar?',
          'É preciso mudar o fogo em um dos quadros.',
          'Sim, duas cópias iguais sempre parecem pulsar.',
          'Duplicar preserva a base; a diferença entre os desenhos produz a mudança visível.',
        ],
      },
      {
        key: 'segundo-quadro',
        title: 'Duplique e alongue só a ponta',
        kind: 'build',
        part: 2,
        from: 'Ainda na faixa de baixo,',
        focus: 'Duplicar o quadro e mudar somente o fogo na cópia.',
        reason:
          'É um gesto novo de seleção e movimento; manter sua sequência inteira, inclusive o preenchimento do vão.',
        say: 'Clique em Duplicar quadro e confira o segundo quadradinho aceso. Com Selecionar e mover, pegue só a ponta do fogo e desça um pouco. Volte ao Lápis e preencha o vão que ficou. Veja a prévia, mantendo o corpo parado.',
        edit: 'Seguir a narração atual: Selecionar e mover → completar o vão. A descrição antiga de Na tela fala em apenas acrescentar com Lápis e precisa ser corrigida.',
        visual:
          'Mostrar retângulo selecionando apenas a ponta; mover, confirmar a seleção conforme a ferramenta e completar os pixels de cada cor. Dois quadros no rodapé.',
        criteria: [
          'Exatamente dois quadros.',
          'Segundo fogo mais comprido, sem sair da tela.',
          'Vão preenchido, corpo e início do motor no mesmo lugar.',
        ],
        help: 'Se a nave inteira mexeu, desfaça e selecione só a ponta. Confira o quadro ativo antes de riscar.',
        question: [
          'Mover a ponta deixou um buraco no meio do fogo. Como completar?',
          'Com o Lápis, ligando as duas partes na mesma cor.',
          'Duplicando o quadro novamente.',
          'Mover desloca os pixels; o Lápis preenche o espaço que ficou vazio.',
        ],
      },
      {
        key: 'fantasma',
        title: 'Observe: comparar sem guardar de memória',
        kind: 'observe',
        part: 3,
        focus: 'Usar o fantasma para comparar tamanho e ponto de saída dos fogos.',
        reason:
          'A comparação aparece quando já existem dois quadros; não encenar desalinhamento para justificar a ferramenta.',
        say: 'No segundo quadro, ligue o Fantasma do quadro anterior. A imagem fraquinha mostra o primeiro fogo. Ela é uma guia: não entra na animação. No primeiro quadro não há desenho anterior para mostrar.',
        edit: 'Adaptar “ligue” para o gesto do professor na demonstração. Manter ausência no primeiro quadro e ajuste do tamanho; não dizer que o fantasma é um desenho editável.',
        visual:
          'Professor liga o fantasma no segundo quadro, aponta a base comum e a diferença da ponta; alterna primeiro/segundo para mostrar a ausência no primeiro.',
        criteria: [
          'Fantasma é guia do quadro anterior.',
          'Não acrescenta quadros nem desenhos à exportação.',
        ],
        help: 'Se não apareceu no primeiro, está funcionando como previsto.',
      },
      {
        key: 'nome-voando',
        title: 'Confira a animação e dê um nome',
        kind: 'build',
        part: 4,
        focus: 'Conferir os dois desenhos e renomear para voando.',
        reason:
          'Consolida a animação antes de mudar de ferramenta e preparar a integração da aula 6.',
        say: 'Compare os dois quadros; use o fantasma no segundo se precisar ajustar. Confira a nave no mesmo lugar e o fogo pulsando. Em Renomear animação, troque parado por voando. Mantenha dois quadros e a velocidade de 8 fps.',
        edit: 'Manter renomeação completa e encaixar a conferência final da Parte 3. Retirar convite a criar mais quadros ou mexer na velocidade.',
        visual:
          'Nome voando na faixa e na prévia; corpo estável. Salvar e voltar à galeria, onde a miniatura é parada.',
        criteria: [
          'Nome voando.',
          'Dois quadros, 8 fps, corpo estável.',
          'Fogo cresce e diminui, não some em um quadro.',
        ],
        help: 'O nome da animação é diferente do nome do desenho: desenho nave, animação voando.',
        question: [
          'Qual nome vai aparecer para escolher esta animação no Estúdio?',
          'voando, o nome dado à animação.',
          'O nome da cor que você usou no fogo.',
          'O nome da animação acompanha seus quadros até o Estúdio.',
        ],
      },
    ],
    delivery:
      'Envie a mesma nave da galeria, agora com a animação. Antes, abra a prévia e compare os dois quadros.',
    rubric: [
      'nave: personagem pixel art 32 × 32.',
      'Uma animação voando, dois quadros, 8 fps.',
      'Fogo presente em ambos os quadros com diferença intencional; corpo fixo, sem cortes ou buracos.',
      'Fantasma não foi pintado como parte do desenho.',
    ],
    corrections: [
      'A nave pulsa: o motor não alterna apagado/aceso nesta versão dos roteiros.',
      'Preservar a ordem base → duplicar → mudar a cópia.',
      'Não inventar tremor para motivar o fantasma.',
      'A descrição visual da Parte 2 diverge da fala; seguir a seleção da ponta e o preenchimento do vão.',
      'A prévia se move; a miniatura da galeria é estática.',
    ],
    quiz: [
      [
        'No primeiro quadro, o fantasma não aparece. É defeito?',
        'Não: ainda não existe um quadro anterior.',
        'Sim: é preciso duplicar até aparecer no primeiro.',
        'O fantasma consulta o quadro de índice anterior.',
      ],
      [
        'Você quer pulsação do fogo sem a nave tremer. O que deve manter igual?',
        'O corpo e o ponto de saída do fogo.',
        'A ponta e o tamanho do fogo em todos os quadros.',
        'A diferença fica no fogo; a base comum mantém o corpo estável.',
      ],
    ],
  },
  4: {
    title: 'Desenhe seu asteroide em vetor',
    tool: 'pinta',
    entry: 'A nave está animada na galeria. Vamos criar outro desenho, usando formas e pontos.',
    exit: 'Asteroide vetorial 64 × 64, nome asteroide, com forma fechada, curvas intencionais, crateras e espaço superior para a chama.',
    opening:
      'Hoje o Júlio vai desenhar uma pedra usando pontos e formas. Você vai fazer a sua: escolher a cor, traçar, arredondar e pôr crateras. No final vamos comparar a borda do vetor com a dos pixels que você já conhece.',
    closing:
      'Sua pedra nasceu de pontos, ganhou curvas e crateras. Você também comparou os dois jeitos de desenhar. A nave guarda pixels; a pedra guarda formas que o Pinta redesenha. Na próxima aula vamos pôr a chama no espaço que ficou livre. Agora, duas perguntas.',
    choices:
      'Formato irregular, cerca de cinco a oito pontos como sugestão inicial, curvas escolhidas, cor e duas a quatro crateras como ponto de partida, sem nota por contagem. Fixos: Vetor, Personagem, 64 × 64 e nome asteroide.',
    steps: [
      {
        key: 'novo-vetor',
        title: 'Prepare o quadro do asteroide',
        kind: 'build',
        part: 1,
        focus: 'Criar personagem vetorial de 64 × 64 com o nome asteroide.',
        reason:
          'Médio tem números diferentes nos dois estilos; a diferença precisa aparecer antes do clique.',
        say: 'No Pinta, escolha Criar novo → Vetor → Personagem → Médio, 64 × 64. Escreva asteroide. A nave continua no cartão dela; hoje estamos criando outra arte.',
        edit: 'Manter o assistente inteiro. Corrigir “quadro maior facilita pegar pontos” como conveniência do exemplo, não garantia de zoom maior na tela.',
        visual:
          'Zoom em 64 × 64 antes de escolher Médio. Comparativo curto: nave 32 × 32, asteroide 64 × 64.',
        criteria: ['Vetor, Personagem, 64 × 64.', 'Nome asteroide; nave preservada.'],
        help: 'Não reutilize o tamanho Médio do pixel por memória: leia os números do cartão.',
        question: [
          'Médio sempre significa 32 × 32?',
          'Não; no personagem em vetor desta aula, Médio é 64 × 64.',
          'Sim; o número vale para todos os estilos.',
          'A lista de tamanhos muda com o estilo. Confira largura e altura.',
        ],
      },
      {
        key: 'cores-vetor',
        title: 'Observe: a cor de dentro e a linha de fora',
        kind: 'observe',
        part: 2,
        from: 'A primeira parte é a cor,',
        to: 'deixa uma cor aí no Contorno.',
        focus: 'Distinguir preenchimento, contorno e Sem cor.',
        reason:
          'Dois slots de cor são uma novidade do vetor; a demonstração evita mudanças no slot errado.',
        say: 'O Preenchimento muda o interior; o Contorno muda a linha da borda. Observe a mesma forma com e sem contorno. Sem cor deixa aquela parte transparente, não pinta de branco.',
        edit: 'Usar os slots e exemplo de Sem cor. A janela Nova cor é um caminho opcional mostrado brevemente para escolher a cor; não criar uma tarefa extra de catálogo de cores.',
        visual:
          'Mesma pedra com interior fixo enquanto só a linha muda. Fundo quadriculado continua aparecendo onde não há forma.',
        criteria: ['Identificar interior e borda separadamente.'],
        help: 'Plaquinha cheia é o interior; moldura é a linha em volta.',
      },
      {
        key: 'traco',
        title: 'Marque os pontos e feche a pedra',
        kind: 'build',
        part: 2,
        from: 'A segunda parte é o traço.',
        to: 'com muitos ela sai cheia de bicos pequenininhos.',
        focus: 'Criar forma fechada com Caneta e reservar espaço superior.',
        reason:
          'Separar fechamento e suavização permite perceber que o mesmo contorno muda no passo seguinte.',
        say: 'Escolha o Preenchimento e se quer Contorno. Com Caneta, clique em alguns pontos formando uma pedra irregular. Termine clicando no primeiro ponto. Deixe espaço acima da pedra: a próxima aula usa esse espaço para a chama.',
        edit: 'Preservar clique, sem arrastar, e fechamento no primeiro ponto. Acrescentar reserva visual superior que faltava no original. Não dizer que pedra real nunca tem cantos.',
        visual:
          'Caneta com pontos destacados, primeiro ponto maior e fechamento preenchendo a forma. Referência de pedra ocupando a região inferior/central, com margem para chama.',
        criteria: [
          'Forma fechada, preenchida e com contorno conforme a escolha.',
          'Espaço dentro do quadro acima da pedra para a futura chama.',
        ],
        help: 'Se não fechou, localize o primeiro ponto maior e clique nele. Não confundir Caneta com Pincel.',
        question: [
          'Como fechar a forma com a Caneta?',
          'Clicar no primeiro ponto.',
          'Arrastar a tela para fora da borda.',
          'O clique no início fecha o caminho para formar a pedra.',
        ],
      },
      {
        key: 'curvas',
        title: 'Transforme alguns cantos em curvas',
        kind: 'build',
        part: 2,
        from: 'A terceira parte é o arredondamento.',
        focus: 'Editar os pontos e aplicar Ponto suave na seleção desejada.',
        reason:
          'A criança vê o antes e depois na própria forma, sem precisar de um simulador adicional de curvas.',
        say: 'Com Editar os pontos, selecione os cantos que quer arredondar e use Ponto suave. Pode deixar alguns cantos. Confira se a pedra e o espaço da chama continuam dentro do quadro.',
        edit: 'Manter seleção por retângulo e Ponto suave; remover generalização de que toda pedra deve ser completamente arredondada.',
        visual:
          'Mostrar os pontos selecionados antes do botão. Um canto permanece reto de propósito; destacar o resultado sem explicar alças de Bézier.',
        criteria: [
          'Pelo menos uma curva intencional.',
          'Não perdeu o espaço superior nem cortou a pedra.',
        ],
        help: 'O botão de pontos aparece quando a ferramenta e a seleção corretas estão ativas.',
        question: [
          'Só alguns cantos devem virar curvas. O que selecionar?',
          'Apenas os pontos que quer suavizar.',
          'Todas as formas da galeria.',
          'Ponto suave modifica os pontos selecionados no desenho aberto.',
        ],
      },
      {
        key: 'crateras',
        title: 'Crie uma cratera e aproveite a cópia',
        kind: 'build',
        part: 3,
        focus: 'Desselecionar a pedra, criar uma elipse e duplicar variando tamanho e posição.',
        reason:
          'A troca de cor com a pedra ainda selecionada é um erro real que o gesto inicial evita.',
        say: 'Com Selecionar, clique num lugar vazio para soltar a pedra. Escolha um preenchimento mais escuro, faça um Círculo e achate um pouco. Duplique para fazer outra cratera; mude tamanho e lugar, mantendo as duas dentro da pedra.',
        edit: 'Preservar desseleção antes de trocar cor, círculo, alças e duplicação. Substituir “buraco sempre mais escuro” por escolha de contraste desta ilustração; não exigir quatro crateras.',
        visual:
          'Caixa da pedra some antes de escolher cor. Cópia nasce deslocada e selecionada; reposicionar e comparar tamanhos.',
        criteria: [
          'Crateras distinguíveis do corpo da pedra.',
          'Cópias com posições ou tamanhos diferentes, sem cortar a borda da pedra.',
          'Cor original da pedra preservada.',
        ],
        help: 'Se a pedra inteira mudou de cor, desfaça, solte a seleção e escolha a cor novamente.',
        question: [
          'Você trocou a cor para fazer uma cratera e a pedra inteira mudou. Por quê?',
          'A pedra ainda estava selecionada.',
          'O Pinta só permite uma cor por desenho.',
          'A cor aplica-se à forma selecionada. Solte a seleção antes de preparar outra forma.',
        ],
      },
      {
        key: 'bordas',
        title: 'Experimente: aproxime as duas bordas',
        kind: 'experiment',
        part: 4,
        experiment: 'bordas',
        focus: 'Comparar a mesma silhueta em pixels e em vetor em duas ampliações.',
        reason:
          'Agora a criança já desenhou com os dois estilos. A comparação usa uma silhueta comum para isolar a representação.',
        say: 'Veja a mesma pedra em pixels e em vetor. Compare no tamanho pequeno e ampliado, sem mudar o desenho. Registre os dois. O que acontece com a borda de cada uma?',
        edit: 'Transforma as duas idas à galeria da Parte 4 numa comparação delimitada na aula. O zoom dos desenhos reais permanece como recurso de revisão, não mais uma tarefa obrigatória.',
        visual:
          'Mesma forma e mesma escala dos dois lados; primeiro 1×, depois 8×. Identificar pixels por degraus, não por uma imagem deliberadamente embaçada.',
        criteria: [
          'Pixels ficam evidentes na ampliação; curva é redesenhada no exemplo vetorial.',
          'Não concluir que um estilo é melhor que o outro.',
        ],
        help: 'Compare a borda, não a cor. A tela física também usa pixels; a diferença é como o desenho é representado.',
        question: [
          'No exemplo ampliado, por que o vetor preserva a curva?',
          'A forma é redesenhada a partir dos pontos e curvas.',
          'Porque o Pinta adiciona mais quadros de animação.',
          'A representação vetorial permite redesenhar a curva. Uma imagem exportada em pixels depois tem a resolução com que foi exportada.',
        ],
      },
    ],
    delivery:
      'Envie asteroide pela galeria do Pinta. Hoje ele pode continuar com a animação parado e um quadro; o movimento vem na aula 5.',
    rubric: [
      'Personagem vetor 64 × 64 chamado asteroide.',
      'Forma fechada, curva intencional, crateras e espaço para a chama acima.',
      'Cores, contorno e número de crateras são escolhas; avaliar legibilidade e uso das ferramentas.',
      'Nave da aula 3 continua na galeria, sem alterações.',
    ],
    corrections: [
      'Acrescentar espaço superior para o fogo da aula 5: formas fora do quadro são cortadas na exportação.',
      'Caneta usa clique para marcar pontos; Pincel não substitui esse gesto.',
      'Soltar a seleção antes de escolher a cor de outra forma.',
      'O vetor pode ser redesenhado em outra escala no editor; o jogo recebe a folha rasterizada. Não prometer ampliação infinita do PNG no Estúdio.',
      'Retirar perguntas abertas de próximos projetos durante a tarefa atual.',
    ],
    quiz: [
      [
        'Sem cor no Contorno faz o quê?',
        'Retira a linha de fora e conserva o preenchimento.',
        'Apaga todas as formas do desenho.',
        'Preenchimento e contorno são propriedades separadas.',
      ],
      [
        'Você copiou uma cratera para outra região. Precisa ficar idêntica à primeira?',
        'Não; pode variar tamanho e posição para compor a pedra.',
        'Sim; copiar impede qualquer mudança na nova forma.',
        'A cópia é outra forma selecionável e editável.',
      ],
    ],
  },
}
