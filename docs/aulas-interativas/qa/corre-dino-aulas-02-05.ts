import { absent, c, frame, inLoop, p, type Recipe, timer } from './corre-dino-editorial'

const draw = c('desenhar', 'Desenhe o sprite dino dentro de A cada quadro.', 'sz_g2d_draw_sprite', {
  ...inLoop,
  fields: { SPRITE: 'dino' },
})
const clear = c('limpar', 'Limpe a tela antes de desenhar o Dino.', 'sz_g2d_clear', {
  ...inLoop,
  beforeBlock: 'sz_g2d_draw_sprite',
})
const clearBeforeForest = c(
  'limpar-primeiro',
  'Limpe a tela antes de desenhar a floresta.',
  'sz_g2d_clear',
  { ...inLoop, beforeBlock: 'sz_g2d_forest' },
)
const forest = c(
  'floresta',
  'Desenhe a floresta com velocidade 5 antes do Dino.',
  'sz_g2d_forest',
  { ...inLoop, inputs: { SPEED: 5 }, beforeBlock: 'sz_g2d_draw_sprite' },
)
const noBorder = absent('sem-borda', 'Retire a borda provisória da tela.', 'sz_g2d_stage_border')
const dino = c(
  'preservar-dino',
  'Mantenha o dinossauro criado em Ao iniciar.',
  'sz_g2d_create_dino',
  { area: 'start', fields: { NAME: 'dino' } },
)
const description = c(
  'preservar-descricao',
  'Mantenha a descrição do jogo em Ao iniciar.',
  'sz_g2d_set_stage_description',
  { area: 'start' },
)
const gravity = c(
  'gravidade',
  'Aplique gravidade ao dino antes do controle do pulo.',
  'sz_g2d_apply_gravity',
  { ...inLoop, fields: { SPRITE: 'dino' }, beforeBlock: 'sz_g2d_control_dino' },
)
const jump = (force: number) =>
  c('controle', `Controle o dino com força ${force}, antes de desenhá-lo.`, 'sz_g2d_control_dino', {
    ...inLoop,
    fields: { SPRITE: 'dino' },
    inputs: { JUMP: force },
    beforeBlock: 'sz_g2d_draw_sprite',
  })
const sound = c(
  'som-pulo',
  'Coloque Som de pulo dentro de Quando o dino pular.',
  'sz_g2d_on_jump',
  { area: 'events', fields: { SPRITE: 'dino' }, inputBlocks: { BODY: p('sz_g2d_play_jump') } },
)
const oneSound = c('som-unico', 'Mantenha apenas um bloco Som de pulo ativo.', 'sz_g2d_play_jump', {
  count: 1,
})
const noKey = absent('sem-evento-tecla', 'Retire o evento provisório de tecla.', 'sz_g2d_on_key')
const group = c('grupo', 'Crie o grupo cactos em Ao iniciar.', 'sz_g2d_create_group', {
  area: 'start',
  fields: { NAME: 'cactos' },
})
const update = c(
  'mover-grupo',
  'Atualize o grupo cactos a cada quadro, antes de desenhá-lo.',
  'sz_g2d_update_group',
  { ...inLoop, fields: { GROUP: 'cactos' }, beforeBlock: 'sz_g2d_draw_group' },
)
const drawGroup = c(
  'desenhar-grupo',
  'Desenhe o grupo cactos a cada quadro.',
  'sz_g2d_draw_group',
  { ...inLoop, fields: { GROUP: 'cactos' } },
)
const spawn = (x: number) =>
  p('sz_g2d_spawn_obstacle', {
    fields: { GROUP: 'cactos', SHAPE: 'cactus' },
    inputs: { X: x, VX: -5, SIZE: 44 },
  })
const spawnTimer = (x: number) =>
  c('relogio', `Crie um cacto em x ${x}, tamanho 44 e velocidade -5 a cada 1,4 s.`, timer, {
    area: 'loops',
    inputs: { SECS: 1.4 },
    inputBlocks: { BODY: spawn(x) },
  })
const singleSpawn = c(
  'criar-uma-vez',
  'Mantenha apenas um bloco de criação de cacto.',
  'sz_g2d_spawn_obstacle',
  { count: 1 },
)

