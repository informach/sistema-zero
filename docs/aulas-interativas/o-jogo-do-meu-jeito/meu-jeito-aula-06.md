# O Jogo do Meu Jeito · Aula 6 · Coloque sua nave animada no jogo

Fonte editorial: `qa/meu-jeito.conteudo.json`. Gerador: `qa/gerar-meu-jeito.ts`. Consulte [o mapa do curso](modulos.md).

## Resumo

- Entrada: Cópia do jogo da aula 1 e duas artes animadas salvas no Pinta.
- Resultado: Jogo com nave autoral animada e asteroides originais, mantendo as regras.
- Seções: 7. Vídeos: 7.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

Trazer uma imagem, criar o sprite, preparar a folha e iniciar a animação ganham resultados próprios. A troca do criador é feita numa mesma aplicação; não se transforma a exclusão do bloco em uma aula de erro fabricado. A folha entra no fim do Ao iniciar, como no programa de referência.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Nomes de sprite e folha | Experiência unique-names antes dos novos blocos. | Evita apagar o nome procurado ou usar o mesmo nome para preparações diferentes. |
| Folha, quadro e tamanho no jogo | Experiência sheet-vs-sprite antes da troca de criador. | Separa o recorte 32 × 32 do tamanho 54 × 54. |
| Trazer arte, criar e animar | Aplicações separadas na mesma cópia. | Cada bloco ganha um propósito observável; regras anteriores continuam. |

## Proposta final

### Seção 1. Separe os nomes que os blocos procuram

**Tarefa / Zappy na página:** Sua vez! Tire o bloco, troque o nome e veja quando os avisos aparecem. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-nomes → fala-nomes → experimento-nomes.

**Experiência existente:** `unique-names`. Clique em Tempo para a nave voar na prévia. Clique em Tirar este bloco e observe os avisos. Clique em Pôr de volta. Em Nome do bloco de baixo, escolha nave e compare os avisos. Depois escolha folha-nave. Sem palpite, pistas ou pergunta final.

### Seção 2. Traga seus desenhos para o projeto

**Tarefa / Zappy na página:** Agora traga os seus desenhos para o jogo! Adicione nave e asteroide aos materiais da cópia do seu jogo. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

**Blocos na página:** video-trazer-artes → fala-trazer-artes.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-trazer-artes-K1: Dedé substitui “Já trouxe os desenhos. Eles já vão aparecer?”. Antes: “e a janela de materiais. Se uma arte não estiver na lista, volte ao Pinta e confira se ela ficou guardada na sua conta.”. Depois: “Agora clique na prévia e toque na tecla Enter para começar uma partida. Tá vendo? Os desenhos ainda são os antigos. As”.

**Aplicação no Estúdio:** o roteiro começa pela retomada de uma experiência desta aula e inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Esta parte registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 3. Separe o quadro do tamanho no jogo

**Tarefa / Zappy na página:** Sua vez! Mude a Largura do recorte até aparecer uma nave inteira. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-recorte → fala-recorte → experimento-recorte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-recorte-K1: Dedé substitui “Posso deixar a nave maior no jogo sem mudar o recorte?”. Antes: “Depois escolho o Quadro 2, e aparece a nave com o fogo grande. São esses dois quadros que vão se revezar na animação.”. Depois: “Agora eu mudo tamanho no jogo para 80. Repare: a nave do jogo fica maior, e o recorte continua 32 por 32. É que o”.

**Experiência existente:** `sheet-vs-sprite`. Coloque Largura do recorte em 64 e observe a nave. Mude para 16 e depois para 32. Com 32, escolha os quadros 1 e 2. Mude tamanho no jogo para 80 e confira se o recorte continua 32 por 32. Sem palpite, pistas ou pergunta final.

### Seção 4. Use sua imagem no criador da nave

**Tarefa / Zappy na página:** Agora use a sua imagem no criador da nave! Troque o criador por um sprite com imagem, conservando o nome nave. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

**Blocos na página:** video-trocar-nave → fala-trocar-nave.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-trocar-nave-K1: Dedé substitui “O bloco novo já está preenchido. E o antigo?”. Antes: “54 e imagem nave. A altura agora é 54, igual à largura, porque o seu desenho é quadrado e assim ele não fica esticado.”. Depois: “Agora clique com o botão direito apenas no Criar nave antigo e escolha Apagar este bloco. Depois encaixe o novo criador”.

**Aplicação no Estúdio:** o roteiro começa pela retomada de uma experiência desta aula e inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Esta parte registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 5. Prepare o recorte da nave

**Tarefa / Zappy na página:** Agora prepare o recorte da sua nave! Carregue folha-nave com quadros de 32 por 32 no fim de Ao iniciar. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

**Blocos na página:** video-folha-nave → fala-folha-nave.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-folha-nave-K1: Dedé substitui “Que nome eu dou para essa folha?”. Antes: “da imagem com quadros de x px. Encaixe esse bloco no fim da pilha Ao iniciar, depois dos blocos que já estavam ali.”. Depois: “No nome da folha, escreva folha-nave, um nome só dela, como na experiência da primeira parte desta aula. Na imagem,”.

**Aplicação no Estúdio:** o roteiro começa pela retomada de uma experiência desta aula e inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Esta parte registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 6. Ligue a animação voando

**Tarefa / Zappy na página:** Agora ligue a animação voando! Anime nave com folha-nave e confira os dois quadros no jogo. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

**Blocos na página:** video-animar-nave → fala-animar-nave.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-animar-nave-K1: Dedé substitui “No Pinta era um e dois. Por que aqui é zero e um?”. Antes: “voando. Repare nos valores que chegam preenchidos: do quadro 0 ao 1, a 8 fps, que quer dizer 8 quadros por segundo.”. Depois: “O Pinta mostra os desenhos como 1 e 2, mas o bloco começa a contagem em 0, por isso usa 0 e 1. Agora clique na prévia e”.

**Aplicação no Estúdio:** o roteiro inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Esta parte registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 7. Envie o jogo com sua nave

**Tarefa / Zappy na página:** Hora de enviar o seu jogo com a sua nave! Confira se a nave aparece inteira, com a sua imagem e o fogo pulsando. Depois clique em Escolher no Estúdio, selecione o cartão do seu jogo e clique em Enviar (1). Quando aparecer Recebido!, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → entrega-galeria-v6.

**Aplicação no Estúdio:** o roteiro inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Conclusão exige vídeo e recebimento da entrega pela galeria.

## Continuidade e produção

Os oito slugs e a chave de entrega `entrega-galeria-v6` são preservados. Aula 5 recebe duas artes; as demais recebem um trabalho. A galeria guarda a cópia enviada. Não criar workspace embutido nem aplicar projectChecks a um projeto externo.

O programa de referência permanece em `qa/meu-jeito-projetos-qa.ts`; as etapas e artes de demonstração ficam em `qa/meu-jeito-etapas.ts`. Usar Programação e Jogo 2D já trazidos com o projeto de Nave Contra Asteroides. Não acrescentar HTML/CSS nem instalar extensão em um projeto vazio só para cumprir uma tarefa.

A ordem vídeo → Zappy → atividade não configura sozinha o bloqueio: conferir videoBeforeActivity no curso durante a importação. Gravar os clipes, vincular o PDF, testar com perfil de aluno e ensaiar com crianças antes de declarar o percurso validado.
