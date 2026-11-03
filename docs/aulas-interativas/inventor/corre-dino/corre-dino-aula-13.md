# Corre, Dino! · Aula 13 · Aumente a dificuldade com um limite

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Corrida completa com placar e sorteios, usando base fixa -5.
- Resultado da aula: Base velocidade começa em -5, diminui a cada 5 segundos até -9, com variação de 0 a 1; descrição dos três controles e publicação opcional.
- Seções: 7. Vídeos: 6.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

A experiência de aceleração vem antes da mudança da base e do relógio; a régua dos negativos, que ela pressupõe, passou para a Aula 12. Guardar a base, preparar o relógio e limitar a soma são montagens separadas. O fechamento testa e publica o próprio jogo; a visita ao modo Ponte, indisponível neste curso, foi retirada.

**Revisão de 02/11/2026.** D3: a régua foi para a Aula 12, e a Aula 13 ficou com sete partes e uma experiência só, a da base que acelera (o botão de volume, sem o “até um limite” que entregava a descoberta, no lugar do freio da bicicleta, que fazia pensar em reduzir). As retomadas citam a "primeira parte" e o limite lembra a régua da aula anterior ("-5 fica à direita de -9, por isso é maior"). P10: o relógio dos pontos é dito como de 1 segundo, sem "o intervalo que você escolheu". "Velocidade" ficou com um sentido por vez: a variável velocidade guarda a base, e cada cacto tem o seu vx. As três montagens só lembram a experiência, porque o efeito não aparece no jogo antes do fim; o Se dentro do Se é explicado, a resposta à Debinha começa pelo limite, e a publicação ficou em cinco falas, com a ajuda de um adulto. No quiz, "o bloco que cria os cactos".

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Mudança da base e limite | acceleration antes da variável velocidade e do acelerador | Separar a base do valor copiado por cada cacto. |
| Descrição completa e publicação | reaplicação e operação da plataforma | Concluir o acesso aos controles e compartilhar opcionalmente. |

## Proposta final

### Seção 1. Até onde a corrida acelera?

**Tarefa:** Sua vez! Investigue o que muda nos cactos quando a base muda, com e sem a pergunta. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-o-que-o-freio-segura → fala-o-que-o-freio-segura → experiencia-aceleracao.

**Recado na página (não gravar):** Sua vez! Investigue o que muda nos cactos quando a base muda, com e sem a pergunta. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-o-que-o-freio-segura-K1: Debinha substitui “E os cactos que já estão na pista também ficam mais rápidos?”. Antes: “-7… Cada cacto nasce com o número dele. E o jogo pode fazer uma pergunta antes de mudar a base: a base é maior que -9?”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que acontece com a base e com os”.

**Experiência em exploração livre:** `acceleration` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/acceleration.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/acceleration.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare o número da base com o número dos cactos novos e dos antigos, com a pergunta ligada e desligada. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Clique em Passar 5 segundos algumas vezes e olhe o número embaixo de cada cacto. Com a pergunta ligada, clique em Passar 5 segundos até a base chegar no -9 e mais uma vez. Com a pergunta ligada, continue clicando em Passar 5 segundos e olhe o número de cada cacto novo. Clique em Desligar a pergunta e em Passar 5 segundos algumas vezes.

**Pistas, do aberto ao direto:** 1) Olhe o número embaixo de cada cacto e o número da base. 2) Passe 5 segundos até a resposta da pergunta virar não. 3) Com a base parada no -9, passe mais 5 segundos algumas vezes e olhe cada cacto novo; depois desligue a pergunta e compare a base. Sem palpite e sem pergunta final.

### Seção 2. Guarde a velocidade base

**Tarefa:** Agora guarde a velocidade base numa variável! Crie velocidade com -5 em Ao iniciar e use o valor dela na conta do vx dos cactos. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-numero-que-manda → fala-numero-que-manda.

**Recado na página (não gravar):** Agora guarde a velocidade base numa variável! Crie velocidade com -5 em Ao iniciar e use o valor dela na conta do vx dos cactos. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Crie a variável velocidade com valor inicial negativo em Ao iniciar.
- No vx dos cactos, use velocidade menos uma variação não negativa sorteada.
- Sorteie a posição de entrada dos cactos, a partir da direita da pista.

### Seção 3. Prepare o relógio da dificuldade

**Tarefa:** Agora prepare o relógio da dificuldade! Crie um relógio de 5 segundos com um Se jogando, separado dos outros dois. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-relogio-da-dificuldade → fala-relogio-da-dificuldade.

**Recado na página (não gravar):** Agora prepare o relógio da dificuldade! Crie um relógio de 5 segundos com um Se jogando, separado dos outros dois. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Prepare um relógio de 2 a 10 segundos com Se jogando.

### Seção 4. Diminua a base até o limite

**Tarefa:** Agora faça a corrida acelerar até um limite! No relógio de 5 segundos, some -1 em velocidade só enquanto a base for maior que -9. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-acelerador-e-freio → fala-acelerador-e-freio.

**Recado na página (não gravar):** Agora faça a corrida acelerar até um limite! No relógio de 5 segundos, some -1 em velocidade só enquanto a base for maior que -9. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-acelerador-e-freio-K1: Debinha substitui “Até onde a velocidade pode mudar?”. Antes: “pegue o bloco valor da variável e solte em cima desse x. Ele também chega com x: clique nele e escolha velocidade.”. Depois: “Até -9. Por isso, a pergunta vai ser: velocidade maior que -9? O sinal já chega como maior que: mantenha. No lado”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Num relógio próprio, se o estado do jogo é jogando e a velocidade é maior que o limite, some -1 em velocidade. O relógio é seu, de 2 a 10 segundos, e o limite também, de -14 a -7.
- Use um único Somar em variável velocidade no projeto inteiro.

