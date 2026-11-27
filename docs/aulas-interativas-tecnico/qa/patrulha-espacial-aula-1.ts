import type { ConstrutorAula } from './construtor-base-tipos'
import {
  guardaPatrulha,
  montagemPatrulha,
  montarFalaPatrulha,
  passosGuardaPatrulha,
  TIPOS_GUARDA,
} from './patrulha-espacial-editorial'
import { experienciaEixosPatrulha } from './patrulha-espacial-experiencias'

export const patrulhaAula1: ConstrutorAula = {
  slug: 'aula-1',
  title: 'Da tela ao espaço',
  entryStage: 'inicio',
  entry:
    'A nave já se move para os lados depois de Enter. Cena, câmera, três modelos, grupos vazios, percursos, abertura, estado e telas finais estão preparados. As velocidades dos grupos ainda são zero.',
  outcome:
    'Cada aperto de Espaço cria um laser na posição lateral da nave; ele viaja pelo Z negativo e sai do grupo ao ultrapassar o limite.',
  trechos: [
    {
      key: 'abertura',
      title: 'Conheça a Patrulha Espacial',
      kind: 'intro',
      objective: 'Experimentar o jogo completo e reconhecer a nova rota em três dimensões.',
      ponte:
        'Sua vez de pilotar! Clique no jogo, pressione Enter, mova com as setas e toque em Espaço para atirar. Tente acertar vinte asteroides com suas três vidas. Quando terminar, clique em Próxima parte.',
      text: montarFalaPatrulha([
        [
          'abertura',
          'Oi! Sua nave já abriu uma rota em duas dimensões. Agora você vai construir a Patrulha Espacial, com uma rota que vem lá do fundo até a nave.',
        ],
        ['pergunta', 'A missão continua sendo acertar vinte asteroides?'],
        [
          'conversa',
          'Continua! Cada asteroide acertado vale um ponto. Você tem três vidas, e uma pedra que passa sem bater na nave não tira vida. Olha como essa rota aparece no espaço.',
        ],
        [
          'teste',
          'Eu clico no jogo e pressiono Enter para começar. Seguro a seta da direita um pouquinho e solto. Agora toco uma vez em Espaço: o laser sai da nave e segue para o fundo.',
        ],
        [
          'conversa',
          'Depois de uma vitória ou de uma derrota, o botão Voltar ao início prepara uma nova partida. Você volta à abertura e pressiona Enter para jogar de novo.',
        ],
        [
          'descoberta',
          'Na construção, vamos reaplicar ideias que você usou na nave em duas dimensões: acontecimentos, grupos, acertos, pontos e vidas. E vamos descobrir como escolher o lugar e o caminho das coisas nesse espaço em três dimensões.',
        ],
        [
          'teste',
          'Agora experimente você! Clique no jogo, pressione Enter e pilote. Jogue o quanto quiser. Quando terminar, clique em Próxima parte.',
        ],
      ]),
      kids: ['A missão continua sendo acertar vinte asteroides?'],
      screen:
        'Na edição, apresentar o título sobre uma imagem do projeto completo. No "Olha como essa rota", ampliar o jogo [ampliar jogo]. No "Eu clico no jogo", dar foco [tocar jogo]. No "pressiono Enter", começar [tecla Enter]. No "Seguro a seta da direita um pouquinho e solto", mover [segurar tecla ArrowRight por 0,4 s]. No "toco uma vez em Espaço", disparar uma vez [tecla Space]. Na explicação do resultado, usar na edição uma imagem real da tela nativa com o botão Voltar ao início, sem uma partida inteira. No "Agora experimente você", voltar à aula [voltar à aula]. No "clique em Próxima parte", avançar [próxima parte].',
      steps: [
        'Clique no jogo e pressione Enter.',
        'Use as setas esquerda e direita para mover a nave. Cada aperto de Espaço dispara um laser.',
        'Acerte 20 asteroides antes de perder as três vidas. Uma pedra que passa sem bater não tira vida.',
        'No resultado, clique em Voltar ao início. Na abertura, Enter começa outra partida.',
      ],
      tests: ['Experimente a versão completa; não é preciso vencer para seguir.'],
      blockLabels: [],
      blockTypes: [],
    },
    {
      key: 'seu-passo-a-passo',
      title: 'Seu passo a passo do projeto',
      kind: 'material',
      objective: 'Conhecer o caderno de consulta e os caminhos de ajuda da plataforma.',
      ponte:
        'Aqui está seu Passo a passo do projeto. Você pode consultar o livro ou clicar em Baixar para guardar o PDF. Quando quiser continuar, clique em Próxima parte.',
      text: montarFalaPatrulha([
        [
          'conversa',
          'Este é o seu Passo a passo da Patrulha Espacial. Ele acompanha as montagens, com os blocos, os lugares de encaixar e os testes de cada parte.',
        ],
        [
          'teste',
          'Se esquecer um campo ou um encaixe, pode voltar aqui e consultar. Você pode abrir o livro na aula. Se quiser guardar o material, clique em Baixar.',
        ],
        [
          'conversa',
          'Os links do Como fazer ajudam a usar a plataforma. Para uma dúvida sobre o seu jogo, você encontra Preciso de ajuda no fim da aula.',
        ],
        ['instrucao', 'Quando quiser começar a construção, clique em Próxima parte.'],
      ]),
      screen:
        'No "Este é o seu Passo a passo", apontar o livro [apontar livro]. No "os blocos, os lugares de encaixar e os testes", abrir e folhear uma montagem [livro tela cheia] [livro próxima]. No "pode voltar aqui e consultar", sair da tela cheia [livro sair da tela cheia]. No "clique em Baixar", baixar [baixar]. No "Os links do Como fazer", apontar a área de materiais [apontar "Como usar o Estúdio"]. No "Preciso de ajuda", apontar o rótulo sem enviar nada [apontar "Preciso de ajuda"]. No "clique em Próxima parte", avançar [próxima parte].',
      steps: [
        'Consulte o Passo a passo do projeto quando precisar de um bloco, de um encaixe ou de um teste.',
        'Se quiser guardar o PDF, clique em Baixar.',
        'Use os links do Como fazer para dúvidas sobre a plataforma e Preciso de ajuda para pedir orientação sobre o jogo.',
      ],
      tests: [],
      blockLabels: [],
      blockTypes: [],
    },
    experienciaEixosPatrulha(),
    montagemPatrulha({
      key: 'um-aperto-um-laser',
      title: 'Um aperto, um laser',
      etapa: 'disparo',
      objective: 'Criar uma cópia do laser ao apertar Espaço, somente durante a partida.',
      ponte:
        'Programe o disparo: cada aperto de Espaço cria um laser. Nesta parte ele nasce parado no meio; o caminho vem logo depois.',
      falas: [
        [
          'teste',
          'Clique em Rodar de novo, no alto do Estúdio. Pressione Enter e toque em Espaço. Tá vendo? Ainda não aparece laser, porque esse acontecimento está por construir.',
          '[rodar de novo] [tecla Enter] [tecla Space]',
        ],
        [
          'conversa',
          'Lembra da experiência da parte anterior? Você investigou x para os lados, y para a altura e z para a profundidade. Agora vamos criar um laser parado e usar essas direções para escolher onde ele nasce.',
        ],
        [
          'instrucao',
          'Encontre a área Quando acontecer. Se precisar, arraste um espaço vazio entre os blocos até ela aparecer.',
          '[arrastar até "Quando acontecer"]',
        ],
        [
          'instrucao',
          'Deixe à vista um espaço livre dentro de Quando acontecer, ao lado do acontecimento de Enter.',
          '[apontar abaixo de "Quando apertar a tecla Enter"]',
        ],
        [
          'instrucao',
          'Abra Jogo 3D e depois Controles. Pegue Quando apertar a tecla e coloque nesse espaço.',
          '[abrir categoria Jogo 3D > Controles] [encaixar "Quando apertar a tecla" abaixo de "Quando apertar a tecla Enter"]',
        ],
        [
          'instrucao',
          'No campo da tecla, escolha espaço, que aparece com pular entre parênteses. O que ele vai fazer aqui depende dos blocos que você colocar dentro.',
          '[trocar "W (frente)" por "espaço (pular)" em "Quando apertar a tecla W (frente)"]',
        ],
        ...guardaPatrulha('Quando apertar a tecla espaço', 'o acontecimento de Espaço', true),
        [
          'conversa',
          'Essa pergunta usa o começo que já está no seu jogo: Enter muda o estado para jogando. Assim, Espaço só dispara depois que a partida começou.',
        ],
        [
          'instrucao',
          'Deixe à vista o espaço então desse Se.',
          '[apontar encaixe em "Se dentro de Quando apertar a tecla espaço" no "então"]',
        ],
        [
          'instrucao',
          'Abra Jogo 3D e depois Grupos. Pegue Criar uma cópia e encaixe no então.',
          '[abrir categoria Jogo 3D > Grupos] [encaixar "Criar uma cópia" em "Se dentro de Quando apertar a tecla espaço" no "então"]',
        ],
        [
          'instrucao',
          'No primeiro campo, escolha moldeTiro. No campo do grupo, escolha tiros.',
          '[trocar "molde" por "moldeTiro" em "Criar uma cópia"] [trocar "inimigos" por "tiros" em "Criar uma cópia"]',
        ],
        [
          'instrucao',
          'Conserve x em zero. Mude y para um e z para menos um vírgula seis.',
          'nota de gravação manual: no bloco Criar uma cópia de moldeTiro, mudar apenas y de 0 para 1 e z de 0 para -1.6; conservar x em 0. Os três zeros não são distinguíveis pelo nome do campo no resolvedor atual.',
        ],
        [
          'descoberta',
          'O y deixa o laser na altura da nave. O z coloca o laser um pouco à frente dela, na direção do fundo. Ainda vamos fazer o x acompanhar a nave.',
        ],
        [
          'instrucao',
          'Deixe à vista o encaixe logo abaixo de Criar uma cópia, ainda dentro do então.',
          '[apontar abaixo de "Criar uma cópia"]',
        ],
        [
          'instrucao',
          'Abra Jogo 3D, depois Som. Encaixe Tocar nota abaixo da cópia. Mude a frequência para oitocentos e oitenta e a duração para sessenta.',
          '[abrir categoria Jogo 3D > Som] [encaixar "Tocar nota" abaixo de "Criar uma cópia"] [trocar "440" por "880" em "Tocar nota"] [trocar "200" por "60" em "Tocar nota"]',
        ],
        [
          'teste',
          'Clique em Rodar de novo. Toque em Espaço antes de Enter: nada de laser. Agora pressione Enter e toque em Espaço uma vez. O laser aparece parado perto da frente da nave, com um som curtinho.',
          '[rodar de novo] [tecla Space] [tecla Enter] [tecla Space] [apontar prévia]',
        ],
        [
          'teste',
          'Segure a seta da direita um pouquinho. A nave sai do centro, e você consegue ver que o laser ficou no lugar onde nasceu.',
          '[segurar tecla ArrowRight por 0,4 s] [apontar prévia]',
        ],
      ],
      steps: [
        'Em Quando acontecer, deixe um espaço livre visível. Em Jogo 3D → Controles, pegue Quando apertar a tecla e coloque dentro da área.',
        'No campo da tecla, escolha espaço (pular).',
        ...passosGuardaPatrulha('Quando apertar a tecla espaço'),
        'Deixe o então do Se visível. Em Jogo 3D → Grupos, encaixe Criar uma cópia de no grupo em x y z nesse então.',
        'Escolha moldeTiro e tiros. Deixe X = 0, Y = 1 e Z = -1.6.',
        'Deixe o encaixe abaixo da cópia visível. Em Jogo 3D → Som, encaixe Tocar nota abaixo dela. Use frequência 880 Hz e duração 60 ms.',
      ],
      tests: [
        'Rodar de novo. Antes de Enter, Espaço não cria laser.',
        'Depois de Enter, um aperto de Espaço cria um laser parado e toca uma nota curta.',
        'Mova a nave para o lado; o primeiro laser permanece perto do centro.',
      ],
      blockLabels: [
        'Quando apertar a tecla espaço (pular)',
        'Se estado = jogando',
        'Criar uma cópia de moldeTiro no grupo tiros em x 0 y 1 z -1.6',
        'Tocar nota 880 Hz por 60 ms',
      ],
      blockTypes: ['sz_g3d_on_key', ...TIPOS_GUARDA, 'sz_g3d_spawn_copy', 'sz_g3d_play_note'],
      conferencia:
        'o acontecimento usa espaço, o Se pergunta estado igual a jogando, a cópia usa moldeTiro no grupo tiros com x zero, y um e z menos um vírgula seis, e a nota está abaixo da cópia',
      mostrar: 'Quando apertar a tecla espaço',
    }),
    montagemPatrulha({
      key: 'laser-segue-a-nave',
      title: 'O laser nasce na nave',
      etapa: 'origem',
      objective: 'Usar a posição X atual da nave como origem lateral de cada disparo.',
      ponte:
        'Faça o laser sair da nave: troque o x fixo pela posição x da nave. Mova a nave para um lado e dispare para comparar.',
      falas: [
        [
          'conversa',
          'Seu laser já nasce quando você aperta Espaço. Só que ele sempre nasce no centro, mesmo quando a nave está ao lado. Vamos usar a posição da nave para escolher o lugar de cada novo laser.',
        ],
        ['pergunta', 'Ele precisa acompanhar a nave mesmo depois de sair?'],
        [
          'conversa',
          'Ele pega o lugar da nave no momento do disparo. Depois, segue o próprio caminho. É como soltar uma bolinha: ela sai de onde sua mão está naquele momento.',
        ],
        [
          'instrucao',
          'Em Quando acontecer, encontre Criar uma cópia de moldeTiro dentro do acontecimento de Espaço. Deixe o zero do x à vista.',
          '[arrastar até "Quando apertar a tecla espaço"] [apontar bloco "Criar uma cópia de moldeTiro"]',
        ],
        [
          'instrucao',
          'Abra Jogo 3D, depois Objetos e Posição, giro e tamanho. Pegue posição x do objeto.',
          '[abrir categoria Jogo 3D > Objetos > Posição, giro e tamanho]',
        ],
        [
          'instrucao',
          'Solte esse bloco em cima do zero do x da cópia.',
          '[soltar "posição x do objeto" em cima do "0" em "Criar uma cópia de moldeTiro"]',
        ],
        [
          'instrucao',
          'Conserve o eixo em x. No objeto, escolha nave.',
          '[trocar "jogador" por "nave" em "posição x do objeto dentro de Criar uma cópia de moldeTiro"]',
        ],
        [
          'descoberta',
          'Agora o x da cópia lê o x da nave. O y continua um, e o z continua menos um vírgula seis.',
        ],
        [
          'teste',
          'Clique em Rodar de novo e pressione Enter. Segure a seta da direita um pouquinho, solte e toque em Espaço. O laser nasce na nova posição lateral da nave.',
          '[rodar de novo] [tecla Enter] [segurar tecla ArrowRight por 0,4 s] [tecla Space] [apontar prévia]',
        ],
        [
          'teste',
          'Mova a nave para a esquerda e dispare de novo. Você criou lasers em dois lugares diferentes. Eles ainda ficam parados; a próxima parte cuida do caminho.',
          '[segurar tecla ArrowLeft por 0,7 s] [tecla Space] [apontar prévia]',
        ],
      ],
      steps: [
        'Em Quando acontecer, encontre a cópia do moldeTiro no evento Espaço e deixe o campo X visível.',
        'Em Jogo 3D → Objetos → Posição, giro e tamanho, pegue posição x do objeto e solte sobre o 0 do X dessa cópia.',
        'No bloco de posição, use eixo x e objeto nave. Conserve Y = 1 e Z = -1.6 na cópia.',
      ],
      tests: [
        'Rodar de novo → Enter. Mova para a direita, solte e aperte Espaço: o laser nasce no X atual da nave.',
        'Mova para a esquerda e aperte Espaço outra vez: o novo laser nasce no novo X. Os lasers anteriores não acompanham a nave.',
      ],
      blockLabels: ['posição x do objeto nave', 'Criar uma cópia de moldeTiro no grupo tiros'],
      blockTypes: ['sz_g3d_get_pos'],
      conferencia:
        'o bloco posição x do objeto nave ocupa o x da cópia de moldeTiro, e y e z continuam um e menos um vírgula seis',
      mostrar: 'Criar uma cópia de moldeTiro',
    }),
    montagemPatrulha({
      key: 'laser-em-profundidade',
      title: 'O laser segue para o fundo',
      etapa: 'trajeto-tiro',
      objective: 'Escolher a velocidade negativa em Z para o grupo de tiros.',
      ponte:
        'Dê velocidade ao laser. O número negativo faz ele voar para longe, na direção dos asteroides.',
      falas: [
        [
          'conversa',
          'O laser já nasce na nave. Agora ele precisa percorrer a rota. Na investigação da Ilha, você viu que z muda a profundidade. Neste jogo, seguir da nave para o fundo é diminuir o z.',
        ],
        [
          'instrucao',
          'Encontre Ao iniciar e procure Criar variável velocidadeTiros com valor zero.',
          '[arrastar até "Ao iniciar"] [apontar bloco "Criar variável velocidadeTiros"]',
        ],
        [
          'instrucao',
          'No valor dessa variável, troque zero por menos vinte e dois.',
          '[trocar "0" por "-22" em "Criar variável velocidadeTiros"]',
        ],
        [
          'descoberta',
          'O percurso preparado lê esse valor para movimentar cada tiro no eixo z. O sinal de menos escolhe a direção do fundo. O tamanho do número escolhe a rapidez.',
        ],
        [
          'teste',
          'Clique em Rodar de novo e pressione Enter. Mova a nave um pouquinho e toque em Espaço. O laser nasce na frente dela e viaja para o fundo.',
          '[rodar de novo] [tecla Enter] [segurar tecla ArrowRight por 0,3 s] [tecla Space] [apontar prévia]',
        ],
        [
          'teste',
          'Aperte e solte Espaço algumas vezes. Cada aperto cria seu próprio laser, e todos seguem a mesma direção.',
          '[tecla Space] [tecla Space] [apontar prévia]',
        ],
      ],
      steps: [
        'Em Ao iniciar, encontre Criar variável velocidadeTiros com valor 0.',
        'Troque apenas o valor 0 por -22. Conserve o nome velocidadeTiros.',
      ],
      tests: [
        'Rodar de novo → Enter. Mova a nave e aperte Espaço: o laser viaja para o fundo, pelo Z negativo.',
        'Aperte e solte Espaço mais de uma vez. Cada aperto cria um novo laser.',
      ],
      blockLabels: ['Criar variável velocidadeTiros com valor -22'],
      blockTypes: ['sz_js_var_create'],
      conferencia:
        'velocidadeTiros começa com menos vinte e dois em Ao iniciar, e o disparo continua usando a posição x da nave',
      mostrar: 'Criar variável velocidadeTiros',
    }),
    montagemPatrulha({
      key: 'fim-do-caminho-do-laser',
      title: 'O laser tem um fim de caminho',
      etapa: 'limite-tiro',
      objective: 'Retirar do grupo os lasers que ultrapassaram os limites de profundidade.',
      ponte:
        'Tire do jogo os lasers que já foram longe demais. Teste vários disparos e envie a primeira versão da sua patrulha.',
      falas: [
        [
          'conversa',
          'O laser já vai para o fundo. Só sair da nossa vista não retira o objeto do jogo. Vamos dar um fim ao caminho dele, como você fez com os objetos que saíam da tela no jogo em duas dimensões.',
        ],
        [
          'instrucao',
          'Encontre Enquanto estiver rodando e o bloco A cada quadro da cena. Dentro dele, procure o Se que pergunta estado igual a jogando.',
          '[arrastar até "Enquanto estiver rodando"] [apontar bloco "A cada quadro da cena"]',
        ],
        [
          'instrucao',
          'Desça até o final das ações desse Se. Deixe à vista o encaixe depois dos percursos dos grupos, ainda dentro do então.',
          '[apontar abaixo de "Para cada objeto asteroide do grupo asteroides abaixo de Mover o grupo asteroides"]',
        ],
        [
          'instrucao',
          'Abra Jogo 3D e Grupos. Pegue No grupo inimigos, tirar quem saiu e encaixe nesse lugar.',
          '[abrir categoria Jogo 3D > Grupos] [encaixar "No grupo inimigos, tirar quem saiu" abaixo de "Para cada objeto asteroide do grupo asteroides abaixo de Mover o grupo asteroides"]',
        ],
        [
          'instrucao',
          'Escolha o grupo tiros. No primeiro limite, escreva menos trinta e seis. No segundo, escreva três. No eixo, escolha Z.',
          '[trocar "inimigos" por "tiros" em "No grupo inimigos, tirar quem saiu"] [trocar "-20" por "-36" em "No grupo tiros, tirar quem saiu"] [trocar "20" por "3" em "No grupo tiros, tirar quem saiu"] [trocar "↔ X" por "↗ Z" em "No grupo tiros, tirar quem saiu"]',
        ],
        [
          'descoberta',
          'O tiro nasce em z menos um vírgula seis. Ele continua no grupo enquanto fica entre menos trinta e seis e três. Depois que passa do limite lá do fundo, o bloco o retira.',
        ],
        [
          'teste',
          'Clique em Rodar de novo. Antes de Enter, toque em Espaço: não deve sair laser. Depois de Enter, mova a nave, solte a seta e dispare.',
          '[rodar de novo] [tecla Space] [tecla Enter] [segurar tecla ArrowRight por 0,3 s] [tecla Space]',
        ],
        [
          'teste',
          'Veja o laser nascer na nave e seguir até o fundo. Espere um pouquinho e dispare outra vez. O novo laser funciona normalmente. A imagem mostra o caminho; o botão Verificar projeto também confere se o laser antigo foi retirado do grupo.',
          '[apontar prévia] nota de edição: manter a prévia por três segundos [tecla Space]',
        ],
      ],
      steps: [
        'Em Enquanto estiver rodando → A cada quadro da cena → Se estado = jogando, deixe visível o último encaixe do então, depois dos percursos.',
        'Em Jogo 3D → Grupos, pegue No grupo inimigos, tirar quem saiu e encaixe no final desse então.',
        'Escolha grupo tiros, limites -36 e 3 e eixo Z.',
      ],
      tests: [
        'Antes de Enter, Espaço não dispara.',
        'Depois de Enter, mova e dispare. O laser nasce no X da nave e segue para o fundo.',
        'Espere pelo menos dois segundos. Verificar projeto também confere que o laser saiu do grupo; ele não apenas ficou fora da imagem.',
      ],
      blockLabels: ['No grupo tiros, tirar quem saiu de -36 a 3 no eixo Z'],
      blockTypes: ['sz_g3d_prune_area'],
      conferencia:
        'o limite do grupo tiros está dentro do Se de jogando, no fim do quadro, com menos trinta e seis, três e eixo Z',
      mostrar: 'No grupo tiros, tirar quem saiu',
      entrega: {
        reconhecimento:
          'Você construiu o disparo da patrulha: cada laser nasce na nave, viaja pelo espaço e termina o caminho!',
        depois: 'Quando aparecer Projeto enviado!, clique em Concluir aula.',
        saida: 'Concluir aula',
      },
    }),
  ],
}
