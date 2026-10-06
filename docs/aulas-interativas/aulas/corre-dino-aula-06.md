# Corre, Dino! · Aula 6 · Retire os cactos que saíram

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-corre-dino.md).

## Resumo

- Estado de entrada: Cactos atravessando a tela, ainda guardados no grupo depois de sair.
- Resultado da aula: Limpeza do grupo a cada quadro, com o intervalo original 1,4 segundo preservado.
- Seções: 4. Vídeos: 3.

## Diagnóstico e decisão

A experiência torna visível o conteúdo do grupo. O medidor temporário e a criação acelerada, depois retirados no desenho antigo, deixam de ser desvios obrigatórios. A montagem atua diretamente sobre a limpeza, com o mesmo programa final.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Visibilidade e permanência no grupo | cleanup antes da limpeza | Observar os objetos fora da tela nos bastidores. |
| Limpeza da imagem e do grupo | retomada no quiz | Distinguir apagar pixels de retirar objetos. |

## Proposta final

### Seção 1. Compare a tela com o grupo

**Tarefa:** Compare o grupo antes e depois de ligar a limpeza.

**Blocos na página:** video-visivel-guardado → fala-visivel-guardado → experiencia-visivel-guardado.

**Zappy na página (não gravar):** Compare o grupo antes e depois de ligar a limpeza.

**Experiência existente:** `cleanup`. Na experiência, deixe Tirar do grupo quem sair da tela desligado. Clique em Tempo para o tempo passar. Espere dois cactos saírem pela esquerda e compare a tela com os bastidores. A chave da limpeza fica disponível depois desse teste. Ligue Tirar do grupo quem sair da tela e deixe o tempo passar mais alguns segundos. Observe os que já saíram e o cacto que ainda chega pela direita. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 2. Retire do grupo quem já saiu

**Tarefa:** Limpe o grupo cactos a cada quadro e conserve o intervalo 1.4.

**Blocos na página:** video-faxina → fala-faxina.

**Zappy na página (não gravar):** Limpe o grupo cactos a cada quadro e conserve o intervalo 1.4.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Remova do grupo cactos quem saiu da tela, a cada quadro.
- Mantenha a criação de cactos no relógio de 1.4 s.
- Mantenha o projeto sem um placar de teste para contar cactos.

### Seção 3. Confira o que você construiu

**Tarefa:** Retome o som e os cactos nas perguntas. Leia as explicações depois de enviar. Você pode corrigir e tentar de novo quantas vezes precisar.

**Blocos na página:** fala-revisao → quiz.

**Zappy na página (não gravar):** Retome o som e os cactos nas perguntas. Leia as explicações depois de enviar. Você pode corrigir e tentar de novo quantas vezes precisar.

**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta seção.

### Seção 4. Teste e envie seu jogo

**Tarefa:** Teste o seu jogo, clique em Verificar esta parte e envie o projeto para o guia. Confirme em Enviar e clique em Concluir fase.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Zappy na página (não gravar):** Teste o seu jogo, clique em Verificar esta parte e envie o projeto para o guia. Confirme em Enviar e clique em Concluir fase.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio em Enviar para o guia confirmado em Enviar.

- Remova do grupo cactos quem saiu da tela, a cada quadro.
- Mantenha a criação de cactos no relógio de 1.4 s.
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
