/**
 * A fonte editorial do extra "Meu primeiro desenho no Pinta" (Faísca): as falas gravadas (com as
 * marcas do ElevenLabs), as notas de tela, as falas do Zappy na página e o Passo a passo do
 * projeto. O gerador (`gerar-meu-desenho.ts`) monta manifesto, roteiro e caderno a partir daqui.
 *
 * Uma aula curta, depois do par do posto. Não há conceito novo de lógica: é exploração de
 * ferramenta (desenhar formas no Pinta) e a troca de uma imagem num jogo que a criança já fez.
 * Por isso não há experiência nem quiz (DIRETRIZES, seção 2: operação de interface não ganha cena;
 * o quiz retoma raciocínio, e aqui não há raciocínio novo para retomar).
 *
 * A ordem das partes segue a régua das entregas: o desenho é entregue numa parte de Entrega e o
 * jogo no Fechamento, a última parte. Assim a criança envia o desenho ANTES de abrir o jogo, e a
 * vaga de arte `minha-chave` já chega preenchida aos materiais do jogo.
 */
import { entregar, telaDaConferencia, telaDoEnvio } from './faisca-comum'

export type MeuDesenhoTrecho = {
  key: string
  title: string
  kind: 'intro' | 'material' | 'draw' | 'swap'
  /** Fala do Zappy na página, logo depois do vídeo. Não é gravada. */
  ponte: string
  /** Fala gravada, com as marcas de interpretação. */
  text: string
  screen: string
  /**
   * As frases que a Debinha diz na edição kids (revisão de 23/11/2026, no molde da Ilha do Farol):
   * cada uma é um parágrafo inteiro do `text`, com a professora antes e depois, e a frase seguinte
   * responde o que foi perguntado.
   */
  kids?: string[]
}

/**
 * Revisão de 23/11/2026, no padrão do Cadê, da Chave do Farol e da Ilha do Farol: a abertura começa
 * com "Oi!" e deixa o jogo para a criança, o material usa a fala comum, a Debinha faz três perguntas,
 * a troca da imagem fecha com a conferência, a verificação e o envio na fórmula comum, e o Na tela
 * usa os verbos do palco. O palco não desenha no Pinta: a parte do desenho é gravada à mão, com as
 * deixas da fala no Na tela, sem gestos entre colchetes.
 */
