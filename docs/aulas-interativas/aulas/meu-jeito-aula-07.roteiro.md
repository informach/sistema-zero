# Roteiro de gravação · O Jogo do Meu Jeito · Aula 7

**Faça suas pedras nascerem animadas**

Fonte: `qa/meu-jeito.conteudo.json`. Gerado por `qa/gerar-meu-jeito.ts`. Revise a fonte e regenere proposta, roteiro e manifesto juntos.

Entrada: Jogo com nave autoral animada; asteroide já adicionado aos materiais. Saída: Nave e asteroides autorais animados no mesmo jogo, com tiro, pontos e vidas.

Retomar o trabalho do aluno na ferramenta externa. Não substituir por um modelo. Mostrar caminhos, campos, formas e encaixes sem cortes. A prévia do Estúdio é automática. A ponte do Zappy é texto na página; não entra na narração. As conferências do desenho são visuais, sem aprovação automática por assistir ao vídeo.

Nas experiências, o vídeo é uma demonstração: a primeira frase diz o conceito, o narrador faz os testes na primeira pessoa a partir de "Olha aqui:", explica por que cada resultado aconteceu e só no fim passa a vez. Nas aplicações no Pinta e no Estúdio, a fala segue no imperativo, para fazer junto.

## Seção 1. Compare nascer e animar

### Clipe `video-dois-relogios` · Compare nascer e animar

**Estimativa de gravação:** aproximadamente 3 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Na tela:** Demonstração na primeira pessoa: o narrador faz cada teste no ritmo da fala e deixa ver o resultado real antes de explicar; o vídeo não dá ordens antes de passar a vez. A partir do quadro 0, com uma pedra a cada 40 quadros e 8 desenhos por segundo: escolher 20 quadros em A cada quantos quadros nasce uma pedra, deixar 8 por segundo, clicar em Voltar ao começo e no Tempo. Deixar o tempo passar até o contador mostrar Quadro 60 e três pedras, mostrando o quadro 0 em cada pedra ao entrar; parar o Tempo. Escolher 40 quadros e 16 por segundo, dizendo que cada relógio vai para um lado, clicar em Voltar ao começo, ligar o Tempo por três segundos e deixar ver duas pedras com o número trocando mais depressa. No fim, apontar a experiência para a pessoa repetir os mesmos testes e apontar Próxima seção.

**Narração:**
> "Esta é uma experiência para a gente entender dois relógios que trabalham ao mesmo tempo: um faz as pedras nascerem, e o outro troca os desenhos de cada pedra.
>
> Olha aqui: eu deixo Desenhos por segundo de cada pedra em 8 e coloco A cada quantos quadros nasce uma pedra em 20. Clico em Voltar ao começo e no Tempo. Em dois segundos, o contador chega ao quadro 60, e nasceram três pedras, nos quadros 20, 40 e 60. Cada pedra entra mostrando o quadro 0, e depois o número em cima dela troca entre 0 e 1.
>
> Eu clico em Tempo para parar. Nasceu uma pedra a cada 20 quadros, e cada uma trocou de desenho 8 vezes por segundo.
>
> Agora eu mudo os dois relógios, cada um para um lado. Coloco A cada quantos quadros nasce uma pedra em 40, que é mais devagar, e Desenhos por segundo de cada pedra em 16, que é mais depressa. Clico em Voltar ao começo e ligo o Tempo. Em três segundos, nascem só duas pedras: o relógio de nascer ficou mais lento. Mas o número em cima de cada pedra troca entre 0 e 1 bem mais depressa: o relógio dos desenhos ficou mais rápido.
>
> Cada relógio mudou só o que é dele. E cada pedra começa o próprio giro no quadro 0, na hora em que nasce.
>
> No seu jogo, o bloco A cada 40 quadros faz cada pedra nascer, e a animação chamada girando troca os desenhos de cada pedra 8 vezes por segundo. No bloco, isso aparece como 8 fps.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção."

**Zappy na página (não gravar):** Agora mude os dois relógios e compare as pedras que nascem.

## Seção 2. Prepare a folha do asteroide

### Clipe `video-folha-pedra` · Prepare a folha do asteroide

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Na tela:** Mostrar cada gesto narrado, os nomes dos controles e o resultado comparável, sem acelerar a execução. Mostrar a passagem entre a aba da aula e a ferramenta, o trabalho salvo e o resultado de referência para a autoconferência narrada.

**Narração:**
> "Abra meu Estúdio e retome o mesmo cartão da aula anterior. Deixe à vista o fim de Ao iniciar, logo depois da animação da nave. A nova folha vai entrar ali. Em Jogo 2D, Sprites, Animação, pegue Carregar folha de quadros. Escreva folha-asteroide, escolha a imagem asteroide e coloque 64 nos dois tamanhos do quadro.
>
> Encaixe no fim de Ao iniciar, depois da animação da nave. Confira as duas folhas: folha-nave continua 32 por 32; folha-asteroide usa 64 por 64. Carregar a folha ainda não troca as pedras do jogo. Aguarde Salvo.
>
> Pause aqui para fazer esta parte no seu trabalho. Use Abrir meu Estúdio se a ferramenta ainda não estiver aberta. Compare o resultado com a conferência que acabamos de fazer. Antes de sair, espere Salvo. Volte a esta aba e clique em Próxima seção."

**Zappy na página (não gravar):** Carregue folha-asteroide com quadros de 64 por 64.

## Seção 3. Troque a imagem das pedras que nascem

