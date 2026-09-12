import {
  absent,
  c,
  frame,
  guarded,
  iff,
  inLoop,
  p,
  type Recipe,
  scene,
  timer,
} from './corre-dino-editorial'

const meter = c(
  'medidor',
  'Mostre a quantidade do grupo cactos no valor do medidor.',
  'sz_g2d_draw_score',
  { ...inLoop, inputBlocks: { VALUE: p('sz_g2d_count_group', { fields: { GROUP: 'cactos' } }) } },
)
const clock = (seconds: number) =>
  c('intervalo-cactos', `Mantenha a criação de cactos no relógio de ${seconds} s.`, timer, {
    area: 'loops',
    inputs: { SECS: seconds },
    inputBlocks: { BODY: p('sz_g2d_spawn_obstacle', { fields: { GROUP: 'cactos' } }) },
  })
const cleanup = c(
  'faxina',
  'Remova do grupo cactos quem saiu da tela, a cada quadro.',
  'sz_g2d_prune_offscreen',
  { ...inLoop, fields: { GROUP: 'cactos' } },
)
const noMeter = absent(
  'sem-medidor',
  'Retire o placar provisório usado como medidor.',
  'sz_g2d_draw_score',
)
const initialScene = c('cena-inicial', 'Abra o jogo na tela inicio.', 'sz_g2d_set_scene', {
  area: 'start',
  fields: { SCENE: 'inicio' },
})
const playingActions = [
  ['gravidade', 'Aplicar gravidade', 'sz_g2d_apply_gravity'],
  ['controle', 'Controlar o dinossauro', 'sz_g2d_control_dino'],
  ['desenho', 'Desenhar o Dino', 'sz_g2d_draw_sprite'],
  ['mover', 'Atualizar cactos', 'sz_g2d_update_group'],
  ['desenhar', 'Desenhar cactos', 'sz_g2d_draw_group'],
  ['limpeza', 'Remover cactos fora da tela', 'sz_g2d_prune_offscreen'],
] as const
const guardedActions = playingActions.map(([id, label, type]) =>
  c(`proteger-${id}`, `${label} deve ficar no então de Se a tela é jogando.`, iff, {
    ...inLoop,
    inputBlocks: guarded(p(type)).inputBlocks,
  }),
)
const uniqueActions = playingActions.map(([id, label, type]) =>
  c(`unico-${id}`, `Mantenha uma única ação ${label}.`, type, { count: 1 }),
)
const background = ['sz_g2d_clear', 'sz_g2d_forest'].map((type, index) =>
  c(
    `fundo-${index}`,
    `${index ? 'Floresta' : 'Limpeza da tela'} deve continuar fora do Se, diretamente no quadro.`,
    frame,
    { area: 'loops', inputBlocks: { BODY: p(type) } },
  ),
)
const guardedSpawn = c(
  'proteger-relogio',
  'No relógio de 1,4 s, crie cactos somente se a tela for jogando.',
  timer,
  {
    area: 'loops',
    inputs: { SECS: 1.4 },
    inputBlocks: { BODY: guarded(p('sz_g2d_spawn_obstacle', { fields: { GROUP: 'cactos' } })) },
  },
)
const menu = (hint: string) =>
  c('menu', 'Mostre a tela de início no senão se inicio, com a dica combinada.', iff, {
    ...inLoop,
    inputBlocks: {
      COND: scene('jogando'),
      ELSEIF_COND0: scene('inicio'),
      ELSEIF_THEN0: p('sz_g2d_show_screen', { inputs: { HINT: hint } }),
    },
  })
const hint = 'Aperte qualquer tecla ou toque na tela para começar'
const inputStart = c(
  'entrada-menu',
  'Qualquer tecla ou toque deve iniciar apenas quando a tela for inicio.',
  'sz_g2d_on_any_input',
  {
    area: 'events',
    inputBlocks: {
      BODY: guarded(p('sz_g2d_set_scene', { fields: { SCENE: 'jogando' } }), 'inicio'),
    },
  },
)
const collision = c(
  'colisao',
  'Ao o dino tocar o grupo cactos, mude para a tela fim.',
  'sz_g2d_on_sprite_group_overlap',
  {
    area: 'events',
    fields: { GROUP: 'cactos', SPRITE: 'dino', ANAME: 'cacto' },
    inputBlocks: { BODY: p('sz_g2d_set_scene', { fields: { SCENE: 'fim' } }) },
  },
)
const endScreen = c(
  'tela-fim',
  'Desenhe a tela de fim no segundo senão se, quando a cena for fim.',
  iff,
  { ...inLoop, inputBlocks: { ELSEIF_COND1: scene('fim'), ELSEIF_THEN1: p('sz_g2d_show_screen') } },
)
const restart = c(
  'reiniciar',
  'No mesmo evento de entrada, reinicie somente no senão se fim.',
  'sz_g2d_on_any_input',
  {
    area: 'events',
    inputBlocks: {
      BODY: p(iff, {
        inputBlocks: {
          COND: scene('inicio'),
          THEN: p('sz_g2d_set_scene', { fields: { SCENE: 'jogando' } }),
          ELSEIF_COND0: scene('fim'),
          ELSEIF_THEN0: p('sz_g2d_restart'),
        },
      }),
    },
  },
)