export const meuDesenhoAula = {
  slug: 'aula-1',
  title: 'A minha chave no Farol',
  trechos: [
    {
      key: 'abertura',
      title: 'Uma chave desenhada por você',
      kind: 'intro',
      kids: ['E eu também vou poder desenhar a minha chave?'],
      screen:
        'O jogo pronto é a Chave do Farol com uma chave rosa desenhada no lugar da chave dourada. No "Lembra do seu jogo da Chave do Farol", mostrar o jogo pronto no tamanho da aula, parado. No "Olha este jogo aqui", ampliar o jogo pronto [ampliar jogo]. No "a chave não é mais a dourada de antes", apontar a chave desenhada [apontar jogo 227 69]. No "o personagem pega a chave", apontar o personagem [apontar jogo 53 173]. No "vai até o farol", apontar o farol [apontar jogo 404 116]. No "Olha aqui: quando eu seguro a seta da direita", segurar a seta da direita da tela por um instante, sem chegar à chave nem ao farol [segurar seta da direita por 1,2 s]. Durante a pergunta da Debinha, manter a cena parada. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não mostrar os blocos nem o Pinta.',
      ponte:
        'Sua vez! Jogue a versão pronta: pegue a chave desenhada e leve o personagem até o farol. Quando terminar, clique em Próxima parte.',
      text: '[upbeat, welcoming voice] Oi! Lembra do seu jogo da Chave do Farol? Hoje ele vai ganhar uma coisa que ninguém mais tem. [interested, animated voice] Olha este jogo aqui: a chave não é mais a dourada de antes. Ela foi desenhada no Pinta, o programa de desenhar da plataforma. [engaging, energetic, conversational voice] O resto do jogo continua igualzinho ao seu: o personagem pega a chave, vai até o farol, e o farol acende. [interested, animated voice] Olha aqui: quando eu seguro a seta da direita, o personagem anda para a direita. [curious] E eu também vou poder desenhar a minha chave? [engaging, energetic, conversational voice] Vai, sim! Nesta aula, você vai desenhar a sua chave no Pinta, aqui mesmo na página, e depois colocar o seu desenho no jogo. [upbeat, encouraging voice] Agora é a sua vez: jogue até o farol acender. Quando terminar, clique em Próxima parte.',
    },
    {
      key: 'material',
      title: 'O seu Passo a passo do projeto',
      kind: 'material',
      screen:
        'O material é o Passo a passo do projeto, o caderno anexado a `materiais`. No "Olha, aqui está o Passo a passo do projeto", apontar o material [apontar livro]. No "Nele estão os passos", colocar o livro em tela cheia [livro tela cheia]. No "para desenhar a sua chave", passar da capa para a página seguinte [livro próxima]. No "e colocar o desenho no jogo", passar mais uma página [livro próxima]. No "com as ferramentas que você vai usar", passar mais uma página [livro próxima]. No "Por isso, se você esquecer algum passo", passar mais uma página [livro próxima]. No "Se quiser", sair da tela cheia [livro sair da tela cheia]. No "você pode ler aqui mesmo", mostrar o livro no tamanho da aula [apontar livro]. No "também pode clicar em Baixar", clicar no botão **Baixar**, ao lado do nome do arquivo [baixar]. No "Agora clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não demonstrar a impressão nem os controles do leitor.',
      ponte:
        'Este é o seu Passo a passo do projeto! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.',
      text: '[engaging, energetic, conversational voice] Olha, aqui está o Passo a passo do projeto. Nele estão os passos para desenhar a sua chave e colocar o desenho no jogo, com as ferramentas que você vai usar e o lugar de cada uma. Por isso, se você esquecer algum passo, é só voltar aqui e abrir o material. [upbeat, encouraging voice] Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o material e consultar onde quiser. [confident, clear, unhurried voice] Agora clique em Próxima parte.',
    },
    {
      key: 'desenhar',
      title: 'Desenhe a sua chave',
      kind: 'draw',
      kids: ['E se a minha chave ficar torta?'],
      screen:
        'Gravação à mão: o palco não desenha no Pinta. A parte começa com o bloco do Pinta da aula, com o quadro quadrado vazio. No "o quadrado branco no meio é o seu quadro", apontar o quadro. No "leia as dicas e clique em Entendi", clicar em **Entendi!** nas Dicas rápidas. No "Agora clique em Expandir", clicar em **Expandir**. No "na esquerda fica a caixa de ferramentas", apontar a caixa de ferramentas. No "embaixo da caixa tem dois quadradinhos", apontar os quadrados de **Preenchimento** e **Contorno**, no pé da caixa. No "Clique no Preenchimento", clicar no Preenchimento e escolher um rosa no painel **Cores**. No "Clique na ferramenta Círculo", clicar em **Círculo**. No "No lado esquerdo do quadro", desenhar a argola, grande e redonda. No "Clique na ferramenta Retângulo", clicar em **Retângulo**. No "Clique e segure no meio da argola", desenhar a haste até perto da borda do quadro. No "Por último, os dentes", desenhar os dois dentes embaixo da ponta da haste. Durante a pergunta da Debinha, manter o desenho parado. No "Clique na ferramenta Selecionar", clicar em **Selecionar** e arrastar uma forma para o lugar certo. No "puxe um dos quadradinhos da borda", mudar o tamanho de uma forma. No "clique no Pincel", fazer um brilho na argola com o **Pincel**. No "clique em Reduzir", clicar em **Reduzir**. No "clique em Enviar meu desenho", clicar em **Enviar meu desenho** e, no "confirme em Enviar", em **Enviar**. No "Quando aparecer Desenho enviado", mostrar a mensagem **Desenho enviado!** e clicar em **Próxima parte**. Não preencher o recado.',
      ponte:
        'Agora desenhe a sua chave! Clique em Expandir e use um Círculo para a argola, um Retângulo para a haste e dois Retângulos pequenos para os dentes. Quando gostar, clique em Reduzir, em Enviar meu desenho e confirme em Enviar. Quando aparecer Desenho enviado!, clique em Próxima parte.',
      text: '[engaging, energetic, conversational voice] Este é o Pinta, aqui dentro da aula. Olha aqui: o quadrado branco no meio é o seu quadro, e tudo o que você desenhar nele vai virar a chave do jogo. [engaging, energetic, conversational voice] No jogo, a chave fica pequena. Por isso, desenhe bem grande, usando o quadro inteiro. [confident, clear, unhurried voice] Se aparecer a janela Dicas rápidas, leia as dicas e clique em Entendi!. [confident, clear, unhurried voice] Agora clique em Expandir, aqui em cima, para o Pinta ocupar a tela toda e você ter mais espaço para desenhar. [interested, animated voice] Olha aqui: na esquerda fica a caixa de ferramentas. É nela que você escolhe com o que vai desenhar. [engaging, energetic, conversational voice] Repare: embaixo da caixa tem dois quadradinhos. O cheio é o Preenchimento, a cor de dentro da forma. O vazado é o Contorno, a cor da borda. [confident, clear, unhurried voice] Clique no Preenchimento e depois escolha uma cor no painel Cores, à direita. Eu vou escolher um rosa. O Contorno já vem preto, e pode ficar assim. [confident, clear, unhurried voice] Agora a argola, a parte redonda da chave. Clique na ferramenta Círculo, na caixa. [confident, clear, unhurried voice] No lado esquerdo do quadro, clique e segure o botão do mouse. Sem soltar, arraste na diagonal, até a bolinha ficar grande e redonda. Depois solte. [confident, clear, unhurried voice] Agora a haste, a parte comprida. Clique na ferramenta Retângulo. [confident, clear, unhurried voice] Clique e segure no meio da argola. Sem soltar, arraste para a direita, até perto da borda do quadro, num retângulo baixinho. Depois solte. [confident, clear, unhurried voice] Por último, os dentes. Ainda com o Retângulo, desenhe um retângulo pequeno embaixo da ponta da haste, saindo para baixo. Do lado dele, desenhe outro. [curious] E se a minha chave ficar torta? [reassuring, encouraging voice] Dá para arrumar. Clique na ferramenta Selecionar, depois clique na forma e arraste para o lugar certo. [confident, clear, unhurried voice] Para mudar o tamanho, puxe um dos quadradinhos da borda da seleção. [upbeat, encouraging voice] Se quiser, clique no Pincel e faça um brilho na argola. [confident, clear, unhurried voice] Quando gostar da sua chave, clique em Reduzir, para voltar à aula. [confident, clear, unhurried voice] Depois clique em Enviar meu desenho, aqui em cima do Pinta, e confirme em Enviar. Quando aparecer Desenho enviado!, clique em Próxima parte.',
    },
    {
      key: 'trocar',
      title: 'A sua chave no jogo',
      kind: 'swap',
      kids: ['E as regras do jogo continuam funcionando com o meu desenho?'],
      screen: `A parte começa com o Estúdio no tamanho da aula, com o jogo pronto da Chave do Farol. No "Clique no menu de três pontinhos", abrir o menu do Estúdio [clicar "Mais opções"]. No "e depois em Imagens", abrir as imagens do jogo [clicar "Imagens"]. No "Role a lista até o fim", rolar a lista de imagens até a última. No "A sua chave está aqui", apontar a imagem **minha-chave**, com o selo **Seu desenho da aula** [apontar "minha-chave"]. No "Clique em Fechar", fechar a janela [clicar "Fechar"]. No "Agora clique em Expandir", colocar o Estúdio em tela cheia [expandir estúdio]. No "Encontre essa área", trazer a área **Ao iniciar** para perto do meio [arrastar até "Criar sprite chave"]. No "Procure o bloco Criar sprite chave", apontar o bloco [apontar bloco "Criar sprite chave"]. No "no fim dele está escrito", apontar o campo **chave-dourada**, no fim do bloco [apontar bloco "Criar sprite chave"]. Durante a pergunta da Debinha, manter o bloco à vista. Do "Trocar a imagem é como vestir uma fantasia" até o "só a aparência dele muda", a tela fica parada, e a edição troca esse trecho por um desenho nosso com o Zappy vestindo uma fantasia e continuando o mesmo Zappy [na edição: o Zappy de fantasia]. No "Agora clique em chave-dourada", abrir a lista das imagens [abrir campo "chave-dourada" em "Criar sprite chave"]. No "escolha minha-chave", escolher a imagem nova [escolher "minha-chave" em "Criar sprite chave"]. No "segure as setas e leve o personagem até a sua chave", segurar a seta da direita da tela até o personagem ficar embaixo da chave e a de cima até ele encostar nela [segurar seta da direita na prévia por 1 s] [segurar seta de cima na prévia por 0,5 s]. No "ela some e o aviso muda", apontar o aviso no alto do jogo [apontar prévia 120 24]. No "Depois leve o personagem até o farol", descer e seguir até a porta, na base da torre [segurar tecla ArrowDown por 0,5 s] [segurar tecla ArrowRight por 0,95 s]. No "ele acende", apontar o farol aceso [apontar prévia 404 116]. ${telaDaConferencia(
        '"Criar sprite chave"',
        [['o bloco Criar sprite chave usa a imagem minha-chave', 'Criar sprite chave']],
      )} ${telaDoEnvio('Pronto, a chave do seu jogo agora é um desenho seu', 'Concluir aula')} Não preencher o recado.`,
      ponte:
        'Agora coloque o seu desenho no jogo! Clique em Expandir e, em Ao iniciar, no bloco Criar sprite chave, troque chave-dourada por minha-chave. Teste no jogo. Depois clique em Verificar projeto, em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.',
      text: `[upbeat, welcoming voice] Olha só: este é o jogo da Chave do Farol, pronto, e o seu desenho já chegou aqui! [confident, clear, unhurried voice] Clique no menu de três pontinhos, lá em cima, e depois em Imagens. Role a lista até o fim. [interested, animated voice] Tá vendo? A sua chave está aqui, com o nome minha-chave e o selo Seu desenho da aula. Clique em Fechar. [confident, clear, unhurried voice] Agora clique em Expandir, para o Estúdio ocupar a tela toda. [engaging, energetic, conversational voice] A chave aparece no jogo por causa de um bloco da área Ao iniciar. Encontre essa área. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. [confident, clear, unhurried voice] Procure o bloco Criar sprite chave. Repare: no fim dele está escrito com imagem chave-dourada. É essa imagem que você vai trocar. [curious] E as regras do jogo continuam funcionando com o meu desenho? [engaging, energetic, conversational voice] Continuam, sim. Trocar a imagem é como vestir uma fantasia: você continua sendo você, e só a roupa muda. [engaging, energetic, conversational voice] Com a chave é igual. O sprite continua se chamando chave, e só a aparência dele muda. Por isso, as regras do jogo continuam funcionando com o seu desenho. [confident, clear, unhurried voice] Se a pré-visualização cobrir o fim do bloco, clique no botão do olho, lá em cima, para esconder a pré-visualização. Depois, clique no olho de novo para ela voltar. [confident, clear, unhurried voice] Agora clique em chave-dourada e, na lista, escolha minha-chave. [upbeat, encouraging voice] Agora teste: segure as setas e leve o personagem até a sua chave. Olha só: ela some e o aviso muda. [upbeat, encouraging voice] Depois leve o personagem até o farol. Olha só: ele acende! [reassuring, encouraging voice] Se um dia quiser outra chave, volte à parte anterior, mude o desenho e clique em Enviar de novo. Na próxima vez que você abrir esta aula, o jogo já vem com a chave nova. ${entregar(
        'em Ao iniciar, o bloco Criar sprite chave usa a imagem minha-chave',
        'Pronto, a chave do seu jogo agora é um desenho seu!',
        'Quando aparecer Projeto enviado!, clique em Concluir aula.',
      )}`,
    },
  ] satisfies MeuDesenhoTrecho[],
}

