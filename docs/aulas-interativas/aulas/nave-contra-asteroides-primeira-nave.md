# Nave Contra Asteroides · Aula 1 · Faça a nave aparecer

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-nave-contra-asteroides.md).

## Resumo

- Estado de entrada: Projeto vazio, com Programação e Jogo 2D disponíveis.
- Resultado da aula: Tela 800 × 480 e nave visível em x 400, y 410, ainda parada.
- Seções: 9. Vídeos: 9.

## Diagnóstico e decisão

A primeira aula conserva jogo pronto e caderno, mas termina com a nave construída e visível. Preparação, coordenadas, criação e desenho ganham experiências e montagens curtas antes do envio.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Preparação e repetição | once-vs-always antes das áreas | Comparar a mesma ação uma vez e repetida. |
| Coordenadas | coordinates antes de criar a nave | Mudar um eixo por vez e observar a origem. |
| Criar e desenhar | world antes da criação; draw-loop antes do desenho | Separar o objeto guardado de sua imagem e observar a atualização por quadro. |

## Proposta final

### Seção 1. Jogue antes de construir

**Tarefa:** Sua vez! Jogue a versão pronta: Enter começa a partida, as setas movem a nave e a barra de espaço atira. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-abertura → fala-abertura → jogo-pronto.

**Zappy na página (não gravar):** Sua vez! Jogue a versão pronta: Enter começa a partida, as setas movem a nave e a barra de espaço atira. Quando terminar, clique em Próxima parte.

Versão completa do mesmo jogo, derivada do marco original 5. Conclusão por participação; vencer não é exigência para conhecer o jogo.

### Seção 2. Seu Mapa da Aventura

**Tarefa:** Este é o seu Mapa da Aventura! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.

**Blocos na página:** video-seu-caderno-do-aluno → fala-seu-caderno-do-aluno → caderno.

**Zappy na página (não gravar):** Este é o seu Mapa da Aventura! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.

Anexar somente `output/pdf/nave-contra-asteroides-caderno.pdf` ao bloco caderno, que aparece na tela como Mapa da Aventura: Nave Contra Asteroides. Ler aqui mesmo ou clicar em Baixar para guardar são convites e não entram na conclusão. A fala não diz que não precisa baixar ou imprimir: soa como uma ordem para não fazer.

### Seção 3. Compare uma vez e sempre

**Tarefa:** Sua vez! Faça os dois testes e fique de olho no contador Ações feitas. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-uma-vez-e-sempre → fala-uma-vez-e-sempre → experiencia-areas.

**Zappy na página (não gravar):** Sua vez! Faça os dois testes e fique de olho no contador Ações feitas. Quando terminar, clique em Próxima parte.

**Experiência existente:** `once-vs-always`. Nesta experiência, coloque Mover a nave um pouquinho em Ao iniciar. Clique em Começar o jogo e espere o teste parar. Observe a nave e o contador Ações feitas. Leve a mesma peça para Enquanto estiver rodando. Clique em Começar o jogo e espere esse teste parar também. Compare a nave e o contador nas duas tentativas. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 4. Prepare a tela do jogo

**Tarefa:** Agora prepare a tela do seu jogo! Monte Ao iniciar e Enquanto estiver rodando, coloque a tela de 800 por 480 e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Blocos na página:** video-montar-areas-tela → fala-montar-areas-e-tela.

**Zappy na página (não gravar):** Agora prepare a tela do seu jogo! Monte Ao iniciar e Enquanto estiver rodando, coloque a tela de 800 por 480 e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Coloque Ao iniciar.
- Coloque Enquanto estiver rodando.
- Deixe a tela de 800 × 480 em Ao iniciar.

### Seção 5. Escolha onde a nave aparece

**Tarefa:** Sua vez! Mude x e y, um de cada vez, e depois coloque os dois em zero. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-coordenadas → fala-coordenadas → experiencia-coordenadas.

