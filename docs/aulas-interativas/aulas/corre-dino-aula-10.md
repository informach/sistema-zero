# Corre, Dino! · Aula 10 · Ajuste a área da batida

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-corre-dino.md).

## Resumo

- Estado de entrada: Corrida completa, com área de colisão padrão.
- Resultado da aula: Área do Dino em 80% como referência, desenho tamanho 64; contorno de teste retirado.
- Seções: 5. Vídeos: 5.

## Diagnóstico e decisão

A aula retoma o contato observado antes da colisão e compara agora a porcentagem da área. O contorno temporário é instrumento para conferir o ajuste, não uma regra nova. A escolha entre 70 e 85% continua permitida.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Área de colisão e desenho | hitbox antes do ajuste | Manter o desenho e variar somente a área. |
| Instrumento de inspeção | contorno no próprio jogo | Conferir o ajuste e retirar o instrumento ao terminar. |

## Proposta final

### Seção 1. Compare a área com o desenho

**Tarefa:** Sua vez! Mude só a área com o cacto parado e, depois, compare a batida com a área em 40%. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-caixa-decide → fala-caixa-decide → experiencia-hitbox.

**Zappy na página (não gravar):** Sua vez! Mude só a área com o cacto parado e, depois, compare a batida com a área em 40%. Quando terminar, clique em Próxima parte.

**Experiência existente:** `hitbox`. Na experiência, deixe a área do Dino em 100%. Aproxime o cacto um toque de cada vez até aparecer BATEU! Observe os desenhos nesse momento. Sem mudar a distância, diminua Tamanho da área do Dino para 80%. Observe a indicação. Depois aproxime o cacto até encostar no desenho do Dino e diminua a área para 40%. Compare de novo. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 2. Mostre a área no seu jogo

**Tarefa:** Agora mostre a área da batida no seu jogo! Coloque Mostrar a caixa de colisão do sprite logo depois do desenho do Dino. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Blocos na página:** video-ligar-raio-x → fala-ligar-raio-x.

**Zappy na página (não gravar):** Agora mostre a área da batida no seu jogo! Coloque Mostrar a caixa de colisão do sprite logo depois do desenho do Dino. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Desenhe a área de colisão do dino a cada quadro.

### Seção 3. Ajuste a área sem mudar o desenho

**Tarefa:** Agora ajuste a área da batida! Coloque Usar área de colisão no fim de Ao iniciar, com dino e 80%, sem mudar o tamanho 64 do desenho. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Blocos na página:** video-ajustar-area → fala-ajustar-area.

**Zappy na página (não gravar):** Agora ajuste a área da batida! Coloque Usar área de colisão no fim de Ao iniciar, com dino e 80%, sem mudar o tamanho 64 do desenho. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Em Ao iniciar, ajuste a área de colisão do dino. Vale qualquer número de 70 a 85 por cento.
- Desenhe a área de colisão do dino a cada quadro.
- Crie o Dino com tamanho 64 antes do ajuste de colisão.

### Seção 4. Retire o contorno de teste

**Tarefa:** Agora retire o contorno de teste! Tire só Mostrar a caixa de colisão do sprite e deixe o ajuste da área em Ao iniciar. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Blocos na página:** video-retirar-contorno → fala-retirar-contorno.

**Zappy na página (não gravar):** Agora retire o contorno de teste! Tire só Mostrar a caixa de colisão do sprite e deixe o ajuste da área em Ao iniciar. Depois, clique em Verificar esta parte e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Em Ao iniciar, ajuste a área de colisão do dino. Vale qualquer número de 70 a 85 por cento.
- Retire o desenho provisório da área de colisão.
- Crie o Dino com tamanho 64 antes do ajuste de colisão.

### Seção 5. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo! Jogue até a batida e confira o recomeço, clique em Verificar esta parte e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir fase.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Zappy na página (não gravar):** Hora de testar e enviar o seu jogo! Jogue até a batida e confira o recomeço, clique em Verificar esta parte e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir fase.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio em Enviar meu projeto confirmado em Enviar.

- Em Ao iniciar, ajuste a área de colisão do dino. Vale qualquer número de 70 a 85 por cento.
- Retire o desenho provisório da área de colisão.
- Crie o Dino com tamanho 64 antes do ajuste de colisão.

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
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| A cada segundos | Jogo 2D → Tempo → Quadros e intervalos |
| Soltar explosão no sprite cor | Jogo 2D → Desenho e efeitos → Partículas |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D → Cenários → Fundos |
| Quando apertar qualquer tecla ou tocar na tela | Jogo 2D → Controles → Teclado, ações e toque |
| Quando o sprite pular | Jogo 2D → Controles → Teclado, ações e toque |
| Para cada sprite do grupo que colidir com o sprite | Jogo 2D → Colisões → Encostar e bloquear |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
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
| Número | Programação → 🔣 Valores |
| texto | Programação → 🔣 Valores |

## Continuidade e produção

Aula 10 na cadeia `corre-dino`. Entrada: etapa 9; saída: etapa 10 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