/** O Passo a passo do projeto: as duas montagens completas, para consultar quando quiser. */
export const meuDesenhoAjuda: {
  key: string
  title: string
  idea: string
  steps: string[]
  test: string
  correction: string
}[] = [
  {
    key: 'desenhar',
    title: 'Desenhe a sua chave',
    idea: 'O quadro do Pinta é quadrado, como a chave do jogo. O que você desenha nele vira a imagem minha-chave, que vai para o jogo quando você envia o desenho.',
    steps: [
      'Se aparecer a janela Dicas rápidas, clique em Entendi!. Depois clique em Expandir, em cima do Pinta, para ele ocupar a tela toda.',
      'Embaixo da caixa de ferramentas, clique no quadradinho cheio, o Preenchimento. No painel Cores, à direita, escolha a cor da chave. O Contorno, o quadradinho vazado, já vem preto.',
      'Clique na ferramenta Círculo. No lado esquerdo do quadro, clique e segure o botão do mouse. Sem soltar, arraste na diagonal até a argola ficar grande e redonda. Depois solte.',
      'Clique na ferramenta Retângulo. Clique e segure no meio da argola e, sem soltar, arraste para a direita até perto da borda do quadro, num retângulo baixinho: é a haste.',
      'Ainda com o Retângulo, desenhe um retângulo pequeno embaixo da ponta da haste, saindo para baixo. Do lado dele, desenhe outro: são os dentes.',
      'Para arrumar, clique na ferramenta Selecionar, depois clique numa forma e arraste. Para mudar o tamanho, puxe um dos quadradinhos da borda da seleção.',
      'Se quiser, clique no Pincel e faça um brilho na argola. Use o quadro inteiro: no jogo a chave fica pequena.',
      'Clique em Reduzir, para voltar à aula. Depois clique em Enviar meu desenho, em cima do Pinta, e confirme em Enviar.',
    ],
    test: 'A sua chave ocupa quase todo o quadro, e aparece a mensagem Desenho enviado!',
    correction:
      'Se uma forma sumiu ou ficou errada, use Desfazer, no alto do Pinta. Se o envio não foi, clique em Enviar meu desenho de novo.',
  },
  {
    key: 'trocar',
    title: 'A sua chave no jogo',
    idea: 'O desenho chega aos materiais do jogo com o nome minha-chave. Trocar a imagem do sprite chave é como vestir uma fantasia: o nome do sprite continua chave, só a aparência muda, e por isso as regras do jogo continuam valendo.',
    steps: [
      'Se quiser ver o desenho, abra o menu de três pontinhos e depois Imagens, e role a lista até o fim: a minha-chave tem o selo Seu desenho da aula. Clique em Fechar.',
      'Clique em Expandir, em cima do Estúdio. Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.',
      'Procure o bloco Criar sprite chave. Se a pré-visualização cobrir o fim dele, clique no botão do olho, lá em cima, para escondê-la.',
      'No fim do bloco, clique em chave-dourada e escolha minha-chave. Clique no olho de novo para a pré-visualização voltar.',
    ],
    test: 'Segure as setas e leve o personagem até a chave: ela some e o aviso muda. Depois vá até o farol: ele acende. Clique em Verificar projeto.',
    correction:
      'Se a chave dourada continuar aparecendo, confira se a troca foi no bloco Criar sprite chave. Se minha-chave não estiver na lista, volte à parte anterior, clique em Enviar meu desenho e abra a aula de novo.',
  },
]
