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
export type MeuDesenhoTrecho = {
  key: string
  title: string
  kind: 'intro' | 'material' | 'draw' | 'swap'
  /** Fala do Zappy na página, logo depois do vídeo. Não é gravada. */
  ponte: string
  /** Fala gravada, com as marcas de interpretação. */
  text: string
  screen: string
}

export const meuDesenhoAula = {
  slug: 'aula-1',
  title: 'A minha chave no Farol',
  trechos: [
    {
      key: 'abertura',
      title: 'Uma chave desenhada por você',
      kind: 'intro',
      screen:
        'Jogo pronto: a Chave do Farol com uma chave rosa desenhada no lugar da chave dourada. Mostrar o personagem indo até a chave, a chave sumindo e o farol acendendo. Não mostrar os blocos nem o Pinta.',
      ponte:
        'Sua vez! Clique no jogo e use as setas do teclado. Pegue a chave desenhada e leve o personagem até o farol. Depois clique em Próxima parte.',
      text: '[upbeat, welcoming voice] Lembra do seu jogo da Chave do Farol? Hoje ele vai ganhar uma coisa que ninguém mais tem: uma chave desenhada por você! [interested, animated voice] Olha este jogo aqui: a chave não é mais a dourada de antes. Ela foi desenhada no Pinta, o programa de desenhar da plataforma. [engaging, energetic, conversational voice] O resto do jogo continua igualzinho ao seu: o personagem pega a chave, vai até o farol, e o farol acende. [engaging, energetic, conversational voice] Nesta aula, você vai desenhar a sua chave no Pinta, aqui mesmo na página, e depois colocar o seu desenho no jogo. [upbeat, encouraging voice] Agora é a sua vez de jogar. Clique no jogo e use as setas do teclado. Pegue a chave e leve o personagem até o farol. Depois clique em Próxima parte.',
    },
    {
      key: 'material',
      title: 'O seu Passo a passo do projeto',
      kind: 'material',
      screen:
        'Abrir o Passo a passo do projeto no bloco Consulte. Mostrar a parte do desenho, a parte da troca no jogo e o botão Baixar.',
      ponte:
        'Este é o seu Passo a passo do projeto. Se quiser, leia aqui mesmo ou clique em Baixar para guardar. Depois clique em Próxima parte.',
      text: '[engaging, energetic, conversational voice] Olha aqui: este é o seu Passo a passo do projeto! Ele mostra cada ferramenta do Pinta que você vai usar, o jeito de desenhar a chave e como colocar o desenho no jogo. [reassuring, encouraging voice] Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o material e consultar onde quiser. Depois clique em Próxima parte.',
    },
    {
      key: 'desenhar',
      title: 'Desenhe a sua chave',
      kind: 'draw',
      screen:
        'Bloco do Pinta da aula com o quadro quadrado vazio. Clicar em Entendi! nas Dicas rápidas e em Expandir. Mostrar a caixa de ferramentas à esquerda, os dois quadrados de Preenchimento e Contorno no pé da caixa e o painel Cores. Desenhar junto: a argola com Círculo, a haste e os dois dentes com Retângulo, arrumar com Selecionar, um brilho com Pincel. Clicar em Reduzir. Mostrar Enviar meu desenho, a confirmação Enviar e Desenho enviado!. Não preencher o recado.',
      ponte:
        'Agora desenhe a sua chave. Clique em Expandir para ter mais espaço e use um Círculo para a argola, um Retângulo para a haste e dois Retângulos pequenos para os dentes. Quando gostar, clique em Reduzir, em Enviar meu desenho, confirme em Enviar e depois clique em Próxima parte.',
      text: '[engaging, energetic, conversational voice] Este é o Pinta, aqui dentro da aula. Olha aqui: o quadrado branco no meio é o seu quadro, e tudo o que você desenhar nele vai virar a chave do jogo. [engaging, energetic, conversational voice] No jogo, a chave fica pequena. Por isso, desenhe bem grande, usando o quadro inteiro. [confident, clear, unhurried voice] Se aparecer a janela Dicas rápidas, leia as dicas e clique em Entendi!. [confident, clear, unhurried voice] Agora clique em Expandir, aqui em cima, para o Pinta ocupar a tela toda e você ter mais espaço para desenhar. [interested, animated voice] Olha aqui: na esquerda fica a caixa de ferramentas. É nela que você escolhe com o que vai desenhar. [engaging, energetic, conversational voice] Repare: embaixo da caixa tem dois quadradinhos. O cheio é o Preenchimento, a cor de dentro da forma. O vazado é o Contorno, a cor da borda. [confident, clear, unhurried voice] Clique no Preenchimento e depois escolha uma cor no painel Cores, à direita. Eu vou escolher um rosa. O Contorno já vem preto, e pode ficar assim. [confident, clear, unhurried voice] Agora a argola, a parte redonda da chave. Clique na ferramenta Círculo, na caixa. [confident, clear, unhurried voice] No lado esquerdo do quadro, clique e segure o botão do mouse. Sem soltar, arraste na diagonal, até a bolinha ficar grande e redonda. Depois solte. [confident, clear, unhurried voice] Agora a haste, a parte comprida. Clique na ferramenta Retângulo. [confident, clear, unhurried voice] Clique e segure no meio da argola. Sem soltar, arraste para a direita, até perto da borda do quadro, num retângulo baixinho. Depois solte. [confident, clear, unhurried voice] Por último, os dentes. Ainda com o Retângulo, desenhe um retângulo pequeno embaixo da ponta da haste, saindo para baixo. Do lado dele, desenhe outro. [interested, animated voice] Ficou torto? Sem problema. Clique na ferramenta Selecionar, depois clique na forma e arraste para o lugar certo. [confident, clear, unhurried voice] Para mudar o tamanho, puxe um dos quadradinhos da borda da seleção. [upbeat, encouraging voice] Se quiser, clique no Pincel e faça um brilho na argola. [confident, clear, unhurried voice] Quando gostar da sua chave, clique em Reduzir, para voltar à aula. [confident, clear, unhurried voice] Depois clique em Enviar meu desenho, aqui em cima do Pinta, e confirme em Enviar. Quando aparecer Desenho enviado!, clique em Próxima parte.',
    },
    {
      key: 'trocar',
      title: 'A sua chave no jogo',
      kind: 'swap',
      screen:
        'Estúdio com o jogo pronto da Chave do Farol. Abrir o menu ⋯, Imagens, rolar até o fim e mostrar minha-chave com o selo Seu desenho da aula; Fechar. Expandir; em Ao iniciar, achar Criar sprite chave e mantê-lo à vista durante a comparação da fantasia, sem ilustração; esconder a pré-visualização pelo olho se ela cobrir o fim do bloco, clicar em chave-dourada e escolher minha-chave. Mostrar a pré-visualização de novo, testar o jogo, Reduzir, Verificar projeto, Enviar meu projeto, confirmação Enviar, Projeto enviado! e Concluir aula. Não preencher o recado.',
      ponte:
        'Agora coloque o seu desenho no jogo: clique em Expandir e, em Ao iniciar, no bloco Criar sprite chave, troque chave-dourada por minha-chave. Teste, clique em Reduzir e em Verificar projeto, depois em Enviar meu projeto, confirme em Enviar e clique em Concluir aula.',
      text: `[upbeat, welcoming voice] Olha só: este é o jogo da Chave do Farol, pronto, e o seu desenho já chegou aqui! [confident, clear, unhurried voice] Clique no menu de três pontinhos, lá em cima, e depois em Imagens. Role a lista até o fim. [interested, animated voice] Tá vendo? A sua chave está aqui, com o nome minha-chave e o selo Seu desenho da aula. Clique em Fechar. [confident, clear, unhurried voice] Agora clique em Expandir, para o Estúdio ocupar a tela toda. [engaging, energetic, conversational voice] A chave aparece no jogo por causa de um bloco da área Ao iniciar. Encontre essa área. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. [confident, clear, unhurried voice] Procure o bloco Criar sprite chave. Repare: no fim dele está escrito com imagem chave-dourada. É essa imagem que você vai trocar. [engaging, energetic, conversational voice] Trocar a imagem é como vestir uma fantasia: você continua sendo você, e só a roupa muda. [engaging, energetic, conversational voice] Com a chave é igual. O sprite continua se chamando chave, e só a aparência dele muda. Por isso, as regras do jogo continuam funcionando com o seu desenho. [confident, clear, unhurried voice] Se a pré-visualização cobrir o fim do bloco, clique no botão do olho, lá em cima, para esconder a pré-visualização. [confident, clear, unhurried voice] Agora clique em chave-dourada e, na lista, escolha minha-chave. [confident, clear, unhurried voice] Se você escondeu a pré-visualização, clique no olho de novo para ela voltar. [upbeat, encouraging voice] Agora teste: clique no jogo e leve o personagem até a sua chave. Olha só: ela some e o aviso muda. Depois leve o personagem até o farol: ele acende! [reassuring, encouraging voice] Se a chave dourada continuar aparecendo, confira se você trocou a imagem no bloco Criar sprite chave, e não em outro. [confident, clear, unhurried voice] Funcionou? Clique em Reduzir, para voltar à aula, e depois em Verificar projeto. Se faltar alguma coisa, leia a dica, corrija e clique novamente. [confident, clear, unhurried voice] Quando os objetivos estiverem cumpridos, clique em Enviar meu projeto e confirme em Enviar. [pleased, lively voice] Pronto, a chave do seu jogo agora é um desenho seu! [reassuring, encouraging voice] Se um dia quiser outra chave, volte à parte anterior, mude o desenho e clique em Enviar de novo. Na próxima vez que você abrir esta aula, o jogo já vem com a chave nova. [confident, clear, unhurried voice] Quando aparecer Projeto enviado!, clique em Concluir aula.`,
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
    test: 'Clique no jogo e leve o personagem até a chave: ela some e o aviso muda. Depois vá até o farol: ele acende. Clique em Reduzir para voltar à aula e verificar.',
    correction:
      'Se a chave dourada continuar aparecendo, confira se a troca foi no bloco Criar sprite chave. Se minha-chave não estiver na lista, volte à parte anterior, clique em Enviar meu desenho e abra a aula de novo.',
  },
]
