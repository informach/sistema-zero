# Nave Contra Asteroides · Aula 9 · Termine e recomece a partida

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Abertura aguarda Enter; nave, tiros e asteroides só agem em jogando. Ainda sem vitória, derrota ou reinício.
- Resultado da aula: Jogo completo original: alvo 26, vitória, derrota, retorno à abertura e nova partida.
- Seções: 7. Vídeos: 6.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

Amplia a abertura já testada. As regras de final e o reinício são construídos em etapas distintas; a publicação tem instruções completas.

**Revisão de 02/11/2026.** As experiências passaram à exploração livre com o Zappy (`setup.freeExploration`): trabalham só a ideia, sem blocos, áreas do Estúdio nem código; o vídeo explica a ideia com uma analogia curta e convida a investigar, sem sequência de cliques e sem contar o resultado; a pergunta do avatar que anteciparia a descoberta vira "O que você acha? Isso você vai testar na experiência."; instrução, ponte, metas (`goalCopy`) e três pistas usam os botões reais da tela livre. Toda fala foi revista: uma ideia por fala, explicação separada do gesto, montagens que começam pelo "Tá vendo?" no jogo, retomam a experiência e ligam cada bloco à ideia ("É este bloco que…"). O Na tela segue a receita da ESPEC-ROTEIRO §9.8. A montagem dos finais (661 palavras) virou duas: finais (a constante alvo e a pergunta da vitória) e derrota (id novo: a pergunta das vidas e a ordem dos finais). Constante e maior ou igual não têm cena que sirva em exploração livre: a montagem abre com uma retomada didática, a placa do brinquedo do parque (o número não muda; quem tem a altura exata ou mais entra). A proposta de uma experiência própria está registrada no mapa do curso.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Constante e comparação | Meta de 26 pontos no projeto | A constante guarda uma meta que não muda durante a partida; comparar o valor atual com ela. |
| Finais | Duas condições dentro da partida e dois ramos de tela | Conservar a ordem original: verificar vitória e depois derrota. |
| Reinício | restart antes de ampliar Enter | Trocar só o estado não refaz pontos, vidas e grupos. |
| Conclusão | Quiz formativo e teste do ciclo | Ganhar, perder, recomeçar e enviar; publicação opcional no Mural. |

## Proposta final

### Seção 1. Defina quando você ganha

**Tarefa:** Agora defina quando você ganha! Crie a meta alvo com 26, monte a pergunta da vitória dentro de jogando e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-finais → fala-finais.

**Recado na página (não gravar):** Agora defina quando você ganha! Crie a meta alvo com 26, monte a pergunta da vitória dentro de jogando e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-finais-K1: Debinha substitui “E do outro lado vai a meta?”. Antes: “de maior ou igual, o que tem um tracinho embaixo. Esse sinal quer dizer chegou ou passou, como na placa do parque.”. Depois: “Isso: a constante alvo. Deixe à vista o 0, à direita da comparação. Abra Programação e depois Valores, pegue o bloco”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- No final da partida, se pontos ≥ alvo, vá para vitoria.
- Crie uma meta positiva na constante alvo, em Ao iniciar.

### Seção 2. Defina quando você perde

**Tarefa:** Agora defina quando você perde! Monte a pergunta da derrota logo abaixo da vitória e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-derrota → fala-derrota.

**Recado na página (não gravar):** Agora defina quando você perde! Monte a pergunta da derrota logo abaixo da vitória e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-derrota-K1: Debinha substitui “E se as duas coisas acontecerem juntas?”. Antes: “Jogo e telas e depois Telas e partida, pegue o bloco Mudar o estado do jogo para, solte dentro do então e escolha fim.”. Depois: “Olha aqui: a ordem no fim de jogando é primeiro o desenho das vidas, depois a pergunta da vitória e por último a da”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Na partida, coloque a pergunta de vitória antes da pergunta de derrota.
- Se acabaram as vidas da nave, vá para fim, após a pergunta de vitória.

### Seção 3. Mostre a vitória e a derrota

**Tarefa:** Agora mostre a vitória e a derrota! Crie os ramos vitoria e fim depois do ramo inicio, com os textos de cada tela, e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-mostrar-telas → fala-telas.

**Recado na página (não gravar):** Agora mostre a vitória e a derrota! Crie os ramos vitoria e fim depois do ramo inicio, com os textos de cada tela, e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-mostrar-telas-K1: Debinha substitui “E a tela de quando eu perder?”. Antes: “subtítulo e, na dica, escreva Aperte Enter para voltar ao início. Depois, escolha um fundo escuro com letras legíveis.”. Depois: “Ela vem do mesmo jeito. Agora a derrota, do mesmo jeito. Clique de novo no sinal de mais que fica antes de senão se e”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- No senão se inicio, encaixe Mostrar tela com a dica de Enter.
- No senão se vitoria, encaixe Mostrar tela com a dica de Enter.
- No senão se fim, encaixe Mostrar tela com a dica de Enter.

