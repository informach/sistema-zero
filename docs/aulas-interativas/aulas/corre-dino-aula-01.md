# Corre, Dino! · Aula 1 · Prepare a tela e crie o Dino

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-corre-dino.md).

## Resumo

- Estado de entrada: Projeto vazio, com Programação e Jogo 2D disponíveis.
- Resultado da aula: Tela 480 × 270, borda 4 e Dino criado em (110, 150), tamanho 64, ainda sem desenho.
- Seções: 10. Vídeos: 10.

## Diagnóstico e decisão

A abertura e o caderno ficam junto da primeira construção. Preparação, tamanho, coordenadas e criação têm experiências antes da aplicação. O Dino invisível é explicado como resultado da criação sem desenho, sem suspense obrigatório para a aula seguinte.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Preparação e repetição | once-vs-always antes de Ao iniciar | Comparar a mesma ação uma vez e repetida. |
| Tamanho da tela | stage-size antes da tela e da borda | Ver o limite acompanhar largura e altura. |
| Coordenadas | coordinates antes de preencher a posição | Variar um eixo de cada vez. |
| Criar e mostrar | world antes de Criar dinossauro | Distinguir o objeto guardado de seu desenho. |

## Proposta final

### Seção 1. Jogue antes de construir

**Tarefa:** Jogue um pouco para conhecer os controles. Depois clique em Próxima parte.

**Blocos na página:** video-abertura → fala-apresentacao → jogo-pronto.

**Zappy na página (não gravar):** Jogue um pouco para conhecer os controles. Depois clique em Próxima parte.

Versão completa do mesmo jogo, derivada do marco original 13. Conclusão por participação; vencer não é exigência para conhecer o jogo.

### Seção 2. Seu Mapa da Aventura

**Tarefa:** Este é o seu Mapa da Aventura! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.

**Blocos na página:** video-caderno → fala-caderno → caderno.

**Zappy na página (não gravar):** Este é o seu Mapa da Aventura! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.

Anexar somente `output/pdf/corre-dino-caderno.pdf` ao bloco caderno. Ler, baixar e imprimir são opcionais; não entram na conclusão.

### Seção 3. Compare uma vez e sempre

**Tarefa:** Compare a mesma peça nas duas áreas, começando um teste em cada uma.

**Blocos na página:** video-uma-vez-e-sempre → fala-uma-vez-e-sempre → experiencia-uma-vez-e-sempre.

**Zappy na página (não gravar):** Compare a mesma peça nas duas áreas, começando um teste em cada uma.

**Experiência existente:** `once-vs-always`. Nesta experiência, coloque Mover o Dino um pouquinho em Ao iniciar. Clique em Começar o jogo e espere o teste parar. Observe a posição e o contador da ação. Leve a mesma peça para Enquanto estiver rodando. Clique em Começar o jogo e espere esse teste parar também. Compare a posição e o contador. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 4. Escolha o tamanho da tela

**Tarefa:** Mude largura e altura com a borda visível e termine em 480 por 270.

**Blocos na página:** video-limite-da-tela → fala-limite-da-tela → experiencia-tela.

**Zappy na página (não gravar):** Mude largura e altura com a borda visível e termine em 480 por 270.

**Experiência existente:** `stage-size`. Clique em Ligue a borda. Com a borda visível, mude a largura para 600 e a altura para 300. Observe o retângulo. Depois coloque largura 480 e altura 270. Compare com o tamanho anterior. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 5. Prepare a tela do jogo

**Tarefa:** Prepare a tela em Ao iniciar com largura 480 e altura 270.

**Blocos na página:** video-area-e-tela → fala-area-e-tela.

**Zappy na página (não gravar):** Prepare a tela em Ao iniciar com largura 480 e altura 270.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Coloque a área Ao iniciar no projeto.
- Prepare a tela de 480 por 270 dentro de Ao iniciar.

### Seção 6. Mostre o limite da tela

**Tarefa:** Confira o contorno da tela e a espessura 4.

**Blocos na página:** video-borda → fala-borda.

**Zappy na página (não gravar):** Confira o contorno da tela e a espessura 4.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Prepare a tela de 480 por 270 antes de mostrar a borda.
- Coloque Mostrar a borda da tela em Ao iniciar, com espessura 4.

### Seção 7. Escolha onde o Dino fica

**Tarefa:** Mude um eixo de cada vez e termine em x 0, y 0.

**Blocos na página:** video-coordenadas → fala-coordenadas → experiencia-coordenadas.

**Zappy na página (não gravar):** Mude um eixo de cada vez e termine em x 0, y 0.

**Experiência existente:** `coordinates`. Nesta experiência, aumente o x sem mudar o y e observe o Dino. Depois aumente o y sem mudar o x e compare as direções. Por último, coloque x em 0 e y em 0. Observe onde fica essa posição. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 8. Compare criar e mostrar

**Tarefa:** Crie o Dino nos bastidores e depois mostre-o na tela.

**Blocos na página:** video-criar-e-mostrar → fala-criar-e-mostrar → descoberta.

**Zappy na página (não gravar):** Crie o Dino nos bastidores e depois mostre-o na tela.

**Experiência existente:** `world`. Clique em Criar o Dino. Compare os bastidores com a tela do jogo. Depois clique em Mostrar o Dino na tela e compare os dois lugares novamente. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 9. Crie o Dino nos bastidores

**Tarefa:** Crie dino em x 110, y 150 e tamanho 64, abaixo da borda.

**Blocos na página:** video-criar-dino → fala-criar-dino.

**Zappy na página (não gravar):** Crie dino em x 110, y 150 e tamanho 64, abaixo da borda.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Deixe o Criar dinossauro logo abaixo da borda da tela.
- Crie o dinossauro dino em Ao iniciar: x 110, y 150 e tamanho 64.

### Seção 10. Teste e envie seu jogo

**Tarefa:** Teste o seu jogo, clique em Verificar esta parte e envie o projeto para o guia. Confirme em Enviar e clique em Concluir fase.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Zappy na página (não gravar):** Teste o seu jogo, clique em Verificar esta parte e envie o projeto para o guia. Confirme em Enviar e clique em Concluir fase.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio em Enviar para o guia confirmado em Enviar.

- Coloque a área Ao iniciar no projeto.
- Prepare a tela de 480 por 270, antes da borda.
- Mostre a borda da tela com espessura 4, antes de criar o Dino.
- Crie o dinossauro dino em Ao iniciar: x 110, y 150 e tamanho 64.

## Blocos disponíveis

| Bloco | Caminho na paleta |
| --- | --- |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto |
| Criar dinossauro em x y tamanho cor | Jogo 2D → Kits prontos → Dino |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Mostrar a borda da tela, cor espessura | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 1 na cadeia `corre-dino`. Entrada: etapa 0; saída: etapa 1 de `qa/corre-dino-etapas.ts`. Os 13 marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