const effects = [
  c('explodir', 'Exploda o cacto que colidiu antes da tremida.', 'sz_g2d_explode', {
    area: 'events',
    withinBlock: 'sz_g2d_on_sprite_group_overlap',
    fields: { SPRITE: 'cacto' },
    beforeBlock: 'sz_g2d_shake',
  }),
  c('tremida', 'Use tremida 8 antes do som de derrota.', 'sz_g2d_shake', {
    area: 'events',
    withinBlock: 'sz_g2d_on_sprite_group_overlap',
    inputs: { INTENSITY: 8 },
    beforeBlock: 'sz_g2d_play_fx',
  }),
  c('derrota', 'Toque derrota antes de Ir para fim.', 'sz_g2d_play_fx', {
    area: 'events',
    withinBlock: 'sz_g2d_on_sprite_group_overlap',
    fields: { FX: 'gameover' },
    beforeBlock: 'sz_g2d_set_scene',
  }),
]

export const middleRecipes: Record<number, Recipe> = {
  6: {
    title: 'O que sai da tela ainda existe?',
    entry:
      'Os cactos saem da tela, mas podem continuar guardados. Vamos medir antes de fazer a limpeza.',
    exit: 'Cactos fora da tela são removidos; o relógio voltou a 1,4 s e o medidor provisório saiu.',
    steps: [
      {
        key: 'medidor',
        title: 'Monte um medidor do que está guardado',
        kind: 'build',
        part: 1,
        focus: 'Ler a quantidade real do grupo, não só contar o que aparece.',
        reason: 'A medida transforma um problema invisível em algo observável.',
        say: 'No fim de A cada quadro, coloque o placar provisório. No valor dele, encaixe Quantidade de sprites no grupo cactos.',
        edit: 'Preservar o encaixe do valor na tomada VALUE, a posição do medidor e a leitura inicial.',
        checks: [meter],
      },
      {
        key: 'provocar',
        title: 'Veja o número crescer',
        kind: 'build',
        part: 2,
        focus: 'Criar um teste curto que torna o acúmulo perceptível.',
        reason: 'A criança observa um dado do seu próprio projeto antes da explicação.',
        say: 'Troque temporariamente o relógio dos cactos para 0,1 segundo. Execute por alguns segundos e acompanhe o número, mesmo depois que cactos saem da tela.',
        edit: 'Não pedir longas esperas nem criar travamento. Parar a execução ao observar crescimento.',
        checks: [meter, clock(0.1)],
      },
      {
        key: 'visivel-guardado',
        title: 'Sair da tela é ser apagado?',
        kind: 'experiment',
        mission: 'cleanup',
        focus: 'Comparar objetos visíveis, guardados e removidos.',
        reason: 'O laboratório revela os bastidores que a tela comum esconde.',
        say: 'Observe os cactos que saíram. Ligue a limpeza e compare o que continua guardado. O objetivo é cuidar dos que já não são usados.',
      },
      {
        key: 'faxina',
        title: 'Limpe os cactos que saíram',
        kind: 'build',
        part: 3,
        focus: 'Remover objetos depois de atualizar suas posições.',
        reason: 'Aplicar a conclusão e medir novamente com a mesma carga.',
        say: 'No quadro, depois de atualizar e desenhar os cactos e antes do medidor, coloque Remover do grupo cactos os sprites fora da tela.',
        edit: 'Preservar a leitura do medidor antes e depois. Explicar que a quantidade oscila enquanto novos cactos chegam; não prometer zero.',
        checks: [
          cleanup,
          meter,
          c('medir-depois', 'Faça a faxina antes de ler o medidor.', 'sz_g2d_prune_offscreen', {
            ...inLoop,
            beforeBlock: 'sz_g2d_draw_score',
          }),
        ],
      },
      {
        key: 'aposentar-medidor',
        title: 'Volte ao ritmo da partida',
        kind: 'build',
        part: 4,
        focus: 'Restaurar a configuração de jogo e remover a instrumentação.',
        reason: 'A experiência termina com um projeto limpo e pronto para a aula seguinte.',
        say: 'Compare brevemente 0,1 e 0,5 segundo no vídeo. No seu jogo, volte o relógio para 1,4 e retire só o medidor.',
        edit: 'Manter dois ritmos como comparação observada, sem uma nova atividade obrigatória. Reaproveitar Apagar este bloco; preservar a faxina.',
        checks: [cleanup, clock(1.4), noMeter],
      },
    ],
    finalChecks: [cleanup, clock(1.4), noMeter],
    test: 'Execute com intervalo 1,4. Veja cactos entrando e saindo, sem medidor cobrindo a partida. O professor pode recolocar o instrumento numa cópia para conferir o grupo.',
    corrections: [
      'As Especificações antigas dizem que o medidor fica até a aula 7, mas Parte 4 e Fecho o retiram na aula 6. Seguir Parte 4/Fecho e a continuidade da aula 7.',
      'Retirar instrumento não é desligar a rotina de limpeza.',
    ],
    quiz: [
      [
        'Um cacto que saiu da tela foi necessariamente apagado?',
        'Não, pode continuar guardado no grupo.',
        'Sim, tudo fora da tela deixa de existir.',
        'Visibilidade e existência são coisas diferentes.',
      ],
      [
        'Por que usar o mesmo ritmo antes e depois da faxina?',
        'Para comparar o efeito da limpeza.',
        'Para mudar o tamanho do Dino.',
        'Manter o ritmo controla uma das variáveis da comparação.',
      ],
      [
        'Depois de tirar o medidor, a faxina deve ficar?',
        'Sim, ela continua cuidando do grupo.',
        'Não, o medidor é que apaga os cactos.',
        'O medidor informa; a rotina de limpeza remove.',
      ],
    ],
  },
  7: {
    title: 'O jogo só corre quando está jogando',
    entry:
      'Vamos separar inicio, jogando e fim. Hoje o jogo aprenderá a esperar; a tela com título vem na próxima aula.',
    exit: 'Preparação em inicio; movimento, desenho dos personagens e nascimento de cactos protegidos por jogando. A floresta continua visível.',
    steps: [
      {
        key: 'estado-inicial',
        title: 'Diga em qual tela o jogo começa',
        kind: 'build',
        part: 1,
        focus: 'Distinguir o nome do estado de seu desenho.',
        reason: 'Mudar o estado sozinho não muda a lógica; esse limite precisa ficar visível.',
        say: 'Em Ao iniciar, coloque Ir para a tela inicio. Observe que só dar esse nome ainda não faz o jogo esperar.',
        edit: 'Preservar a execução ainda acontecendo depois da troca. Não antecipar a tela de menu da aula 8.',
        checks: [initialScene],
      },
      {
        key: 'pergunta',
        title: 'Veja o Se e sua pergunta',
        kind: 'observe',
        part: 2,
        focus: 'Separar condição, resposta sim/não e ações do então.',
        reason: 'O formato do valor e a abertura do contêiner são novos e merecem atenção visual.',
        say: 'A pergunta entra no encaixe de condição. Se a resposta for sim, o jogo faz o que está dentro do então.',
        visual:
          'Congelar o bloco Se. Destacar primeiro COND, depois THEN. Mostrar inicio dando não e jogando dando sim, sem mudar outras peças. Texto e ícone, além da cor.',
        edit: 'Reaproveitar a pergunta da cena; mostrar a retirada da comparação de fábrica. Parar antes de embrulhar os seis comandos.',
      },
      {
        key: 'embrulhar',
        title: 'Coloque as ações dentro do Se',
        kind: 'build',
        part: 3,
        focus: 'Mover a sequência de jogo para o ramo jogando.',
        reason:
          'O gesto de embrulhar uma pilha é a principal dificuldade operacional; a seção fica dedicada a ele.',
        say: 'Deixe Limpar a tela e Floresta fora do Se. Da gravidade até a faxina, mova os seis comandos para dentro de Se a tela atual é jogando. Não copie a pilha.',
        edit: 'Manter os quatro gestos com pausas visuais: abrir espaço, pôr Se, conectar pergunta, mover a pilha. Terminar antes de proteger o relógio. A criança pausa e monta no mesmo Estúdio.',
        checks: [...guardedActions, ...background],
      },
      {
        key: 'estado-modelo',
        title: 'Quem ainda está trabalhando no início?',
        kind: 'experiment',
        mission: 'game-state',
        focus: 'Observar e impedir atividade fora do estado jogando.',
        reason:
          'Depois do primeiro Se, revelar que outra rotina também precisa obedecer ao estado.',
        say: 'Compare o início com a partida. Ligue a condição e observe quando as ações do jogo podem acontecer. Volte ao início para conferir a espera.',
      },
      {
        key: 'relogio-protegido',
        title: 'Faça o relógio esperar também',
        kind: 'build',
        part: 3,
        focus: 'Proteger a criação na rotina periódica separada.',
        reason: 'O relógio é irmão do quadro, portanto não recebeu automaticamente o primeiro Se.',
        say: 'No relógio de 1,4 segundo, coloque outro Se a tela atual é jogando e mova a criação do cacto para dentro dele.',
        edit: 'Selecionar apenas o trecho final da Parte 3 sobre o relógio. Não repetir o tutorial inteiro de embrulhar.',
        checks: [guardedSpawn],
      },
    ],
    finalChecks: [
      initialScene,
      ...guardedActions,
      ...uniqueActions,
      ...background,
      guardedSpawn,
      c('um-criador', 'Mantenha um único criador de cactos.', 'sz_g2d_spawn_obstacle', {
        count: 1,
      }),
    ],
    test: 'Reinicie a prévia em inicio: a floresta aparece, mas o Dino e os cactos não correm. Nesta aula a tela sem título é esperada. Revise os dois Se antes de entregar.',
    corrections: [
      'Não inventar um botão de começar nesta aula; ele pertence à aula 8.',
      'São dois grupos protegidos nesta aula: quadro e relógio. Evitar referências futuras a três embrulhos.',
    ],
    quiz: [
      [
        'Ir para a tela inicio já faz todas as ações pararem?',
        'Não, as ações precisam consultar o estado.',
        'Sim, o nome da tela apaga todos os blocos.',
        'O estado é informação usada pelas condições.',
      ],
      [
        'Por que o relógio precisa de outro Se?',
        'Porque roda em uma rotina separada do quadro.',
        'Porque a floresta precisa nascer duas vezes.',
        'Uma condição só protege o que está dentro dela.',
      ],
      [
        'O que deve ficar fora do Se jogando?',
        'Limpar a tela e desenhar a floresta.',
        'Criar cactos sem parar.',
        'O fundo continua aparecendo enquanto o jogo espera.',
      ],
    ],
  },
  8: {
    title: 'Uma tela de início que responde ao jogador',
    entry: 'O jogo já espera. Vamos mostrar o menu e permitir começar pelo teclado ou pelo toque.',
    exit: 'Menu em inicio, início por qualquer tecla ou toque e dica que corresponde aos controles.',
    steps: [
      {
        key: 'senao-se',
        title: 'Veja como escolher uma tela por vez',
        kind: 'observe',
        part: 1,
        focus: 'Entender o ramo senão se e o texto como peça de valor.',
        reason:
          'São dois detalhes visuais necessários para montar o menu sem confundir campo e encaixe.',
        say: 'Quando não está jogando, o próximo ramo pergunta se está no início. Dentro dele, os textos são peças conectadas ao Mostrar tela.',
        visual:
          'Destacar um ramo por vez. Depois aproximar título/subtítulo/dica e suas bordas; comparar com o campo de cor. Não animar tudo junto.',
        edit: 'Usar a explicação do senão se e das peças de texto. Na construção seguinte, manter somente os gestos e a configuração.',
      },
      {
        key: 'menu',
        title: 'Monte sua tela de início',
        kind: 'build',
        part: 1,
        focus: 'Mostrar instrução de início no estado correto.',
        reason: 'Transformar a espera invisível da aula 7 em um menu compreensível.',
        say: 'No Se do quadro, acrescente senão se inicio. Dentro, coloque Mostrar tela. Escreva o título do jogo, uma frase sobre pular cactos e a dica Aperte Enter para começar.',
        edit: 'Manter título como escolha visual breve. O identificador da cena continua inicio. A dica provisória é exata para o teste seguinte.',
        checks: [menu('Aperte Enter para começar')],
      },
      {
        key: 'enter',
        title: 'Faça o Enter começar a partida',
        kind: 'build',
        part: 2,
        focus: 'Responder à entrada somente na cena de início.',
        reason: 'Um caso simples permite testar a condição antes de ampliar o acesso.',
        say: 'Dentro de Quando acontecer, coloque Quando apertar Enter. Dentro, Se a tela é inicio, então Ir para jogando. Teste e depois toque no menu: esse primeiro evento só escuta Enter.',
        edit: 'Preservar o teste que funciona e o clique sem resposta. Retirar afirmações absolutas sobre inexistência de teclado em celulares; dizer que jogar por toque precisa funcionar.',
        checks: [
          c(
            'enter-inicia',
            'No evento Enter, vá para jogando somente se estiver em inicio.',
            'sz_g2d_on_key',
            {
              area: 'events',
              fields: { KEY: 'Enter' },
              inputBlocks: {
                BODY: guarded(p('sz_g2d_set_scene', { fields: { SCENE: 'jogando' } }), 'inicio'),
              },
            },
          ),
        ],
      },
      {
        key: 'toque-tecla',
        title: 'O menu funciona com toque?',
        kind: 'experiment',
        mission: 'controls',
        focus: 'Comparar acesso pelo teclado e pelo toque.',
        reason:
          'A limitação foi observada no próprio jogo; agora a criança testa a ligação que falta.',
        say: 'Neste exemplo, comece pelo teclado e depois pelo toque. Ligue o toque para que os dois caminhos funcionem.',
      },
      {
        key: 'entrada-completa',
        title: 'Atenda aos dois jeitos de começar',
        kind: 'build',
        part: 2,
        focus: 'Ampliar a entrada e atualizar a promessa escrita.',
        reason: 'Código e instrução visível precisam mudar juntos.',
        say: `Mova o mesmo Se para Quando apertar qualquer tecla ou tocar na tela. Apague o evento Enter. Na dica do menu, escreva: ${hint}`,
        edit: 'Usar a transferência do Se e a revisão da dica. Não duplicar o evento nem acrescentar um segundo Se separado.',
        checks: [
          inputStart,
          absent('sem-enter', 'Retire o evento exclusivo de Enter.', 'sz_g2d_on_key'),
          menu(hint),
        ],
      },
    ],
    finalChecks: [
      initialScene,
      menu(hint),
      inputStart,
      absent('sem-enter', 'Retire o evento exclusivo de Enter.', 'sz_g2d_on_key'),
      guardedSpawn,
    ],
    test: 'Reinicie a prévia. Comece por toque; reinicie e comece pelo teclado. Antes de começar, não devem nascer cactos. A dica deve descrever os dois controles.',
    corrections: [
      'Parte 3: aproveitar os testes; reduzir o passeio por cores e frases a uma escolha breve de título.',
      'Não confundir esta correção com a aula 4: aqui escutar a entrada é adequado, mas precisamos atender a mais de uma entrada.',
    ],
    quiz: [
      [
        'Quando o senão se é consultado?',
        'Quando a condição anterior deu não.',
        'Mesmo depois de a condição anterior dar sim.',
        'Os ramos escolhem um caminho por vez.',
      ],
      [
        'Trocar o controle exige revisar o quê na tela?',
        'A dica que ensina a começar.',
        'O tamanho do Dino.',
        'A instrução precisa corresponder ao comportamento.',
      ],
      [
        'Por que manter Se inicio dentro do evento?',
        'Para começar só quando estamos no menu.',
        'Para tocar o som a cada quadro.',
        'O evento pode ganhar outra função no fim da partida.',
      ],
    ],
  },
  9: {
    title: 'Colidir, terminar e jogar de novo',
    entry: 'Hoje a batida vai encerrar a partida, mostrar uma tela de fim e permitir recomeçar.',
    exit: 'Colisão com cactos dispara efeitos uma vez, muda para fim e permite reiniciar pelo mesmo evento de entrada.',
    steps: [
      {
        key: 'qual-cacto',
        title: 'Qual cacto participou da batida?',
        kind: 'observe',
        part: 1,
        focus: 'Distinguir o grupo inteiro do membro recebido pelo evento.',
        reason: 'O nome local cacto será usado na explosão; não é o nome de todo o grupo.',
        say: 'Há vários cactos no grupo. O evento aponta só o que encostou no Dino; dentro dele, vamos chamar esse cacto de cacto.',
        visual:
          'Congelar três cactos. Destacar o que colidiu e uma seta até o nome cacto no evento. Manter os outros sem destaque.',
        edit: 'Reaproveitar a apresentação do evento. Acrescentar a visualização da referência local; não ensinar criação de variável geral antes da aula 11.',
      },
      {
        key: 'colisao-fim',
        title: 'Faça a batida encerrar a partida',
        kind: 'build',
        part: 1,
        focus: 'Usar a colisão como evento que muda o estado.',
        reason: 'Primeiro observar a parada da lógica; depois dar um desenho ao estado fim.',
        say: 'Dentro de Quando acontecer, use Quando o sprite dino tocar o grupo cactos, chamando o que tocou de cacto. Dentro, vá para a tela fim.',
        edit: 'Preservar a primeira colisão. Explicar que o fundo sem texto é esperado antes do próximo passo.',
        checks: [collision],
      },
      {
        key: 'desenhar-fim',
        title: 'Mostre que a partida acabou',
        kind: 'build',
        part: 2,
        focus: 'Acrescentar o terceiro ramo exclusivo de tela.',
        reason: 'O estado fim já existe; falta sua representação visível.',
        say: 'No Se do quadro, depois de inicio, acrescente senão se fim. Dentro, coloque Mostrar tela com uma mensagem de fim e uma dica para jogar novamente.',
        edit: 'Preservar o segundo senão se e textos. O placar numérico só entra na aula 11.',
        checks: [endScreen],
      },
      {
        key: 'efeitos-batida',
        title: 'Mostre e sinalize a batida',
        kind: 'build',
        part: 3,
        focus: 'Encadear efeitos no evento antes da mudança de cena.',
        reason: 'Os efeitos comunicam a causa do fim, sem uma nova exploração de estética.',
        say: 'No evento da colisão, antes de Ir para fim: exploda o cacto que tocou, tremida 8 e som de derrota. Mantenha essa ordem.',
        edit: 'Preservar o resultado visual e sonoro; manter texto de fim como alternativa perceptível ao áudio.',
        checks: effects,
      },
      {
        key: 'reset-modelo',
        title: 'Recomeçar é só trocar de tela?',
        kind: 'experiment',
        mission: 'restart',
        focus: 'Distinguir a cena de fim de uma nova partida preparada.',
        reason: 'Entender o reset antes de montar o segundo ramo do evento de entrada.',
        say: 'Neste exemplo, termine uma partida e ligue o reinício. Compare o estado de fim com a nova partida preparada.',
      },
      {
        key: 'jogar-novamente',
        title: 'Monte o caminho de volta',
        kind: 'build',
        part: 4,
        focus: 'Usar a mesma entrada com ação diferente conforme o estado.',
        reason: 'Reutiliza a estrutura da aula 8, evitando eventos duplicados.',
        say: 'No Se do evento de qualquer tecla ou toque, acrescente senão se fim. Dentro, coloque Reiniciar o jogo.',
        edit: 'Preservar o evento único. Conferir que reiniciar não ficou solto nem no ramo inicio.',
        checks: [
          restart,
          c(
            'evento-unico',
            'Mantenha um único evento de qualquer tecla ou toque.',
            'sz_g2d_on_any_input',
            { count: 1 },
          ),
        ],
      },
    ],
    finalChecks: [
      collision,
      endScreen,
      restart,
      initialScene,
      c('evento-unico', 'Mantenha um único evento de entrada.', 'sz_g2d_on_any_input', {
        count: 1,
      }),
      ...effects,
    ],
    test: 'Faça uma rodada completa: início → partida → colisão → fim → reinício. Confira efeitos e repita o reinício pelo toque. Na nova partida, nenhum cacto antigo deve permanecer.',
    corrections: [
      'Parte 5: trocar três partidas obrigatórias por uma rodada completa e uma conferência da outra entrada. Não tornar recorde, convite a amigos ou competição requisito.',
      'A justiça da área de colisão será investigada na aula 10; não desviar desta aula para calibrá-la.',
    ],
    quiz: [
      [
        'O nome cacto dentro do evento indica o quê?',
        'O cacto que participou daquela colisão.',
        'O grupo inteiro de cactos.',
        'O evento fornece uma referência ao membro envolvido.',
      ],
      [
        'Onde colocar Reiniciar?',
        'No ramo fim do evento de entrada.',
        'Solto dentro de A cada quadro.',
        'Reiniciar precisa depender da intenção do jogador no estado correto.',
      ],
      [
        'Por que desenhar a tela de fim em outro ramo?',
        'Porque fim e jogando são estados diferentes.',
        'Para criar mais um Dino.',
        'Uma cena por vez recebe seu desenho.',
      ],
    ],
  },
}
