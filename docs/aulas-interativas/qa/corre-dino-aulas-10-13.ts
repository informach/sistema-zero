import {
  absent,
  c,
  guarded,
  iff,
  inLoop,
  p,
  type Recipe,
  scene,
  timer,
} from './corre-dino-editorial'

const hitbox = c(
  'raio-x',
  'Desenhe a área de colisão do dino a cada quadro.',
  'sz_g2d_draw_hitbox',
  { ...inLoop, fields: { SPRITE: 'dino' } },
)
const scale = c(
  'colisao-80',
  'Em Ao iniciar, ajuste a área de colisão do dino para 80%.',
  'sz_g2d_set_hitbox_scale',
  { area: 'start', fields: { SPRITE: 'dino' }, inputs: { PERCENT: 80 } },
)
const noHitbox = absent(
  'sem-raio-x',
  'Retire o desenho provisório da área de colisão.',
  'sz_g2d_draw_hitbox',
)
const variable = (name: string) => p('sz_val_variable', { fields: { NAME: name } })
const points = c(
  'pontos-zero',
  'Crie pontos com valor inicial zero em Ao iniciar.',
  'sz_js_var_create',
  { area: 'start', fields: { NAME: 'pontos' }, inputs: { VALUE: 0 } },
)
const score = c(
  'mostrar-pontos',
  'No placar, conecte o valor da variável pontos à entrada do valor.',
  'sz_g2d_draw_score',
  { ...inLoop, fields: { LABEL: 'Pontos:' }, inputBlocks: { VALUE: variable('pontos') } },
)
const pointClock = c(
  'relogio-pontos',
  'A cada 1 s, some 1 em pontos somente se estiver jogando.',
  timer,
  {
    area: 'loops',
    inputs: { SECS: 1 },
    inputBlocks: {
      BODY: guarded(p('sz_js_var_increment', { fields: { NAME: 'pontos', DELTA: 1 } })),
    },
  },
)
const finalText = c(
  'frase-pontos',
  'No subtítulo do fim, junte texto, valor de pontos e texto nessa ordem.',
  iff,
  {
    ...inLoop,
    inputBlocks: {
      ELSEIF_COND1: scene('fim'),
      ELSEIF_THEN1: p('sz_g2d_show_screen', {
        inputBlocks: {
          SUBTITLE: p('sz_val_join', {
            inputBlocks: {
              ITEM0: p('sz_val_text', { fields: { TEXT: 'Você fez ' } }),
              ITEM1: variable('pontos'),
              ITEM2: p('sz_val_text', { fields: { TEXT: ' pontos. Tente bater essa marca!' } }),
            },
          }),
        },
      }),
    },
  },
)
const random = (min: number, max: number) =>
  p('sz_g2d_random_between', { inputs: { MIN: min, MAX: max } })
const randomX = c(
  'sortear-x',
  'No x do cacto, conecte Sorteio entre 500 e 560.',
  'sz_g2d_spawn_obstacle',
  {
    area: 'loops',
    withinBlock: timer,
    fields: { GROUP: 'cactos' },
    inputBlocks: { X: random(500, 560) },
  },
)
const randomV = c(
  'sortear-v',
  'Na velocidade do cacto, use -5 menos Sorteio entre 0 e 1.',
  'sz_g2d_spawn_obstacle',
  {
    area: 'loops',
    withinBlock: timer,
    inputBlocks: {
      VX: p('sz_math_arithmetic', {
        fields: { OP: '-' },
        inputs: { A: -5 },
        inputBlocks: { B: random(0, 1) },
      }),
    },
  },
)
const spawnClock = c(
  'relogio-nascimento',
  'Preserve o relógio de 1,4 s com criação protegida por jogando.',
  timer,
  {
    area: 'loops',
    inputs: { SECS: 1.4 },
    inputBlocks: { BODY: guarded(p('sz_g2d_spawn_obstacle', { fields: { GROUP: 'cactos' } })) },
  },
)
const speed = c(
  'velocidade-inicial',
  'Crie velocidade com valor -5 em Ao iniciar.',
  'sz_js_var_create',
  { area: 'start', fields: { NAME: 'velocidade' }, inputs: { VALUE: -5 } },
)
const baseFormula = c(
  'usar-base',
  'Use valor de velocidade menos sorteio de 0 a 1 no VX dos novos cactos.',
  'sz_g2d_spawn_obstacle',
  {
    area: 'loops',
    inputBlocks: {
      VX: p('sz_math_arithmetic', {
        fields: { OP: '-' },
        inputBlocks: { A: variable('velocidade'), B: random(0, 1) },
      }),
    },
  },
)
const acceleration = c(
  'acelerar-com-limite',
  'A cada 5 s, se jogando e velocidade > -9, some -1 em velocidade.',
  timer,
  {
    area: 'loops',
    inputs: { SECS: 5 },
    inputBlocks: {
      BODY: guarded(
        p(iff, {
          inputBlocks: {
            COND: p('sz_val_compare', {
              fields: { OP: '>' },
              inputs: { RIGHT: -9 },
              inputBlocks: { LEFT: variable('velocidade') },
            }),
            THEN: p('sz_js_var_increment', { fields: { NAME: 'velocidade', DELTA: -1 } }),
          },
        }),
      ),
    },
  },
)
const accessible = c(
  'descricao-final',
  'Atualize a descrição com espaço, seta para cima e toque.',
  'sz_g2d_set_stage_description',
  {
    area: 'start',
    fields: {
      DESCRIPTION: 'Corra com o dino e pule os cactos com espaço, seta pra cima ou tocando na tela',
    },
  },
)