### Clipe `video-trocar-pedra` · Troque a imagem das pedras que nascem

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Na tela:** Mostrar cada gesto narrado, os nomes dos controles e o resultado comparável, sem acelerar a execução. Mostrar a passagem entre a aba da aula e a ferramenta, o trabalho salvo e o resultado de referência para a autoconferência narrada.

**Narração:**
> "Localize A cada 40 quadros e, dentro dele, Se o estado do jogo é jogando. Ali está o criador das pedras. Observe o grupo asteroides, o sorteio do x, o y e as velocidades antes de trocar.
>
> Em Jogo 2D, Grupos, Criar e percorrer, pegue No grupo criar um sprite chamado em x y largura altura com imagem vx vy. Deixe o novo bloco solto enquanto preenche: grupo asteroides, nome asteroide, imagem asteroide, y -30, largura 40, altura 40, vx 0 e vy 3.
>
> Mova a peça do sorteio que está no x do criador antigo para o x do novo. Assim você conserva os limites do seu jogo. Clique com o botão direito no criador antigo e escolha Apagar este bloco. Encaixe o novo no mesmo lugar, dentro do Se jogando do relógio. Confira que só um criador ficou ali e os outros blocos continuam ligados.
>
> Comece a partida e veja se caem suas imagens em lugares diferentes. Ainda pode aparecer a folha inteira espremida: falta ligar a animação de cada pedra. Confira o grupo asteroides e o nome asteroide, que são diferentes. Aguarde Salvo.
>
> Pause aqui para fazer esta parte no seu trabalho. Use Abrir meu Estúdio se a ferramenta ainda não estiver aberta. Compare o resultado com a conferência que acabamos de fazer. Antes de sair, espere Salvo. Volte a esta aba e clique em Próxima seção."

**Zappy na página (não gravar):** Substitua o criador das pedras, preservando o grupo, o sorteio e a velocidade.

## Seção 4. Anime cada pedra depois de criar

### Clipe `video-animar-pedra` · Anime cada pedra depois de criar

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Na tela:** Mostrar cada gesto narrado, os nomes dos controles e o resultado comparável, sem acelerar a execução. Mostrar a passagem entre a aba da aula e a ferramenta, o trabalho salvo e o resultado de referência para a autoconferência narrada.

**Narração:**
> "Deixe à vista o novo criador da pedra, dentro do Se jogando do A cada 40 quadros. A animação vai ficar logo abaixo desse criador, no mesmo Se. Em Jogo 2D, Sprites, Animação, pegue Animar sprite com a folha na animação, do quadro ao a fps e encaixe nesse lugar. Assim cada pedra recebe a animação quando nasce.
>
> Escolha sprite asteroide e folha folha-asteroide. Em Escolher, selecione girando. Confira do quadro 0 ao 1, a 8 fps. O carregamento da folha continua no Ao iniciar; o comando de animar fica aqui, depois de cada nascimento.
>
> Comece uma partida. Observe pelo menos três pedras entrando com a animação, mova a nave e atire. Acerte uma pedra para conferir os pontos e deixe uma encostar na nave para conferir a perda de vida. Se a arte não aparecer inteira, confira folha-asteroide e recorte 64 por 64. Aguarde Salvo.
>
> Pause aqui para fazer esta parte no seu trabalho. Use Abrir meu Estúdio se a ferramenta ainda não estiver aberta. Compare o resultado com a conferência que acabamos de fazer. Antes de sair, espere Salvo. Volte a esta aba e clique em Próxima seção."

**Zappy na página (não gravar):** Coloque a animação girando logo abaixo do criador, dentro do mesmo Se.

## Seção 5. Confira as artes dentro do jogo

**Zappy na página (não gravar):** Responda sobre o que você acabou de fazer. Leia a explicação depois de enviar e corrija o que precisar; você pode tentar de novo sem espera. Quando acertar todas, clique em Próxima seção.

Sem vídeo nem ferramenta. O quiz vem imediatamente depois do Zappy. Correção com explicação, tentativas ilimitadas e sem espera.

## Seção 6. Entregue o jogo com as duas artes

### Clipe `video-entrega` · Entregue o jogo com as duas artes

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.

**Na tela:** Mostrar cada gesto narrado, os nomes dos controles e o resultado comparável, sem acelerar a execução. Mostrar a passagem entre a aba da aula e a ferramenta, o trabalho salvo e o resultado de referência para a autoconferência narrada.

**Narração:**
> "Antes de enviar, confira no seu trabalho: nave e pedras usam suas animações; pelo menos três pedras nasceram animadas; tiros, pontos e perda de vida continuam funcionando. Se algo estiver diferente, volte ao trecho correspondente e ajuste. Aguarde o salvamento na sua conta antes de sair da ferramenta.
>
> Volte para esta aba da aula. Clique em Escolher no Estúdio. Na lista Meus trabalhos do Estúdio, selecione o cartão do seu jogo. Se não aparecer, confira o salvamento na ferramenta e clique em Atualizar galeria. O recado para o professor é opcional. Clique em Enviar ao professor (1). Espere Trabalho recebido pelo professor. Esse envio guarda uma cópia deste momento; você continua criando na ferramenta. Depois clique em Concluir aula."

**Zappy na página (não gravar):** Confira nave e pedras usam suas animações; pelo menos três pedras nasceram animadas; tiros, pontos e perda de vida continuam funcionando. Envie o cartão do seu jogo pela galeria do Estúdio desta seção.
