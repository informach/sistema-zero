# O Jogo do Meu Jeito · Aula 6 · Coloque sua nave animada no jogo

Fonte editorial: `qa/meu-jeito.conteudo.json`. Gerador: `qa/gerar-meu-jeito.ts`. Consulte [o mapa do curso](modulos.md).

## Resumo

- Entrada: Cópia do jogo da aula 1 e duas artes animadas salvas no Pinta.
- Resultado: Jogo com nave autoral animada e asteroides originais, mantendo as regras.
- Seções: 7. Vídeos: 7.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Dedé substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

Trazer uma imagem, criar o sprite, preparar a folha e iniciar a animação ganham resultados próprios. A troca do criador é feita numa mesma aplicação; não se transforma a exclusão do bloco em uma aula de erro fabricado. A folha entra no fim do Ao iniciar, como no programa de referência.

**Revisão de 02/11/2026 (decisões da responsável: experiência só com a ideia, convite à investigação e didática da aula inteira). A folha é apresentada antes de ser usada; nomes e recorte viraram exploração livre (o bloco pode ser nomeado, porque é o conceito). As montagens dizem "É este bloco que…" e o zero do bloco é explicado. Revisão independente de 02/11/2026: o botão é "Abrir meu Estúdio"; as montagens abrem o jogo no Estúdio antes da partida; a retomada do criador da nave lembra a experiência dos nomes; o tamanho da nave no jogo vem antes da pergunta do Dedé; os campos do criador saem em frases curtas, com o que já vem no bloco.**

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Nomes de sprite e folha | Experiência unique-names antes dos novos blocos. | Evita apagar o nome procurado ou usar o mesmo nome para preparações diferentes. |
| Folha, quadro e tamanho no jogo | Experiência sheet-vs-sprite antes da troca de criador. | Separa o recorte 32 × 32 do tamanho 54 × 54. |
| Trazer arte, criar e animar | Aplicações separadas na mesma cópia. | Cada bloco ganha um propósito observável; regras anteriores continuam. |

## Proposta final

### Seção 1. Separe os nomes que os blocos procuram

**Tarefa / Zappy na página:** Sua vez! Investigue o que acontece com os blocos quando um nome falta ou se repete. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-nomes → fala-nomes → experimento-nomes.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-nomes-K1: Dedé substitui “E se a nave e a folha tiverem o mesmo nome?”. Antes: “acham cada coisa pelo nome dela. Imagina um time com duas pessoas que têm o mesmo nome, e o técnico chama esse nome.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o que acontece com os blocos quando o”.

**Experiência em exploração livre:** `unique-names`, com `setup.freeExploration`. Compare os avisos dos blocos e a prévia quando falta o bloco que cria a nave e quando a folha recebe outro nome, inclusive o nome nave. O Zappy te mostra o que testar, e você pode repetir quando quiser. Três pistas, do que observar até a sequência; sem palpite nem pergunta final.

### Seção 2. Traga seus desenhos para o projeto

**Tarefa / Zappy na página:** Agora traga os seus desenhos para o jogo! Adicione nave e asteroide aos materiais da cópia do seu jogo. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

**Blocos na página:** video-trazer-artes → fala-trazer-artes.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-trazer-artes-K1: Dedé substitui “Já trouxe os desenhos. Eles já vão aparecer no jogo?”. Antes: “e a janela de materiais. Se uma arte não estiver na lista, volte ao Pinta e confira se ela ficou guardada na sua conta.”. Depois: “Clique na prévia e toque na tecla Enter para começar uma partida. Tá vendo? Os desenhos ainda são os antigos, porque”.

**Aplicação no Estúdio:** o roteiro começa pela retomada de uma experiência desta aula e inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Esta parte registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 3. Separe o quadro do tamanho no jogo

**Tarefa / Zappy na página:** Sua vez! Investigue qual recorte mostra uma nave inteira e o que o tamanho no jogo muda. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-recorte → fala-recorte → experimento-recorte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-recorte-K1: Dedé substitui “E se o recorte for maior ou menor que um desenho?”. Antes: “pedaço da cartela. Tem mais uma medida: o tamanho da nave no jogo, que diz se a nave aparece grande ou pequena na tela.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar qual recorte mostra uma nave inteira e”.

