# Corre, Dino! · Aula 6 · Retire os cactos que saíram

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Cactos atravessando a tela, ainda guardados no grupo depois de sair.
- Resultado da aula: Limpeza do grupo a cada quadro, com o intervalo original 1,4 segundo preservado.
- Seções: 4. Vídeos: 3.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

A experiência torna visível o conteúdo do grupo. O medidor temporário e a criação acelerada, depois retirados no desenho antigo, deixam de ser desvios obrigatórios. A montagem atua diretamente sobre a limpeza, com o mesmo programa final.

**Revisão de 02/11/2026.** A experiência do grupo passou à exploração livre com a bola no quintal do vizinho (a mochila entregava a descoberta). A montagem liga o bloco à ideia ("É este bloco que tira do grupo cada cacto que passa da borda"), diz o nome de fábrica do grupo e onde clicar, troca "peça" por bloco e explica o espaço fazer. No quiz, a alternativa que citava um bloco que a criança nunca montou virou "Só quando alguém toca na barra de espaço".

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Visibilidade e permanência no grupo | cleanup antes da limpeza | Observar os objetos fora da tela nos bastidores. |
| Limpeza da imagem e do grupo | retomada no quiz | Distinguir apagar pixels de retirar objetos. |

## Proposta final

### Seção 1. Para onde vai o cacto que sai da tela?

**Tarefa:** Sua vez! Investigue o que acontece com o cacto que passa da borda da tela. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-visivel-guardado → fala-visivel-guardado → experiencia-visivel-guardado.

**Recado na página (não gravar):** Sua vez! Investigue o que acontece com o cacto que passa da borda da tela. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-visivel-guardado-K1: Dedé substitui “E quando o cacto some da tela, ele sai do grupo também?”. Antes: “jogo, os cactos ficam num grupo, guardado nos bastidores. Quando um cacto passa da borda da esquerda, ele some da tela.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que acontece com o grupo de cactos”.

**Experiência em exploração livre:** `cleanup` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/dino/cleanup.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/dino/espelhos.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare o grupo de cactos quando o jogo tira quem sai da tela e quando não tira. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Sem tirar ninguém do jogo, clique em Passar 1 segundo até dois cactos saírem da tela e observe o grupo. Clique em Tirar do jogo quem sai da tela e passe o tempo até mais dois cactos saírem. Compare o grupo.

**Pistas, do aberto ao direto:** 1) Observe a tela, os bastidores e o número de cactos no grupo. 2) Compare o grupo quando o jogo tira quem sai da tela e quando não tira. 3) Clique em Passar 1 segundo até dois cactos saírem. Depois clique em Tirar do jogo quem sai da tela e passe o tempo até mais dois saírem. Sem palpite e sem pergunta final.

### Seção 2. Retire do grupo quem já saiu

**Tarefa:** Agora tire do grupo os cactos que já saíram! Coloque Tirar do grupo quem sair da tela depois do desenho dos cactos e mantenha o relógio em 1.4. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-faxina → fala-faxina.

**Recado na página (não gravar):** Agora tire do grupo os cactos que já saíram! Coloque Tirar do grupo quem sair da tela depois do desenho dos cactos e mantenha o relógio em 1.4. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-faxina-K1: Dedé substitui “E onde isso entra no jogo?”. Antes: “parte anterior? Os cactos que saíam da tela continuavam guardados no grupo. Agora a gente vai tirar esses cactos de lá!”. Depois: “O jogo confere os cactos em todo quadro, depois que eles andaram e foram desenhados. Por isso, o bloco vai no fim de A”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Remova do grupo cactos quem saiu da tela, a cada quadro.
- Mantenha a criação de cactos em um relógio com intervalo positivo.
- Mantenha o projeto sem um placar de teste para contar cactos.

### Seção 3. Confira o que você construiu

**Tarefa:** Hora de lembrar o que você construiu! As perguntas falam do som do pulo e dos cactos. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

**Blocos na página:** fala-revisao → quiz.

**Recado na página (não gravar):** Hora de lembrar o que você construiu! As perguntas falam do som do pulo e dos cactos. Depois de clicar em Responder!, leia as explicações: se alguma resposta não estiver certa, é só clicar em Tentar de novo! e responder outra vez. Quando acertar todas, clique em Próxima parte.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta parte.

### Seção 4. Teste e envie seu jogo

**Tarefa:** Hora de testar e enviar o seu jogo! Espere novos cactos passarem, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de testar e enviar o seu jogo! Espere novos cactos passarem, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio em Enviar meu projeto confirmado em Enviar.

- Remova do grupo cactos quem saiu da tela, a cada quadro.
- Mantenha a criação de cactos em um relógio com intervalo positivo.
- Mantenha o projeto sem um placar de teste para contar cactos.

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
| Mostrar placar valor em x y cor tamanho | Jogo 2D → Vida e placar → Indicadores e texto na tela |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| A cada segundos | Jogo 2D → Tempo → Quadros e intervalos |
| Desenhar fundo de floresta (velocidade ) | Jogo 2D → Cenários → Fundos |
| Quando o sprite pular | Jogo 2D → Controles → Teclado, ações e toque |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| Descrever o jogo para leitor de tela | Jogo 2D → Jogo e telas → Telas e partida |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| No grupo criar obstáculo em x tamanho com vx | Jogo 2D → Kits prontos → Dino |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 6 na cadeia `corre-dino`. Entrada: etapa 5; saída: etapa 6 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
