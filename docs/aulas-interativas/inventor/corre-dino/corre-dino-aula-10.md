# Corre, Dino! · Aula 10 · Ajuste a área da batida

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Corrida completa, com área de colisão padrão.
- Resultado da aula: Área do Dino em 80% como referência, desenho tamanho 64; contorno de teste retirado.
- Seções: 5. Vídeos: 5.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

A aula retoma o contato observado antes da colisão e compara agora a porcentagem da área. O contorno temporário é instrumento para conferir o ajuste, não uma regra nova. A escolha entre 70 e 85% continua permitida.

**Revisão de 02/11/2026.** P10 (decisão da coordenação, 02/11/2026): a área fica em 80 por cento, sem "se quiser, teste 70 e 85" na montagem nem "a porcentagem que você escolheu" na entrega; o rótulo do critério também diz 80 (a régua do critério continua aceitando de 70 a 85). A experiência da área passou à exploração livre, voltando ao combinado do pega-pega da aula anterior. As montagens ligam área e caixa de colisão ("No Estúdio, a área da batida se chama caixa de colisão"), explicam a porcentagem, dizem o nome de fábrica jogador e nomeiam o bloco que vem logo abaixo do contorno, Mover os sprites do grupo cactos. A retomada diz a relação ("a área um pouco menor que o desenho").

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Área de colisão e desenho | hitbox antes do ajuste | Manter o desenho e variar somente a área. |
| Instrumento de inspeção | contorno no próprio jogo | Conferir o ajuste e retirar o instrumento ao terminar. |

## Proposta final

### Seção 1. E se a área mudar de tamanho?

**Tarefa:** Sua vez! Investigue o que muda na batida quando a área do Dino muda de tamanho. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-caixa-decide → fala-caixa-decide → experiencia-hitbox.

**Recado na página (não gravar):** Sua vez! Investigue o que muda na batida quando a área do Dino muda de tamanho. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-caixa-decide-K1: Dedé substitui “E se a área ficar menor que o desenho, o que acontece com a batida?”. Antes: “ou mais difícil de pegar alguém. No seu jogo, dá para mudar só o tamanho da área do Dino, sem mudar o desenho dele.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar quando o jogo marca a batida com a área”.

**Experiência em exploração livre:** `hitbox` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/hitbox.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/hitbox.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare quando aparece BATEU com a área do Dino em 100%, 80% e 40%. O Zappy te mostra o que testar, e você pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Com a área em 100%, clique em Aproximar o cacto, um toque de cada vez, até aparecer BATEU. Com o cacto onde apareceu BATEU, clique em 80%. Clique em Aproximar o cacto até o cacto encostar no desenho do Dino e clique em 40%.

**Pistas, do aberto ao direto:** 1) Quando aparecer BATEU, olhe os desenhos e as áreas pontilhadas. 2) Deixe o cacto onde bateu e mude só o tamanho da área. 3) Clique em 80% sem mexer no cacto; depois encoste o cacto no desenho do Dino e clique em 40%. Sem palpite e sem pergunta final.

### Seção 2. Mostre a área no seu jogo

**Tarefa:** Agora mostre a área da batida no seu jogo! Coloque Mostrar a caixa de colisão do sprite logo depois do desenho do Dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-ligar-raio-x → fala-ligar-raio-x.

**Recado na página (não gravar):** Agora mostre a área da batida no seu jogo! Coloque Mostrar a caixa de colisão do sprite logo depois do desenho do Dino. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Desenhe a área de colisão do dino a cada quadro.

### Seção 3. Ajuste a área sem mudar o desenho

**Tarefa:** Agora ajuste a área da batida! Coloque Usar área de colisão no fim de Ao iniciar, com dino e 80%, sem mudar o tamanho 64 do desenho. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-ajustar-area → fala-ajustar-area.

**Recado na página (não gravar):** Agora ajuste a área da batida! Coloque Usar área de colisão no fim de Ao iniciar, com dino e 80%, sem mudar o tamanho 64 do desenho. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Em Ao iniciar, ajuste a área de colisão do dino para 80 por cento.
- Desenhe a área de colisão do dino a cada quadro.
- Mantenha a criação do Dino e ajuste a área de colisão separadamente.

### Seção 4. Retire o contorno de teste

**Tarefa:** Agora retire o contorno de teste! Tire só Mostrar a caixa de colisão do sprite e deixe o ajuste da área em Ao iniciar. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-retirar-contorno → fala-retirar-contorno.

**Recado na página (não gravar):** Agora retire o contorno de teste! Tire só Mostrar a caixa de colisão do sprite e deixe o ajuste da área em Ao iniciar. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-retirar-contorno-K1: Dedé substitui “Como eu tiro só o contorno?”. Antes: “para você enxergar a área enquanto ajustava. Por isso, retire só o contorno e deixe o bloco que escolhe a porcentagem.”. Depois: “Deixe à vista o bloco Mostrar a caixa de colisão do sprite, no então de Se jogando. Se você puxar esse bloco, os blocos”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Em Ao iniciar, ajuste a área de colisão do dino para 80 por cento.
- Retire o desenho provisório da área de colisão.
- Mantenha a criação do Dino e ajuste a área de colisão separadamente.

### Seção 5. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo! Jogue até a batida e confira o recomeço, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Jogue até a batida e confira o recomeço, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio em Enviar meu projeto confirmado em Enviar.

- Em Ao iniciar, ajuste a área de colisão do dino para 80 por cento.
- Retire o desenho provisório da área de colisão.
- Mantenha a criação do Dino e ajuste a área de colisão separadamente.

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
