# Roteiro de gravação · A Chave do Farol · Dia 1

Uma seção, um vídeo de montagem. Estimativa: 4 a 5 minutos, incluindo encaixes e testes. O cenário, os desenhos, a exibição por quadro e a regra do barco já vêm preparados. O projeto inicial ainda não tem controles nem movimento. Mostrar apenas as áreas necessárias, com pausas naturais para acompanhar. Não fazer outra demonstração do jogo completo.

## Seção 1. Faça o personagem andar pelo mapa

### Vídeo `video-d1-borda` · Faça o personagem andar dentro do mapa

**Na tela:** abrir o projeto inicial da seção. Apontar o personagem parado e a área **Ao iniciar**. Abrir **Jogo 2D → Controles → Teclado, ações e toque**, arrastar **Ativar controles clássicos** para o fim de **Ao iniciar**, depois dos blocos preparados. Selecionar **só as quatro direções**. A prévia atualiza automaticamente; aguardar a atualização, sem recomendar Atualizar a cada encaixe.

**Narração:**
> "Você já experimentou a aventura pronta. Nesta versão, o cenário e os desenhos estão preparados, mas o personagem ainda está parado. Vamos programar o movimento para ele andar pelo mapa sem sair da tela. Primeiro, abra Jogo 2D, Controles, Teclado, ações e toque. Pegue Ativar controles clássicos e encaixe no fim da área Ao iniciar, depois dos blocos que já estão lá. No menu deste bloco, escolha só as quatro direções. Espere o jogo atualizar. Agora temos as setas de cima, baixo, esquerda e direita."

**Na tela:** abrir **Jogo 2D → Movimento → Movimentos prontos**. Pegar **Mover sprite em 4 direções com setas, velocidade**. Dentro de **A cada quadro**, na área **Enquanto estiver rodando**, encaixar imediatamente após **Desenhar o cenário cenario** e antes da condição preparada do barco. Escolher `personagem` e manter a velocidade `3`, que já vem no bloco. Apontar o bloco antes e depois do encaixe.

**Narração:**
> "As setas apareceram, mas falta dizer quem elas movem. Na programação, chamamos de sprite um elemento do jogo que podemos controlar, como este personagem. Abra Jogo 2D, Movimento, Movimentos prontos. Pegue Mover sprite em 4 direções com setas. Na área Enquanto estiver rodando, encontre A cada quadro. Encaixe o movimento dentro dele, logo depois de Desenhar o cenário cenario e antes dos outros blocos preparados. O jogo repete o que está aqui enquanto funciona. No nome do sprite, escolha personagem. A velocidade diz quanto ele anda a cada repetição. Ela já está em três. Deixe assim."

**Na tela:** testar uma seta da tela. No computador, focar a prévia e testar uma seta do teclado. Levar o personagem até parte dele ultrapassar a borda. Não mostrar primeiro a correção. Pausar para a criança testar.

**Narração:**
> "Segure uma seta da tela. Se estiver no computador, pode clicar dentro do jogo e testar uma seta do teclado. O personagem deve andar na direção escolhida. Se não andou, confira o nome personagem e veja se o bloco está dentro de A cada quadro. Agora leve o personagem até uma beirada e continue segurando a seta. Observe se ele fica inteiro na tela."

**Na tela:** abrir **Jogo 2D → Movimento → Bordas e rebatidas**. Pegar **Manter o sprite dentro da tela**, encaixar imediatamente depois do movimento, antes dos blocos preparados. Escolher `personagem`; este bloco só tem o seletor de sprite. Testar as quatro bordas; não exigir dois dispositivos.

**Narração:**
> "Se ele passou da beirada, precisamos limitar o caminho. Abra Jogo 2D, Movimento, Bordas e rebatidas. Pegue Manter o sprite dentro da tela e encaixe logo depois do bloco de movimento. Escolha personagem. A ordem importa: primeiro o jogo move, depois confere a borda. Teste as quatro direções até chegar aos limites. Agora o personagem deve continuar visível."

**Na tela:** clicar **Verificar esta etapa**, no painel da seção. Mostrar o resultado real **Objetivo da etapa cumprido!**. Em caso de pendência, enquadrar o item a corrigir e verificar de novo. Depois esperar **Salvo** na barra do Estúdio; clicar **Enviar para o professor**, confirmar no botão **Enviar** da janela e aguardar o envio. Encerrar apontando **Concluir aula**.

**Narração:**
> "Depois de testar, aperte Verificar esta etapa. Se aparecer algo para corrigir, confira o bloco indicado e verifique de novo. Quando aparecer Objetivo da etapa cumprido!, espere a palavra Salvo na barra do Estúdio. Ela indica que seu trabalho ficou guardado. Agora aperte Enviar para o professor e, na janela que abrir, confirme em Enviar. Espere terminar o envio. Para finalizar, aperte Concluir aula."