### Seção 5. Complete a descrição dos controles

**Tarefa:** Agora complete a descrição do seu jogo! Troque a descrição pela frase Corra com o dino e pule os cactos com espaço, seta pra cima ou tocando na tela, sem ponto no fim. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-descricao-completa → fala-descricao-completa.

**Recado na página (não gravar):** Agora complete a descrição do seu jogo! Troque a descrição pela frase Corra com o dino e pule os cactos com espaço, seta pra cima ou tocando na tela, sem ponto no fim. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Descreva objetivo e os três controles em Ao iniciar.

### Seção 6. Confira o que você construiu

**Tarefa:** Hora de lembrar o que você construiu! As perguntas falam dos sorteios e da dificuldade da corrida. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-revisao → quiz.

**Recado na página (não gravar):** Hora de lembrar o que você construiu! As perguntas falam dos sorteios e da dificuldade da corrida. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta parte.

### Seção 7. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu Corre, Dino! Teste a corrida inteira, clique em Verificar projeto e depois em Enviar meu projeto, confirmando em Enviar. Se quiser, mostre o seu jogo no Mural e, por último, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar e enviar o seu Corre, Dino! Teste a corrida inteira, clique em Verificar projeto e depois em Enviar meu projeto, confirmando em Enviar. Se quiser, mostre o seu jogo no Mural e, por último, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio em Enviar meu projeto confirmado em Enviar.

- Crie a variável velocidade com valor inicial negativo em Ao iniciar.
- No vx dos cactos, use velocidade menos uma variação não negativa sorteada.
- Num relógio próprio, se o estado do jogo é jogando e a velocidade é maior que o limite, some -1 em velocidade. O relógio é seu, de 2 a 10 segundos, e o limite também, de -14 a -7.
- Use um único Somar em variável velocidade no projeto inteiro.
- Sorteie a posição de entrada dos cactos, a partir da direita da pista.
- Preserve o relógio de 1,4 s, com o nascimento protegido pelo estado do jogo é jogando.
- Use um único bloco de criar cacto no projeto inteiro.
- No Ao iniciar, mantenha a variável pontos com valor 0.
- Mantenha o relógio de 1 segundo somando 1 em pontos só quando o estado do jogo é jogando.
- Mantenha retirado o desenho provisório da área de colisão.
- Descreva objetivo e os três controles em Ao iniciar.

Publicação opcional após o envio: Compartilhar → resumo já preenchido → Gerar capa → conferir → Publicar → Seu jogo está no Mural! → Copiar link de jogar → Fechar → Concluir aula. Não bloquear a conclusão por publicação.

## Blocos disponíveis

| Bloco | Caminho na paleta |
| --- | --- |
| ⚡ Quando acontecer | 🗂️ Áreas do projeto |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto |
| Aplicar a gravidade do mundo ao sprite | Jogo 2D → Movimento → Velocidade e gravidade |
| Limpar a tela | Jogo 2D → Desenho e efeitos → Efeitos |
| Controlar o dinossauro , força do pulo | Jogo 2D → Kits prontos → Dino |
| Criar dinossauro em x y tamanho cor | Jogo 2D → Kits prontos → Dino |
| Criar grupo de sprites | Jogo 2D → Grupos → Criar e percorrer |
| Desenhar o grupo | Jogo 2D → Grupos → Desenho e ordem |
| Mostrar a caixa de colisão do sprite | Jogo 2D → Colisões → Área de contato |
| Mostrar placar valor em x y cor tamanho | Jogo 2D → Vida e placar → Indicadores e texto na tela |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| A cada segundos | Jogo 2D → Tempo → Quadros e intervalos |
| Soltar explosão no sprite cor | Jogo 2D → Desenho e efeitos → Partículas |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D → Cenários → Fundos |
| Quando apertar qualquer tecla ou tocar na tela | Jogo 2D → Controles → Teclado, ações e toque |
| Quando o sprite pular | Jogo 2D → Controles → Teclado, ações e toque |
| Para cada sprite do grupo que colidir com o sprite | Jogo 2D → Colisões → Encostar e bloquear |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| um número de a | Jogo 2D → Sorteios → Números e posições |
| Reiniciar o jogo | Jogo 2D → Jogo e telas → Telas e partida |
| o estado do jogo é ? | Jogo 2D → Jogo e telas → Telas e partida |
| Usar área de colisão de % do tamanho para o sprite | Jogo 2D → Colisões → Área de contato |
| Mudar o estado do jogo para | Jogo 2D → Jogo e telas → Telas e partida |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Tremer a tela com intensidade | Jogo 2D → Desenho e efeitos → Efeitos |
| Mostrar tela com título subtítulo dica fundo | Jogo 2D → Jogo e telas → Telas e partida |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D → Kits prontos → Dino |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Condição se, senão se e senão | Programação → ❓ Lógica & Se |
| Criar variável com valor | Programação → 🏷️ Variáveis |
| Somar em variável | Programação → 🏷️ Variáveis |
| Conta matemática | Programação → 🔢 Matemática |
| Comparar dois valores | Programação → ❓ Lógica & Se |
| juntar texto | Programação → 🔣 Valores |
| Número | Programação → 🔣 Valores |
| texto | Programação → 🔣 Valores |
| valor da variável | Programação → 🔣 Valores |

## Continuidade e produção

Aula 13 na cadeia `corre-dino`. Entrada: etapa 12; saída: etapa 13 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