**Zappy na página (não gravar):** Sua vez! Mude x e y, um de cada vez, e depois coloque os dois em zero. Quando terminar, clique em Próxima parte.

**Experiência existente:** `coordinates`. Aumente x sem mudar y e observe a nave. Depois aumente y sem mudar x. Por último, coloque x e y em zero e observe o canto da tela. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 6. Compare criar e mostrar

**Tarefa:** Sua vez! Crie a nave, mostre a nave na tela e compare os bastidores com a tela do jogo. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-criar-e-mostrar → fala-criar-e-mostrar → experiencia-criar-mostrar.

**Zappy na página (não gravar):** Sua vez! Crie a nave, mostre a nave na tela e compare os bastidores com a tela do jogo. Quando terminar, clique em Próxima parte.

**Experiência existente:** `world`. Nesta experiência, clique em Criar a nave. Compare os bastidores com a tela do jogo. Depois clique em Mostrar a nave na tela e compare os dois lugares novamente. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 7. Crie a nave nos bastidores

**Tarefa:** Agora crie a sua nave! Coloque Criar nave em Ao iniciar, com x 400 e y 410, e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Blocos na página:** video-criar-nave → fala-criar-nave.

**Zappy na página (não gravar):** Agora crie a sua nave! Coloque Criar nave em Ao iniciar, com x 400 e y 410, e clique em Verificar esta parte. Depois, clique em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte.

- Crie nave em x 400, y 410, largura 54 e altura 62, em Ao iniciar.
- Deixe a tela de 800 × 480 em Ao iniciar.

### Seção 8. Compare o desenho no começo e em cada quadro

**Tarefa:** Sua vez! Compare desenhar só no começo, a cada quadro e com a limpeza ligada, avançando os quadros em cada teste. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-desenho-por-quadro → fala-desenho-por-quadro → experiencia-quadro.

**Zappy na página (não gravar):** Sua vez! Compare desenhar só no começo, a cada quadro e com a limpeza ligada, avançando os quadros em cada teste. Quando terminar, clique em Próxima parte.

**Experiência existente:** `draw-loop`. Na experiência, deixe Desenhar a nave em Só no começo. Clique em Avançar 1 quadro algumas vezes. Compare a imagem com o x mostrado na faixa. Troque para A cada quadro e avance alguns quadros novamente. Por último, ligue Limpar a tela antes e avance mais quadros. Compare os três jeitos. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 9. Mostre a nave a cada quadro

**Tarefa:** Agora faça a sua nave aparecer! Coloque o desenho da nave dentro de A cada quadro do jogo, clique em Verificar esta parte e envie o seu projeto. Depois, clique em Concluir fase.

**Blocos na página:** video-motor-e-nave → fala-motor-e-nave → projeto.

**Zappy na página (não gravar):** Agora faça a sua nave aparecer! Coloque o desenho da nave dentro de A cada quadro do jogo, clique em Verificar esta parte e envie o seu projeto. Depois, clique em Concluir fase.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte, com o envio confirmado em Enviar meu projeto → Enviar.

- Crie nave em x 400, y 410, largura 54 e altura 62, em Ao iniciar.
- Coloque A cada quadro do jogo em Enquanto estiver rodando.
- Desenhe o sprite nave dentro de A cada quadro do jogo.
- Deixe a tela de 800 × 480 em Ao iniciar.

## Blocos disponíveis

| Bloco | Caminho na paleta |
| --- | --- |
| 🔁 Enquanto estiver rodando | 🗂️ Áreas do projeto |
| ⚙️ Ao iniciar | 🗂️ Áreas do projeto |
| Criar nave em x y largura altura , cor do corpo cor das asas | Jogo 2D → Kits prontos → Espaço |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 1 na cadeia `nave-contra-asteroides`. Entrada: etapa 0; saída: etapa 1 de `qa/nave-contra-asteroides-etapas.ts`. Os cinco marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
