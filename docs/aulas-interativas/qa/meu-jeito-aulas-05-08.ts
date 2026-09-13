import type { Recipe } from './meu-jeito-editorial'

export const lateRecipes: Record<number, Recipe> = {
  5: {
    title: 'O asteroide ganha chama e animação',
    tool: 'pinta',
    entry: 'Reabrir o asteroide vetorial 64 × 64 da aula 4, com espaço superior para a chama.',
    exit: 'Asteroide com chamas atrás da pedra e animação girando de dois quadros a 8 fps; nave voando preservada.',
    opening:
      'Sua pedra vai ganhar uma chama de jogo e uma animação. Primeiro vamos descobrir como colocar formas umas atrás das outras. Depois você faz a chama e muda alguns detalhes no segundo quadro. A pedra continua dentro do mesmo desenho.',
    closing:
      'Agora você tem duas artes animadas: a nave e o asteroide. No vetor você mudou formas e pontos; na nave, mudou pixels. A pedra ficou na frente das chamas porque você cuidou da ordem. Na próxima aula vamos levar as artes ao Estúdio. Antes, duas ideias para guardar.',
    choices:
      'Cores e silhueta do fogo; duas chamas bastam, terceira opcional dentro da mesma tarefa. Pequenas mudanças nas crateras e pontas. Fixos: dois quadros, 8 fps, girando, chama acima para acompanhar a queda para baixo.',
    steps: [
      {
        key: 'ordem',
        title: 'Experimente: a pedra sumiu ou foi coberta?',
        kind: 'experiment',
        part: 1,
        experiment: 'ordem',
        focus: 'Comparar as mesmas formas com a chama na frente e atrás.',
        reason:
          'O laboratório mostra a causa de um resultado normal do vetor, antes de a chama cobrir a própria pedra.',
        say: 'Compare a chama na frente e atrás da pedra. As duas formas continuam presentes. Mude só a ordem, registre os dois resultados e descubra quando conseguimos ver a pedra inteira.',
        edit: 'Reaproveita a explicação da pilha de papel como instrução do modelo. Não repetir a mesma demonstração em outra seção.',
        visual:
          'Uma pedra com crateras e uma chama, nas mesmas posições. Duas opções de ordem e uma lista indicando quem está na frente. Nada de mover, apagar ou trocar cores.',
        criteria: ['Cobrir não apaga a forma.', 'Chama atrás deixa a pedra à frente.'],
        help: 'A lista continua com duas formas. Compare quem cobre quem.',
        question: [
          'A pedra reapareceu quando a chama foi para trás. O que mudou?',
          'A ordem das formas.',
          'A pedra foi desenhada de novo.',
          'As formas eram as mesmas. A que fica por cima pode esconder parte da outra.',
        ],
      },
      {
        key: 'chama-externa',
        title: 'Desenhe a chama atrás da pedra',
        kind: 'build',
        part: 1,
        focus: 'Traçar chama dentro do quadro e ajustar a ordem pela aparência.',
        reason:
          'Transfere a comparação para o Pinta usando um critério visual, sem decorar um número de cliques.',
        say: 'Abra asteroide, solte qualquer seleção e escolha a cor da chama. Com Caneta, trace uma forma fechada acima da pedra, dentro do quadro. Use Uma camada para trás até a pedra aparecer inteira na frente. Pare nesse resultado.',
        edit: 'Retirar a explicação de meteoros pegando fogo apenas por velocidade no espaço. Apresentar como desenho estilizado do jogo. Acrescentar desseleção antes da cor e espaço do quadro. Na suavização, nomear Editar os pontos → selecionar só a base → Ponto suave; pontas continuam retas.',
        visual:
          'Chama nasce por cima; mostrar sucessivos passos até ficar atrás da pedra e crateras. Número de cliques não é fixo. Mostrar limites 64 × 64.',
        criteria: [
          'Chama fechada e acima da pedra, sem sair do quadro.',
          'Pedra e crateras ficam à frente.',
          'Pontas intencionais e base encostada na pedra.',
        ],
        help: 'Se os botões de ordem sumiram, use Selecionar e clique na chama. Se só um pedaço da pedra apareceu, continue um passo por vez.',
        question: [
          'Quantas vezes usar Uma camada para trás?',
          'Até a pedra aparecer inteira na frente da chama.',
          'Sempre exatamente duas vezes.',
          'O número depende de quantas formas estão na pilha. O resultado visual é o critério de parada.',
        ],
      },
      {
        key: 'chama-interna',
        title: 'Faça uma chama menor por dentro',
        kind: 'build',
        part: 2,
        focus: 'Duplicar, reduzir e ordenar uma forma para compor o fogo.',
        reason:
          'Reutiliza a cópia aprendida nas crateras e exige atenção à seleção e à nova posição na pilha.',
        say: 'Selecione a chama e duplique. Deixe a cópia menor e mais clara, dentro da primeira. Ela nasce na frente de tudo: mande para trás até a pedra reaparecer. Duas chamas já completam nossa tarefa.',
        edit: 'Preservar cópia deslocada e ordenação. A terceira chama é uma variação breve do professor, sem tarefa extra. Tratar claro por dentro como linguagem visual escolhida, não lei física da temperatura.',
        visual:
          'Nomear maior/menor e mostrar o contorno externo da primeira chama ao redor da cópia. Pedra à frente de ambas.',
        criteria: [
          'Chama menor por dentro com borda da maior visível.',
          'Pedra à frente de todas as chamas.',
          'Sem buraco involuntário entre as partes.',
        ],
        help: 'Se a chama interna sumiu, ela pode ter ido para trás da externa. Desfaça o último passo e confira a pilha.',
        question: [
          'Ao duplicar, a nova chama cobriu a pedra. Por quê?',
          'A cópia nasceu na frente das outras formas.',
          'O Pinta apagou a pedra ao copiar.',
          'A cópia é outra forma no topo da pilha. Ajustar sua ordem recupera a composição.',
        ],
      },
      {
        key: 'mudanca-demo',
        title: 'Observe: uma mudança pequena já anima',
        kind: 'observe',
        part: 3,
        from: 'E agora entra um jeito de animar diferente do da nave:',
        to: 'Duas ou três pontas já bastam.',
        focus: 'Separar mudança dos detalhes e deslocamento do desenho inteiro.',
        reason:
          'A demonstração escolhe uma alteração por vez para evitar que a criança mova tudo e perca a referência.',
        say: 'Veja o segundo quadro: a pedra fica no mesmo lugar. Uma cratera muda um pouco de posição e uma ponta da chama muda de forma. Na prévia, isso sugere movimento. Não precisamos arrastar a pedra inteira.',
        edit: 'Mostrar mover uma cratera e editar uma ponta. Apagar uma cratera pode ser mostrado como possibilidade do professor, sem exigir; não vender dois quadros como rotação geométrica contínua.',
        visual:
          'Congelar corpo com guia discreta; alternar primeiro e segundo quadro, depois prévia breve. A alteração exagerada serve só como contraste de dois segundos.',
        criteria: ['Mudanças locais; corpo e posição geral preservados.'],
        help: 'Compare o contorno da pedra nos dois quadros, além dos detalhes que mudaram.',
      },
      {
        key: 'animar-pedra',
        title: 'Duplique e mude alguns detalhes',
        kind: 'build',
        part: 3,
        focus: 'Criar dois quadros com mudanças locais no vetor.',
        reason:
          'Depois de ver o objetivo, a criança faz uma edição limitada e revê o efeito no mesmo desenho.',
        say: 'Duplique o primeiro quadro. Confira o segundo aceso. Mova uma cratera um pouco e ajuste uma ou duas pontas da chama com Editar os pontos. Veja a prévia e compare os dois quadros. Mantenha a pedra e o fogo dentro da tela.',
        edit: 'Preservar Duplicar quadro e seleção após troca. Encurtar as três alternativas já demonstradas e retirar convites para muitas mudanças.',
        visual:
          'Troca de quadro solta a seleção: escolher de novo a cratera ou chama. Mostrar edição local e prévia.',
        criteria: [
          'Exatamente dois quadros com alterações intencionais.',
          'Corpo da pedra permanece no lugar.',
          'Sem formas cortadas ou chama cobrindo a pedra no segundo quadro.',
        ],
        help: 'Se ficou agitado demais, desfaça uma mudança e compare. O primeiro quadro continua guardando a base.',
        question: [
          'Você moveu uma cratera no segundo quadro. O primeiro também precisa mudar?',
          'Não; cada quadro guarda suas próprias formas.',
          'Sim; editar um quadro sempre modifica todos.',
          'A duplicação cria uma cópia para editar separadamente.',
        ],
      },
      {
        key: 'nome-girando',
        title: 'Dê o nome e confira as duas artes',
        kind: 'build',
        part: 4,
        focus: 'Renomear para girando e confirmar as artes que serão usadas no Estúdio.',
        reason:
          'A continuidade do curso depende dos nomes e quadros corretos, não de uma aparência idêntica ao modelo.',
        say: 'Use Renomear animação para trocar parado por girando. Mantenha dois quadros e 8 fps. Volte à galeria: nave e asteroide devem estar lá. As miniaturas ficam paradas; abra cada desenho para ver a animação.',
        edit: 'Manter renomeação e retorno; não prometer miniaturas animadas. Não confundir duas animações em um desenho com uma animação em cada desenho.',
        visual:
          'Animação girando na faixa do asteroide. Galeria com dois cartões; conferir voando só ao abrir a nave.',
        criteria: [
          'asteroide: girando, dois quadros, 8 fps.',
          'nave: voando, dois quadros, 8 fps.',
          'Dois desenhos salvos e separados.',
        ],
        help: 'Se o cartão parece parado, abra o desenho e olhe a Prévia. O cartão não toca a animação.',
        question: [
          'A miniatura do asteroide na galeria está parada. Onde conferir se a animação funciona?',
          'Na Prévia, abrindo o desenho.',
          'No campo do nome do projeto do Estúdio.',
          'A miniatura mostra um quadro; a Prévia mostra a sequência.',
        ],
      },
    ],
    delivery:
      'Escolha nave e asteroide na galeria do Pinta e envie os dois juntos. Essa entrega permite conferir se a dupla está pronta para entrar no jogo.',
    rubric: [
      'nave pixel 32 × 32, voando, dois quadros, 8 fps.',
      'asteroide vetor 64 × 64, girando, dois quadros, 8 fps.',
      'Pedra e crateras à frente das chamas nos dois quadros.',
      'Chama cabe no quadro e as mudanças são locais, sem teletransporte do desenho inteiro.',
    ],
    corrections: [
      'Tratar o meteoro flamejante como escolha estética do jogo, sem ensinar que velocidade sozinha causa fogo no vácuo.',
      'O roteiro afirma nas notas que o fogo nunca usa Ponto suave, mas a fala suaviza a base: preservar apenas esse arredondamento seletivo e explicitar o gesto.',
      'Cópia nasce no topo; o número de cliques para trás varia com as crateras e chamas.',
      'Não exigir apagar uma cratera nem acrescentar outras animações.',
      'Duas chamas bastam; não avaliar a criança pela quantidade usada por Júlio.',
    ],
    quiz: [
      [
        'No segundo quadro, uma chama cobriu a pedra. Onde procurar a correção?',
        'Na ordem das formas desse quadro.',
        'No tamanho da nave em outro desenho.',
        'A ordem pode ser revisada no quadro em que a composição ficou diferente.',
      ],
      [
        'No vetor, o que acontece ao mover uma ponta com Editar os pontos?',
        'A forma é refeita a partir da nova posição do ponto.',
        'Surge obrigatoriamente um buraco de pixels para pintar.',
        'O Pinta redesenha a forma vetorial. É diferente de mover um recorte de pixels.',
      ],
    ],
  },
  6: {
    title: 'A sua nave entra no jogo',
    tool: 'estudio',
    entry:
      'Abrir o jogo importado na aula 1; nave e asteroide já estão animados na galeria do Pinta.',
    exit: 'Nave com arte própria no mesmo jogo, em 400/410, 54 × 54, folha 32 × 32, voando do 0 ao 1 a 8 fps; controles preservados.',
    opening:
      'Hoje o desenho da sua nave vai entrar no jogo. Vamos trazer as duas artes para o projeto, trocar a nave do kit e ensinar o jogo a mostrar um quadro por vez. O motor vai pulsar como na Prévia do Pinta. Os asteroides ficam para a próxima aula.',
    closing:
      'Sua nave desenhada está no jogo. A imagem entrou no projeto, o sprite ganhou nome, lugar e tamanho, e a folha separou os quadros para animar. O motor cresce e diminui como você desenhou. Na próxima aula os asteroides também mudam. Agora, duas ideias para conferir.',
    choices:
      'Nenhum novo valor na integração guiada. Preservar a arte autoral; usar os nomes da trilha. Se um projeto anterior usa outros nomes, o professor adapta as referências de forma consistente.',
    steps: [
      {
        key: 'trazer-artes',
        title: 'Traga nave e asteroide para o projeto',
        kind: 'build',
        part: 1,
        focus: 'Importar as artes do Pinta no projeto certo, sem esperar troca visual automática.',
        reason:
          'O jogo e a galeria são acervos distintos; confirmar a ponte antes de alterar blocos.',
        say: 'Abra o jogo da nave em Meus Jogos. Em Mais opções → Exibição → Imagens, escolha Trazer do Pinta. Adicione nave e asteroide. Feche as duas janelas e confira: os desenhos estão No projeto, mas o jogo ainda usa as peças do kit.',
        edit: 'Reutilizar o caminho inteiro, incluindo ambos os Fechar. Não afirmar que No projeto estará vazio em toda conta. Manter botão de adição de cada desenho.',
        visual:
          'Selo no projeto em cada arte e lista No projeto com as duas. Não selecionar desenhos da Biblioteca pronta.',
        criteria: [
          'Projeto é o jogo importado, não Meu jogo novo.',
          'As duas artes estão No projeto com suas animações.',
          'O jogo ainda funciona com a arte do kit.',
        ],
        help: 'Se as artes não apareceram, confira o perfil e o salvamento do Pinta. Não importe o mesmo desenho repetidamente para tentar atualizar.',
        question: [
          'Os desenhos estão No projeto, mas a nave continua cinza. O que falta?',
          'Mandar os blocos usarem a imagem e sua animação.',
          'Desenhar a nave novamente.',
          'Trazer do Pinta disponibiliza o recurso; os blocos decidem como mostrá-lo.',
        ],
      },
      {
        key: 'trocar-nave',
        title: 'Troque o criador da nave',
        kind: 'build',
        part: 2,
        to: 'Não foi você que errou.',
        focus: 'Retirar o criador do kit e criar o sprite com imagem sem duplicar o nome.',
        reason:
          'Aqui apagar antes evita dois criadores nave; dividir antes da explicação da folha permite observar o resultado real.',
        say: 'No Ao iniciar, use botão direito → Apagar este bloco no Criar nave do kit. Coloque Criar sprite … com imagem no lugar. Preencha nave; x 400; y 410; largura 54; altura 54; imagem nave. Se aparecerem duas naves espremidas, vamos entender isso na próxima seção.',
        edit: 'Preservar exclusão isolada e pilha religada. Identificar blocos pelo rótulo, não por “segundo da gaveta”. Não prometer o quadrado azul em toda etapa de digitação: o preview pode manter a última versão válida.',
        visual:
          'Bloco entre Preparar o jogo e Criar grupo tiros. Zoom em cada campo e nos avisos enquanto o nome nave está ausente. Ao fim, imagem inteira espremida.',
        criteria: [
          'Criar nave do kit retirado; um único criador chamado nave.',
          'Criar sprite com imagem nave, x 400, y 410, largura 54, altura 54 no Ao iniciar.',
          'Blocos de grupo e lógica abaixo preservados.',
        ],
        help: 'Use Apagar este bloco, não a lixeira com a pilha toda. Se removeu algo junto, desfaça antes de continuar.',
        question: [
          'Por que apagamos o Criar nave do kit antes de montar o novo?',
          'Para não criar duas coisas chamadas nave no mesmo trecho.',
          'Porque toda troca de bloco deve sempre começar apagando.',
          'Os dois criadores usam o mesmo nome. Na próxima aula a peça antiga tem outro contrato, então a ordem será diferente.',
        ],
      },
      {
        key: 'folha-demo',
        title: 'Observe: duas imagens dentro de uma só',
        kind: 'observe',
        part: 2,
        from: 'E as duas vieram do seu próprio desenho:',
        focus: 'Distinguir a folha inteira e um quadro que ocupa o sprite.',
        reason:
          'A explicação nasce da imagem espremida vista na criação, sem apresentar outro problema artificial.',
        say: 'O Pinta levou os dois quadros numa imagem só. O sprite está mostrando essa imagem inteira dentro de seu quadrado. Vamos marcar onde termina cada quadro e mostrar um de cada vez. Um fogo é menor e o outro maior.',
        edit: 'Substituir “apagado e aceso” por “menor e maior”. Mostrar 64 × 32 como dimensão total desta folha de dois quadros 32 × 32; não confundir com 54 × 54 no jogo.',
        visual:
          'Folha com dois quadros, divisória em 32, rótulos primeiro/segundo e índices do Estúdio 0/1. Uma moldura de sprite ao lado mostra a folha comprimida.',
        criteria: [
          'Uma imagem pode conter vários quadros.',
          'Tamanho de quadro e tamanho visível do sprite são independentes.',
        ],
        help: 'A folha tem os desenhos; o sprite é quem os apresenta no jogo.',
      },
      {
        key: 'recorte',
        title: 'Experimente: onde cortar a folha?',
        kind: 'experiment',
        part: 3,
        experiment: 'folha',
        focus:
          'Comparar largura de recorte 16 e 32 na mesma folha, mantendo o sprite do jogo em 54 × 54.',
        reason:
          'A criança testa a relação entre o quadro desenhado no Pinta e a medida informada ao carregar a folha.',
        say: 'A folha deste exemplo tem dois desenhos de 32 × 32. Compare recortar com largura 16 e com largura 32. A altura fica em 32 e o tamanho no jogo não muda. Registre os dois e veja qual recorte pega uma nave inteira.',
        edit: 'Modelo separado do projeto. Não alterar nem corrigir automaticamente os blocos da criança.',
        visual:
          'Folha 64 × 32 com moldura do recorte e resultado num quadrado fixo rotulado 54 × 54. Uma escolha: largura 16 ou 32. Sem painel de velocidade.',
        criteria: [
          '16 pega parte da nave; 32 pega um quadro inteiro.',
          'A dimensão exibida no jogo permanece 54 × 54.',
        ],
        help: 'O corte segue o tamanho do desenho no Pinta, não o tamanho em que ele aparece no jogo.',
        question: [
          'Qual largura recorta uma nave inteira nesta folha?',
          '32, a largura de cada quadro desenhado no Pinta.',
          '54, porque esse é o tamanho do sprite na tela.',
          'O sprite pode ampliar o quadro. O recorte continua seguindo a geometria da folha original.',
        ],
      },
      {
        key: 'carregar-folha',
        title: 'Prepare a folha da nave',
        kind: 'build',
        part: 3,
        to: 'O bloco precisa dele pra cortar a fila de desenhos no lugar certo.',
        focus: 'Carregar folha-nave da imagem nave com quadros 32 × 32 no Ao iniciar.',
        reason:
          'Preparar e animar são ações distintas; uma folha carregada sozinha não troca o desenho do sprite.',
        say: 'Em Jogo 2D → Animação, coloque Carregar folha de quadros logo abaixo do Criar sprite nave. Digite folha-nave e escolha imagem nave. Os dois campos de tamanho ficam em 32. O bloco de animar virá em seguida.',
        edit: 'Manter os campos e a razão do 32. Esclarecer nomes de recurso/imagem/variável: imagem nave pode ser usada pelo sprite nave; folha recebe outro identificador para não conflitar no programa.',
        visual:
          'Nome digitado folha-nave, imagem escolhida e tamanhos 32/32. Preparar a folha uma vez no Ao iniciar, sem mudá-la para o loop.',
        criteria: [
          'Carregar folha-nave da imagem nave, FW 32 e FH 32.',
          'Bloco no Ao iniciar, depois de criar a nave e antes de animar.',
        ],
        help: 'O nome da folha é digitado; a imagem vem do seletor. Não escolha asteroide nesta folha.',
        question: [
          'Carregar a folha já faz o motor pulsar?',
          'Ainda falta mandar animar o sprite com essa folha.',
          'Sim, todos os sprites usam toda folha carregada automaticamente.',
          'A folha prepara os quadros. Animar sprite associa a sequência ao objeto.',
        ],
      },
      {
        key: 'animacao-nave',
        title: 'Anime e teste a sua nave',
        kind: 'build',
        part: 3,
        from: 'Agora vem o bloco que faz a nave se mexer,',
        focus: 'Animar nave com folha-nave/voando e preservar controles.',
        reason: 'Completa a ponte e confere se a aparência mudou sem quebrar o jogo existente.',
        say: 'Logo abaixo da folha, coloque Animar sprite. Escolha nave, folha-nave e voando. Confira os campos: do quadro 0 ao 1, a 8 fps. Inicie a partida e teste movimento, tiro e reinício. O motor deve pulsar, com uma nave por vez.',
        edit: 'Corrigir todas as falas de acender/apagar. Mostrar preenchimento por metadados e conferir os valores reais; se a faixa estiver diferente, revisar os dois quadros no Pinta.',
        visual:
          'Seletores sprite/folha/animação e campos 0, 1, 8. Uma prévia em escala legível e um teste rápido dentro da partida.',
        criteria: [
          'Animar nave com folha-nave/voando do 0 ao 1 a 8 fps no Ao iniciar, depois de carregar.',
          'Uma nave animada; movimento e tiro respondem.',
          'Asteroides ainda usam o kit nesta aula.',
        ],
        help: 'Se voando não aparece, confira o nome da animação no Pinta e a importação da arte com seus metadados. Não digite um nome de folha inexistente.',
        question: [
          'O Estúdio mostra quadros 0 e 1. Quantos desenhos isso representa?',
          'Dois: o primeiro é 0 e o segundo é 1.',
          'Um, porque o último número é 1.',
          'Os índices começam em zero. Do 0 ao 1 inclui os dois quadros.',
        ],
      },
    ],
    delivery:
      'Envie o mesmo projeto livre com a nave animada. Jogue antes de selecionar o cartão: a entrega precisa incluir os blocos e as imagens.',
    rubric: [
      'No projeto: artes nave e asteroide com metadados; não exigir que a segunda já esteja sendo usada.',
      'Criador do kit removido, um único sprite nave em 400/410, 54 × 54, imagem nave.',
      'Folha-nave: quadro 32 × 32; carregar antes de animar nave/voando, 0–1, 8 fps.',
      'Movimento, tiros, estados, placar, vidas e reinício do jogo original preservados.',
    ],
    corrections: [
      'A nave tem fogo pequeno e grande; atualizar referências ao motor apagado/aceso.',
      'O azul de recurso ausente e a última prévia válida são estados transitórios, não critério de aprovação.',
      'A folha tem 64 × 32 no total; cada quadro é 32 × 32 e o sprite no jogo é 54 × 54.',
      'Nome do recurso de imagem pode coincidir com nome do sprite; identificadores de sprite e folha devem ser distintos.',
      'Se a criança já personalizou nomes no Desafio, adaptar todas as referências ao mesmo nome, sem renomear apenas um campo.',
    ],
    quiz: [
      [
        'Uma nave aparece esticada verticalmente. Qual par define seu tamanho no jogo?',
        'Largura e altura do Criar sprite.',
        'Primeiro e último quadro da animação.',
        'Largura e altura definem a caixa visível; o intervalo escolhe os desenhos.',
      ],
      [
        'Qual é a ordem necessária para usar uma folha na animação?',
        'Carregar a folha antes de mandar animar com ela.',
        'Mandar animar antes de a folha existir.',
        'O bloco de animação precisa da folha já preparada.',
      ],
    ],
  },
  7: {
    title: 'Os seus asteroides entram no jogo',
    tool: 'estudio',
    entry: 'Mesmo projeto da aula 6, nave animada e arte asteroide já em No projeto.',
    exit: 'Um único criador de asteroides com imagem, dentro do relógio e da condição jogando; cada novo sprite animado, mecânica preservada.',
    opening:
      'A nave já usa a sua arte. Hoje vamos trocar os asteroides. A nave foi criada uma vez; as pedras nascem ao longo da partida. Por isso vamos preparar a folha no início e animar cada pedra logo depois que ela nascer.',
    closing:
      'Agora a sua nave e os seus asteroides estão no jogo. Você trocou a peça que precisava de imagem e conservou as outras regras. Cada asteroide novo nasce e já começa a animação. Na próxima aula vamos publicar esta versão. Antes, duas perguntas rápidas.',
    choices:
      'Preservar as artes próprias. Na montagem guiada: folha-asteroide, asteroide, grupo asteroides, y −30, 40 × 40, VX 0, VY 3, relógio 40 quadros, animação girando 0–1/8 fps.',
    steps: [
      {
        key: 'folha-asteroide',
        title: 'Prepare a folha de 64 por 64',
        kind: 'build',
        part: 1,
        focus: 'Carregar a folha uma vez, mantendo a folha da nave intacta.',
        reason: 'Consolida a geometria do quadro e a distinção entre preparação e efeito na tela.',
        say: 'Abra o mesmo jogo. No Ao iniciar, coloque Carregar folha de quadros depois da animação da nave e antes do grupo tiros. Nome folha-asteroide, imagem asteroide, quadros 64 × 64. As pedras do kit ainda não mudam.',
        edit: 'Manter todos os campos, destacando a troca de ambos os 32 por 64. Não usar tamanho visível 40 como tamanho do quadro.',
        visual:
          'Duas folhas nomeadas, tamanhos 32 e 64. Mostrar a área do jogo sem troca automática.',
        criteria: [
          'Folha-asteroide usa imagem asteroide e quadros 64 × 64 no Ao iniciar.',
          'Folha-nave continua 32 × 32.',
        ],
        help: 'Os dois campos devem ser 64. Esse número vem do Médio do vetor escolhido no Pinta.',
        question: [
          'O asteroide vai aparecer com 40 × 40 no jogo. Qual tamanho colocar na folha?',
          '64 × 64, o tamanho original de cada quadro.',
          '40 × 40, copiando o tamanho do sprite.',
          'O recorte da folha e o tamanho de exibição têm funções diferentes.',
        ],
      },
      {
        key: 'tempo-demo',
        title: 'Observe: uma nave, muitos nascimentos',
        kind: 'observe',
        part: 2,
        from: 'Desce até a área Enquanto estiver rodando',
        to: 'É ele que faz uma pedra nova nascer lá em cima de tempos em tempos.',
        focus:
          'Distinguir relógio do jogo e quadros de animação; situar nascimento e animação de cada asteroide.',
        reason:
          'O nome “quadro” reaparece com outro significado e o sprite do grupo existe só depois de ser criado.',
        say: 'Este relógio conta atualizações do jogo. Os quadros do Pinta são desenhos da animação. Veja a ordem: quando o relógio dispara durante a partida, nasce uma pedra e logo ela recebe a animação. A folha já foi preparada no início.',
        edit: 'Complementar o recorte com uma linha do tempo; não converter 40 quadros em duração exata em segundos.',
        visual:
          'Três trilhas: Ao iniciar prepara folha; relógio cria pedra A, depois B; cada pedra alterna quadros 0/1. Mesmas cores/rótulos para cada objeto, sem controle do aluno.',
        criteria: [
          'Preparação ocorre uma vez; criação e animação se repetem para cada novo objeto.',
          'Quadro do jogo não é desenho da folha.',
        ],
        help: 'Pergunte “é o tempo do jogo ou uma imagem da animação?” ao ler a palavra quadro.',
      },
      {
        key: 'novo-criador',
        title: 'Troque a peça e aproveite o sorteio',
        kind: 'build',
        part: 2,
        from: 'Olha os campos dele:',
        focus: 'Substituir o criador do kit preservando o x aleatório e eliminando a duplicação.',
        reason:
          'Aqui montar antes preserva a peça conectada em x; o trecho deve terminar com o criador antigo removido.',
        say: 'No A cada 40 quadros, dentro de Se a tela atual é jogando, monte No grupo … criar um sprite chamado … com imagem. Escolha asteroides; nome asteroide; mova o x aleatório do velho; y −30; tamanho 40 × 40; imagem asteroide; vx 0; vy 3. Confira e apague só o criador velho.',
        edit: 'Preservar o gesto de mover, não copiar, a peça x. Identificar pelo rótulo com imagem, sem posição de gaveta. Mostrar coexistência como etapa temporária, nunca resultado a entregar.',
        visual:
          'Novo criador no mesmo Se/relógio. Mover a peça x, preencher os nove campos, comparar e usar Apagar este bloco no antigo. O x vazio antigo pode gerar pedras no canto até a retirada.',
        criteria: [
          'Um único criador de asteroides ativo ao final, o com imagem.',
          'Grupo asteroides, nome asteroide, x aleatório conectado nesse criador.',
          'y −30, largura/altura 40, VX 0, VY 3; dentro de Se jogando no relógio de 40 quadros.',
        ],
        help: 'Se saem pedras do kit junto, procure o criador antigo ainda ativo. Se as novas saem todas no mesmo x, confira onde ficou conectada a peça aleatória.',
        question: [
          'Estão caindo pedras suas e pedras cinzas. O que conferir primeiro?',
          'Se o criador antigo do kit ainda está ativo junto do novo.',
          'Se a cor da nave está errada.',
          'Dois criadores podem gerar duas famílias de pedras. Esta substituição termina com apenas o novo.',
        ],
      },
      {
        key: 'animar-cada',
        title: 'Anime cada asteroide que nascer',
        kind: 'build',
        part: 3,
        to: 'e agora ele é seu de verdade.',
        focus: 'Animar o sprite recém-criado no mesmo ramo e testar a mecânica.',
        reason:
          'O nome asteroide aponta para quem acabou de nascer; colocar a animação no início não alcança os nascimentos futuros.',
        say: 'Logo abaixo do novo criador, dentro do mesmo Se jogando e do mesmo relógio, coloque Animar sprite. Escolha asteroide, folha-asteroide e girando. Confira 0 a 1, 8 fps. Inicie e teste: cada pedra nova deve animar, e tiros, pontos e vidas precisam continuar funcionando.',
        edit: 'Preservar seletores e teste. Não incluir aqui uma tarefa nova de melhorar as artes. Atualizar “caixa pelos pixels” para explicar caixa delimitadora do conteúdo opaco apenas na revisão do professor.',
        visual:
          'Destaque no encaixe imediatamente depois do criador, antes de fechar o Se. Teste com pelo menos três nascimentos; nova partida também funciona.',
        criteria: [
          'Animar asteroide/folha-asteroide/girando, 0–1, 8 fps depois do criador, no mesmo ramo.',
          'Três asteroides sucessivos animam.',
          'Tiro acerta, pontuação/vidas reagem e nova partida reinicia corretamente.',
        ],
        help: 'Se a primeira pedra anima e as outras não, confira se Animar sprite está junto de cada criação. Não coloque esse bloco só no Ao iniciar.',
        question: [
          'Por que Animar sprite fica logo depois do criador dentro do relógio?',
          'Para animar cada asteroide novo depois que ele existe.',
          'Para mudar a velocidade de queda de todas as pedras.',
          'A sequência é criar e animar o objeto recém-criado. A queda é controlada por vx e vy.',
        ],
      },
    ],
    delivery:
      'Jogue uma partida, perca ou vença, reinicie e confira a nova partida. Envie o mesmo projeto com nave e asteroides usando suas artes.',
    rubric: [
      'Folha-asteroide 64 × 64 preparada no Ao iniciar, com nome distinto do sprite.',
      'Criador do kit ausente; novo criador único com x aleatório, y −30, 40 × 40, VX 0, VY 3 no relógio de 40 quadros e condição jogando.',
      'Animar o recém-criado imediatamente depois, mesmo ramo; girando, 0–1, 8 fps.',
      'Arte nova não altera inadvertidamente controles, estado, placar, vidas, explosão ou reinício.',
      'Conferir colisão real com a arte enviada: o contorno visual irregular não implica colisão pixel a pixel.',
    ],
    corrections: [
      'Nesta aula montar antes de apagar preserva a peça x; o criador antigo não declara um nome próprio como o Criar nave da aula 6.',
      'A caixa automática é baseada nos limites do conteúdo opaco; não prometer precisão pixel a pixel em todos os vazios.',
      'Editar desenho atualiza os projetos vinculados após salvar/sincronizar; não promete atualizar a publicação já feita.',
      'Manter o caminho editar desenho como orientação de ajuda: Imagens → editar desenho → salvar no Pinta → voltar e conferir atualização. Não iniciar outra tarefa.',
      'No fecho gravado, atualizar a ordem da aula 8: publicar vem antes de apresentar outras versões.',
    ],
    quiz: [
      [
        'O y −30 serve para quê?',
        'Começar a pedra um pouco acima da tela antes de ela entrar caindo.',
        'Escolher o quadro −30 da animação.',
        'y indica posição; neste jogo o sentido positivo para baixo permite a pedra entrar com vy 3.',
      ],
      [
        'Mudar a arte exige remontar o placar?',
        'Não, se mantivermos os grupos, nomes e conexões que a lógica usa.',
        'Sim, a imagem sempre apaga os blocos de pontos.',
        'A aparência pode mudar conservando o comportamento. Ainda assim, testar confirma que a troca preservou as referências.',
      ],
    ],
  },
  8: {
    title: 'Publique o jogo do seu jeito',
    tool: 'estudio',
    entry: 'Jogo com as duas artes próprias pronto e testado na aula 7.',
    exit: 'Projeto enviado ao professor, publicação conferida no Mural e compreensão de tema, mecânica e caminhos para continuar após o curso.',
    opening:
      'O jogo com a sua arte está pronto. Hoje a primeira tarefa é publicar e conferir que as outras pessoas conseguem jogar. Depois vou mostrar algumas possibilidades para quando você quiser criar de novo. Você não precisa construir outro jogo para terminar este curso.',
    closing:
      'Você levou um jogo para o Estúdio, desenhou em pixels e em vetor, animou e colocou suas artes no jogo. Sua versão está pronta para ser jogada. Quando quiser continuar, pode trocar a arte, imaginar outro tema ou buscar uma ideia no Mural. Termine as duas perguntas; a criação de hoje já está completa.',
    choices:
      'Título, resumo e capa da publicação. Ideias de versões, Desafio do mês e Clube são orientação para depois; não exigir criar outro jogo, participar de competição, remixar ou postar no Clube para concluir.',
    steps: [
      {
        key: 'publicar',
        title: 'Publique e abra o jogo no Mural',
        kind: 'build',
        part: 1,
        focus: 'Publicar a versão pronta e verificar o cartão e o jogo abertos pela publicação.',
        reason:
          'Preserva a revisão original: publicar primeiro, sem segurar a vitória atrás de sugestões de outros projetos.',
        say: 'Abra o projeto com a sua nave e seus asteroides. Teste e use Compartilhar. Escolha título, resumo e capa; confira o aviso da cópia publicada e publique. Feche a janela, vá ao Mural e abra o cartão do seu jogo. Jogue a versão que está lá.',
        edit: 'Reaproveitar o caminho de publicação. Cortar a explicação longa do Desafio do mês para a seção de orientação posterior; deixar desmarcado nesta publicação guiada. Não prometer rankings, selos ou prêmios não confirmados. Preservar o aviso de cópias separadas.',
        visual:
          'Título, resumo, capa, aviso e Publicar; depois Fechar e Mural pelo menu. Conferir nome/arte corretos no cartão e abrir o jogo publicado. Não mostrar apenas tela de sucesso.',
        criteria: [
          'Cartão com título, capa e resumo da criação.',
          'Link publicado abre o jogo com as duas artes.',
          'Partida publicada responde e permite reinício.',
        ],
        help: 'Se o cartão mostra uma versão antiga, confira qual projeto publicou. Alterar o projeto depois não substitui automaticamente a versão que já está no Mural.',
        question: [
          'Você mudou o projeto depois de publicar. O jogo daquela publicação mudou sozinho?',
          'Não; a versão publicada e o projeto editável são cópias separadas.',
          'Sim; qualquer alteração no Pinta muda toda publicação antiga.',
          'A publicação guarda o estado daquele momento. Abra a versão publicada para conferir o que os outros recebem.',
        ],
      },
      {
        key: 'versoes',
        title: 'Observe: a mesma regra com outra aparência',
        kind: 'observe',
        part: 2,
        focus: 'Distinguir mecânica, tema e estilo visual, sem abrir uma nova construção.',
        reason:
          'A criança já terminou a criação principal e pode reconhecer possibilidades sem desviá-la antes da publicação.',
        say: 'Veja a nave e depois o carrinho. Se os controles, tiros, obstáculos e pontuação seguem as mesmas regras, a mecânica foi preservada. O tema e o desenho mudaram. Essas são ideias para outro dia, não uma tarefa nova desta aula.',
        edit: 'Usar no máximo dois exemplos reais e uma comparação de estilo. Não afirmar “mesmos blocos” se o exemplo de carrinho retirou tiros, vidas ou vitória. Trocar obrigação de duas versões por convite para prática futura.',
        visual:
          'Comparação de dois jogos jogáveis preparados pelo professor. Destacar uma regra igual e um elemento visual diferente; encerrar sem abrir o editor da criança.',
        criteria: [
          'Separar aparência/história das regras.',
          'Não confundir trocar imagens com qualquer mudança de mecânica.',
        ],
        help: 'Pergunte o que a pessoa ainda faz para jogar e o que só mudou na aparência.',
      },
      {
        key: 'ideias',
        title: 'Observe: onde procurar uma próxima ideia',
        kind: 'observe',
        part: 3,
        focus: 'Conhecer as opções de tema do mês e remix, sem sair para uma atividade extra.',
        reason:
          'A função desta seção é orientação pós-curso; não criar cópias que se confundam com a entrega.',
        say: 'Quando quiser uma ideia nova, veja o tema do mês na página inicial ou jogue uma criação no Mural. Fazer a minha versão cria outro projeto, com o nome Remix de. O jogo publicado que você acabou de conferir continua separado.',
        edit: 'Reaproveitar os caminhos e o projeto de teste da aula 1. Professor demonstra remix em projeto de demonstração, sem pedir clique da criança. Corrigir a afirmação de que outro tema quase sempre exige começar do zero: às vezes cabe adaptar as mesmas regras.',
        visual:
          'Tema atual sem narrar seu nome; cartão do Mural e surgimento de Remix de na conta de demonstração. Mostrar Meu jogo novo como ponto de partida disponível, sem montar blocos.',
        criteria: [
          'Remix cria outro projeto editável.',
          'Desafio do mês é uma opção futura e depende do tema/participação escolhida.',
        ],
        help: 'Não é preciso importar de novo o jogo da aula nem criar um remix para terminar.',
      },
      {
        key: 'clube',
        title: 'Observe: como pedir uma ajuda que funciona',
        kind: 'observe',
        part: 4,
        focus: 'Saber descrever uma dúvida concreta no Clube.',
        reason:
          'Oferece uma estratégia de continuidade, sem transformar postagem social em critério obrigatório.',
        say: 'No Clube você pode mostrar o que está criando e pedir uma sugestão. Uma pergunta ajuda mais quando conta o que você queria, o que tentou e o que aconteceu. Por exemplo: queria que o fogo pulsasse, dupliquei o quadro, mas os dois desenhos ficaram iguais.',
        edit: 'Reaproveitar apresentação do Clube. Remover obrigação de postar, promessa de resposta pessoal e frase absoluta “ninguém aprende sozinho”. Preferir exemplos preparados para a gravação a dados de crianças expostos sem necessidade.',
        visual:
          'Tela de demonstração com uma pergunta em três partes: queria/tentei/aconteceu. Nenhum envio automático ou ação exigida do aluno.',
        criteria: ['Reconhecer como formular uma dúvida específica.'],
        help: 'Na própria aula, Preciso de ajuda já leva ao professor o contexto da seção.',
      },
    ],
    delivery:
      'Envie o projeto que acabou de publicar pela galeria do Estúdio. Na mensagem da entrega, cole o endereço da publicação para o professor conferir o jogo no Mural. Você não precisa criar nem enviar uma segunda versão.',
    rubric: [
      'Projeto entregue corresponde ao jogo próprio terminado na aula 7.',
      'Professor abre o endereço da publicação e confere identidade, artes, partida, telas e reinício.',
      'Pergunta sobre cópias separadas respondida; não interpretar isso como prova automática de publicação.',
      'Não exigir publicação no Clube, participação no tema mensal, remix ou duas versões adicionais.',
    ],
    corrections: [
      'Publicação vem primeiro, como a decisão original de 23/08.',
      'O recebimento pela galeria é automático; verificação do link no Mural é humana. O manifesto não tem uma ação automática de publicar jogo.',
      'Não prometer desbloqueio, XP, selo, premiação ou posições no ranking sem conferir o produto configurado.',
      'Apresentar a rotina das versões como prática futura, compatível com o pedido de foco da criança.',
      'Preparar os jogos de comparação antes de editar o vídeo; não afirmar que os exemplos já estão implementados neste pacote.',
    ],
    quiz: [
      [
        'Trocar a nave por um submarino, conservando controles e regras, muda principalmente o quê?',
        'O tema e a aparência.',
        'Obrigatoriamente todas as regras do jogo.',
        'O tema pode mudar mantendo a mecânica. Se você também mudar controles ou objetivos, a mecânica pode mudar junto.',
      ],
      [
        'Para pedir ajuda sobre uma animação parada, qual mensagem ajuda mais?',
        'Dupliquei o quadro, mas os dois desenhos ficaram iguais e o fogo não pulsa.',
        'Não ficou bom.',
        'Contar o que tentou e o resultado facilita localizar a próxima ação.',
      ],
    ],
  },
}
