# Roteiro de gravação · Nave Contra Asteroides · Aula 7

**Dê três vidas à nave**

Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.

Entrada: Variável pontos começa em zero, aumenta somente no acerto e aparece no placar. Saída: Três vidas, dano de uma vida, proteção de 45 quadros e corações na tela; jogo ainda sem encerramento.

Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo. Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.

## Seção 1. Compare quando dar as vidas

### Clipe `video-vidas-no-comeco` · Compare quando dar as vidas

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Apontar os controles citados e o que observar. Deixar os testes para quem faz a experiência, sem antecipar os resultados.

**Narração:**
> "Seu jogo já conta pontos. Agora compare dois lugares para dar três vidas à nave.
>
> Na experiência, coloque Dar três vidas à nave em Ao iniciar. Clique em Começar o jogo, espere o teste parar e observe os corações depois das batidas.
>
> Leve a mesma peça para Enquanto estiver rodando. Clique em Começar o jogo, espere o teste parar e compare os corações. Depois, clique em Próxima seção."

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

**Estimativa de gravação:** aproximadamente 1 minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.

**Na tela:** Apontar 0, 45 e 15 no seletor. A cena tem batidas nos quadros 1, 10 e 30; 15 permite ver expirar. Não prometer que a cena reproduz 45 quadros de jogo real em segundos.

**Narração:**
> "Sua nave ainda atravessa as pedras sem perder vida. Vamos programar o dano e um pequeno tempo de proteção depois de uma batida. Durante essa proteção, outra batida não tira vida.
>
> Nesta experiência, escolha 0 quadros em Proteção em quadros. Clique em Avançar até a próxima pedra três vezes e observe os corações.
>
> Clique em Voltar ao começo, escolha 45 quadros e repita as três batidas. Acompanhe os corações e quantos quadros de proteção restam.
>
> Volte ao começo mais uma vez. Escolha 15 quadros e avance pelas três pedras. Observe em qual batida a proteção ainda está ativa e em qual já acabou. Depois dos três testes, clique em Próxima seção."

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