export const earlyRecipes: Record<number, Recipe> = {
  2: {
    title: 'O Dino aparece: quadros, limpeza e camadas',
    entry:
      'Seu Dino foi criado e ainda está invisível. Hoje vamos desenhá-lo e pôr a floresta atrás dele.',
    exit: 'O Dino corre no lugar diante da floresta. A descrição e a criação permanecem; a borda provisória saiu.',
    steps: [
      {
        key: 'quadros',
        title: 'Veja como desenhos viram movimento',
        kind: 'observe',
        part: 1,
        from: 'Você já viu um daqueles livrinhos de folhear',
        to: 'E quem faz essa ilusão é você.',
        focus: 'Distinguir um quadro da repetição de quadros.',
        reason: 'A criança precisa visualizar repetição antes de receber a área nova.',
        say: 'Veja três desenhos das pernas, primeiro separados e depois em sequência. Cada desenho é um quadro.',
        visual:
          'Cartela com três poses do Dino, contador de quadros e reprodução curta. Mostrar um quadro por vez, sem controles de velocidade. Com movimento reduzido, trocar por cartões numerados.',
        edit: 'Usar a analogia do caderno; não repetir a montagem que vem na próxima seção.',
      },
      {
        key: 'motor',
        title: 'Monte o motor do jogo',
        kind: 'build',
        part: 1,
        from: 'Pra fazer isso, o seu jogo precisa de uma área nova.',
        focus: 'Separar preparação de repetição.',
        reason: 'Uma área nova e um único bloco vazio formam uma primeira montagem pequena.',
        say: 'Ao lado de Ao iniciar, coloque a área Enquanto estiver rodando. Dentro dela, encaixe A cada quadro do jogo.',
        edit: 'Preservar o gesto de colocar as áreas lado a lado e o contêiner ainda vazio.',
        checks: [
          c('motor', 'Encaixe A cada quadro dentro de Enquanto estiver rodando.', frame, {
            area: 'loops',
          }),
        ],
      },
      {
        key: 'primeiro-desenho',
        title: 'Faça o Dino aparecer',
        kind: 'build',
        part: 2,
        to: 'e agora o jogo está desenhando ele a cada quadro.',
        focus: 'Conectar o desenho ao personagem criado.',
        reason: 'Entregar logo o primeiro resultado visível, antes de discutir defeitos.',
        say: 'Dentro de A cada quadro, coloque Desenhar o sprite. Selecione dino e veja-o aparecer.',
        edit: 'Manter o aparecimento. Na trilha revisada usamos dino como identificador; retirar o parágrafo sobre nomes diferentes.',
        checks: [draw],
      },
      {
        key: 'limpeza',
        title: 'Limpe antes de desenhar',
        kind: 'build',
        part: 2,
        from: 'Agora chega perto da tela',
        to: 'por hábito, não por emergência.',
        focus: 'Começar um quadro sem resíduos do anterior.',
        reason: 'O rastro real só pode ser observado antes de entrar a floresta.',
        say: 'Olhe as perninhas. Coloque Limpar a tela antes de Desenhar o sprite e compare.',
        edit: 'Manter o zoom no rastro sutil; não fabricar um borrão enorme. Preservar a explicação de por que limpar fica mesmo quando o fundo cobre tudo.',
        checks: [clear, draw],
      },
      {
        key: 'floresta-cobre',
        title: 'O que aconteceu com o Dino?',
        kind: 'observe',
        part: 2,
        from: 'Agora falta a floresta.',
        to: 'Sumiu! Ele estava aí agorinha.',
        focus: 'Perceber que um desenho posterior pode cobrir outro.',
        reason:
          'A ordem errada é mostrada no exemplo pronto; a criança não precisa copiar uma montagem errada para prosseguir.',
        say: 'Observe: o Dino continua criado, mas a floresta desenhada depois cobre ele. Vamos comparar as duas ordens em um exemplo separado.',
        edit: 'Parar antes da explicação e antes do conserto. Mostrar as duas peças e destacar a última, sem pedir à criança que monte a ordem errada.',
      },
      {
        key: 'camadas',
        title: 'Quem fica na frente?',
        kind: 'experiment',
        mission: 'layers',
        focus: 'Trocar apenas a ordem de dois desenhos e observar a sobreposição.',
        reason: 'A criança acabou de ver o desaparecimento e agora pode testar sua causa.',
        say: 'Neste exemplo, compare Floresta depois do Dino e Dino depois da Floresta. Só a ordem muda.',
      },
      {
        key: 'ordem-certa',
        title: 'Organize as camadas do seu jogo',
        kind: 'build',
        part: 2,
        from: 'Então é só arrumar a ordem:',
        to: 'o espaço em volta continua da cor que você escolheu na Aula 1.',
        focus: 'Transferir a descoberta para a pilha real de desenho.',
        reason: 'Aplicação imediatamente depois da comparação, sem outra demonstração repetida.',
        say: 'Coloque a floresta com velocidade 5 entre Limpar a tela e Desenhar o sprite. Arraste a peça, sem duplicar.',
        edit: 'Acrescentar a entrada mostrando a floresta ainda na paleta, pois a ordem errada só apareceu na demonstração. Preservar o gesto de encaixe e a fronteira do palco.',
        checks: [
          clearBeforeForest,
          forest,
          draw,
          c('uma-floresta', 'Use uma única floresta.', 'sz_g2d_forest', { count: 1 }),
        ],
      },
      {
        key: 'retirar-borda',
        title: 'Retire só a peça provisória',
        kind: 'build',
        part: 2,
        from: 'E aí, olha só: agora',
        to: 'O retângulo continua lá, marcado pela floresta, e o seu jogo ficou limpo.',
        focus: 'Apagar uma peça do meio preservando as demais.',
        reason:
          'O vídeo já demonstra erro, desfazer e comando correto; não precisa de um laboratório adicional.',
        say: 'Use Apagar este bloco na borda. Confira se a descrição e a criação do Dino continuam em Ao iniciar.',
        edit: 'Preservar Ctrl+Z e o menu de contexto. Em tela de toque, complementar com a forma de abrir o menu usada pelo Estúdio atual. Não exigir que a criança apague três blocos de propósito.',
        checks: [noBorder, dino, description],
      },
    ],
    finalChecks: [draw, clearBeforeForest, forest, noBorder, dino, description],
    test: 'Execute: o Dino deve aparecer na frente da floresta, com as pernas animadas. Ele fica no mesmo lugar; a floresta é que passa.',
    corrections: [
      'Parte 3: aproveitar a ilusão de movimento no fechamento; retirar a exploração livre das velocidades 2 e 9 e manter 5.',
      'Nomes dos identificadores ficam canônicos na trilha guiada; a cor do Dino pode ser escolhida.',
    ],
    quiz: [
      [
        'Quem aparece por cima quando dois desenhos ocupam o mesmo lugar?',
        'O que é desenhado por último.',
        'O que foi criado primeiro.',
        'A ordem do desenho determina as camadas.',
      ],
      [
        'Por que repetir o desenho a cada quadro?',
        'Para atualizar a imagem que vemos.',
        'Para criar outro Dino a cada quadro.',
        'A criação ocorreu em Ao iniciar; o mesmo personagem é redesenhado.',
      ],
      [
        'Como retirar a borda sem apagar o Dino?',
        'Usar Apagar este bloco na borda.',
        'Arrastar a borda e toda a pilha para a lixeira.',
        'Apagar apenas a peça preserva as que estão abaixo.',
      ],
    ],
  },
  3: {
    title: 'Pular e voltar: gravidade e impulso',
    entry:
      'Hoje o Dino vai saltar e voltar ao chão. Primeiro vamos descobrir por que ele ainda não consegue pular.',
    exit: 'O Dino recebe gravidade antes do controle e pula com força 14.',
    steps: [
      {
        key: 'controle-provisorio',
        title: 'Dê o comando de pulo',
        kind: 'build',
        part: 1,
        focus: 'Adicionar controle e reconhecer o estado inicial suspenso.',
        reason: 'O sintoma real do roteiro motiva a gravidade: este Dino ainda não está apoiado.',
        say: 'Coloque Controlar o dinossauro antes de desenhá-lo. Selecione dino e deixe a força 15 por enquanto. Ao testar, ele ainda não pula: falta chegar ao chão.',
        edit: 'Preservar o Dino flutuando e parado; não substituir pelo salto sem retorno do modelo simplificado.',
        checks: [jump(15)],
      },
      {
        key: 'gravidade-modelo',
        title: 'O que faz o Dino voltar?',
        kind: 'experiment',
        mission: 'gravity',
        focus: 'Comparar a trajetória com e sem aplicar gravidade.',
        reason: 'Isolar a ação da gravidade sem acrescentar força variável.',
        say: 'Este exemplo já dá um impulso ao Dino. Compare a subida sem gravidade com a volta ao chão quando você liga a gravidade. No seu projeto, ele primeiro precisa cair até o chão.',
      },
      {
        key: 'aplicar-gravidade',
        title: 'Traga o Dino para o chão',
        kind: 'build',
        part: 2,
        focus: 'Aplicar gravidade antes do controle a cada quadro.',
        reason: 'Voltar do modelo à correção concreta e aos controles reais.',
        say: 'Antes de Controlar o dinossauro, coloque Aplicar gravidade ao sprite dino. Teste espaço, seta para cima e toque na parte de cima do jogo.',
        edit: 'Preservar a queda inicial, o pouso e o primeiro pulo. Relembrar y crescendo para baixo em uma frase, sem abrir outra aula de coordenadas.',
        checks: [gravity, jump(15)],
      },
      {
        key: 'impulso-modelo',
        title: 'O que muda a altura?',
        kind: 'experiment',
        mission: 'impulse',
        focus: 'Comparar dois impulsos mantendo a mesma gravidade.',
        reason:
          'Só introduzir o segundo parâmetro depois de estabilizar a explicação da gravidade.',
        say: 'Agora a gravidade fica igual. Faça um salto, aumente o impulso e compare as marcas de altura.',
      },
      {
        key: 'regular-pulo',
        title: 'Prepare o salto do seu jogo',
        kind: 'build',
        part: 3,
        focus: 'Fixar uma força adequada ao percurso que será construído.',
        reason: 'Encerrar a comparação com uma configuração comum para as próximas aulas.',
        say: 'No seu jogo, deixe a força do pulo em 14. Teste um salto completo: subir, descer e pousar.',
        edit: 'Pode reaproveitar a comparação gravada de 2 e 30 como demonstração breve no clipe. Substituir a escolha livre de 12 a 18 pelo fechamento em 14; não alegar equivalência numérica com o laboratório.',
        checks: [gravity, jump(14)],
      },
    ],
    finalChecks: [gravity, jump(14), draw, forest],
    test: 'Execute e faça um salto com teclado e outro com toque. O Dino deve voltar ao chão; a floresta continua atrás dele.',
    corrections: [
      'Cortar o convite a testar agachamento para pássaros nesta aula; o objetivo é o salto.',
      'O modelo de gravidade é ilustrativo. O sintoma inicial do Estúdio é flutuar sem conseguir pular, não sair voando.',
    ],
    quiz: [
      [
        'Com a mesma gravidade, um impulso maior tende a fazer o quê?',
        'Produzir um salto mais alto.',
        'Mudar a cor do Dino.',
        'A comparação isolou o impulso inicial.',
      ],
      [
        'Que ação faz o Dino cair de volta?',
        'Aplicar gravidade ao personagem.',
        'Desenhar a floresta por último.',
        'Gravidade muda o movimento; desenho muda a imagem.',
      ],
      [
        'Qual ordem usamos no quadro?',
        'Gravidade, controle, desenho.',
        'Desenho, controle, gravidade.',
        'Calculamos o movimento antes de mostrar o personagem.',
      ],
    ],
  },
  4: {
    title: 'O som deve escutar o pulo',
    entry: 'Seu Dino já pula. Hoje o som vai acompanhar o pulo, seja qual for o controle usado.',
    exit: 'Um único som responde ao evento de pulo; o evento provisório de espaço foi retirado.',
    steps: [
      {
        key: 'evento-espaco',
        title: 'Monte um primeiro evento',
        kind: 'build',
        part: 1,
        focus: 'Entender a área que responde a acontecimentos.',
        reason: 'Introduzir a área Eventos e o contêiner antes de acrescentar som.',
        say: 'Coloque a área Quando acontecer ao lado das outras. Dentro dela, encaixe Quando apertar a tecla e escolha espaço.',
        edit: 'Manter o evento vazio. A sequência anuncia que esta é uma primeira versão que vamos testar.',
        checks: [
          c(
            'evento-inicial',
            'Coloque o evento da tecla espaço dentro de Quando acontecer.',
            'sz_g2d_on_key',
            { area: 'events', fields: { KEY: 'Space' } },
          ),
        ],
      },
      {
        key: 'primeiro-som',
        title: 'Ligue um som e teste',
        kind: 'build',
        part: 2,
        focus: 'Ouvir a resposta de um evento de entrada.',
        reason: 'A primeira versão precisa ser compreendida antes de mostrar seu limite.',
        say: 'Dentro do evento de espaço, encaixe Som de pulo. Ative o áudio pelo controle da página e teste.',
        edit: 'Manter a ativação de áudio real. Mostrar legenda ou indicador de som para quem não pode ouvi-lo.',
        checks: [
          c('som-na-tecla', 'Encaixe Som de pulo no evento de espaço.', 'sz_g2d_on_key', {
            area: 'events',
            fields: { KEY: 'Space' },
            inputBlocks: { BODY: p('sz_g2d_play_jump') },
          }),
        ],
      },
      {
        key: 'entrada-ou-pulo',
        title: 'O dedo e o Dino fazem a mesma coisa?',
        kind: 'experiment',
        mission: 'jump-sound',
        focus: 'Separar comando de entrada e acontecimento real de pulo.',
        reason:
          'O laboratório compara controles e repetição no ar sem obrigar a criança a reconstruir o caso.',
        say: 'Compare o som ligado à tecla com o som ligado ao pulo. Teste o toque e uma tentativa enquanto o Dino já está no ar.',
      },
      {
        key: 'escutar-dino',
        title: 'Faça o som acompanhar o pulo',
        kind: 'build',
        part: 3,
        focus: 'Trocar o evento preservando um único bloco de som.',
        reason: 'Aplicar a descoberta à montagem; impedir que o som antigo continue duplicando.',
        say: 'Coloque Quando o dino pular. Mova o mesmo Som de pulo para dentro dele e apague o evento de espaço que ficou vazio.',
        edit: 'Reaproveitar os quatro testes e a transferência do bloco. Encurtar a explicação já vista no laboratório; manter o gesto de mover, não copiar.',
        checks: [sound, oneSound, noKey],
      },
    ],
    finalChecks: [sound, oneSound, noKey, gravity, jump(14)],
    test: 'Teste espaço, seta para cima e toque. Deve haver som em cada pulo real, sem um novo som só por apertar espaço no ar.',
    corrections: [
      'Parte 4: retirar o passeio pelos 27 sons do percurso obrigatório. Manter o som de pulo para conferir a relação evento → som.',
      'Não depender só da audição: a experiência nativa deve manter o contador/indicador visual de pulo e som.',
    ],
    quiz: [
      [
        'Qual evento deve tocar o som?',
        'Quando o Dino realmente pula.',
        'Sempre que uma tecla qualquer é apertada.',
        'O som descreve o acontecimento, não apenas o dedo.',
      ],
      [
        'Por que mover o bloco de som?',
        'Para não deixar dois sons ativos.',
        'Para mudar a altura do salto.',
        'Uma cópia no evento antigo manteria o defeito.',
      ],
      [
        'Tocar na tela também pode produzir som de pulo?',
        'Sim, quando o toque produz um pulo.',
        'Não, som de pulo só funciona com espaço.',
        'O evento de pulo atende aos diferentes controles.',
      ],
    ],
  },
  5: {
    title: 'Cactos no ritmo certo',
    entry: 'Vamos criar cactos, fazê-los andar e dar espaço entre um e outro.',
    exit: 'O grupo cactos é atualizado e desenhado a cada quadro; um cacto nasce fora da tela a cada 1,4 segundo.',
    steps: [
      {
        key: 'grupo-cactos',
        title: 'Prepare o grupo dos cactos',
        kind: 'build',
        part: 1,
        focus: 'Usar um grupo para reunir vários obstáculos.',
        reason: 'Nomear o conjunto antes de operar em todos os seus membros.',
        say: 'Em Ao iniciar, crie o grupo cactos. Ele começa vazio.',
        edit: 'Preservar a analogia da caixa; não confundir grupo com cacto visível.',
        checks: [group],
      },
      {
        key: 'avalanche',
        title: 'Veja por que nascem tantos cactos',
        kind: 'observe',
        part: 2,
        focus: 'Distinguir criar de atualizar e desenhar a cada quadro.',
        reason:
          'A avalanche é útil para observar, mas copiar dezenas de nascimentos não é uma tarefa necessária.',
        say: 'Observe estes três comandos: criar, atualizar e desenhar. Se criar também fica a cada quadro, nasce cacto sem parar.',
        edit: 'Reutilizar a montagem e a avalanche como observação. A criança ainda não copia esta pilha; destacar só o comando Criar.',
      },
      {
        key: 'ritmo',
        title: 'Dê um intervalo aos nascimentos',
        kind: 'experiment',
        mission: 'spawn',
        focus: 'Comparar criação a cada quadro e criação com relógio.',
        reason: 'Isolar o tempo de nascimento antes de introduzir posição ou velocidade.',
        say: 'Compare os nascimentos a cada quadro. Depois ligue o relógio e observe o espaço entre os cactos.',
      },
      {
        key: 'relogio-cacto',
        title: 'Monte os dois ritmos do jogo',
        kind: 'build',
        part: 3,
        focus: 'Criar periodicamente, mover e desenhar continuamente.',
        reason: 'Aplicar o resultado com dois contêineres irmãos na área Repetições.',
        say: 'Dentro de Enquanto estiver rodando, coloque A cada 1,4 segundos ao lado de A cada quadro. No relógio, crie o cacto em x 400, tamanho 44 e velocidade -5. No quadro, depois de desenhar o Dino, atualize e desenhe o grupo cactos.',
        edit: 'Complementar o início da montagem: a criança ainda não copiou a avalanche. Reaproveitar a distinção entre criar no relógio e atualizar/desenhar no quadro.',
        checks: [spawnTimer(400), update, drawGroup, singleSpawn],
      },
      {
        key: 'fora-da-tela',
        title: 'Veja onde o cacto começa',
        kind: 'observe',
        part: 4,
        focus: 'Relacionar x de nascimento à borda direita de 480.',
        reason: 'Recuperar coordenadas da aula 1 com uma finalidade concreta.',
        say: 'A tela acaba em x 480. Em x 400, o cacto nasce dentro dela; em x 560, começa do lado de fora e entra andando.',
        visual:
          'Mostrar o retângulo 480 × 270 e uma faixa externa à direita. Marcar 400, 480 e 560 na mesma escala. Um cacto por vez; deixar sua posição externa visível só na demonstração.',
        edit: 'Reaproveitar a explicação de x e o resultado antes/depois. Separar nascimento fora da tela da questão do sinal da velocidade.',
      },
      {
        key: 'entrada-suave',
        title: 'Faça o cacto entrar pela direita',
        kind: 'build',
        part: 4,
        focus: 'Alterar somente a posição de nascimento.',
        reason: 'Uma mudança pequena consolida o significado de x.',
        say: 'No bloco de criar cacto, troque x 400 por 560. Mantenha tamanho 44, velocidade -5 e relógio 1,4.',
        edit: 'Usar apenas o gesto e a entrada suave; cortar a explicação já vista na demonstração.',
        checks: [spawnTimer(560)],
      },
      {
        key: 'sentido-velocidade',
        title: 'Por que a velocidade é negativa?',
        kind: 'observe',
        part: 5,
        focus: 'Entender que diminuir x move para a esquerda.',
        reason: 'Preparar a interpretação dos números negativos exigida nas aulas 12 e 13.',
        say: 'Veja o x diminuir: 560, 555, 550. O -5 manda andar para a esquerda. O relógio continua igual.',
        visual:
          'Três posições sobre uma régua horizontal; destacar a diferença -5 e a seta para a esquerda. Não variar intervalo, tamanho ou velocidade ao mesmo tempo.',
        edit: 'Aproveitar a comparação de velocidade gravada, com a régua como complemento. Cortar o convite a escolher livremente velocidade e intervalo; encerrar em -5 e 1,4.',
      },
    ],
    finalChecks: [
      group,
      spawnTimer(560),
      update,
      drawGroup,
      singleSpawn,
      c('fora-do-quadro', 'Deixe a criação fora de A cada quadro.', 'sz_g2d_spawn_obstacle', {
        withinBlock: frame,
        count: 0,
      }),
    ],
    test: 'Observe dois cactos entrando pela direita. Eles andam para a esquerda, separados no tempo. A colisão ainda não termina a partida nesta aula.',
    corrections: [
      'Não obrigar a criança a montar a avalanche: observar e experimentar já mostram a causa.',
      'Conservar 1,4 segundo, x 560 e velocidade -5 como estado de saída para as próximas aulas.',
    ],
    quiz: [
      [
        'O que deve acontecer a cada quadro?',
        'Atualizar e desenhar os cactos.',
        'Criar um novo cacto sempre.',
        'O relógio decide quando nasce; o quadro cuida dos que já existem.',
      ],
      [
        'Se a tela termina em x 480, onde começa um cacto em x 560?',
        'Fora da tela, à direita.',
        'No meio da tela.',
        '560 fica além da borda direita.',
      ],
      [
        'Por que usar velocidade -5?',
        'Para diminuir x e andar para a esquerda.',
        'Para fazer o cacto nascer a cada cinco segundos.',
        'Velocidade e intervalo são propriedades diferentes.',
      ],
    ],
  },
}