### Seção 4. Jogar outra vez

**Tarefa:** Sua vez! Descubra o que muda na partida nova em cada jeito de o Enter recomeçar. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-reiniciar → fala-reiniciar → experiencia-reiniciar.

**Recado na página (não gravar):** Sua vez! Descubra o que muda na partida nova em cada jeito de o Enter recomeçar. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-reiniciar-K1: Debinha substitui “E qual é a diferença entre os dois?”. Antes: “jogo, quando a partida acaba, o Enter pode fazer duas coisas: só voltar para a tela de início, ou começar tudo de novo.”. Depois: “O que você acha? Isso você vai testar na experiência. Olha aqui: nesta experiência, você escolhe o que o Enter faz no”.

**Experiência em exploração livre:** `restart` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/restart.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/restart.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare os asteroides que ficam na tela e a tela de início quando o Enter do fim da partida só volta para a tela de início e quando ele começa tudo de novo. Você escolhe a ordem dos testes e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Escolha Só voltar para a tela de início. Clique em Apertar Enter, deixe o tempo passar até a nave bater e comece outra partida. Observe os asteroides na tela. Escolha Começar tudo de novo. Clique em Apertar Enter, deixe o tempo passar até a nave bater e clique em Apertar Enter no fim. Observe os asteroides e a tela de início.

**Pistas, do aberto ao direto:** 1) Observe os asteroides que ficam na tela quando uma partida nova começa. 2) Compare os dois jeitos do Enter no fim da partida: só voltar para a tela de início e começar tudo de novo. 3) Escolha Só voltar para a tela de início, clique em Apertar Enter, deixe o tempo passar até a nave bater e clique em Apertar Enter de novo. Depois faça o mesmo com Começar tudo de novo. Sem palpite e sem pergunta final.

### Seção 5. Faça Enter preparar outra partida

**Tarefa:** Agora faça o Enter preparar outra partida! Acrescente ao evento Enter os ramos fim e vitoria, com Reiniciar o jogo, e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-enter → fala-enter.

**Recado na página (não gravar):** Agora faça o Enter preparar outra partida! Acrescente ao evento Enter os ramos fim e vitoria, com Reiniciar o jogo, e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-enter-K1: Debinha substitui “E quando eu ganhar? Também quero jogar de novo!”. Antes: “bloco que começa tudo de novo: o jogo volta ao começo, faz outra vez a preparação de Ao iniciar e mostra a abertura.”. Depois: “Por isso, a vitória ganha um ramo igual. Agora a vitória, do mesmo jeito. Clique de novo no sinal de mais que fica”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Enter: inicio vai para jogando; fim e vitoria reiniciam e voltam ao início.

### Seção 6. Confira o que você construiu

**Tarefa:** Hora de conferir o que você construiu! Responda sobre o Enter, a partida e a vitória, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-quiz-final → quiz.

**Recado na página (não gravar):** Hora de conferir o que você construiu! Responda sobre o Enter, a partida e a vitória, pensando nos testes do seu jogo. Depois de enviar, leia as explicações e, se errar alguma, corrija e tente de novo. Quando acertar todas, clique em Próxima parte.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta parte.

### Seção 7. Teste o jogo completo e compartilhe

**Tarefa:** Hora do teste final! Confira a derrota, a vitória e o recomeço, clique em Verificar projeto e envie o seu projeto. Se quiser, publique o seu jogo no Mural. Depois, clique em Concluir aula.

**Blocos na página:** video-ciclo-completo → fala-entrega → projeto.

**Recado na página (não gravar):** Hora do teste final! Confira a derrota, a vitória e o recomeço, clique em Verificar projeto e envie o seu projeto. Se quiser, publique o seu jogo no Mural. Depois, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio confirmado em Enviar meu projeto → Enviar.

