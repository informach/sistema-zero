# Corre, Dino! · Aula 1 · Prepare a tela e crie o Dino

Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Projeto vazio, com Programação e Jogo 2D disponíveis.
- Resultado da aula: Tela 480 × 270, borda 4 e Dino criado em (110, 150), tamanho 64, ainda sem desenho.
- Seções: 10. Vídeos: 10.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

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

**Tarefa:** Sua vez! Jogue a versão pronta e pule os cactos com a barra de espaço, a seta para cima ou um toque na parte de cima da tela. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-abertura → fala-apresentacao → jogo-pronto.

**Recado na página (não gravar):** Sua vez! Jogue a versão pronta e pule os cactos com a barra de espaço, a seta para cima ou um toque na parte de cima da tela. Quando terminar, clique em Próxima parte.

Versão completa do mesmo jogo, derivada do marco original 13. Conclusão por participação; vencer não é exigência para conhecer o jogo.

### Seção 2. Seu passo a passo do projeto

**Tarefa:** Este é o seu Passo a passo do projeto! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.

**Blocos na página:** video-caderno → fala-caderno → caderno.

**Recado na página (não gravar):** Este é o seu Passo a passo do projeto! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.

Anexar somente `docs/aulas-interativas/corre-dino/passo-a-passo-do-projeto.pdf` ao bloco caderno. Ler, baixar e imprimir são opcionais; não entram na conclusão.

### Seção 3. Compare uma vez e sempre

**Tarefa:** Sua vez! Coloque a mesma peça em Ao iniciar e depois em Enquanto estiver rodando, começando um teste em cada uma. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-uma-vez-e-sempre → fala-uma-vez-e-sempre → experiencia-uma-vez-e-sempre.

**Recado na página (não gravar):** Sua vez! Coloque a mesma peça em Ao iniciar e depois em Enquanto estiver rodando, começando um teste em cada uma. Quando terminar, clique em Próxima parte.

**Experiência existente:** `once-vs-always`. Nesta experiência, coloque Mover o Dino um pouquinho em Ao iniciar. Clique em Começar o jogo e espere o teste parar. Observe a posição e o contador da ação. Leve a mesma peça para Enquanto estiver rodando. Clique em Começar o jogo e espere esse teste parar também. Compare a posição e o contador. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 4. Escolha o tamanho da tela

**Tarefa:** Sua vez! Ligue a borda, mude a largura e a altura e termine com a tela em 480 por 270. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-limite-da-tela → fala-limite-da-tela → experiencia-tela.

**Recado na página (não gravar):** Sua vez! Ligue a borda, mude a largura e a altura e termine com a tela em 480 por 270. Quando terminar, clique em Próxima parte.

**Experiência existente:** `stage-size`. Clique em Ligue a borda. Com a borda visível, mude a largura para 600 e a altura para 300. Observe o retângulo. Depois coloque largura 480 e altura 270. Compare com o tamanho anterior. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 5. Prepare a tela do jogo

**Tarefa:** Agora prepare a tela do seu jogo! Coloque Ao iniciar no projeto e, dentro dela, a tela de 480 por 270. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-area-e-tela → fala-area-e-tela.

**Recado na página (não gravar):** Agora prepare a tela do seu jogo! Coloque Ao iniciar no projeto e, dentro dela, a tela de 480 por 270. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Coloque a área Ao iniciar no projeto.
- Prepare a tela em Ao iniciar, com o mundo de 480 por 270 usado neste curso.

### Seção 6. Mostre o limite da tela

**Tarefa:** Agora mostre onde a tela do seu jogo acaba! Coloque Mostrar a borda da tela logo abaixo da preparação, com espessura 4. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-borda → fala-borda.

**Recado na página (não gravar):** Agora mostre onde a tela do seu jogo acaba! Coloque Mostrar a borda da tela logo abaixo da preparação, com espessura 4. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-borda-K1: Debinha substitui “Qual cor vai aparecer melhor?”. Antes: “Jogo e telas e depois Preparar a área do jogo, pegue o bloco Mostrar a borda da tela e solte logo abaixo da preparação.”. Depois: “Deixe a espessura em 4 e escolha uma cor que apareça sobre o azul, como branco, porque, com duas cores parecidas, a”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Prepare a tela em Ao iniciar, com o mundo de 480 por 270 usado neste curso.
- Coloque a borda da tela com espessura positiva.

