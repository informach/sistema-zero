<!-- Versão adulta gerada por docs/aulas-interativas-tecnico/qa/adulto/gerar-adulto.ts a partir de kids/nave-contra-asteroides/nave-contra-asteroides-dia-5.md e de qa/adulto/traducoes/nave-contra-asteroides/nave-contra-asteroides-dia-5.json. Não edite este arquivo: edite a tradução e gere de novo. -->

# Nave Contra Asteroides · Aula 9 · Termine e recomece a partida

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Abertura aguarda Enter; nave, tiros e asteroides só agem em jogando. Ainda sem vitória, derrota ou reinício.
- Resultado da aula: Jogo completo original: alvo 26, vitória, derrota, retorno à abertura e nova partida.
- Seções: 6. Vídeos: 5.

**Vozes e gravação:** Só a professora fala nos vídeos; não há avatar nem mascote. O recado da página é texto, sem personagem e sem voz no vídeo. A versão adulta ainda não foi gravada.

## Diagnóstico e decisão

Amplia a abertura já testada. As regras de final e o reinício são construídos em etapas distintas; a publicação tem instruções completas.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Constante e comparação | Meta de 26 pontos no projeto | A constante guarda uma meta que não muda durante a partida; comparar o valor atual com ela. |
| Finais | Duas condições dentro da partida e dois ramos de tela | Conservar a ordem original: verificar vitória e depois derrota. |
| Reinício | restart antes de ampliar Enter | Trocar só o estado não refaz pontos, vidas e grupos. |
| Conclusão | Quiz formativo e teste do ciclo | Ganhar, perder, recomeçar e enviar; publicação opcional no Mural. |

## Proposta final

### Seção 1. Defina quando ganhar e perder

**Tarefa:** Agora defina quando a partida termina. Crie a meta alvo, monte as perguntas de vitória e de derrota dentro de jogando e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Blocos na página:** video-finais → fala-finais.

**Recado na página (não gravar):** Agora defina quando a partida termina. Crie a meta alvo, monte as perguntas de vitória e de derrota dentro de jogando e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- No final da partida, se pontos ≥ alvo, vá para vitoria.
- Na partida, coloque a pergunta de vitória antes da pergunta de derrota.
- Se acabaram as vidas da nave, vá para fim, após a pergunta de vitória.
- Crie uma meta positiva na constante alvo, em Ao iniciar.

### Seção 2. Mostre a vitória e a derrota

**Tarefa:** Agora mostre a vitória e a derrota. Crie os ramos vitoria e fim depois do ramo inicio, com os textos de cada tela, e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Blocos na página:** video-mostrar-telas → fala-telas.

**Recado na página (não gravar):** Agora mostre a vitória e a derrota. Crie os ramos vitoria e fim depois do ramo inicio, com os textos de cada tela, e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- No senão se inicio, encaixe Mostrar tela com a dica de Enter.
- No senão se vitoria, encaixe Mostrar tela com a dica de Enter.
- No senão se fim, encaixe Mostrar tela com a dica de Enter.

### Seção 3. Compare voltar à abertura e reiniciar

**Tarefa:** Sua vez: depois de perder, compare Mudar o estado do jogo para inicio com Reiniciar o jogo e repare nas pedras quando a partida nova começa. Quando terminar, clique em Próxima seção.

**Blocos na página:** video-reiniciar → fala-reiniciar → experiencia-reiniciar.

**Recado na página (não gravar):** Sua vez: depois de perder, compare Mudar o estado do jogo para inicio com Reiniciar o jogo e repare nas pedras quando a partida nova começa. Quando terminar, clique em Próxima seção.

**Experiência existente:** `restart`. Escolha Mudar o estado do jogo para inicio. Comece, espere perder, volte à abertura e tente jogar de novo. No final, escolha Reiniciar o jogo, volte à abertura e comece outra partida para comparar. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 4. Faça Enter preparar outra partida

**Tarefa:** Agora faça o Enter preparar outra partida. Acrescente ao evento Enter os ramos fim e vitoria, com Reiniciar o jogo, e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Blocos na página:** video-enter → fala-enter.

**Recado na página (não gravar):** Agora faça o Enter preparar outra partida. Acrescente ao evento Enter os ramos fim e vitoria, com Reiniciar o jogo, e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Enter: inicio vai para jogando; fim e vitoria reiniciam e voltam ao início.

### Seção 5. Confira o que você construiu

**Tarefa:** Hora de lembrar o que você construiu. Responda sobre o Enter, a partida e a vitória, pensando nos testes do seu jogo. Depois de clicar em Enviar quiz, leia as explicações: se alguma resposta não estiver certa, é só trocar a resposta e clicar em Enviar quiz de novo. Quando acertar todas, clique em Próxima seção.

**Blocos na página:** fala-quiz-final → quiz.

**Recado na página (não gravar):** Hora de lembrar o que você construiu. Responda sobre o Enter, a partida e a vitória, pensando nos testes do seu jogo. Depois de clicar em Enviar quiz, leia as explicações: se alguma resposta não estiver certa, é só trocar a resposta e clicar em Enviar quiz de novo. Quando acertar todas, clique em Próxima seção.

**Revisão formativa:** recado → quiz, com todas as perguntas numa página só e o botão Enviar quiz. Todas corretas, com explicação e novos envios sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta seção.

### Seção 6. Teste o jogo completo e compartilhe

**Tarefa:** Hora do teste final. Confira a derrota, a vitória e o recomeço, clique em Verificar esta etapa e envie o seu projeto ao professor. Se quiser, publique o seu jogo no Mural. Depois, clique em Concluir aula.

**Blocos na página:** video-ciclo-completo → fala-entrega → projeto.

**Recado na página (não gravar):** Hora do teste final. Confira a derrota, a vitória e o recomeço, clique em Verificar esta etapa e envie o seu projeto ao professor. Se quiser, publique o seu jogo no Mural. Depois, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa, com o envio confirmado em Enviar para o professor → Enviar.

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

Publicação opcional após o envio: Compartilhar → resumo já preenchido, sem mexer → Gerar capa → conferir → Publicar → Publicado! → Copiar link → Fechar → Concluir aula. Não bloquear a conclusão por publicação.

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

A ordem vídeo → recado → atividade é editorial. Configurar videoBeforeActivity no curso adulto e conferir com um perfil adulto; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos adultos, anexar o PDF do caderno do curso quando existir e ensaiar com adultos antes de declarar o percurso validado.
