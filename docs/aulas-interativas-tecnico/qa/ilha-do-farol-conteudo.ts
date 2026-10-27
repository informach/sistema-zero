/** Fonte editorial. A geração conserva a fala integral e os passos do caderno. */
export type IlhaTrecho = {
  key: string
  title: string
  kind: 'intro' | 'material' | 'experience' | 'build' | 'delivery' | 'closing'
  text: string
  screen: string
  steps?: string[]
}
const verificar =
  '[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos, confira os nomes e os encaixes que acabamos de montar e teste de novo. [confident, clear, unhurried voice] Depois clique em Verificar projeto. Se algum objetivo faltar, leia a indicação, ajuste e verifique novamente. Quando aparecer Objetivo cumprido! e depois Salvo, clique em Próxima parte.'
const enviar =
  '[confident, clear, unhurried voice] Clique em Verificar projeto. Se algum objetivo faltar, leia a indicação, ajuste e teste novamente. Quando aparecer Objetivo cumprido! e depois Salvo, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.'
export const ilhaAulas: { slug: string; title: string; trechos: IlhaTrecho[] }[] = [
  {
    slug: 'ilha-aula-1',
    title: 'Uma ilha com profundidade',
    trechos: [
      {
        key: 'abertura',
        title: 'Jogue na ilha',
        kind: 'intro',
        screen:
          'Jogo final. Mostrar o personagem andando alguns passos e a ponte, sem resolver a partida. Foco no jogo para receber as teclas.',
        text: '[upbeat, welcoming voice] Você já criou A Chave do Farol. Agora vamos levar essa ideia para uma ilha em três dimensões: A Ilha do Farol! O desafio continua: encontrar a chave e acender o farol para o barco chegar. [interested, animated voice] Olha aqui: eu caminho pelo chão e posso passar na frente ou atrás dos objetos. A pedra pode esconder a chave dependendo de onde a gente olha. [upbeat, encouraging voice] Sua vez! Clique no jogo e use as setas do teclado ou as letras W, A, S e D para andar. Para começar outra partida, pressione R. Explore a ilha; você pode seguir mesmo sem terminar a partida. Depois clique em Próxima parte.',
      },
      {
        key: 'material',
        title: 'Seu passo a passo do projeto',
        kind: 'material',
        screen: 'Abrir o PDF e mostrar uma página de montagem e o botão Baixar. Consulta opcional.',
        text: '[upbeat, welcoming voice] Este é o seu Passo a passo do projeto! Ele guarda os blocos, os encaixes e os testes das três aulas. Se você esquecer um passo, pode voltar aqui e consultar. [engaging, energetic, conversational voice] Você pode ler aqui mesmo ou clicar em Baixar para guardar. O Como Fazer também tem ajuda para usar o Estúdio. Quando quiser continuar, clique em Próxima parte.',
      },
      {
        key: 'ponto-de-vista',
        title: 'O que aparece quando você muda de lugar?',
        kind: 'experience',
        screen:
          'Ilustrar olhar uma chave atrás de uma pedra de dois lugares. Não demonstrar todas as respostas. Atividade view, controles livres.',
        text: '[curious] Sabe quando uma pessoa fica na sua frente e você dá um passo para o lado para enxergar? O que estava escondido aparece, mesmo sem sair do lugar. [engaging, energetic, conversational voice] No jogo 3D, a câmera é o lugar de onde a gente olha. Mudar a câmera pode revelar um objeto que já estava ali. Isso é diferente de mover o próprio objeto. [upbeat, encouraging voice] Na experiência, procure a chave olhando de lugares diferentes. Compare o que aparece e o que continua no mesmo lugar. Você pode voltar às vistas quantas vezes quiser. Quando fizer as descobertas, clique em Próxima parte.',
      },
      {
        key: 'movimento',
        title: 'Faça o personagem andar',
        kind: 'build',
        screen:
          'Projeto inicio. Mostrar Enquanto estiver rodando, A cada quadro da cena cena. Encaixar Andar com personagem antes do aviso. As áreas permitidas e as animações já vêm configuradas em Ao iniciar.',
        steps: [
          'Abra Enquanto estiver rodando e deixe à vista A cada quadro da cena cena.',
          'Antes de Escrever no canto da tela, encaixe Jogo 3D → Movimento → Andar com o teclado → Andar com personagem usando WASD/setas, velocidade 3.',
          'Escolha personagem e troque a velocidade de 3 por 4.',
          'Execute o jogo. Pressione e solte cada seta: ande nas quatro direções e pare ao soltar. Confira a ponte e a beirada.',
          'Verifique o projeto, corrija se necessário e espere Salvo.',
        ],
        text:
          '[engaging, energetic, conversational voice] Na experiência, mudar a vista não moveu a chave. Agora vamos mover o personagem. Clique no seu jogo e pressione uma seta. Ele ainda fica parado, porque falta o comando de movimento. [confident, clear, unhurried voice] Volte aos blocos. Encontre a área Enquanto estiver rodando e deixe à vista A cada quadro da cena cena. Dentro dele, encontre Escrever no canto da tela. O novo bloco vai antes desse aviso. As áreas por onde o personagem pode andar já estão preparadas em Ao iniciar. [confident, clear, unhurried voice] Abra Jogo 3D, Movimento, Andar com o teclado. Pegue Andar com personagem usando WASD ou setas, velocidade 3. Arraste até o lugar que deixamos à vista e solte quando aparecer o encaixe. No nome, escolha personagem. No número que vem em 3, coloque 4. [engaging, energetic, conversational voice] Lembra dos quadros do jogo 2D? A cada quadro, esse comando confere as teclas pressionadas e move o personagem no chão. O número é a velocidade por segundo. [upbeat, encouraging voice] Execute o jogo. Clique nele, pressione a seta da direita por um tempo e solte. Faça o mesmo com as outras três. Repare: ele anda enquanto você pressiona e para quando solta. Ele também mexe as pernas e os braços enquanto anda, e respira quando para: essas animações já vieram prontas no seu projeto. Experimente também chegar à ponte e à beirada. ' +
          verificar,
      },
      {
        key: 'entrega',
        title: 'Confira seu primeiro percurso',
        kind: 'delivery',
        screen:
          'Percurso com as quatro setas, parada e R. Sem exigir coleta ainda. Mostrar objetivos, Salvo, envio e confirmação.',
        steps: [
          'Ande nas quatro direções e solte as teclas para parar.',
          'Atravesse a ponte e volte. Pressione R para começar novamente.',
          'Verificar projeto → aguardar Salvo → Enviar meu projeto → Enviar → Projeto enviado!.',
        ],
        text:
          '[pleased, lively voice] Você programou o movimento do personagem na ilha! Agora faça um percurso: ande nas quatro direções, solte as teclas para parar e atravesse a ponte. Depois pressione R para voltar ao começo. A chave ainda não é recolhida; essa regra vem na próxima aula. ' +
          enviar,
      },
      {
        key: 'fecho',
        title: 'Seu personagem já explora a ilha',
        kind: 'closing',
        screen: 'Reconhecer o movimento após envio, saída Concluir aula.',
        text: '[pleased, lively voice] Seu personagem já anda pelo mundo em 3D. Você também descobriu que olhar de outro lugar pode revelar algo escondido. Na próxima aula, vamos escolher um lugar para a chave e programar o encontro com ela. Clique em Concluir aula.',
      },
    ],
  },
  {
    slug: 'ilha-aula-2',
    title: 'A chave está ao seu alcance',
    trechos: [
      {
        key: 'posicao-3d',
        title: 'Duas direções no chão e uma na altura',
        kind: 'experience',
        screen:
          'Comparar planta do chão e vista lateral. X e Z no chão, Y vertical. Atividade position com marca inicial, anterior e projeção.',
        text: '[engaging, energetic, conversational voice] No jogo 2D, você usou x e y para escolher um lugar na tela. Aqui a posição tem três valores, e o y tem outro papel: ele indica a altura. [interested, animated voice] Imagine procurar um livro numa estante. Você pode mudar de lugar para os lados, chegar mais perto ou mais longe e também procurar numa prateleira mais alta. No seu jogo, x e z indicam as duas direções do chão; y indica a altura. [upbeat, encouraging voice] Experimente aumentar e diminuir cada valor da chave. Observe a marca do lugar inicial e compare com o lugar atual. Mude também a vista para enxergar melhor cada diferença. Você escolhe por onde começar. Quando fizer as comparações, clique em Próxima parte.',
      },
      {
        key: 'posicao',
        title: 'Coloque a chave na ilha',
        kind: 'build',
        screen:
          'Ao iniciar, posição da chave; editar um eixo por vez, com teste intermediário. Solução canônica x −3, y 1, z −2, diferente da entrada.',
        steps: [
          'Em Ao iniciar, encontre Posição do objeto chave em x −2 y 1 z −3.',
          'Mude x para −3 e teste. Depois mude z para −2 e teste. Mantenha y em 1.',
          'Confira a chave na ilha e leve o personagem até perto dela.',
        ],
        text:
          '[engaging, energetic, conversational voice] Agora que você comparou as três direções, vamos mudar o lugar da chave no seu jogo. [confident, clear, unhurried voice] Nos blocos, abra Ao iniciar e encontre Posição do objeto chave em x menos 2, y 1 e z menos 3. Se precisar, arraste um espaço vazio entre os blocos até deixar essa linha à vista. Primeiro mude só x: coloque menos 3. Execute o jogo e observe para onde a chave foi. [confident, clear, unhurried voice] Volte à mesma linha e coloque menos 2 em z. Deixe y em 1. Execute outra vez e leve o personagem até perto da chave. [interested, animated voice] Ela mudou de lugar no chão, mas continuou na mesma altura. Por enquanto, encostar não a retira: vamos montar essa reação depois de investigar o contato em 3D. ' +
          verificar,
      },
      {
        key: 'contato-3d',
        title: 'Parece junto, mas está encostando?',
        kind: 'experience',
        screen:
          'Atividade contact, inicialmente vista de cima e chave alta. Todos os controles livres. Áreas desenhadas correspondem à conta de contato.',
        text: '[curious] Se a chave aparece sobre o personagem na imagem, será que os dois estão encostando? Uma lâmpada pode ficar bem acima da sua cabeça sem encostar em você. Ainda existe um espaço entre vocês. [engaging, energetic, conversational voice] Em 3D, o encontro depende do lugar no chão e da altura. A imagem sozinha pode enganar. [upbeat, encouraging voice] Na experiência, teste um encontro e observe o resultado. Troque a vista, mude o lugar da chave ou do personagem e compare casos em que eles encostam com casos em que ficam separados. Se quiser, mostre as áreas de contato. Repita os testes na ordem que preferir. Quando fizer as descobertas, clique em Próxima parte.',
      },
      {
        key: 'recolher',
        title: 'Recolha a chave',
        kind: 'build',
        screen:
          'Mostrar Quando acontecer existente com reinício por R. Novo encontro fica fora do evento R. O evento escolhe diretamente personagem e chave, sem grupo nem nome de item.',
        steps: [
          'Deixe à vista um espaço dentro de Quando acontecer, depois do evento da tecla R.',
          'Jogo 3D → Encostar → Encostar: arraste Quando personagem encostar em chave.',
          'Dentro do fazer, encaixe Jogo 3D → Objetos → Aparência → Esconder o objeto chave.',
          'Jogue até a chave. Confira que ela some apenas no encontro. Pressione R para repetir.',
        ],
        text:
          '[engaging, energetic, conversational voice] Você viu que o contato precisa acontecer também na altura. No seu jogo, leve o personagem até a chave. Ela ainda fica ali porque falta a reação do encontro. [confident, clear, unhurried voice] Volte aos blocos e encontre Quando acontecer. Já existe ali o evento da tecla R, que recomeça a partida. Deixe à vista um espaço depois desse evento, fora do fazer dele. Abra Jogo 3D, Encostar, Encostar. Pegue o bloco Quando personagem encostar em chave. Encaixe no espaço que deixamos à vista. No primeiro nome, escolha personagem; no segundo, chave. [confident, clear, unhurried voice] Agora deixe à vista o fazer do novo encontro. Abra Jogo 3D, Objetos, Aparência e pegue o bloco de mostrar ou esconder o objeto. Encaixe dentro desse fazer. Escolha Esconder e, no objeto, chave. [upbeat, encouraging voice] Execute o jogo e caminhe até a chave. Ela deve sumir quando o personagem encostar. Pressione R e repita por outro caminho. ' +
          verificar,
      },
      {
        key: 'memoria',
        title: 'Guarde que você pegou a chave',
        kind: 'build',
        screen:
          'Criar temChave falso em Ao iniciar. Atribuir verdadeiro depois de esconder no encontro. Nenhum mostrador de variável inventado: verificar estrutura e resultado pelo objetivo.',
        steps: [
          'Deixe à vista Ao iniciar, depois da linha que cria aviso. Em Programação → Variáveis, pegue Criar variável e encaixe ali. Escreva temChave no nome.',
          'No valor da variável, encaixe verdadeiro ou falso de Programação → Lógica e Se. Escolha falso: a partida começa sem chave.',
          'Deixe à vista o encontro com chave, depois de Esconder o objeto chave. Encaixe Alterar variável, de Programação → Variáveis. Escolha temChave e encaixe o valor verdadeiro, de Programação → Lógica e Se.',
          'Confira os dois lugares. A coleta deve guardar a informação até o reinício.',
        ],
        text:
          '[engaging, energetic, conversational voice] A chave sumiu. Lembra do jogo 2D? Sumir e guardar que pegamos a chave são ações diferentes. Vamos usar de novo temChave, a variável que responde se o personagem tem a chave. [confident, clear, unhurried voice] Deixe à vista o fim da área Ao iniciar. Em Programação, Variáveis, pegue Criar variável e encaixe depois da linha que cria aviso. Escreva temChave no nome. Em Programação, Lógica e Se, pegue verdadeiro ou falso e coloque no valor dessa variável. Escolha falso, porque a partida começa sem a chave. [confident, clear, unhurried voice] Agora deixe à vista o encontro do personagem com chave. Em Programação, Variáveis, pegue Alterar variável variável para e encaixe depois de Esconder o objeto chave. Escolha temChave. Em Programação, Lógica e Se, pegue verdadeiro ou falso e encaixe no valor. Aqui escolha verdadeiro. [interested, animated voice] Confira os dois lugares: ao começar, falso; ao recolher, verdadeiro. O valor não aparece como um objeto na ilha. Na próxima aula, o farol vai consultar essa informação. ' +
          verificar,
      },
      {
        key: 'aviso',
        title: 'Conte que a chave foi recolhida',
        kind: 'delivery',
        screen:
          'Atribuição aviso dentro da coleta. HUD existente lê aviso a cada quadro. Envio desta aula.',
        steps: [
          'Deixe à vista o encontro com chave, depois de temChave verdadeiro. Em Programação → Variáveis, pegue Alterar variável e encaixe ali. Escolha aviso.',
          'Em Programação → Valores, pegue Texto e encaixe no valor. Escreva Você pegou a chave! Agora vá ao farol.',
          'Jogue, recolha e se afaste. O aviso deve continuar. Reinicie: chave e aviso inicial voltam.',
          'Verifique, aguarde Salvo e envie o projeto com confirmação.',
        ],
        text:
          '[engaging, energetic, conversational voice] Vamos mostrar na tela quando a coleta acontece. O jogo já exibe o texto guardado em aviso. Só precisamos mudar esse texto no encontro. [confident, clear, unhurried voice] Deixe à vista o encontro com chave e a linha temChave verdadeiro. Em Programação, Variáveis, pegue Alterar variável variável para e encaixe depois dessa linha. Escolha aviso. Em Programação, Valores, pegue Texto, encaixe no valor e escreva: Você pegou a chave! Agora vá ao farol. [upbeat, encouraging voice] Execute o jogo, recolha a chave e se afaste. A chave deve sumir e o novo aviso deve continuar na tela. Pressione R: a chave e o aviso inicial devem voltar. Se algo não funcionou, confira se esconder a chave, guardar verdadeiro e mudar aviso estão juntos no fazer do encontro. Corrija e teste novamente. ' +
          enviar,
      },
      {
        key: 'fecho',
        title: 'A chave já pode ser encontrada',
        kind: 'closing',
        screen: 'Projeto enviado, encerrar aula.',
        text: '[pleased, lively voice] Você escolheu uma posição em 3D e programou a coleta. Agora sabe por que olhar de lado pode ajudar a descobrir se dois objetos realmente encostam. Na próxima aula, o farol vai consultar a chave e responder. Clique em Concluir aula.',
      },
    ],
  },
  {
    slug: 'ilha-aula-3',
    title: 'A luz volta ao farol',
    trechos: [
      {
        key: 'sem-chave',
        title: 'O farol precisa conferir a chave',
        kind: 'build',
        screen:
          'Partida sem chave primeiro. Encontro com farol como irmão da coleta. Se temChave com então vazio, senão aviso. Retomada breve sem experiência nova de memória/condição.',
        steps: [
          'Deixe à vista Quando acontecer, depois do evento da coleta e fora do fazer dele. Em Jogo 3D → Encostar → Encostar, pegue Quando personagem encostar em chave. Encaixe ali, escolha personagem no primeiro nome e farol no segundo.',
          'No fazer desse encontro, encaixe Programação → Lógica e Se → Se; clique em + senão.',
          'Retire a comparação x maior que zero da pergunta do Se. No lugar dela, encaixe valor da variável, de Programação → Valores, e escolha temChave.',
          'Deixe à vista o senão. Encaixe Alterar variável, de Programação → Variáveis, e escolha aviso. Encaixe Texto, de Programação → Valores, com Falta a chave. Procure na ilha antes de voltar. Deixe então vazio nesta parte.',
          'Reinicie e vá direto ao farol sem recolher a chave. Confira o aviso e a luz apagada.',
        ],
        text:
          '[engaging, energetic, conversational voice] No jogo 2D, o farol perguntava se você tinha a chave. Vamos montar essa mesma decisão na ilha 3D. Primeiro execute o jogo e vá ao farol sem recolher a chave. Ainda falta a resposta dele. [confident, clear, unhurried voice] Volte aos blocos. Em Quando acontecer, deixe à vista um espaço depois do encontro com chave, fora do fazer dele. Abra Jogo 3D, Encostar, Encostar. Pegue Quando personagem encostar em chave e encaixe nesse espaço. Escolha personagem no primeiro nome e farol no segundo. [confident, clear, unhurried voice] Deixe à vista o fazer desse novo encontro. Abra Programação, Lógica e Se e pegue Se. Encaixe dentro do fazer. O Se chega com a pergunta x maior que zero. Arraste essa comparação pelo sinal de maior até a lixeira para deixar o lugar da pergunta vazio. Em Programação, Valores, pegue valor da variável e encaixe nesse lugar. Troque x por temChave. Depois clique em mais senão, no próprio bloco Se, para abrir o segundo caminho. [engaging, energetic, conversational voice] Verdadeiro escolhe o então; falso escolhe o senão. Agora vamos construir a resposta para quem está sem chave. [confident, clear, unhurried voice] Deixe à vista o senão. Em Programação, Variáveis, pegue Alterar variável variável para e encaixe dentro dele. Escolha aviso. Em Programação, Valores, pegue Texto e encaixe no valor. Escreva: Falta a chave. Procure na ilha antes de voltar. Deixe o então vazio nesta parte. [upbeat, encouraging voice] Execute uma partida nova e vá direto ao farol, sem passar pela chave. O farol deve continuar apagado e o aviso deve pedir a chave. ' +
          verificar,
      },
      {
        key: 'decisao',
        title: 'Acenda o farol com a chave',
        kind: 'build',
        screen:
          'Projeto sem-chave. Montar três ações no então: Tocar a animação acender em farol uma vez, ganhou verdadeiro e aviso. Mostrar a regra pronta em Enquanto estiver rodando que troca para aceso repetindo e aproxima o barco. Testar sem chave e com chave; o feixe gira depois de acender.',
        steps: [
          'No encontro com farol, deixe à vista o então do Se temChave.',
          'Jogo 3D → Objetos → 🎬 Animação do modelo: encaixe Tocar a animação dentro do então.',
          'No primeiro espaço, escolha acender. No objeto, escolha farol. No último, escolha uma vez.',
          'Depois dele, encaixe Alterar variável, de Programação → Variáveis. Escolha ganhou. Encaixe verdadeiro ou falso, de Programação → Lógica e Se, e escolha verdadeiro.',
          'Ainda no então, encaixe mais um Alterar variável e escolha aviso. No valor, encaixe Texto, de Programação → Valores, e escreva Você acendeu o farol! O barco pode chegar.',
          'Teste sem chave; depois recolha e volte ao farol. Confira a luz acendendo, o feixe girando e a chegada do barco.',
        ],
        text:
          '[engaging, energetic, conversational voice] O farol já responde quando falta a chave. Agora vamos ensinar a resposta para quem trouxe a chave. [interested, animated voice] No jogo 2D, a gente trocava a imagem do farol apagado pela do farol aceso. Aqui o farol é um modelo só, e ele sabe acender: o modelo tem animações, como o personagem, que já anda e respira sozinho. [confident, clear, unhurried voice] Nos blocos, encontre o encontro com farol e deixe à vista o então do Se temChave. Abra Jogo 3D, Objetos, Animação do modelo. Pegue Tocar a animação e encaixe dentro do então. No primeiro espaço, escolha acender. No objeto, escolha farol. No último espaço, escolha uma vez. [engaging, energetic, conversational voice] Uma vez quer dizer que a luz acende e para no fim, acesa. Repetindo faria a animação recomeçar sem parar. [confident, clear, unhurried voice] Ainda dentro do então, deixe à vista o lugar depois de Tocar a animação. Em Programação, Variáveis, pegue Alterar variável variável para. Encaixe ali e escolha ganhou. Em Programação, Lógica e Se, pegue verdadeiro ou falso, coloque no valor e escolha verdadeiro. [interested, animated voice] Agora olhe em Enquanto estiver rodando: já existe uma regra pronta que usa ganhou. Quando a animação acender termina, ela deixa o farol aceso, com o feixe girando, e aproxima o barco. [confident, clear, unhurried voice] Volte ao então e, depois de ganhou, encaixe mais um Alterar variável variável para. Escolha aviso e encaixe um Texto de Programação, Valores. Escreva: Você acendeu o farol! O barco pode chegar. [upbeat, encouraging voice] Execute uma partida nova. Primeiro visite o farol sem chave: ele continua apagado. Depois pegue a chave e volte ao farol. Olha só: a luz acende, o feixe começa a girar, o aviso muda e o barco se aproxima. Pressione R para conferir o começo de outra partida. ' +
          verificar,
      },
      {
        key: 'aparencia',
        title: 'Deixe o jogo com a sua cara',
        kind: 'build',
        screen:
          'Projeto decisao. Antes de gravar, preparar duas combinações em perfis de teste (robo, lancha, chave-prateada, farol-colorido, ilha-nevada; mergulhador, veleiro, chave-dourada, farol-de-madeira, costa-rochosa) e gravar 3 a 4 segundos de cada com o farol acendendo e o barco chegando. Depois, ao vivo: em Ao iniciar, abrir a lista do modelo de cada Criar o objeto e escolher pirata, barco-pirata, chave-de-estrela, farol-de-pedra e noite-na-ilha. Não mudar nome do objeto nem tamanho.',
        steps: [
          'Em Ao iniciar, deixe à vista Criar o objeto personagem com o modelo aventureiro. Clique em aventureiro e escolha outro personagem da lista.',
          'Faça o mesmo em Criar o objeto barco, chave e farol: clique no nome do modelo e escolha outro.',
          'Em Criar o objeto cenario, troque praia-tropical por outro cenário: costa-rochosa, ilha-nevada ou noite-na-ilha.',
          'Troque só o modelo. Deixe o nome do objeto, a cena e o tamanho como estão.',
          'Teste a combinação: vá ao farol sem a chave, depois busque a chave e volte. Confira a luz e o barco.',
          'Verifique o projeto e aguarde Salvo.',
        ],
        text:
          '[curious] O seu farol já acende! E agora chegou uma surpresa: olha quantas versões o seu jogo pode ter. Outro personagem, outro barco, outra chave, outro farol e até outro cenário. [interested, animated voice] São as mesmas opções da Chave do Farol, com os mesmos nomes, agora em 3D. [engaging, energetic, conversational voice] Eu vou mostrar com o pirata. Você escolhe o que quiser, e o que você gostou pode ficar como está. [confident, clear, unhurried voice] Nos blocos, abra Ao iniciar e deixe à vista Criar o objeto personagem com o modelo aventureiro. Clique no nome aventureiro para abrir a lista e escolha outro. Eu escolho o pirata. [interested, animated voice] Olha só: ele aparece no mesmo lugar e do mesmo tamanho, porque todos os personagens deste jogo foram feitos com a mesma medida. E ele também anda e respira, como o aventureiro. [confident, clear, unhurried voice] Repare que o nome do objeto continua personagem, porque os outros blocos usam esse nome. Troque só o modelo e deixe o nome e o tamanho como estão. [engaging, energetic, conversational voice] Os blocos Criar o objeto barco, chave e farol funcionam do mesmo jeito: clique no nome do modelo e escolha outro. Eu vou escolher barco pirata, chave de estrela e farol de pedra. [interested, animated voice] No 2D, o farol tinha duas imagens, apagada e acesa. Aqui cada farol é um modelo só, e todos sabem acender. Por isso basta trocar num lugar. [engaging, energetic, conversational voice] Agora falta o lugar onde a história acontece. O primeiro Criar o objeto, o cenario, é a ilha inteira: o mar, o chão, a ponte, as árvores e o céu. Clique em praia tropical e escolha outro. Eu vou usar noite na ilha. [interested, animated voice] Olha só: o caminho, a ponte e o lugar do farol continuam os mesmos. [upbeat, encouraging voice] Agora teste a sua combinação! Vá até o farol sem a chave: ele continua apagado. Depois busque a chave e volte. Olha só: o farol de pedra acende, e o barco pirata vem chegando! [reassuring, encouraging voice] Se algo não funcionou, volte aos blocos e confira se você trocou só o modelo, e se cada modelo está no bloco do mesmo tipo: personagem no personagem, barco no barco. ' +
          verificar,
      },
      {
        key: 'personalizar',
        title: 'Escolha seu esconderijo e teste de verdade',
        kind: 'delivery',
        screen:
          'Projeto aparencia, com a combinação escolhida na parte anterior. Personalizar posição da chave e mensagens. Valor inicial exemplo −3,1,−2. Testar acesso pelo chão e ambos os ramos; envio atualizado.',
        steps: [
          'Em Ao iniciar → Posição do objeto chave, escolha x e z dentro da ilha. Mantenha uma altura que o personagem alcance.',
          'Se quiser, escreva seus próprios avisos nas linhas de atribuição, conservando a função de cada mensagem.',
          'Reinicie. Vá ao farol sem chave. Depois alcance a chave escolhida e volte ao farol.',
          'Reinicie após vencer: o farol apaga, a chave retorna e você pode jogar novamente.',
          'Verifique, aguarde Salvo, envie o projeto e confirme o envio.',
        ],
        text:
          '[upbeat, encouraging voice] Agora escolha outro lugar para a chave. Nos blocos, abra Ao iniciar e encontre Posição do objeto chave. Mude x e z para escolher o lugar no chão. Você também pode ajustar y, mas o personagem precisa conseguir encostar na chave. [thoughtful] Ver a chave não basta. Ela pode estar alta demais ou do outro lado da água. [engaging, energetic, conversational voice] Por isso, execute o jogo e vá até o lugar que escolheu. Confira se a coleta acontece e se dá para voltar ao farol. Se não conseguir, volte à posição da chave, ajuste um valor por vez e teste novamente. Se quiser, escreva seus próprios avisos nas linhas que mudam aviso, conservando a mensagem de começo, coleta, falta da chave e vitória. [upbeat, encouraging voice] Faça também uma partida sem pegar a chave: o farol deve ficar apagado e pedir que você procure. Depois recolha a chave e acenda o farol. Pressione R e confira se tudo volta ao começo. ' +
          enviar,
      },
      {
        key: 'fecho',
        title: 'Sua ilha está pronta',
        kind: 'closing',
        screen:
          'Depois do envio final, mostrar o Estúdio e a publicação opcional: Compartilhar, resumo, Gerar capa, Publicar, confirmação e Fechar. Sem certificado, venda ou autoria das artes. Concluir aula.',
        text: '[pleased, lively voice] Você transformou a ideia da Chave do Farol em um jogo 3D! Programou o movimento, escolheu um lugar alcançável para a chave, fez o farol acender com a coleta e deixou o jogo com a sua cara. Também aprendeu a mudar o ponto de vista para investigar o que a imagem não mostra de primeira. [upbeat, encouraging voice] Seu jogo está pronto! Se quiser publicar no Mural, clique em Compartilhar no Estúdio. O título já vem preenchido. Escreva um resumo, clique em Gerar capa e confira a imagem. Depois clique em Publicar e espere aparecer Seu jogo está no Mural! [pleased, lively voice] Olha só: seu jogo ganhou um lugar para outras pessoas jogarem! Clique em Copiar link de jogar para mostrar à família e aos amigos. Se precisar, peça ajuda a um adulto. [confident, clear, unhurried voice] Clique em Fechar para voltar. Você também pode continuar sem publicar. Para terminar, clique em Concluir aula.',
      },
    ],
  },
]