- Crie uma meta positiva na constante alvo, em Ao iniciar.
- Vá para inicio em Ao iniciar.
- Leve a sequência para o então de Se jogando, começando por Limpar.
- O movimento da nave fica dentro de Se jogando.
- Mostre as vidas da nave dentro de Se jogando.
- No relógio de intervalo positivo, crie asteroides somente se o estado é jogando.
- Não deixe outro criador de asteroides fora da condição.
- Dentro de Espaço, coloque criar tiro e som no então de Se jogando.
- Não deixe outro criador de tiro fora da condição.
- No final da partida, se pontos ≥ alvo, vá para vitoria.
- Na partida, coloque a pergunta de vitória antes da pergunta de derrota.
- Se acabaram as vidas da nave, vá para fim, após a pergunta de vitória.
- No senão se inicio, encaixe Mostrar tela com a dica de Enter.
- No senão se vitoria, encaixe Mostrar tela com a dica de Enter.
- No senão se fim, encaixe Mostrar tela com a dica de Enter.
- Enter: inicio vai para jogando; fim e vitoria reiniciam e voltam ao início.
- O placar da variável fica na partida.
- A colisão que soma pontos fica na partida.
- A colisão que tira vida fica na partida.
- Dê 3 vidas à nave em Ao iniciar.

Publicação opcional após o envio: Compartilhar → resumo já preenchido, sem mexer → Gerar capa → conferir → Publicar → Seu jogo está no Mural! → Copiar link de jogar → Fechar → Concluir aula. Não bloquear a conclusão por publicação.

## Blocos disponíveis

| Bloco | Caminho na paleta |
| --- | --- |
| ⚡ Quando acontecer | 🗂️ Áreas do projeto |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto |
| Mover o sprite com as setas <- -> (velocidade ) | Jogo 2D → Movimento → Movimentos prontos |
| o centro x do sprite | Jogo 2D → Movimento → Posição e tamanho |
| Manter o sprite dentro da tela | Jogo 2D → Movimento → Bordas e rebatidas |
| Limpar a tela | Jogo 2D → Desenho e efeitos → Efeitos |
| Criar grupo de sprites | Jogo 2D → Grupos → Criar e percorrer |
| Criar nave em x y largura altura , cor do corpo cor das asas | Jogo 2D → Kits prontos → Espaço |
| Machucar o sprite em e deixá-lo invencível por quadros | Jogo 2D → Vida e placar → Vida |
| Desenhar o grupo | Jogo 2D → Grupos → Desenho e ordem |
| Mostrar placar valor em x y cor tamanho | Jogo 2D → Vida e placar → Indicadores e texto na tela |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| Desenhar as vidas do sprite como em x y tamanho cor | Jogo 2D → Vida e placar → Vida |
| A cada quadros | Jogo 2D → Tempo → Quadros e intervalos |
| Soltar explosão no sprite cor | Jogo 2D → Desenho e efeitos → Partículas |
| as vidas do sprite acabaram? | Jogo 2D → Vida e placar → Vida |
| Para cada colisão entre os grupos e | Jogo 2D → Colisões → Encostar e bloquear |
| Quando apertar a tecla | Jogo 2D → Controles → Teclado, ações e toque |
| Para cada sprite do grupo que colidir com o sprite | Jogo 2D → Colisões → Encostar e bloquear |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| um x aleatório na tela | Jogo 2D → Sorteios → Números e posições |
| Tirar o sprite do grupo | Jogo 2D → Grupos → Participação e limpeza |
| Reiniciar o jogo | Jogo 2D → Jogo e telas → Telas e partida |
| o estado do jogo é ? | Jogo 2D → Jogo e telas → Telas e partida |
| Dar ao sprite de vida | Jogo 2D → Vida e placar → Vida |
| Mudar o estado do jogo para | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Tremer a tela com intensidade | Jogo 2D → Desenho e efeitos → Efeitos |
| Mostrar tela com título subtítulo dica fundo | Jogo 2D → Jogo e telas → Telas e partida |
| No grupo criar um asteroide em x y tamanho cor com vx vy | Jogo 2D → Kits prontos → Espaço |
| Criar tiro no grupo em x y raio cor vx vy | Jogo 2D → Grupos → Criar e percorrer |
| a posição y do sprite | Jogo 2D → Movimento → Posição e tamanho |
| Desenhar fundo de estrelas (velocidade ) | Jogo 2D → Cenários → Fundos |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Criar constante com valor | Programação → 🏷️ Variáveis |
| Condição se, senão se e senão | Programação → ❓ Lógica & Se |
| Criar variável com valor | Programação → 🏷️ Variáveis |
| Somar em variável | Programação → 🏷️ Variáveis |
| Comparar dois valores | Programação → ❓ Lógica & Se |
| Número | Programação → 🔣 Valores |
| texto | Programação → 🔣 Valores |
| valor da variável | Programação → 🔣 Valores |

## Continuidade e produção

Aula 9 na cadeia `nave-contra-asteroides`. Entrada: etapa 8; saída: etapa 9 de `qa/nave-contra-asteroides-etapas.ts`. Os cinco marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
