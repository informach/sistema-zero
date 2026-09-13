import { step } from './desafio-aulas-00-02'
import { finalChecks, checks as k } from './desafio-checks'
import type { Recipe } from './desafio-editorial'

export const lateRecipes: Record<number, Recipe> = {
  3: {
    title: 'Asteroides chegam e os tiros acertam',
    entry: 'Retomar o Dia 2: nave controlada e tiros que sobem.',
    exit: 'Asteroides nascem em posições sorteadas, caem e podem ser destruídos pelos tiros.',
    minutes: '18–27 minutos',
    opening:
      'Hoje seus tiros vão ter o que acertar. Vamos fazer os asteroides chegarem aos poucos e ensinar o jogo a perceber quando um tiro encontra uma pedra.',
    closing:
      'A chuva de asteroides já funciona, e os tiros conseguem destruí-los. Você usou um relógio para criar e uma colisão para responder ao encontro de dois objetos. Amanhã, cada acerto vai valer ponto.',
    steps: [
      step(
        'grupo-asteroides',
        'Prepare o grupo das pedras',
        'Parte 1.',
        'build',
        'Separar tiros e asteroides em grupos diferentes.',
        'Em Jogo 2D, Muitos, coloque outro Criar grupo de sprites no final de Ao iniciar. Deixe o nome asteroides. O grupo tiros continua lá: cada grupo cuida de um tipo de objeto.',
        { checks: k.grupoAsteroides },
      ),
      step(
        'intervalo',
        'Um relógio mais rápido cria mais?',
        'Parte 2.',
        'experiment',
        'Relacionar intervalo de nascimento com quantidade no mesmo período.',
        'Compare nascer a cada 20 quadros e a cada 40 quadros. Nos dois testes, observe 120 quadros. A velocidade de queda fica igual. Conte quantas pedras nasceram em cada situação.',
        {
          experiment: 'intervalo',
          question: [
            'Em 120 quadros, qual relógio cria mais asteroides?',
            'O de 20 quadros entre os nascimentos.',
            'O de 40 quadros entre os nascimentos.',
            'O intervalo de 20 cabe seis vezes em 120; o de 40 cabe três. Isso muda a frequência, não a velocidade de queda.',
          ],
          reason:
            'Separar frequência de velocidade antes da montagem evita interpretar um número maior como chuva mais intensa.',
          visual:
            'Contagem de quadros 0, 40, 80, 120 e fichas dos asteroides que nasceram. As fichas são um registro, não sprites acumulados no jogo.',
          help: 'Conte os nascimentos no mesmo total de quadros. Um intervalo menor se repete mais vezes.',
        },
      ),
      step(
        'relogio',
        'Monte o relógio dos asteroides',
        'Parte 2.',
        'build',
        'Criar uma repetição periódica separada do motor principal.',
        'Em Jogo 2D, Tempo e repetição, pegue A cada quadros e coloque 40. Ele fica em Enquanto estiver rodando, como vizinho do A cada quadro do jogo. Não encaixe um relógio dentro do outro.',
        {
          checks: k.relogio,
          visual:
            'Área Enquanto estiver rodando com dois contornos destacados: o motor principal e o relógio de 40 quadros. Mostrar a conexão de vizinhos e o espaço BODY do novo relógio.',
          help: 'O motor não deve contornar o relógio de 40 quadros. Os dois pertencem diretamente à área de repetição.',
        },
      ),
      step(
        'nascer-fora',
        'Observe posição e velocidade',
        'Parte 3.',
        'observe',
        'Distinguir y negativo de vy positivo e reconhecer o sorteio de x.',
        'Este menos 30 é o lugar onde a pedra nasce: acima da tela. Já o vy 3 é a velocidade: faz a pedra descer. O x é sorteado quando ela nasce; não troca de lugar a cada quadro. Um sorteio também pode cair perto de outro.',
        {
          edit: 'Recortar a explicação do x sorteado, y e vy. Substituir “lugar novo” por “posição sorteada”, pois resultados podem repetir. Mostrar caixa completa fora da área antes de entrar.',
          visual:
            'Faixa superior externa ao retângulo da tela, y −30 marcado, seta de velocidade para baixo e dois sorteios possíveis de x. A passagem é observada sem controles.',
          help: 'y responde “onde está?”; vy responde “como muda de altura?”.',
        },
      ),
      step(
        'asteroide',
        'Crie a pedra no relógio',
        'Parte 3.',
        'build',
        'Configurar nascimento e movimento vertical do asteroide.',
        'Dentro do relógio, encaixe No grupo criar um asteroide, de Jogo 2D, Kit espaço. Grupo asteroides; no x, encaixe um x aleatório na tela, de Mira e contas. Use y menos 30, tamanho 40, vx 0 e vy 3. Escolha uma cor visível.',
        {
          checks: k.asteroide,
          edit: 'Aproveitar a montagem dos campos; encurtar a explicação já demonstrada. O tamanho 40 é a base do kit: não prometer que toda pedra tem exatamente a mesma largura.',
        },
      ),
      step(
        'ciclo-asteroides',
        'Use o padrão que você já conhece',
        'Parte 4.',
        'build',
        'Transferir o ciclo mover, retirar, desenhar para outro grupo.',
        'No A cada quadro do jogo, abaixo do Desenhar grupo tiros, coloque Atualizar o grupo, Tirar do grupo quem sair da tela e Desenhar o grupo. Agora escolha asteroides nos três. Deixe o fazer da limpeza vazio. O padrão é o mesmo dos tiros.',
        {
          checks: k.cicloAsteroides,
          reason:
            'Reutilizar um padrão já dominado dá fluidez; não fragmentar em três vídeos para repetir o mesmo gesto.',
          help: 'Se os tiros mudaram e as pedras não, confira qual grupo foi escolhido em cada bloco.',
        },
      ),
      step(
        'encontro',
        'Observe quais dois objetos se encontraram',
        'Parte 5.',
        'observe',
        'Distinguir o grupo inteiro dos dois objetos de uma colisão.',
        'Há vários tiros e várias pedras, mas esta colisão tem dois participantes. Aqui dentro, tiro é o tiro que acertou, e asteroide é a pedra atingida. São esses dois que vamos retirar. Os outros continuam no jogo.',
        {
          to: 'aqui dentro, a gente consegue mandar ordens certinhas pros dois que se bateram.',
          edit: 'Aproveitar a explicação dos apelidos. Acrescentar congelamento de uma colisão com outros objetos ao redor. Não mover a colisão para Quando acontecer: este bloco verifica encontros em cada quadro.',
          visual:
            'Congelar três tiros e três pedras, destacar um par, ligar às etiquetas tiro/asteroide e remover só esse par. Voltar ao jogo com os demais presentes.',
          help: 'tiros é o grupo; tiro é um participante daquele encontro.',
        },
      ),
      step(
        'colisao',
        'Faça a colisão destruir os dois',
        'Parte 5.',
        'build',
        'Responder à colisão entre os grupos a cada quadro.',
        'Em Jogo 2D, Colisões, coloque Para cada colisão entre os grupos no motor, depois de desenhar asteroides. Escolha tiros e asteroides, com apelidos tiro e asteroide. Dentro: retire tiro de tiros; retire asteroide de asteroides; solte explosão em asteroide; toque som de explosão.',
        {
          checks: k.colisaoTiros,
          visual:
            'Mostrar primeiro grupos e apelidos, depois os quatro encaixes no mesmo BODY. Destacar que a explosão usa a referência do asteroide atingido, mesmo depois de removido do grupo.',
          help: 'Se todas as pedras somem, confira se usou Tirar o sprite do grupo, apontando para o apelido daquela colisão.',
        },
      ),
      step(
        'teste-colisao',
        'Observe um acerto e uma tentativa',
        'Parte 6.',
        'observe',
        'Conferir que a colisão remove somente objetos que se encontram.',
        'Um tiro que passa longe continua subindo. Um tiro que encontra um asteroide tira os dois e solta a explosão. Nesta aula, a nave ainda não perde vida quando uma pedra encosta nela. Isso vem no Dia 4.',
        {
          to: 'Sente como o seu jogo já parece um jogo de verdade.',
          edit: 'Usar os acertos do início; acrescentar um tiro que erra. Retirar novos testes com 20 e 80, já substituídos pela comparação isolada.',
          visual:
            'Um disparo sem colisão e outro com colisão; contagem visual dos objetos retirados.',
          help: 'Se atravessar a pedra, confira a colisão dentro do motor, os dois grupos e o bloco que tira cada participante.',
        },
      ),
    ],
    test: 'Teste um tiro que erra e outro que acerta. No acerto, confira se só o tiro e a pedra envolvidos saem. Observe outras pedras chegando e saindo por baixo. Mantenha intervalo 40 e vy 3. Envie o projeto; ainda não é necessário desviar para preservar vidas.',
    finalChecks: finalChecks(3),
    corrections: [
      'Não exigir que cada sorteio de x seja diferente. O runtime sorteia posição sem memória de resultados anteriores.',
      'O kit varia o tamanho real em torno da base 40. Não usar essa base como prova de largura idêntica de todos os asteroides.',
      'A limpeza não deve tirar asteroides que nasceram fora e ainda estão entrando. Isso será validado com o runtime real.',
      'A nave ainda não tem dano: retirar a sugestão de que desviar já é uma regra de sobrevivência. Pode mover para mirar.',
      'As colisões são comandos do motor, apesar de a fala usar “quando”. A categoria e o comportamento do bloco prevalecem sobre essa ambiguidade.',
    ],
    quiz: [
      [
        'O que muda quando o intervalo cai de 40 para 20 quadros?',
        'Nascem mais asteroides no mesmo tempo.',
        'Cada asteroide passa a cair duas vezes mais rápido.',
        'Intervalo controla nascimento; vy controla a queda.',
      ],
      [
        'Dentro da colisão, quem é asteroide?',
        'A pedra que participou daquele encontro.',
        'Todas as pedras do grupo ao mesmo tempo.',
        'O apelido permite agir sobre o participante, preservando os outros.',
      ],
    ],
  },
  4: {
    title: 'Pontos, vidas e tempo para escapar',
    entry: 'Retomar a chuva de asteroides e a colisão com os tiros do Dia 3.',
    exit: 'Cada acerto soma um ponto; a nave tem três vidas, perde vida ao bater e ganha proteção temporária.',
    minutes: '18–26 minutos',
    opening:
      'Hoje o jogo vai lembrar seus acertos e mostrar quantas vidas a nave ainda tem. Você vai ver um placar subir e descobrir por que uma nave precisa de um respiro depois de levar uma batida.',
    closing:
      'Agora os acertos ficam guardados nos pontos, e as batidas mudam as vidas. O placar e os corações mostram essas informações. No Dia 5, vamos usar esses valores para decidir vitória e derrota.',
    steps: [
      step(
        'memoria',
        'Observe o número e o placar',
        'Parte 1.',
        'observe',
        'Separar guardar, alterar e mostrar um valor.',
        'Pontos é uma caixinha com um número. Ela começa em zero. Um acerto soma um. O placar só lê o número que está guardado e mostra na tela. Mostrar o placar muitas vezes não deve somar mais pontos.',
        {
          to: 'esse número pode mudar o tempo todo.',
          edit: 'Reaproveitar a analogia da caixinha. Acrescentar três imagens: guardar 0, acertar e guardar 1, desenhar 1 novamente sem somar.',
          visual:
            'Caixa pontos e placar lado a lado. Uma colisão muda 0 para 1; dois quadros seguintes mostram 1. Não ensinar por um contador abstrato desconectado da colisão.',
          help: 'Veja qual ação muda o número e qual apenas mostra o mesmo número.',
        },
      ),
      step(
        'pontos',
        'Crie a memória dos pontos',
        'Parte 1.',
        'build',
        'Preparar uma variável uma vez.',
        'Em Programação, Variáveis, coloque Criar variável no final de Ao iniciar. Nome pontos, valor 0. Este jogo começa com zero ponto; durante a partida, esse número vai mudar.',
        {
          from: 'Na categoria Programação, subcategoria Variáveis, pega o bloco Criar variável',
          to: 'porque todo jogo começa com zero ponto.',
          checks: k.pontos,
          edit: 'Usar o gesto; trocar “todo jogo começa” por “este jogo começa”. Variáveis podem ter outros valores iniciais em outros projetos.',
        },
      ),
      step(
        'somar',
        'Faça o acerto valer um ponto',
        'Parte 1.',
        'build',
        'Somar por acerto dentro da colisão certa.',
        'Na colisão entre tiros e asteroides, coloque Somar em variável, de Programação, Variáveis, depois do som de explosão. Escolha pontos e deixe 1. A soma fica dentro dessa colisão, não solta no motor.',
        { from: 'Agora vamos fazer essa caixinha crescer.', checks: k.somar },
      ),
      step(
        'placar',
        'Mostre o que está guardado',
        'Parte 2.',
        'build',
        'Ler a variável no HUD a cada quadro.',
        'Em Jogo 2D, Placar e HUD, coloque Mostrar placar abaixo da colisão. Texto Pontos:. No valor, encaixe valor da variável, de Programação, Valores, escolhendo pontos. Use x 12, y 30, tamanho 24 e uma cor clara para aparecer no fundo.',
        {
          checks: k.placar,
          help: 'Se o placar ficar sempre em zero, confira se o campo valor tem a leitura de pontos, em vez de um número 0.',
        },
      ),
      step(
        'vida',
        'Dê três vidas à nave',
        'Parte 3.',
        'build',
        'Preparar vida atual e máxima na inicialização.',
        'Em Jogo 2D, Vida, coloque Dar ao sprite de vida em Ao iniciar, depois dos pontos. Escolha nave e 3. As vidas ficam preparadas uma vez; não coloque esse bloco no motor, ou ele devolveria as vidas o tempo todo.',
        { checks: k.vida },
      ),
      step(
        'protecao',
        'Compare três batidas bem próximas',
        'Parte 4.',
        'experiment',
        'Compreender a proteção temporária contra novos danos.',
        'Três pedras diferentes vão bater uma depois da outra. Compare a nave sem proteção e com 45 quadros de proteção. Cada pedra é retirada ao bater. Observe quantas vidas sobraram em cada teste.',
        {
          experiment: 'protecao',
          question: [
            'Por que só a primeira batida tira vida durante a proteção?',
            'As próximas tentativas de dano são ignoradas por um tempo.',
            'A nave ganhou vidas infinitas para a partida inteira.',
            'A proteção dura 45 quadros após o dano aceito. Depois desse tempo, outra batida pode tirar vida.',
          ],
          reason:
            'A comparação isola novos danos sem exigir que a criança provoque três colisões rápidas no próprio jogo.',
          visual:
            'Nave com três símbolos de coração e três batidas numeradas nos quadros 1, 6 e 11. Sem piscar ou tremer na atividade; número de vidas e rótulos comunicam o resultado.',
          help: 'As três pedras desaparecem nos dois testes. Compare somente a perda de vidas.',
        },
      ),
      step(
        'batida',
        'Faça a nave sentir a batida',
        'Parte 4.',
        'build',
        'Responder à colisão nave × asteroides com remoção e dano protegido.',
        'Em Jogo 2D, Colisões, encaixe Para cada sprite do grupo que colidir com o sprite no motor, depois do placar. Grupo asteroides, sprite nave, apelido inimigo. Dentro: retire inimigo de asteroides; exploda inimigo; machuque nave em 1 com 45 quadros de proteção; trema a tela com intensidade 8.',
        {
          checks: k.batida,
          edit: 'Manter a montagem. Corrigir a explicação da invencibilidade: o mesmo asteroide já foi removido, então o respiro protege de outras pedras que chegam logo depois. Manter a tremida breve da gravação, sem repetição automática.',
          help: 'inimigo é a pedra desta batida; nave é quem perde vida. Os blocos não devem trocar esses nomes.',
        },
      ),
      step(
        'coracoes',
        'Mostre as vidas que restam',
        'Parte 5.',
        'build',
        'Ler a vida da nave no desenho dos corações.',
        'Em Jogo 2D, Vida, coloque Desenhar as vidas do sprite depois da batida, no motor. Escolha nave e corações. Use x 12, y 48 e tamanho 22. Deixe uma cor que apareça bem no fundo.',
        { checks: k.coracoes },
      ),
      step(
        'teste-vidas',
        'Observe ponto e vida mudarem',
        'Parte 6.',
        'observe',
        'Associar cada mudança à sua causa.',
        'Acertou uma pedra com tiro: mais um ponto. Uma pedra bateu na nave: de três vidas para duas. Espere a proteção acabar; outra batida deixa uma vida. Quando as vidas chegam a zero, ainda falta ensinar o jogo a terminar. Vamos fazer isso no próximo dia.',
        {
          edit: 'Reaproveitar um acerto e uma batida. Corrigir a contagem: depois da segunda perda, sobra 1, não 2. Mostrar a espera antes da próxima batida.',
          visual:
            'Placar 0 → 1; corações 3 → 2; após proteção, 2 → 1. Cada mudança acompanhada de rótulo, sem depender apenas do som ou do vermelho.',
          help: 'Se a segunda batida muito próxima não tira vida, pode ser a proteção funcionando.',
        },
      ),
    ],
    test: 'Destrua um asteroide e veja o placar subir uma vez. Deixe outra pedra bater na nave: devem sobrar duas vidas. Espere a proteção passar e observe outra perda. Confira contraste do placar e dos corações. Envie ao professor; a tela de derrota ainda não faz parte deste dia.',
    finalChecks: finalChecks(4),
    corrections: [
      'Corrigir a contagem falada do teste original: 3 → 2 → 1, respeitando o intervalo de proteção.',
      'O asteroide da batida é retirado antes do dano; a proteção atende novos contatos, não a permanência daquela mesma pedra.',
      'Evitar “jogo sem perigo não tem emoção”: apresentar as vidas como regra escolhida para este jogo.',
      'A experiência não força animações de tremor ou piscar; o efeito breve no Estúdio é apenas um reforço. Vidas e resultados precisam ser legíveis sem ele.',
      'O professor deve distinguir somar por colisão de somar a cada quadro, e inicializar vida de restaurar vida continuamente.',
    ],
    quiz: [
      [
        'O placar foi redesenhado três vezes sem nenhum novo acerto. O que deve acontecer?',
        'Continuar mostrando o mesmo número de pontos.',
        'Somar três pontos por ter sido desenhado três vezes.',
        'Desenhar lê a variável; a colisão é que soma.',
      ],
      [
        'Onde dar as três vidas iniciais à nave?',
        'Em Ao iniciar.',
        'No motor, a cada quadro.',
        'Preparar uma vez permite que as vidas diminuam durante a partida.',
      ],
    ],
  },
  5: {
    title: 'Começo, vitória, derrota e recomeço',
    entry: 'Retomar o Dia 4, com pontuação, três vidas e as duas colisões funcionando.',
    exit: 'Jogo completo com quatro telas, ações limitadas à partida, reinício e entrega pronta para compartilhar.',
    minutes: '28–40 minutos, com pausa possível após proteger as ações',
    opening:
      'Chegou a hora de dar começo e final ao seu jogo. Hoje vamos guardar a partida atrás de uma pergunta: estamos jogando? Depois entram as telas, o Enter e o teste completo. Vamos por partes; seu projeto continua guardado se você precisar de uma pausa.',
    closing:
      'Seu jogo agora tem começo, partida e dois finais. O Enter também permite voltar ao início e jogar outra vez. Confira a entrega e o Compartilhar quando estiver pronto. Você terminou a construção do seu primeiro jogo; faltam só duas ideias para guardar no quiz.',
    steps: [
      step(
        'telas-observar',
        'Observe os quatro momentos do jogo',
        'Parte 1.',
        'observe',
        'Distinguir tela atual de desenho da tela e reconhecer a meta fixa.',
        'O jogo abre em inicio. Enter leva para jogando. Se os pontos chegam a 26, vai para vitoria; se as vidas acabam, vai para fim. Pontos mudam durante a partida. O alvo fica em 26: ele é uma constante, a meta deste jogo.',
        {
          edit: 'Usar a apresentação de telas e da constante. Acrescentar um percurso visual das quatro telas, sem ainda mostrar a reorganização de todos os blocos.',
          visual:
            'Quatro cartões de estado, uma seta de cada vez e valores pontos/vidas. De inicio para jogando; uma partida de exemplo termina em fim e outra em vitoria. Não trocar estados por cliques do aluno.',
          help: 'A tela atual guarda em qual momento estamos. Mostrar tela desenha esse momento para o jogador.',
        },
      ),
      step(
        'alvo',
        'Prepare a meta e a tela inicial',
        'Parte 1.',
        'build',
        'Inicializar a constante alvo e escolher inicio.',
        'Em Programação, Variáveis, coloque Criar constante no final de Ao iniciar: nome alvo, valor 26. Depois, em Jogo 2D, Telas e cenas, coloque Ir para a tela e escolha inicio. O jogo vai começar nesse estado.',
        { checks: k.alvo },
      ),
      step(
        'telas',
        'O relógio pode agir agora?',
        'Parte 3.',
        'experiment',
        'Entender que uma condição controla a ação sem desligar o relógio.',
        'O relógio vai tocar três vezes. Compare a tela inicio com jogando. Ele só cria uma pedra se a pergunta a tela atual é jogando tiver resposta sim. Veja a diferença antes de fazer isso no seu projeto.',
        {
          experiment: 'telas',
          question: [
            'O relógio tocou na tela inicio, mas tem Se a tela é jogando antes de criar. O que acontece?',
            'Nenhum asteroide é criado.',
            'Cria um asteroide porque o relógio tocou.',
            'A chamada do relógio acontece; a condição falsa impede o bloco de criar.',
          ],
          visual:
            'Rótulo do estado, três chamadas do relógio e contagem de nascimentos. Sem escolher outras condições ou inventar fases extras.',
          help: 'Veja se a pergunta da condição é verdadeira no estado escolhido.',
        },
      ),
      step(
        'pergunta',
        'Faça a pergunta da partida',
        'Parte 2.',
        'build',
        'Encaixar a comparação de tela no Se.',
        'Em Programação, Lógica e Se, coloque Se no topo de A cada quadro do jogo. Retire a comparação que veio na pergunta. No lugar, encaixe a tela atual é, de Jogo 2D, Telas e cenas, e escolha jogando. Ainda vamos levar os blocos para dentro.',
        {
          checks: k.pergunta,
          help: 'A pergunta deve dizer jogando; não deixe a comparação de números que veio no Se.',
        },
      ),
      step(
        'mover-cadeia',
        'Observe a mudança de todos os blocos',
        'Parte 3.',
        'observe',
        'Ver como mover a sequência preservando sua ordem.',
        'Vou pegar a sequência pelo primeiro bloco, Limpar a tela. Os que estão encaixados abaixo vêm junto. Eu solto a sequência dentro do então do Se. Confira o começo e o fim: Limpar a tela lá em cima e Desenhar as vidas lá embaixo, todos dentro.',
        {
          to: 'Capricha no encaixe.',
          edit: 'Reaproveitar só o arraste da cadeia. Gravar zoom e pausa no contorno do então. Não incluir ainda o relógio neste clipe.',
          visual:
            'Realçar a cadeia inteira, arrastar uma vez e mostrar o contorno do Se envolvendo todos os blocos. Alternar visão geral e aproximação, sem cortes que escondam a conexão.',
          help: 'Não arraste o Se com a cadeia. Pegue a sequência por Limpar a tela.',
        },
      ),
      step(
        'guardar-jogo',
        'Leve a partida para dentro da pergunta',
        'Parte 3.',
        'build',
        'Limitar o motor da partida à tela jogando.',
        'No seu Estúdio, arraste a sequência de Limpar a tela até Desenhar as vidas para o então do Se jogando. Preserve a ordem. Enquanto a tela for inicio, essa sequência não roda. A tela pode ficar vazia por enquanto: vamos desenhar a abertura daqui a pouco.',
        {
          to: 'Capricha no encaixe.',
          checks: k.guardarJogo,
          reason:
            'Separar observar o arraste de executar reduz o risco de soltar metade da cadeia e perder o ponto de partida.',
        },
      ),
      step(
        'guardar-relogio',
        'Proteja também o nascimento das pedras',
        'Parte 3.',
        'build',
        'Colocar a condição dentro do relógio independente.',
        'Dentro de A cada 40 quadros, coloque outro Se com a pergunta a tela atual é jogando. Leve Criar asteroide para o então desse Se. Proteger o motor principal não protege automaticamente este outro relógio.',
        {
          from: 'Ah, e tem um lugarzinho a mais:',
          checks: k.guardarRelogio,
          help: 'Deixe só um Criar asteroide: ele deve estar dentro da condição que está dentro do relógio.',
        },
      ),
      step(
        'guardar-tiro',
        'Deixe o disparo só para a partida',
        'Parte 6.',
        'build',
        'Evitar tiros e sons acumulados no menu e depois do fim.',
        'Agora veja o evento da barra de espaço. Dentro dele, coloque Se a tela atual é jogando. Leve Criar tiro e Tocar som de tiro para o então. Fora da partida, espaço não dispara. O evento continua ouvindo; a pergunta decide se ele age.',
        {
          checks: k.guardarTiro,
          edit: 'Complemento novo: o roteiro original protege motor e asteroides, mas deixa o evento de tiro sem condição. A Parte 6 localiza a área de eventos; regravar este gesto sobre o evento Espaço antes de criar o Enter.',
          visual:
            'Evento Espaço já existente, pergunta jogando e os dois comandos transferidos para dentro; teste curto no menu sem tiro e sem som.',
          help: 'Não crie um segundo evento Espaço. Envolva os comandos do evento que já existe.',
        },
      ),
      step(
        'vitoria',
        'Decida quando vencer',
        'Parte 4.',
        'build',
        'Comparar pontos e alvo para mudar de tela.',
        'No fim do então de Se jogando, depois dos corações, coloque outro Se. Na comparação, leia pontos à esquerda, escolha maior ou igual e leia alvo à direita. Dentro dele, coloque Ir para a tela vitoria.',
        {
          to: 'escolhe vitoria na listinha.',
          checks: k.vitoria,
          help: 'O lado direito lê a constante alvo. Não substitua por um número diferente só para passar de seção.',
        },
      ),
      step(
        'derrota',
        'Decida quando a partida termina sem vidas',
        'Parte 4.',
        'build',
        'Separar a condição de derrota da condição de vitória.',
        'Logo abaixo da pergunta de vitória, ainda dentro de jogando, coloque outro Se. Troque a comparação por as vidas do sprite acabaram?, de Jogo 2D, Vida, escolhendo nave. Dentro, coloque Ir para a tela fim.',
        {
          from: 'Agora, a derrota.',
          checks: k.derrota,
          edit: 'Manter a ordem original. O professor deve saber: se meta e zero vidas acontecerem no mesmo quadro, a segunda condição leva a fim. Não prometer prioridade de vitória.',
          help: 'As vidas decidem fim; os pontos decidem vitoria. As duas perguntas ficam no então da partida.',
        },
      ),
      step(
        'mostrar-telas',
        'Desenhe a abertura e os dois finais',
        'Parte 5.',
        'build',
        'Associar um ramo e uma imagem a cada estado.',
        'No Se grande, use + senão se três vezes: inicio, vitoria e fim. Cada pergunta usa a tela atual é. Em cada ramo, encaixe Mostrar tela. Na abertura: Nave contra Asteroides e dica Aperte Enter para começar. Nos dois finais, use a dica Aperte Enter para voltar ao início. Escolha títulos e fundos legíveis.',
        {
          checks: k.telas,
          reason:
            'Os três ramos repetem o mesmo padrão e são construídos juntos; o vídeo faz uma abertura e depois mostra apenas o que muda nos finais.',
          edit: 'Reaproveitar a criação dos ramos e telas. Nos finais, trocar a dica por “Aperte Enter para voltar ao início”: o reinício executa Ao iniciar e volta ao menu, não entra imediatamente em jogando.',
          visual:
            'Construir inicio com todos os campos; repetir vitoria/fim destacando só o nome do estado, título e dica. Pausa em cada ramo.',
          help: 'Os senão se pertencem ao Se grande. Não os coloque dentro da pergunta de vitória ou da pergunta de derrota.',
        },
      ),
      step(
        'enter',
        'Faça Enter começar e recomeçar',
        'Parte 6.',
        'build',
        'Usar a mesma tecla de acordo com o estado atual.',
        'Em Quando acontecer, adicione Quando apertar a tecla Enter. Dentro: Se a tela é inicio, vá para jogando. No senão se fim, use Reiniciar o jogo. No senão se vitoria, também Reiniciar o jogo. Depois de reiniciar, você volta à abertura; Enter mais uma vez começa outra partida.',
        {
          checks: k.enter,
          edit: 'Reaproveitar montagem de Enter e seus ramos. Complementar o retorno ao menu e o segundo Enter. Não dizer que o primeiro Enter após derrota já começa a partida.',
          help: 'O evento Espaço continua separado. O Enter tem três ramos, com perguntas de tela diferentes.',
        },
      ),
      step(
        'ciclo-completo',
        'Observe como testar o jogo completo',
        'Parte 7.',
        'observe',
        'Conferir início, derrota, reinício e vitória sem alterar a meta.',
        'Teste primeiro o menu: espaço não dispara e as pedras não nascem. Enter começa. Depois de perder, Enter volta ao início, com zero ponto e três vidas; outro Enter começa. Faça também o caminho até 26 pontos e veja a vitória. Na entrega, envie ao professor e use Compartilhar quando estiver disponível.',
        {
          edit: 'Reaproveitar os testes e o Compartilhar, com corte do tempo repetido de jogo. Corrigir o ciclo de dois Enter. Conferir campos atuais de publicação, sem prometer edição ou geração de capa que não esteja presente.',
          visual:
            'Menu imóvel, espaço sem efeito; partida; derrota; Enter no menu; Enter na partida; montagem acelerada até 26 pontos e vitória. Gravação atual do botão Compartilhar depois do envio.',
          help: 'Se tiros ou asteroides já estiverem esperando ao começar, reveja as condições dos eventos e relógios.',
        },
      ),
    ],
    test: 'Teste o menu sem atirar nem gerar pedras. Comece com Enter. Confira derrota, Enter de volta ao início, zero ponto, três vidas e grupos vazios. Comece novamente e teste a vitória em 26 pontos. Se perder a última vida no mesmo quadro da meta, esta montagem termina em fim.\n\nQuando estiver pronto, envie ao professor. Depois use Compartilhar, confira o que a janela pedir e publique quando desejar mostrar sua criação. Abra o link e teste se o jogo inicia. A entrega é registrada pela plataforma; publicação e qualidade do jogo são conferidas pelo professor. Não é necessário tornar seu perfil pessoal público. O projeto do Dia 5 será a base de O jogo do meu jeito.',
    finalChecks: finalChecks(5),
    corrections: [
      'O Dia 5 tem carga maior. Separar pergunta, mudança da cadeia, guarda do relógio e guarda do disparo. Oferecer pausa após essas três proteções, retomando o mesmo rascunho.',
      'Incluir o Se jogando também no evento Espaço. Esta lacuna do original permite criar tiros e sons fora da partida.',
      'O Reiniciar roda Ao iniciar novamente. Como o último bloco escolhe inicio, há um retorno ao menu e depois outro Enter para jogar.',
      'Conservar a ordem vitória depois derrota no fim do motor: se ambas forem verdadeiras no mesmo quadro, fim prevalece. O roteiro e os testes explicitam essa regra.',
      'Constante significa que o valor não é alterado durante esta execução. O criador pode editar a meta em uma versão futura; essa edição não é tarefa deste dia.',
      'Configurar showcase.enabled apenas no Estúdio do Dia 5. O manifesto preserva a configuração do bloco existente; não inventa um novo comando de publicação.',
      'Não afirmar que o curso está publicado ou que vídeos estão editados. Os arquivos são autoria importável e mapa de produção.',
    ],
    quiz: [
      [
        'Você protegeu o desenho, mas os tiros nascem no menu. Onde falta a pergunta jogando?',
        'Dentro do evento da barra de espaço, antes de criar o tiro.',
        'Na cor do título da tela de início.',
        'O evento é independente do motor; sua ação também precisa da condição.',
      ],
      [
        'Depois da derrota, Reiniciar executa Ao iniciar, que escolhe inicio. Para onde o jogo volta?',
        'Para a abertura; Enter começa uma nova partida.',
        'Direto para uma partida com os pontos antigos.',
        'Reiniciar refaz a preparação: zero ponto, três vidas, grupos novos e tela inicio.',
      ],
    ],
  },
}