export const lateRecipes: Record<number, Recipe> = {
  10: {
    title: 'Uma colisão mais justa',
    entry:
      'A batida pode parecer acontecer antes do toque. Vamos enxergar a área usada pela colisão e ajustá-la.',
    exit: 'Área de colisão do Dino em 80%, desenho do personagem preservado e instrumento retirado.',
    steps: [
      {
        key: 'ligar-raio-x',
        title: 'Veja a área que o jogo usa',
        kind: 'build',
        part: 1,
        focus: 'Adicionar um instrumento que revela a geometria de colisão.',
        reason: 'Partir do próprio jogo e de um problema reconhecível depois da aula 9.',
        say: 'No fim de A cada quadro, coloque Desenhar área de colisão do sprite dino. Veja o contorno ao redor dele.',
        edit: 'Preservar o contorno. Não tratar o desenho da hitbox como a própria configuração da colisão.',
        checks: [hitbox],
      },
      {
        key: 'desenho-e-area',
        title: 'O contorno e o desenho são iguais?',
        kind: 'observe',
        part: 2,
        focus: 'Perceber espaços vazios do desenho dentro da área de colisão.',
        reason:
          'Um close parado explica melhor a geometria do que exigir precisão motora numa partida.',
        say: 'Olhe o espaço vazio junto do corpo. O desenho tem recortes, mas a área de colisão é mais simples.',
        visual:
          'Congelar um contato com a área marcada. Alternar desenho e contorno na mesma posição. Não mover o obstáculo enquanto compara os contornos.',
        edit: 'Preservar a explicação dos espaços transparentes. Corrigir qualquer referência a ajustar o cacto: nesta aula o ajuste é do Dino.',
      },
      {
        key: 'comparar-area',
        title: 'Ajuste só a área de colisão',
        kind: 'experiment',
        mission: 'hitbox',
        focus: 'Comparar a detecção mantendo os desenhos na mesma posição.',
        reason:
          'Permitir uma comparação controlada que seria difícil de repetir numa corrida real.',
        say: 'Aproxime o cacto até o contato indicado. Depois ajuste apenas a área de colisão e compare. O desenho do Dino continua do mesmo tamanho.',
      },
      {
        key: 'ajustar-area',
        title: 'Leve o ajuste para o seu jogo',
        kind: 'build',
        part: 3,
        focus: 'Configurar a área sem redimensionar o sprite.',
        reason: 'Aplicar a descoberta uma única vez na preparação da partida.',
        say: 'Em Ao iniciar, depois de criar o dino, ajuste a área de colisão dele para 80%. Mantenha o tamanho do Dino em 64.',
        edit: 'Reaproveitar a montagem e o teste com contorno; manter a cor e o desenho iguais.',
        checks: [
          scale,
          hitbox,
          c(
            'mesmo-desenho',
            'Crie o Dino com tamanho 64 antes do ajuste de colisão.',
            'sz_g2d_create_dino',
            {
              area: 'start',
              beforeBlock: 'sz_g2d_set_hitbox_scale',
              inputs: { SIZE: 64 },
            },
          ),
        ],
      },
      {
        key: 'tirar-raio-x',
        title: 'Retire o instrumento, mantenha o ajuste',
        kind: 'build',
        part: 4,
        focus: 'Distinguir instrumento temporário de regra permanente.',
        reason: 'Encerrar com o jogo visualmente limpo, sem desfazer a solução.',
        say: 'Depois de testar, apague apenas Desenhar área de colisão. O ajuste de 80% fica em Ao iniciar.',
        edit: 'Pode aproveitar a comparação 40/100 como observação rápida, mas remover a tarefa de escolher livremente. Encerrar em 80 e retirar o contorno.',
        checks: [scale, noHitbox],
      },
    ],
    finalChecks: [
      scale,
      noHitbox,
      c(
        'mesmo-desenho',
        'Crie o Dino com tamanho 64 antes do ajuste de colisão.',
        'sz_g2d_create_dino',
        {
          area: 'start',
          beforeBlock: 'sz_g2d_set_hitbox_scale',
          inputs: { SIZE: 64 },
        },
      ),
    ],
    test: 'Jogue uma rodada. A batida deve continuar funcionando com a margem escolhida; o Dino não encolheu e o contorno não aparece mais.',
    corrections: [
      '80% é a escolha desta versão do Corre Dino; não ensinar que uma área sempre menor é universalmente mais justa.',
      'Evitar comparar tentativas com posições diferentes como prova do ajuste. A experiência nativa mantém o caso de comparação.',
    ],
    quiz: [
      [
        'Ao ajustar a área para 80%, o desenho precisa encolher?',
        'Não, a área de colisão e o desenho são diferentes.',
        'Sim, são sempre a mesma coisa.',
        'O ajuste atua na geometria da detecção.',
      ],
      [
        'O que manter igual ao comparar duas áreas?',
        'As posições do Dino e do cacto.',
        'Apenas a música.',
        'Mudar a posição junto impediria saber a causa do resultado.',
      ],
      [
        'Apagar o desenho da área apaga o ajuste?',
        'Não, o ajuste continua em Ao iniciar.',
        'Sim, o instrumento é a própria regra.',
        'Um bloco mostra; outro configura.',
      ],
    ],
  },
  11: {
    title: 'Pontos que contam a sua partida',
    entry: 'Vamos guardar pontos, mostrar o placar e contar o resultado quando a partida termina.',
    exit: 'Pontos começam em zero, aumentam uma vez por segundo somente jogando e aparecem na frase de fim.',
    steps: [
      {
        key: 'guardar-pontos',
        title: 'Crie a memória dos pontos',
        kind: 'build',
        part: 1,
        focus: 'Criar uma variável com valor inicial.',
        reason:
          'A analogia da caixa já está no vídeo; basta montar e reconhecer que ela ainda não aparece.',
        say: 'Em Ao iniciar, crie a variável pontos com valor zero. Ainda não aparece número na tela: guardar e mostrar são trabalhos diferentes.',
        edit: 'Preservar a caixa e o valor inicial. Não acrescentar um laboratório que repita criar versus desenhar da aula 1.',
        checks: [points],
      },
      {
        key: 'mostrar-pontos',
        title: 'Conecte o placar à memória',
        kind: 'build',
        part: 2,
        focus: 'Usar o valor da variável no desenho do placar.',
        reason: 'Distinguir um zero digitado de uma leitura que acompanhará a variável.',
        say: 'No quadro, mostre um placar com o rótulo Pontos:. No valor, encaixe valor da variável pontos. Coloque-o depois do desenho do mundo.',
        edit: 'Reaproveitar o encaixe. Corrigir a referência ao medidor: ele foi retirado na aula 6, não na 7.',
        checks: [score],
      },
      {
        key: 'contraste',
        title: 'Veja como deixar o número legível',
        kind: 'observe',
        part: 2,
        focus: 'Reconhecer contraste suficiente para ler o placar.',
        reason:
          'É uma decisão visual simples: observar duas versões basta, sem abrir uma paleta como experiência.',
        say: 'No mesmo fundo claro, compare o número branco com um número escuro. O valor é igual; o que mudou foi a facilidade de ler.',
        visual:
          'Mostrar o mesmo placar sobre o mesmo céu, uma versão clara e outra escura. Incluir a palavra Pontos; não depender apenas de cor para identificar as versões.',
        edit: 'Separar a comparação de contraste da montagem. No trecho de construção, orientar a escolher o tom escuro demonstrado.',
      },
      {
        key: 'quando-contar',
        title: 'Em quais momentos os pontos crescem?',
        kind: 'experiment',
        mission: 'score',
        focus: 'Fazer o relógio pontuar apenas durante a partida.',
        reason: 'Retomar estado e tempo antes de montar o novo relógio.',
        say: 'Compare início, jogando e fim. Coloque Somar ponto dentro de Se jogando e confira os três momentos. O resultado precisa ficar guardado no fim.',
      },
      {
        key: 'relogio-pontos',
        title: 'Conte um ponto por segundo',
        kind: 'build',
        part: 3,
        focus: 'Criar uma rotina periódica com condição de estado.',
        reason: 'A criança transfere a regra observada para o projeto contínuo.',
        say: 'Ao lado do relógio dos cactos, coloque A cada 1 segundo. Dentro, Se a tela é jogando; no então, Some 1 em pontos.',
        edit: 'Preservar o relógio irmão, não aninhado. Corrigir referências históricas do Se para aula 7. Retirar testes livres com intervalos 0,5 e 3.',
        checks: [pointClock],
      },
      {
        key: 'frase-dinamica',
        title: 'Veja o número entrar na frase',
        kind: 'observe',
        part: 4,
        focus: 'Compor uma mensagem com texto, valor e texto.',
        reason:
          'A tomada de subtítulo e o mutador de três espaços precisam ser visualizados antes da montagem.',
        say: 'Veja três peças: Você fez, o valor de pontos e o restante da frase. Quando o número muda, a mensagem usa o valor novo.',
        visual:
          'Mostrar três cartões alinhados, depois o encaixe no subtítulo. Trocar apenas o número 3 por 7. Destacar espaços antes/depois do número e o botão + usado três vezes.',
        edit: 'Reaproveitar a explicação da peça de texto da aula 8; separar conceito e gesto de montagem.',
      },
      {
        key: 'montar-frase',
        title: 'Conte o resultado na tela de fim',
        kind: 'build',
        part: 4,
        focus: 'Conectar a composição ao subtítulo do ramo fim.',
        reason:
          'A montagem ocorre com uma imagem clara da estrutura e com checagem da entrada certa.',
        say: 'No subtítulo da tela fim, use juntar texto com três peças: “Você fez ”, valor de pontos e “ pontos. Tente bater essa marca!”. Repare nos espaços junto do número.',
        edit: 'Manter os três cliques em +, a substituição dos zeros, os espaços e o uso de − para retirar um encaixe extra. Não exigir um resultado de 12 pontos: esse é só o exemplo gravado.',
        checks: [finalText],
      },
    ],
    finalChecks: [
      points,
      score,
      pointClock,
      finalText,
      c('um-incremento', 'Use um único incremento da variável pontos.', 'sz_js_var_increment', {
        fields: { NAME: 'pontos' },
        count: 1,
      }),
    ],
    test: 'Espere no menu: pontos não crescem. Comece e acompanhe dois incrementos. Termine a partida: a frase deve mostrar o valor final parado. Reinicie e confira zero. Leia o placar no fundo real.',
    corrections: [
      'Revisar referências antigas: medidor retirado na aula 6; Se ensinado na aula 7; dois grupos protegidos naquela aula.',
      'A checagem confere a conexão da variável e a frase; o professor também confere contraste e posicionamento no jogo.',
    ],
    quiz: [
      [
        'Qual peça faz o placar acompanhar a memória?',
        'Valor da variável pontos.',
        'Um número zero digitado no placar.',
        'O valor conectado é lido novamente quando o jogo desenha.',
      ],
      [
        'Quando o relógio deve somar pontos?',
        'Somente enquanto a tela é jogando.',
        'Também no menu e no fim.',
        'A condição protege o incremento; o resultado fica guardado.',
      ],
      [
        'Para que serve juntar texto?',
        'Para formar uma mensagem com os pedaços em ordem.',
        'Para somar matematicamente todas as palavras.',
        'A conta matemática e a composição de texto têm funções diferentes.',
      ],
    ],
  },
  12: {
    title: 'Sorteios dentro de limites',
    entry:
      'Os cactos repetem o mesmo padrão. Vamos variar onde nascem e a velocidade que recebem, uma propriedade por vez.',
    exit: 'Nascimento entre x 500 e 560 e velocidade -5 menos sorteio de 0 a 1; o relógio continua em 1,4 s.',
    steps: [
      {
        key: 'padrao-fixo',
        title: 'Veja por que o percurso se repete',
        kind: 'observe',
        part: 1,
        focus: 'Relacionar valores fixos a um padrão previsível.',
        reason: 'Estabelecer o caso de comparação antes do sorteio.',
        say: 'O relógio, o x e a velocidade continuam iguais. Observe dois trechos do mesmo padrão; vamos alterar uma propriedade por vez.',
        edit: 'Manter o padrão e os números destacados. Não prometer que sorteio garante uma partida sempre diferente de todas as anteriores.',
      },
      {
        key: 'sorteio-controlado',
        title: 'O que o sorteio pode mudar?',
        kind: 'experiment',
        mission: 'random',
        focus:
          'Comparar resultados de um sorteio dentro da faixa, mantendo a outra propriedade fixa.',
        reason:
          'Duas comparações delimitadas respondem à mesma pergunta sobre sorteio: posição com velocidade fixa, depois velocidade com posição fixa.',
        say: 'Primeiro compare os dois exemplos de posição, com a mesma velocidade. Depois compare os dois de velocidade, com a mesma posição. São exemplos escolhidos para enxergar a diferença; um sorteio real também pode repetir.',
      },
      {
        key: 'sortear-posicao',
        title: 'Sorteie o lugar de nascimento',
        kind: 'build',
        part: 2,
        focus: 'Conectar o sorteio exclusivamente à entrada x.',
        reason: 'Primeira aplicação muda um único campo e preserva o tempo de criação.',
        say: 'No x do bloco que cria cacto, conecte Sorteio entre 500 e 560. Os dois limites ficam depois da borda 480. O relógio continua em 1,4.',
        edit: 'Preservar o encaixe em x e a faixa externa. Explicar que muda o tempo de chegada até o Dino, mesmo com o mesmo relógio de nascimento.',
        checks: [randomX, spawnClock],
      },
      {
        key: 'menos-corre-mais',
        title: 'Veja a conta da velocidade',
        kind: 'observe',
        part: 3,
        focus: 'Ler -5 menos 0 e -5 menos 1 como velocidades para a esquerda.',
        reason: 'A dificuldade é o sinal da conta; uma régua fixa mantém a atenção nessa relação.',
        say: 'Se sair zero, -5 menos zero continua -5. Se sair um, fica -6. Em direção à esquerda, -6 percorre mais distância por quadro.',
        visual:
          'Duas contas alinhadas e duas setas à esquerda com origem igual. Não alterar o tamanho do cacto nem o intervalo. Distinguir valor numérico de rapidez.',
        edit: 'Reaproveitar a explicação aritmética e acrescentar a régua. Evitar dizer que -6 é maior que -5.',
      },
      {
        key: 'sortear-velocidade',
        title: 'Conecte a conta ao cacto',
        kind: 'build',
        part: 3,
        focus: 'Combinar uma base fixa com uma variação limitada.',
        reason: 'Montagem logo depois da visualização, sem outro parâmetro novo.',
        say: 'No VX do cacto, use a conta: -5 menos Sorteio entre 0 e 1. Confira que o sorteio da posição continua ligado ao x.',
        edit: 'Manter A, operador − e B claramente visíveis. Retirar a conclusão que transforma todo sorteio em garantia de não repetição.',
        checks: [randomX, randomV],
      },
    ],
    finalChecks: [randomX, randomV, spawnClock],
    test: 'Observe alguns nascimentos. Todos começam fora da tela e andam à esquerda. Um resultado pode repetir. Confira os dois sorteios em tomadas diferentes, sem alterar o relógio.',
    corrections: [
      'Parte 4: retirar o alargamento livre da faixa para 500–700. Fechar nos limites 500–560 e variação 0–1.',
      'As duas comparações do laboratório são exemplos didáticos controlados; não são prova estatística de aleatoriedade.',
    ],
    quiz: [
      [
        'Um sorteio pode produzir o mesmo resultado de novo?',
        'Sim, repetir é possível.',
        'Não, sorteio nunca repete.',
        'A faixa limita resultados; ela não exige que sejam sempre diferentes.',
      ],
      [
        'Por que os limites de x ficam acima de 480?',
        'Para o cacto começar fora da tela.',
        'Para ele virar um ponto no placar.',
        'A borda direita do palco está em x 480.',
      ],
      [
        'Quanto dá -5 menos 1?',
        '-6, que anda mais rápido para a esquerda que -5.',
        '-4, que anda mais rápido para a direita.',
        'Subtrair 1 torna a velocidade mais negativa.',
      ],
    ],
  },
  13: {
    title: 'A dificuldade cresce e sabe parar',
    entry:
      'Vamos guardar a velocidade base, aumentá-la aos poucos e colocar um limite. Depois conferiremos o jogo completo.',
    exit: 'Base começa em -5, muda a cada 5 s jogando até -9; novos cactos recebem base menos sorteio. Descrição atualizada e projeto entregue.',
    steps: [
      {
        key: 'guardar-velocidade',
        title: 'Crie a memória da velocidade',
        kind: 'build',
        part: 1,
        focus: 'Preparar um valor que pode mudar durante a partida.',
        reason: 'Reutilizar a variável da aula 11 com uma nova finalidade.',
        say: 'Em Ao iniciar, crie velocidade com valor -5. Por enquanto, é o mesmo número que o cacto já usava.',
        edit: 'Manter o valor negativo e o identificador velocidade. Não confundir a base com a velocidade já atribuída a cada cacto.',
        checks: [speed],
      },
      {
        key: 'base-e-nascimento',
        title: 'Quem lê a nova velocidade?',
        kind: 'observe',
        part: 2,
        focus: 'Distinguir a base guardada e a velocidade recebida ao nascer.',
        reason:
          'Evitar a expectativa de que trocar a variável acelera retroativamente todos os cactos.',
        say: 'A base é consultada quando um cacto nasce. Este cacto antigo guarda a velocidade que já recebeu; o próximo lê a base nova.',
        visual:
          'Congelar um cacto antigo com sua seta -5. Mudar a placa da base para -6 e criar outro com seta -6. Mesma posição inicial de comparação; não mudar o sorteio nesta explicação.',
        edit: 'Complementar a gravação com placas base/antigo/novo. Primeiro demonstrar a troca -5 literal por variável -5 sem alteração de comportamento.',
      },
      {
        key: 'usar-memoria',
        title: 'Faça os novos cactos lerem a base',
        kind: 'build',
        part: 2,
        focus: 'Trocar a fonte do valor na entrada correta da conta.',
        reason: 'Pequena mudança estrutural, ainda sem mudar o ritmo do jogo.',
        say: 'Na conta da velocidade do cacto, troque somente o -5 pelo valor da variável velocidade. Preserve menos Sorteio entre 0 e 1.',
        edit: 'Preservar o sorteio e o operador. Destacar o lado A da conta para não trocar o limite do sorteio por engano.',
        checks: [speed, baseFormula, randomX],
      },
      {
        key: 'comparar-negativos',
        title: 'Veja quando a base chega ao limite',
        kind: 'observe',
        part: 3,
        focus: 'Interpretar velocidade > -9 e incremento -1.',
        reason: 'É o erro silencioso mais provável: deixar igualdade em vez de maior que.',
        say: 'Na régua, -5 é maior que -9. Somar -1 leva para -6, depois -7. Em -9, a pergunta “é maior que -9?” dá não e a base para de mudar.',
        visual:
          'Régua com -9, -8, -7, -6, -5; percorrer uma marca por vez. Mostrar a comparação verdadeira/falsa por texto e ícone. Mostrar = riscado e > escolhido sem depender da posição na lista.',
        edit: 'Reaproveitar a analogia de temperatura, encurtando para a régua. Substituir “quinto da lista” pelo símbolo > e nome maior que, pois a ordem da interface pode mudar.',
      },
      {
        key: 'aceleracao-modelo',
        title: 'Teste a base, o limite e os próximos cactos',
        kind: 'experiment',
        mission: 'acceleration',
        focus: 'Observar a regra de velocidade atribuída ao nascer sob uma base limitada.',
        reason:
          'Ver os passos de tempo e os cactos antigos sem exigir que a criança sobreviva muito tempo para comparar.',
        say: 'Crie um cacto, avance o relógio e acompanhe a base até -9. Compare com um cacto novo. No limite, descontar 1 ainda pode dar -10; o antigo conserva a velocidade que recebeu.',
      },
      {
        key: 'relogio-aceleracao',
        title: 'Monte o acelerador com limite',
        kind: 'build',
        part: 3,
        focus: 'Combinar relógio, estado e comparação numérica.',
        reason: 'A lógica foi vista por partes; agora a criança monta os dois Se aninhados.',
        say: 'Crie um relógio de 5 segundos ao lado dos outros. Dentro: Se jogando. Dentro dele: Se valor de velocidade > -9. No então de dentro, some -1 em velocidade.',
        edit: 'Preservar os três relógios irmãos e a troca de = por >. Encurtar a explicação de negativos já demonstrada. A configuração final é 5 s e base mínima -9.',
        checks: [acceleration],
      },
      {
        key: 'descricao-final',
        title: 'Conte todos os controles ao jogador',
        kind: 'build',
        part: 4,
        focus: 'Atualizar a descrição de acordo com o jogo final.',
        reason:
          'Fecha a promessa de acessibilidade iniciada na aula 1 e a relação texto/comportamento da aula 8.',
        say: 'Na descrição, escreva: Corra com o dino e pule os cactos com espaço, seta pra cima ou tocando na tela',
        edit: 'Selecionar o trecho final sobre descrição. Tirar os testes livres -7/-14 e 2/10 da tarefa obrigatória. A revisão do jogo é a entrega seguinte.',
        checks: [accessible],
      },
    ],
    finalChecks: [
      speed,
      baseFormula,
      acceleration,
      randomX,
      spawnClock,
      accessible,
      points,
      pointClock,
      noHitbox,
      c('um-acelerador', 'Use um único incremento da variável velocidade.', 'sz_js_var_increment', {
        fields: { NAME: 'velocidade' },
        count: 1,
      }),
    ],
    test: 'Confira início, salto, colisão, pontos e reinício por teclado e toque. Observe a aceleração; se terminar a partida cedo, use a revisão das peças e o exemplo do laboratório para conferir o limite. Não é preciso bater recorde para concluir.',
    corrections: [
      'O limite -9 vale para a base; um novo cacto ainda pode receber -10 depois do sorteio. Os antigos mantêm a velocidade recebida.',
      'Não exigir três partidas nem prometer que uma comparação pequena mede cientificamente a diversão.',
      'Fecho: substituir a exigência de publicação e mural por entrega do projeto e quiz. Publicar/compartilhar é uma escolha posterior, sem bloquear conclusão. Não prometer números de XP não conferidos.',
      'O trecho de Ponte pode entrar como curiosidade breve do fechamento, sem exigir mudança de modo nem nova atividade.',
    ],
    quiz: [
      [
        'Quando a base é -9 e o sorteio desconta 1, o novo cacto recebe quanto?',
        '-10.',
        '-9 obrigatoriamente.',
        'O limite protege a base; a variação é aplicada depois.',
      ],
      [
        'Qual pergunta permite acelerar até a base -9?',
        'Velocidade > -9.',
        'Velocidade = -9.',
        'Começando em -5, a igualdade com -9 seria falsa e impediria a primeira mudança.',
      ],
      [
        'Mudar a base troca a velocidade dos cactos antigos?',
        'Não; os novos consultam a base ao nascer.',
        'Sim; todos passam a usar o valor novo imediatamente.',
        'Cada cacto mantém a velocidade atribuída na criação.',
      ],
    ],
  },
}