### Seção 7. Escolha onde o Dino fica

**Tarefa:** Sua vez! Mude só o x, depois só o y, e termine com o Dino em x 0 e y 0. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-coordenadas → fala-coordenadas → experiencia-coordenadas.

**Recado na página (não gravar):** Sua vez! Mude só o x, depois só o y, e termine com o Dino em x 0 e y 0. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-coordenadas-K1: Debinha substitui “E para fazer ele descer?”. Antes: “Quando eu aumento só o x, para 300, o Dino vai para a direita, e o y continua igual. O x conta de um lado para o outro.”. Depois: “Quando eu aumento só o y, para 200, o Dino desce. Isso pode surpreender: no jogo, y maior leva para baixo, porque o y”.

**Experiência existente:** `coordinates`. Nesta experiência, aumente o x sem mudar o y e observe o Dino. Depois aumente o y sem mudar o x e compare as direções. Por último, coloque x em 0 e y em 0. Observe onde fica essa posição. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 8. Compare criar e mostrar

**Tarefa:** Sua vez! Clique em Criar o Dino, depois em Mostrar o Dino na tela, e compare os bastidores com a tela do jogo. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-criar-e-mostrar → fala-criar-e-mostrar → descoberta.

**Recado na página (não gravar):** Sua vez! Clique em Criar o Dino, depois em Mostrar o Dino na tela, e compare os bastidores com a tela do jogo. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-criar-e-mostrar-K1: Debinha substitui “Como eu faço ele aparecer?”. Antes: “ele aparece nos bastidores, mas a tela do jogo continua vazia. O Dino já existe no jogo. Ele só não foi desenhado.”. Depois: “Quando eu clico em Mostrar o Dino na tela, o mesmo Dino aparece na tela do jogo. Mostrar não cria outro Dino: desenha”.

**Experiência existente:** `world`. Clique em Criar o Dino. Compare os bastidores com a tela do jogo. Depois clique em Mostrar o Dino na tela e compare os dois lugares novamente. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.

### Seção 9. Crie o Dino nos bastidores

**Tarefa:** Agora crie o seu Dino! Coloque Criar dinossauro logo abaixo da borda, com x 110, y 150 e tamanho 64. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Blocos na página:** video-criar-dino → fala-criar-dino.

**Recado na página (não gravar):** Agora crie o seu Dino! Coloque Criar dinossauro logo abaixo da borda, com x 110, y 150 e tamanho 64. Depois, clique em Verificar projeto e, em seguida, em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-criar-dino-K1: Debinha substitui “Escolhi a cor, mas cadê o Dino?”. Antes: “chega com x 120: troque por 110. O y já vem 150 e o tamanho, 64: mantenha os dois. Depois, escolha a cor do seu Dino.”. Depois: “Vamos conferir. Ele foi criado, mas ainda falta mandar desenhar. Confira se ficou assim: dentro de Ao iniciar, primeiro”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Coloque a borda antes de criar o Dino, com espessura positiva.
- Crie o dinossauro dino em Ao iniciar, com posição dentro da tela e tamanho positivo.

### Seção 10. Teste e envie seu jogo

**Tarefa:** Hora de conferir e enviar o seu jogo! Confira a tela, a borda e o Dino, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → projeto.

**Recado na página (não gravar):** Hora de conferir e enviar o seu jogo! Confira a tela, a borda e o Dino, clique em Verificar projeto e depois em Enviar meu projeto. Confirme em Enviar e, quando o envio terminar, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio em Enviar meu projeto confirmado em Enviar.

- Coloque a área Ao iniciar no projeto.
- Prepare a tela em Ao iniciar, com o mundo de 480 por 270 usado neste curso.
- Coloque a borda da tela com espessura positiva.
- Crie o dinossauro dino em Ao iniciar, com posição dentro da tela e tamanho positivo.

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