**Experiência em exploração livre:** `sheet-vs-sprite`, com `setup.freeExploration`. Ache o recorte que mostra uma nave inteira e compare o jogo e a folha quando o tamanho da nave no jogo muda. O Zappy te mostra o que testar, e você pode repetir quando quiser. Três pistas, do que observar até a sequência; sem palpite nem pergunta final.

### Seção 4. Use sua imagem no criador da nave

**Tarefa / Zappy na página:** Agora use a sua imagem no criador da nave! Troque o criador por um sprite com imagem, conservando o nome nave. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

**Blocos na página:** video-trocar-nave → fala-trocar-nave.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-trocar-nave-K1: Dedé substitui “O bloco novo já está preenchido. E o antigo?”. Antes: “coloque 54. A altura agora é 54, igual à largura, porque o seu desenho é quadrado e assim ele não fica esticado.”. Depois: “Agora o Criar nave antigo sai. Clique com o botão direito só nele e escolha Apagar este bloco. Se apagar outra peça sem”.

**Aplicação no Estúdio:** o roteiro começa pela retomada de uma experiência desta aula e inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Esta parte registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 5. Prepare o recorte da nave

**Tarefa / Zappy na página:** Agora prepare o recorte da sua nave! Carregue folha-nave com quadros de 32 por 32 no fim de Ao iniciar. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

**Blocos na página:** video-folha-nave → fala-folha-nave.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-folha-nave-K1: Dedé substitui “Que nome eu dou para essa folha?”. Antes: “quadros da imagem com quadros de x px. Encaixe esse bloco no fim de Ao iniciar, depois dos blocos que já estavam ali.”. Depois: “Um nome só dela: folha-nave, como na experiência da primeira parte desta aula. Escreva folha-nave no nome da folha. Na”.

**Aplicação no Estúdio:** o roteiro começa pela retomada de uma experiência desta aula e inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Esta parte registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 6. Ligue a animação voando

**Tarefa / Zappy na página:** Agora ligue a animação voando! Anime nave com folha-nave e confira os dois quadros no jogo. Quando aparecer Salvo, volte a esta aba e clique em Próxima parte.

**Blocos na página:** video-animar-nave → fala-animar-nave.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-animar-nave-K1: Dedé substitui “No Pinta era um e dois. Por que aqui é zero e um?”. Antes: “voando. Repare nos valores que chegam preenchidos: do quadro 0 ao 1, a 8 fps. Fps quer dizer quadros por segundo.”. Depois: “É que o bloco começa a contar do zero. Por isso, o quadro 0 é o desenho que o Pinta chama de quadro 1, e o quadro 1 é o”.

**Aplicação no Estúdio:** o roteiro inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Esta parte registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.

### Seção 7. Envie o jogo com sua nave

**Tarefa / Zappy na página:** Hora de enviar o seu jogo com a sua nave! Confira se a nave aparece inteira, com a sua imagem e o fogo pulsando. Depois clique em Escolher no Estúdio, selecione o cartão do seu jogo e clique em Enviar (1). Quando aparecer Recebido!, clique em Concluir aula.

**Blocos na página:** video-entrega → fala-entrega → entrega-galeria-v6.

**Aplicação no Estúdio:** o roteiro inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. Conclusão exige vídeo e recebimento da entrega pela galeria.

## Continuidade e produção

Os oito slugs e a chave de entrega `entrega-galeria-v6` são preservados. Aula 5 recebe duas artes; as demais recebem um trabalho. A galeria guarda a cópia enviada. Não criar workspace embutido nem aplicar projectChecks a um projeto externo.

O programa de referência permanece em `qa/meu-jeito-projetos-qa.ts`; as etapas e artes de demonstração ficam em `qa/meu-jeito-etapas.ts`. Usar Programação e Jogo 2D já trazidos com o projeto de Nave Contra Asteroides. Não acrescentar HTML/CSS nem instalar extensão em um projeto vazio só para cumprir uma tarefa.

A ordem vídeo → Zappy → atividade não configura sozinha o bloqueio: conferir videoBeforeActivity no curso durante a importação. Gravar os clipes, vincular o PDF, testar com perfil de aluno e ensaiar com crianças antes de declarar o percurso validado.
