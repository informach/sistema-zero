# Roteiro de gravação · Nave Contra Asteroides · Aula 7

**Dê três vidas à nave**

Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Variável pontos começa em zero, aumenta somente no acerto e aparece no placar. Saída: Três vidas, dano de uma vida, proteção de 45 quadros e corações na tela; jogo ainda sem encerramento.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Compare quando dar as vidas

### Clipe `video-vidas-no-comeco` · Compare quando dar as vidas

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Colocar Dar três vidas à nave em Ao iniciar, clicar em Começar o jogo e acompanhar os corações apagando até Vidas: 0 · Batidas: 3 e Teste encerrado. Levar a peça para Enquanto estiver rodando, clicar em Começar o jogo e mostrar os corações voltando para 3 no quadro depois de cada batida e Vidas: 2 no fim, porque a última batida cai no último quadro. Terminar em Agora é a sua vez e Próxima seção, sem palpite nem pergunta final.

**Narração:**
> "Esta é a mesma experiência da primeira aula, agora para a gente entender onde as vidas da nave devem ser dadas. Aqui, uma pedra bate na nave de tempos em tempos.
>
> Olha aqui: eu coloco Dar três vidas à nave em Ao iniciar e clico em Começar o jogo. A nave começa com 3 vidas, e cada batida apaga um coração. No fim do teste, a tela mostra Vidas: 0 e Batidas: 3. As vidas foram dadas uma vez, no começo, e as batidas conseguiram tirar.
>
> Agora eu levo a mesma peça para Enquanto estiver rodando e clico em Começar o jogo. A batida apaga um coração, mas no quadro seguinte as vidas voltam para 3. No fim do teste, aparece Vidas: 2, porque a última batida foi bem no último quadro. A peça devolve as vidas o tempo todo, e a nave nunca perderia. Por isso, no seu jogo, as vidas vão ser dadas em Ao iniciar.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção."

**Zappy na página (não gravar):** Compare Dar três vidas à nave em Ao iniciar e Enquanto estiver rodando. Espere cada teste parar e observe os corações.

## Seção 2. Dê e mostre as três vidas

### Clipe `video-vidas` · Dê e mostre as três vidas

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Dar as vidas em Ao iniciar e desenhar os corações depois do placar. Mostrar três corações. Ainda não montar nem simular perda de vida. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou dar as vidas uma vez com dar as vidas de novo em cada quadro. No seu jogo ainda não há corações. Agora prepare as três vidas no começo e mostre o que a nave tem.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Primeiro, dê três vidas à nave. Deixe à vista o fim de Ao iniciar. Abra Jogo 2D, depois Vida e placar e Vida. Pegue Dar ao sprite de vida e encaixe no fim de Ao iniciar. Escolha nave e coloque 3. As vidas são dadas na preparação. Se esse bloco se repetisse em cada quadro, ele ficaria devolvendo as vidas perdidas.
>
> Deixe à vista o fim de A cada quadro do jogo, depois do placar. Abra Jogo 2D, depois Vida e placar e Vida. pegue Desenhar as vidas do sprite. Encaixe no fim de A cada quadro do jogo, depois do placar. Escolha nave e o formato corações. Coloque x 12, y 48 e tamanho 22. Escolha vermelho. Confira os três corações na tela.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Dê as três vidas em Ao iniciar e desenhe os corações a cada quadro.

## Seção 3. Compare as batidas com proteção

### Clipe `video-protecao` · Compare as batidas com proteção

**Estimativa de gravação:** aproximadamente 2 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Demonstração: o narrador faz cada teste no ritmo da fala, na primeira pessoa, e mostra o resultado real. Apontar 0, 45 e 15 no seletor. A cena tem batidas nos quadros 1, 10 e 30; 15 permite ver expirar. Com 0 quadros, clicar três vezes em Avançar até a próxima pedra e mostrar as vidas de 3 a 0. Voltar ao começo, repetir com 45 e mostrar 36 e 16 quadros restando nas batidas 10 e 30, com 2 vidas no fim. Voltar ao começo, repetir com 15 e mostrar 6 quadros restando na batida 10 e a vida caindo na batida 30. Não prometer que a cena reproduz 45 quadros de jogo real em segundos. Terminar em Agora é a sua vez e Próxima seção, sem palpite nem pergunta final.

**Narração:**
> "Esta é uma experiência para a gente entender a proteção depois de uma batida: um tempinho em que outra batida não tira vida. Aqui, as pedras batem nos quadros 1, 10 e 30.
>
> Olha aqui: eu escolho 0 quadros em Proteção em quadros e clico em Avançar até a próxima pedra três vezes. Cada batida apaga um coração, e a nave fica sem vidas. Sem proteção, as três batidas tiram as três vidas.
>
> Eu clico em Voltar ao começo, escolho 45 quadros e repito as três batidas. A primeira tira uma vida, e a proteção começa com 45 quadros. Na batida do quadro 10, ainda restam 36 quadros de proteção, e a vida não cai. Na do quadro 30, ainda restam 16. Só a primeira batida tirou vida.
>
> Por último, eu volto ao começo e escolho 15 quadros. A primeira batida tira uma vida. Na batida do quadro 10, restam 6 quadros, e a vida não cai. Mas, no quadro 30, a proteção já acabou, e essa batida tira outra vida. A proteção é um respiro com prazo. No seu jogo, a batida vai dar 45 quadros de proteção.
>
> Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção."

