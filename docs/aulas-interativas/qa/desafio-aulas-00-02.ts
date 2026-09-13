import { finalChecks, checks as k } from './desafio-checks'
import type { Recipe, Step } from './desafio-editorial'

export const step = (
  key: string,
  title: string,
  source: string,
  kind: Step['kind'],
  focus: string,
  say: string,
  extra: Partial<Step> = {},
): Step => ({
  key,
  title,
  source,
  kind,
  focus,
  say,
  reason:
    'Introduzir esta relação no momento em que ela será usada, antes de acrescentar outra tarefa.',
  edit: 'Recortar apenas o gesto desta seção. Retirar a contagem antiga de passos e as chamadas para a parte seguinte. A fala revisada orienta a substituição; evitar repetir as duas explicações.',
  visual:
    'Mostrar o bloco, sua categoria e o encaixe completo, com uma pausa para enxergar o resultado.',
  help: 'Reveja o encaixe destacado e compare o nome do bloco com a orientação. Corrija no mesmo projeto.',
  ...extra,
})
export const earlyRecipes: Record<number, Recipe> = {
  0: {
    title: 'Bem-vindo: encontre sua aula e saiba continuar',
    entry:
      'Conhecer o caminho até o primeiro jogo e aprender a usar as seções, o salvamento e a ajuda.',
    exit: 'Saber encontrar o Dia 1, acompanhar uma seção e pedir ajuda com uma descrição útil.',
    minutes: '6–9 minutos',
    opening:
      'Oi! Aqui você vai criar o seu primeiro jogo de nave. Hoje eu vou te mostrar como acompanhar a aula, onde encontrar os materiais e como pedir ajuda. Depois a gente começa a construção no Dia 1.',
    closing:
      'Agora você já sabe por onde começar. Avise seu responsável sobre o Mapa dos Pais e responda às duas perguntas. O Dia 1 te espera para colocar a nave no espaço!',
    steps: [
      step(
        'percurso',
        'Uma seção de cada vez',
        'O que conta pra completar',
        'observe',
        'Distinguir assistir, observar, experimentar e fazer no Estúdio.',
        'Cada seção tem uma tarefa. Em algumas você assiste; em outras, observa um exemplo ou faz uma comparação curta. Quando aparecer o Estúdio, é sua vez de montar. Confira o que falta, envie a construção quando a aula pedir e responda ao quiz.',
        {
          edit: 'Usar a ideia de acompanhar e entregar; substituir a imagem antiga de vídeo em cima e Estúdio embaixo pela página atual por seções. Regravar as instruções de navegação.',
          visual:
            'Percorrer uma seção de vídeo, uma demonstração sem controles, uma comparação encerrada e uma construção. Mostrar Índice da aula, Anterior e o avanço que só libera depois do objetivo.',
          help: 'O índice permite rever seções disponíveis; a lista O que falta para concluir indica a tarefa pendente.',
        },
      ),
      step(
        'tela',
        'Veja o exemplo e monte com conforto',
        'Três jeitos de fazer',
        'observe',
        'Usar a disposição atual da aula no tamanho de tela disponível.',
        'Na tela grande, o exemplo e o Estúdio aparecem lado a lado. Você pode ajustar a divisória. Na tela pequena, use Ver exemplo e Criar. É o mesmo projeto. Para enxergar mais do Estúdio, use Expandir; depois volte à aula.',
        {
          edit: 'Substituir os antigos três modos e a orientação de abrir a mesma aula em duas telas. O vídeo de 4min34s documenta uma interface anterior; reaproveitar apenas gestos ainda presentes e regravar esta parte curta.',
          visual:
            'Gravação atual: divisória na tela larga, alternância Ver exemplo/Criar na compacta e Expandir/Reduzir do Estúdio. Não mostrar seleção de ferramentas extras.',
          help: 'Em uma tela pequena, volte a Ver exemplo para rever o gesto e retorne a Criar para continuar.',
        },
      ),
      step(
        'materiais',
        'Seu caderno e o caminho da ajuda',
        'Os seus materiais',
        'observe',
        'Localizar os materiais e reconhecer como pedir ajuda sem sair do foco.',
        'No curso, encontre o Caderno do Aluno. Ele ajuda a conferir os bloquinhos. O Mapa dos Pais é para o seu responsável. Se uma coisa não funcionar, use Preciso de ajuda e conte o que você fez e o que apareceu. Assim eu consigo te ajudar naquele ponto.',
        {
          edit: 'Reaproveitar a apresentação dos dois materiais. Não fixar posições “próximas duas aulas” sem conferir a ordem publicada. Acrescentar a ajuda contextual atual.',
          visual:
            'Localizar os materiais pelo título no curso. Na aula, apontar Preciso de ajuda; usar exemplo visual de mensagem, sem enviar uma dúvida fictícia.',
          help: 'Uma mensagem útil: “Coloquei Criar nave em Ao iniciar, mas ela ainda não apareceu”.',
        },
      ),
      step(
        'salvar',
        'Salvar e enviar são coisas diferentes',
        'O estúdio salva sozinho',
        'observe',
        'Esperar o salvamento antes de sair e distinguir rascunho de entrega.',
        'O Estúdio guarda seu rascunho enquanto você monta. Antes de sair, espere o aviso de salvo. Esse rascunho fica neste navegador; para o professor receber sua construção, use Enviar para o professor na entrega. Nos próximos dias, a aula continua a partir do projeto enviado.',
        {
          edit: 'Reaproveitar a etiqueta de salvamento. Cortar “pode criar sem medo nenhum” e a garantia absoluta após queda de energia. Complementar a diferença entre rascunho local e entrega.',
          visual:
            'Mostrar mudança, estado salvando, confirmação de salvo e botão de entrega em uma aula de exemplo. Não fazer uma entrega nesta introdução.',
          help: 'Se ainda estiver salvando, aguarde. Enviar ao professor não é necessário para cada bloquinho.',
        },
      ),
    ],
    test: 'Introdução sem projeto obrigatório. O professor confirma no quiz a distinção entre guardar e enviar e a utilidade de descrever o problema.',
    finalChecks: [],
    corrections: [
      'O arquivo introdutório avisa que o parágrafo Carreira de Criador foi acrescentado depois da gravação. Ele não pode ser marcado como áudio reaproveitado.',
      'Avatar, quarto, moedas e XP continuam disponíveis na plataforma, mas a introdução não exige personalização, missões, compra ou perfil público para chegar ao Dia 1.',
      'Guardar os trechos do tour pessoal para um material opcional de ambientação, fora do percurso obrigatório deste curso. A visibilidade do perfil permanece uma decisão do responsável.',
      'Não prometer desbloqueios, posições no ranking ou moedas por ações sem conferir as regras atuais. Esta aula ensina a navegar e construir.',
      'O YAML da aula 0 e as capturas antigas são referências de produção. A interface atual por seções deve ser gravada novamente; não usar imagens antigas como demonstração da página atual.',
    ],
    omitted: {
      'ATENÇÃO: este roteiro está À FRENTE do vídeo publicado':
        'Alerta editorial preservado: a fala adicional de Carreira não está no vídeo publicado.',
      'O seu avatar': 'Reservar para ambientação opcional; sem personalizar para liberar o curso.',
      'O seu quarto (e como deixar todo mundo ver)':
        'Reservar para ambientação opcional. Não orientar a criança a tornar o perfil público como tarefa.',
      'Moedas e missões':
        'Reservar para ambientação opcional; não interromper a preparação para criar o jogo.',
      'XP, ranking e a sua Carreira de Criador':
        'Reservar para ambientação opcional. A fala de Carreira depende de gravação nova, conforme aviso da fonte.',
      'Modo normal':
        'Substituído pela demonstração da página atual; montagem antiga não corresponde às seções.',
      'Modo criação guiada':
        'Substituído por divisória larga e Ver exemplo/Criar na tela compacta.',
      'Modo tela cheia':
        'Aproveitar somente Expandir/Reduzir, se o gesto ainda corresponder. Retirar duas instâncias da mesma aula editando o projeto.',
    },
    quiz: [
      [
        'Você quer fechar a aula e continuar depois. O que faz?',
        'Espera o aviso de salvo e retoma o rascunho no mesmo navegador.',
        'Envia uma construção incompleta toda vez que encaixa um bloco.',
        'Salvar conserva o rascunho; a entrega envia o trabalho solicitado ao professor.',
      ],
      [
        'A nave não apareceu. Qual pedido ajuda mais?',
        '“Criei a nave em Ao iniciar, mas ela não aparece na tela.”',
        '“Não deu”, sem contar o que tentou.',
        'Descrever a ação e o resultado ajuda o professor a localizar a dificuldade.',
      ],
    ],
  },
  1: {
    title: 'A nave ganha vida',
    entry: 'Começar um projeto vazio com a extensão Jogo 2D já preparada pelo professor.',
    exit: 'Tela 800 × 480, nave visível e controlada pelas setas, sem sair das bordas.',
    minutes: '20–30 minutos',
    opening:
      'Oi! Hoje sua nave vai aparecer num espaço cheio de estrelas e obedecer às setas. Vamos preparar o jogo, descobrir onde a nave fica e montar um pedacinho de cada vez.',
    closing:
      'Sua nave apareceu e já responde a você. Criar preparou o objeto; o motor passou a desenhar e mover. No Dia 2, ela vai aprender a atirar. Agora vamos guardar duas ideias de hoje.',
    steps: [
      step(
        'areas',
        'Monte os dois lugares do jogo',
        'Parte 1.',
        'build',
        'Separar a preparação da repetição.',
        'Em Áreas do projeto, coloque Ao iniciar e Enquanto estiver rodando. Deixe um espaço entre eles. O primeiro prepara as coisas; o segundo vai guardar o motor que trabalha enquanto o jogo está ligado.',
        { checks: k.areas },
      ),
      step(
        'tela',
        'Prepare o espaço da nave',
        'Parte 2.',
        'build',
        'Preparar largura e altura do jogo uma vez.',
        'Em Jogo 2D, Aparência, encaixe Preparar o jogo em tela cheia dentro de Ao iniciar. Deixe largura 800 e altura 480. Escolha um fundo escuro para enxergar a nave e as estrelas.',
        { checks: k.tela },
      ),
      step(
        'endereco',
        'Observe o endereço na tela',
        'Parte 3.',
        'observe',
        'Reconhecer x horizontal, y vertical e a origem no alto à esquerda.',
        'O x cresce para a direita. O y cresce para baixo. A marca mostra o canto de cima à esquerda da caixa da nave. Com x 400, esse canto fica no meio da tela; o centro da nave fica um pouquinho à direita.',
        {
          from: 'Esse bloco tem uns números',
          to: 'que é um tamanho bom para desviar de asteroide.',
          edit: 'Reaproveitar a analogia de endereço e a explicação de largura/altura. Substituir a afirmação de que x 400 centraliza exatamente a nave. Acrescentar origem e sentido dos eixos.',
          visual:
            'Tela 800 × 480 com caixa 54 × 62: x de 200 para 400 com y fixo; depois y de 110 para 410 com x fixo. Marcar o canto em (400,410) e o centro x em 427, sem transformar essa conta em tarefa.',
          help: 'Veja qual direção muda enquanto o outro número fica parado.',
        },
      ),
      step(
        'coordenadas',
        'Compare duas alturas',
        'Parte 3.',
        'experiment',
        'Descobrir o efeito de aumentar somente y.',
        'O x vai ficar em 400. Mostre a nave em y 110 e depois em y 410. Compare a altura e responda: quando o y aumenta, a nave vai para qual lado?',
        {
          experiment: 'coordenadas',
          question: [
            'O y foi de 110 para 410, com o mesmo x. A nave foi…',
            'Mais para baixo.',
            'Mais para a direita.',
            'Mudar y altera a posição vertical. Na tela, os valores crescem para baixo.',
          ],
          reason:
            'Depois de ver os dois eixos, variar apenas um reduz a carga e revela a direção do y.',
          visual:
            'Caixa da nave na tela completa, marca no canto e eixo vertical. Duas posições prontas; sem arrastar livremente.',
          help: 'Compare a distância até o alto da tela; o x ficou igual.',
        },
      ),
      step(
        'nave',
        'Crie sua nave',
        'Parte 3.',
        'build',
        'Criar o sprite uma vez com posição e tamanho definidos.',
        'Em Jogo 2D, Kit espaço, encaixe Criar nave abaixo de Preparar o jogo, em Ao iniciar. Use nome nave, x 400, y 410, largura 54 e altura 62. Você escolhe as cores do corpo e das asas. Ela ainda não aparece: falta desenhar.',
        {
          checks: k.nave,
          edit: 'Reaproveitar o gesto de criar e configurar. Encurtar os eixos, já vistos na comparação. Manter a surpresa de ainda não aparecer, sem dizer que houve erro.',
        },
      ),
      step(
        'criar-desenhar',
        'Criar não é desenhar',
        'Parte 4.',
        'observe',
        'Distinguir o objeto preparado do desenho repetido.',
        'Olha: o jogo já guarda uma nave. Quando mando desenhar, ela aparece. No próximo quadro, limpo a imagem antiga e desenho essa mesma nave outra vez. É como virar as páginas de um livrinho: as imagens mudam, e a gente vê movimento.',
        {
          to: 'é isso que faz tudo parecer que se mexe.',
          edit: 'Aproveitar a analogia do livrinho. Acrescentar a nave na memória e o desenho na tela em dois quadros. Não pedir montagem durante o clipe.',
          visual:
            'Quadro dividido: cartão “nave criada: 1” permanece; tela muda de vazia para nave desenhada. Em seguida três quadros numerados, com uma só nave na memória.',
          help: 'O número de naves criadas permanece 1, mesmo quando aparecem vários quadros.',
        },
      ),
      step(
        'quadro',
        'Ligue o motor de quadros',
        'Parte 4.',
        'build',
        'Encaixar o motor na área de repetição.',
        'Em Jogo 2D, Tempo e repetição, pegue A cada quadro do jogo e encaixe em Enquanto estiver rodando. O espaço de dentro recebe o que o jogo faz de novo a cada quadro.',
        { from: 'E tem um bloco que faz exatamente isso.', checks: k.quadro },
      ),
      step(
        'limpeza',
        'O que acontece sem a borracha?',
        'Parte 5.',
        'experiment',
        'Relacionar a limpeza com a remoção dos desenhos anteriores.',
        'Passe três quadros sem limpar. Depois passe os mesmos três quadros limpando antes de desenhar. Observe quantos desenhos ficam. É sempre uma só nave; você está comparando as imagens que ela deixa.',
        {
          experiment: 'limpeza',
          question: [
            'Qual sequência evita deixar os desenhos antigos na tela?',
            'Limpar e depois desenhar a nave em cada quadro.',
            'Criar uma nave nova em cada quadro.',
            'A limpeza apaga a imagem anterior; não apaga o objeto guardado no jogo.',
          ],
          visual:
            'Três posições idênticas nos dois ensaios, com desenhos anteriores esmaecidos apenas no caso sem limpeza.',
          help: 'Conte os desenhos que sobraram depois do terceiro quadro.',
        },
      ),
      step(
        'fundo',
        'Desenhe o espaço',
        'Parte 5.',
        'build',
        'Limpar antes de pintar o fundo em cada quadro.',
        'Dentro de A cada quadro do jogo, encaixe Limpar a tela, em Jogo 2D, Aparência. Abaixo, encaixe Desenhar fundo de estrelas, em Kit espaço, com velocidade 1. A borracha vem antes do novo desenho.',
        { from: 'O primeiro apaga', to: 'bem suave.', checks: k.fundo },
      ),
      step(
        'mover',
        'Dê as setas e uma borda à nave',
        'Parte 5.',
        'build',
        'Mover horizontalmente sem sair da tela.',
        'Em Jogo 2D, Movimento, coloque Mover o sprite nave com as setas, velocidade 7, abaixo das estrelas. Depois coloque Manter o sprite dentro da tela e escolha nave. Se aparecer um alerta de nome, leia e troque para o sprite que você criou.',
        {
          from: 'O terceiro é o que dá vida',
          to: 'ele te mostra certinho o que arrumar.',
          checks: k.mover,
          help: 'Os dois blocos devem apontar para nave. Não crie um sprite chamado heroi só para o alerta sumir.',
        },
      ),
      step(
        'desenhar',
        'Faça a nave aparecer por último',
        'Parte 5.',
        'build',
        'Desenhar a nave depois do fundo e de atualizar a posição.',
        'Em Jogo 2D, Sprites, coloque Desenhar o sprite por último e escolha nave. Confira: limpar, estrelas, mover, manter dentro da tela, desenhar nave. Agora clique no jogo e use as setas para os dois lados.',
        {
          from: 'E o quinto é o que finalmente',
          checks: k.desenhar,
          edit: 'Manter o gesto e a ordem. Substituir “as estrelas iam tampar ela” por “o que é desenhado depois pode cobrir o que veio antes”; não afirmar cobertura total por pontos de estrelas.',
        },
      ),
      step(
        'teste',
        'Observe como conferir uma mudança',
        'Parte 6.',
        'observe',
        'Aprender a confirmar uma edição e testar com o foco no jogo.',
        'Depois de digitar um valor, confirme saindo do campo. Para testar as setas, clique na área do jogo. Nesta aula, deixe a velocidade em 7. Verifique se a nave vai para os dois lados e para na borda.',
        {
          to: 'Ela obedece você!',
          edit: 'Selecionar o primeiro teste; mostrar confirmar campo e focar jogo em gravação atual. Retirar convite a 12 e exploração livre. Não provocar um suposto bug de confirmação sem reproduzi-lo na interface atual.',
          visual:
            'Campo confirmado; clique no jogo; setas esquerda e direita; nave contida nas duas bordas.',
          help: 'Se a seta rolar a página, clique primeiro na área do jogo.',
        },
      ),
    ],
    test: 'Clique no jogo e teste esquerda e direita até as duas bordas. Confira que a nave aparece por cima do espaço e não deixa rastros. Deixe velocidade 7 e estrelas 1. Espere salvar e envie ao professor. As cores são suas; não há outra tarefa depois desta.',
    finalChecks: finalChecks(1),
    corrections: [
      'Preservar x 400 e y 410 para reaproveitar a gravação, explicando que são o canto da caixa. O centro horizontal seria 427 com largura 54.',
      'A maior fragmentação acontece aqui porque a criança está conhecendo o Estúdio; nos dias seguintes, padrões conhecidos ficam juntos.',
      'A escolha de cores permanece focada na nave e no fundo. Não solicitar testes de velocidade livre nem números extras para concluir.',
      'Demonstrações usam vídeo com pausa; as duas comparações usam HTML isolado, sem copiar automaticamente valores para o projeto.',
    ],
    quiz: [
      [
        'A nave foi criada, mas não aparece. Qual ação está faltando?',
        'Desenhar o sprite nave no motor de quadros.',
        'Criar várias naves iguais.',
        'O objeto pode estar preparado sem ter sido desenhado.',
      ],
      [
        'Onde preparar a tela e criar a nave?',
        'Em Ao iniciar.',
        'Dentro de cada quadro, repetindo a criação.',
        'A preparação ocorre uma vez; o motor atualiza e desenha depois.',
      ],
    ],
  },
  2: {
    title: 'O tiro nasce na nave e sobe',
    entry: 'Retomar a entrega do Dia 1, com nave, estrelas e setas funcionando.',
    exit: 'Tiros saem da posição atual da nave, sobem com som e são retirados ao sair da tela.',
    minutes: '16–24 minutos',
    opening:
      'Sua nave já voa. Hoje você vai apertar espaço e ver um tiro sair dela, mesmo quando estiver em outro lugar da tela. Vamos ensinar o jogo a criar, mover e mostrar esses tiros.',
    closing:
      'Agora cada disparo nasce na sua nave. O evento cria; o motor move, faz a limpeza e desenha o grupo. No Dia 3, chegam os asteroides para você acertar.',
    steps: [
      step(
        'grupo-tiros',
        'Prepare o grupo dos tiros',
        'Parte 1.',
        'build',
        'Usar um grupo para cuidar de vários tiros.',
        'Em Jogo 2D, Muitos, coloque Criar grupo de sprites no final de Ao iniciar. Troque o nome para tiros. O grupo começa vazio; cada disparo vai colocar um tiro nele.',
        { checks: k.grupoTiros },
      ),
      step(
        'espaco',
        'Escute a barra de espaço',
        'Parte 2.',
        'build',
        'Criar uma resposta a uma tecla específica.',
        'Em Áreas do projeto, coloque Quando acontecer. Dentro, encaixe Quando apertar a tecla, de Jogo 2D, Controles, e escolha barra de espaço. Esse é o evento que vai responder ao disparo.',
        { checks: k.espaco },
      ),
      step(
        'origem',
        'Observe de onde o tiro sai',
        'Parte 3.',
        'observe',
        'Distinguir número fixo de leitura da posição atual.',
        'Veja a nave primeiro à esquerda e depois à direita. Se eu guardar um x fixo para o tiro, ele nasce no mesmo lugar. Se eu ler o centro x da nave na hora do disparo, ele acompanha a nave. A posição y diz a altura de onde ele sai.',
        {
          from: 'Agora vamos dizer onde o tiro nasce.',
          to: 'bem na pontinha dela.',
          edit: 'Reaproveitar a explicação de ler a nave e acrescentar duas posições. Trocar a promessa de sair exatamente da pontinha visual por “alinhado com o centro e na altura de cima da caixa”.',
          visual:
            'Dois disparos com nave em posições diferentes. Mostrar marcador centro x e topo y da caixa. A posição é consultada em cada evento, sem atualizar tiros já disparados.',
          help: 'O tiro novo acompanha a origem da nave; o que já saiu segue seu próprio caminho.',
        },
      ),
      step(
        'criar-tiro',
        'Encaixe o endereço da nave no tiro',
        'Parte 3.',
        'build',
        'Ler centro x e posição y ao criar o tiro.',
        'Dentro do evento de espaço, encaixe Criar tiro no grupo, de Jogo 2D, Muitos, e escolha tiros. Em Posição e tamanho, pegue o centro x do sprite e a posição y do sprite. Encaixe no x e no y do tiro e escolha nave nos dois. Raio 5; escolha uma cor visível.',
        { checks: k.origemTiro },
      ),
      step(
        'direcao',
        'Compare o sinal da velocidade',
        'Parte 4.',
        'experiment',
        'Descobrir o que o sinal de vy muda.',
        'Os dois tiros começam no mesmo lugar. Compare vy menos 9 e vy mais 9. Avance os passos e observe o número y e a direção. Só o sinal mudou; o vx continua zero.',
        {
          experiment: 'direcao',
          question: [
            'Qual vy faz o tiro subir?',
            'vy = −9.',
            'vy = +9.',
            'Subir diminui o y. A velocidade negativa produz essa diminuição.',
          ],
          visual:
            'Dois percursos verticais, origem marcada e leituras de y; sequência manual ampliada de 10 quadros por passo.',
          help: 'O topo da tela tem valores menores de y. Veja em qual teste o y diminui.',
        },
      ),
      step(
        'velocidade-som',
        'Configure o disparo e seu som',
        'Parte 4.',
        'build',
        'Criar velocidade vertical e som no evento.',
        'No Criar tiro, deixe vx 0 e vy menos 9. Em Jogo 2D, Kit espaço, pegue Tocar som de tiro e coloque logo abaixo, dentro do evento. Assim o som acontece quando você dispara, e não a cada quadro.',
        { checks: k.disparo },
      ),
      step(
        'ciclo-tiros',
        'Mova, retire e desenhe os tiros',
        'Parte 5.',
        'build',
        'Aplicar um mesmo ciclo ao grupo inteiro.',
        'No motor, abaixo de Desenhar nave, coloque três blocos de Jogo 2D, Muitos: Atualizar o grupo, Tirar do grupo quem sair da tela e Desenhar o grupo. Escolha tiros nos três. O fazer da limpeza fica vazio hoje.',
        {
          checks: k.cicloTiros,
          reason:
            'Os três comandos formam um único padrão: mover, retirar, desenhar. Reunir evita três conferências pequenas sem uma observação nova.',
          help: 'Se houver tiros no grupo mas nada aparecer, confira Desenhar o grupo. Se ficarem parados, confira Atualizar.',
        },
      ),
      step(
        'testar',
        'Observe o teste de dois disparos',
        'Parte 6.',
        'observe',
        'Conferir a origem do tiro em duas posições.',
        'Clique no jogo. Vá para a esquerda e atire. Depois vá para a direita e atire de novo. Os dois tiros nascem na nave e sobem. Deixe vy menos 9 para a próxima aula.',
        {
          to: 'é de lá que o tiro sai.',
          edit: 'Usar o primeiro teste de posições. Retirar alterações para −15 e convites de brincar com valores.',
          visual:
            'A mesma nave em dois pontos da tela; um disparo por posição; observar a saída por cima.',
          help: 'O evento precisa apontar para Espaço; o grupo dos três comandos precisa ser tiros.',
        },
      ),
    ],
    test: 'No seu projeto, faça um disparo à esquerda e outro à direita. Confira origem, subida, som e desaparecimento dos tiros fora da tela. Mantenha raio 5, vx 0 e vy −9. Envie a construção; ela será o começo do Dia 3.',
    finalChecks: finalChecks(2),
    corrections: [
      'A posição y do sprite é o topo da caixa. Não prometer coincidência exata com a ponta da arte do kit.',
      'Criar tiros usa a posição atual da nave a cada evento. Isso não faz um tiro já criado perseguir a nave.',
      'O som é testado após uma interação do jogador; a qualidade e audibilidade continuam na revisão do professor.',
      'Não transformar a comparação de sinal em menu livre de velocidade, cor e quantidade. A cor pode ser escolhida durante a construção.',
    ],
    quiz: [
      [
        'A nave mudou de lugar. O que mantém o tiro novo alinhado com ela?',
        'Ler o centro x da nave na hora do disparo.',
        'Usar sempre o número 400 no x do tiro.',
        'Ler o sprite acompanha sua posição atual; um número fixo continua igual.',
      ],
      [
        'O tiro saiu por cima. Por que retirá-lo do grupo?',
        'Para não continuar atualizando um objeto que já foi embora.',
        'Para apagar a nave também.',
        'A limpeza cuida dos tiros que saíram, sem apagar a nave nem os tiros que ainda estão visíveis.',
      ],
    ],
  },
}