**Zappy na página (não gravar):** Teste 0, 45 e 15 quadros de proteção, voltando ao começo entre os testes.

## Seção 4. Programe as vidas e a batida

### Clipe `video-batida-e-coracoes` · Programe as vidas e a batida

**Estimativa de gravação:** aproximadamente 4 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Desenhar vidas primeiro para tornar o estado visível; inserir colisão antes desse desenho. Confirmar a ordem final original: placar, colisão da nave, corações. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Na experiência da seção anterior, você comparou a perda de vidas com tempos diferentes de proteção. No seu jogo, deixe uma pedra atingir a nave: os corações ainda não mudam. Agora programe essa batida.
>
> Se o lugar do encaixe estiver fora da tela, arraste um espaço vazio entre os blocos até encontrá-lo. Deixe esse lugar à vista antes de buscar a próxima peça.
>
> Agora programe a batida. Deixe à vista o espaço entre o placar e os corações, em A cada quadro do jogo. Abra Jogo 2D, depois Colisões e Encostar e bloquear. Pegue Para cada sprite do grupo que colidir com o sprite. Encaixe entre o placar e o desenho dos corações, dentro de A cada quadro do jogo. Escolha grupo asteroides, sprite nave e escreva inimigo no apelido. Inimigo é o nome da pedra envolvida nessa batida.
>
> Deixe à vista o interior da colisão da nave com os asteroides. Abra Jogo 2D, depois Grupos e Participação e limpeza. Pegue Tirar o sprite do grupo e encaixe dentro dessa colisão. Escolha inimigo como sprite e asteroides como grupo.
>
> Deixe à vista o encaixe abaixo da retirada do inimigo. Abra Jogo 2D, depois Desenho e efeitos e Partículas. Pegue Soltar explosão no sprite, encaixe abaixo da retirada e escolha inimigo. Escolha uma cor para o efeito.
>
> Deixe à vista o encaixe abaixo da explosão, dentro dessa colisão. Abra Jogo 2D, depois Vida e placar e Vida. Pegue Machucar o sprite em e deixá-lo invencível por quadros. Encaixe abaixo da explosão, dentro da colisão. Escolha nave, dano 1 e proteção 45 quadros.
>
> Deixe à vista o encaixe abaixo do dano, dentro dessa colisão. Abra Jogo 2D, depois Desenho e efeitos e Efeitos. Pegue Tremer a tela com intensidade e encaixe abaixo do dano. Coloque intensidade 8. Confira as quatro ações da batida: tirar inimigo, explodir inimigo, machucar nave e tremer a tela.
>
> Clique no jogo e deixe uma pedra atingir a nave. A pedra deve sair, a tela deve tremer e um coração deve apagar. Aguarde a proteção acabar e deixe outra pedra bater. Se nenhum coração mudar, confira se o dano e o desenho das vidas usam nave. Se a nave sumir, confira se você retirou inimigo, e não nave. Por enquanto, ficar sem vidas ainda não encerra a partida.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Depois, clique em Próxima seção."

**Zappy na página (não gravar):** Dê as vidas em Ao iniciar. Na colisão, retire a pedra e machuque a nave. Desenhe os corações em cada quadro.

## Seção 5. Confira o que você construiu

**Zappy na página (não gravar):** Responda pensando nos testes do seu jogo. Depois de enviar, leia as explicações. Se precisar, corrija e tente de novo. Quando acertar todas, clique em Próxima seção.

Sem vídeo ou ferramenta nesta seção. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.

## Seção 6. Teste os pontos e as vidas

### Clipe `video-fecho` · Teste os pontos e as vidas

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Testar as duas colisões e inspecionar os encaixes, preservando os blocos anteriores. Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.

**Narração:**
> "Faça um tiro errar e veja se os pontos ficam iguais. Acerte uma pedra e confira a soma de um ponto. Depois deixe uma pedra bater na nave e confira a perda de uma vida.
>
> Confira também onde cada regra ficou: pontos e vidas começam em Ao iniciar; somar pontos fica na colisão do tiro; machucar nave fica na colisão da nave. Placar e corações são desenhados a cada quadro, fora dessas colisões.
>
> Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo. Clique em Enviar para o professor e confirme em Enviar. Depois, clique em Concluir aula."

**Zappy na página (não gravar):** Confira acerto, erro e batida. Verifique a etapa e envie.
