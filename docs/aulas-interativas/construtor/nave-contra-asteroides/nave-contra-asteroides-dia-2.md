# Nave Contra Asteroides · Aula 3 · Faça a nave atirar

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Nave com setas, limpeza, bordas e estrelas; mesmo resultado do primeiro marco original.
- Resultado da aula: Tiros saem da nave, sobem, têm som e são retirados do grupo ao sair da tela.
- Seções: 8. Vídeos: 8.

**Produção:** a professora grava toda a fala principal. Na montagem kids, Debinha substitui somente os trechos da tabela, com a mesma frase e sem voz sobreposta. O master funciona sozinho no adulto. Notas e recados da página não são gravados. [Direção de voz e edição](../../../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md).

## Diagnóstico e decisão

O evento é ensinado no próprio projeto. Duas experiências cobrem informações invisíveis: ler a posição no disparo e retirar objetos que não aparecem mais.

**Revisão de 02/11/2026.** As experiências passaram à exploração livre com o Zappy (`setup.freeExploration`): trabalham só a ideia, sem blocos, áreas do Estúdio nem código; o vídeo explica a ideia com uma analogia curta e convida a investigar, sem sequência de cliques e sem contar o resultado; a pergunta do avatar que anteciparia a descoberta vira "O que você acha? Isso você vai testar na experiência."; instrução, ponte, metas (`goalCopy`) e três pistas usam os botões reais da tela livre. Toda fala foi revista: uma ideia por fala, explicação separada do gesto, montagens que começam pelo "Tá vendo?" no jogo, retomam a experiência e ligam cada bloco à ideia ("É este bloco que…"). O Na tela segue a receita da ESPEC-ROTEIRO §9.8. A montagem do disparo (652 palavras) virou duas partes: criar-tiro (o evento da barra de espaço com o som, logo depois da experiência do evento) e tiro-da-nave (id novo: o grupo, o tiro lendo o lugar da nave e a velocidade, logo depois das experiências do número lido e da direção). A ordem das partes mudou para cada montagem vir logo depois da sua experiência; os ids existentes ficam. O vídeo de cada experiência segue o molde do Cadê (02/11/2026, decisão da responsável): o conceito, uma analogia curta, o nome no jogo dela, a pergunta do avatar devolvida à criança e um convite de uma frase; sem tour pelos controles nem roteiro de testes, que ficam com o Zappy dentro da experiência.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Evento | once-vs-always com tiro antes do disparo | Comparar espera pela tecla e repetição automática. |
| Posição lida | fixed-vs-read antes da origem do tiro | Comparar número fixo e posição atual da nave. |
| Velocidade vertical | velocity antes de vx e vy | Observar o sinal e a mudança do y. |
| Grupo e limpeza | cleanup antes da retirada | Distinguir sair da tela de sair do grupo. |

## Proposta final

### Seção 1. Quando sai o tiro?

**Tarefa:** Sua vez! Investigue em que momento o tiro sai em cada jeito. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-tecla-e-repeticao → fala-tecla-e-repeticao → experiencia-tres-areas.

**Recado na página (não gravar):** Sua vez! Investigue em que momento o tiro sai em cada jeito. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-tecla-e-repeticao-K1: Debinha substitui “E se o tiro sair sempre, em todo quadro?”. Antes: “e sempre, em todo quadro. Agora tem um terceiro jeito: na hora em que algo acontece, como alguém tocar numa tecla.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar em que momento o tiro sai em cada um”.

**Experiência em exploração livre:** `once-vs-always` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/once-vs-always.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/once-vs-always.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare quando o tiro sai em cada um dos três jeitos, com a tecla e sem a tecla. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Escolha Na hora em que algo acontece, clique em Começar o jogo e deixe o jogo terminar sem clicar em Apertar a tecla. Observe os tiros. Com Na hora em que algo acontece escolhido, clique em Apertar a tecla durante o jogo e observe os tiros. Escolha Sempre, em todo quadro, clique em Começar o jogo e observe os tiros.

**Pistas, do aberto ao direto:** 1) Observe quantos tiros saem e em que momento cada um aparece. 2) Compare o jeito Na hora em que algo acontece, com a tecla e sem a tecla, com o jeito Sempre, em todo quadro. 3) Escolha Na hora em que algo acontece e clique em Começar o jogo sem clicar em mais nada. Depois clique em Apertar a tecla. Por último, escolha Sempre, em todo quadro, e clique em Começar o jogo. Sem palpite e sem pergunta final.

### Seção 2. Faça a barra de espaço disparar

**Tarefa:** Agora faça a barra de espaço disparar! Crie a área Quando acontecer, coloque a tecla barra de espaço com o som do tiro e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-criar-tiro → fala-criar-tiro.

**Recado na página (não gravar):** Agora faça a barra de espaço disparar! Crie a área Quando acontecer, coloque a tecla barra de espaço com o som do tiro e clique em Verificar projeto. Depois, clique em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Em Quando acontecer, coloque Quando apertar a tecla: barra de espaço.
- Toque um efeito no mesmo evento de disparar com Espaço.

### Seção 3. Onde o tiro nasce?

**Tarefa:** Sua vez! Investigue onde o tiro nasce quando a nave muda de lugar. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-escrito-e-lido → fala-escrito-e-lido → experiencia-escrito-e-lido.

**Recado na página (não gravar):** Sua vez! Investigue onde o tiro nasce quando a nave muda de lugar. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-escrito-e-lido-K1: Debinha substitui “E se a nave mudar de lugar, o tiro vai junto?”. Antes: “que diga onde ele nasce. Ele também pode ter um número escrito uma vez ou um número lido da nave na hora do tiro.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar onde o tiro nasce quando a nave muda de”.

**Experiência em exploração livre:** `fixed-vs-read` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/fixed-vs-read.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/fixed-vs-read.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare onde nascem os tiros com o número escrito e com o número lido da nave, com a nave em lugares diferentes. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Escolha Número escrito: 400, clique em Atirar, mude a nave de lugar e atire de novo. Compare as marcas. Escolha Número lido da nave, clique em Atirar, mude a nave de lugar e atire de novo. Compare as marcas. Com o número lido, clique em Mostrar as marcas da nave e atire. Observe de onde o tiro sai.

**Pistas, do aberto ao direto:** 1) Compare as marcas dos tiros depois de mudar a nave de lugar. 2) Faça o mesmo teste com o número escrito e com o número lido da nave. 3) Escolha Número escrito: 400, clique em Atirar, clique em Direita e atire de novo. Depois escolha Número lido da nave e repita. Por último, clique em Mostrar as marcas da nave e atire. Sem palpite e sem pergunta final.

### Seção 4. Para que lado o tiro anda?

**Tarefa:** Sua vez! Investigue o que o número da velocidade faz com o tiro e com o y. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-direcao-do-tiro → fala-direcao-do-tiro → experiencia-direcao.

**Recado na página (não gravar):** Sua vez! Investigue o que o número da velocidade faz com o tiro e com o y. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-direcao-do-tiro-K1: Debinha substitui “E com um número negativo, o tiro vai para onde?”. Antes: “cada quadro, e para que lado. E a velocidade pode ser um número positivo ou um número negativo, com o sinal de menos.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar para que lado o tiro anda, e o que”.

**Experiência em exploração livre:** `velocity` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/velocity.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/velocity.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare para que lado o tiro anda e o que acontece com o y com um número negativo e com um número positivo na velocidade. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Escolha um número negativo, como −9, clique em Avançar 1 quadro algumas vezes e observe o tiro e o y. Escolha um número positivo, como 9, clique em Avançar 1 quadro algumas vezes e observe o tiro e o y.

**Pistas, do aberto ao direto:** 1) Observe o número do y em cada quadro. 2) Compare o tiro e o y com um número negativo e com um número positivo. 3) Escolha −9 e clique em Avançar 1 quadro algumas vezes. Depois escolha 9 e avance outros quadros. Sem palpite e sem pergunta final.

### Seção 5. Faça o tiro nascer na nave

**Tarefa:** Agora faça o tiro nascer na nave! Crie o grupo tiros e o tiro na barra de espaço, lendo o lugar da nave, e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-tiro-da-nave → fala-tiro-da-nave.

**Recado na página (não gravar):** Agora faça o tiro nascer na nave! Crie o grupo tiros e o tiro na barra de espaço, lendo o lugar da nave, e clique em Verificar projeto. Depois, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-tiro-da-nave-K1: Debinha substitui “E a altura de onde sai o tiro?”. Antes: “lugar do número. Nesse bloco, escolha nave. É este bloco que lê, na hora do tiro, o meio da nave, de um lado ao outro.”. Depois: “O y também vai ler a nave. Deixe à vista o 100 do campo y do tiro. Na mesma categoria Posição e tamanho, pegue o bloco”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Crie o grupo tiros em Ao iniciar.
- Dentro de Espaço, crie o tiro usando centro x e posição y da nave.
- No evento Espaço, crie o tiro a partir da nave, para cima, e toque um efeito.
- Mantenha apenas um comando de criar tiro.

### Seção 6. Mova e desenhe os tiros

**Tarefa:** Agora faça os tiros voarem! Mova e desenhe o grupo tiros em cada quadro, atire de dois lugares e clique em Verificar projeto. Depois, clique em Próxima parte.

**Blocos na página:** video-tiros-voam → fala-tiros-voam.

**Recado na página (não gravar):** Agora faça os tiros voarem! Mova e desenhe o grupo tiros em cada quadro, atire de dois lugares e clique em Verificar projeto. Depois, clique em Próxima parte.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto.

- Mova o grupo tiros a cada quadro.
- Desenhe o grupo tiros a cada quadro.

### Seção 7. O tiro saiu da tela. E do jogo?

**Tarefa:** Sua vez! Investigue o que acontece com o tiro que passa da borda da tela. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Blocos na página:** video-tiro-fora-da-tela → fala-tiro-que-sai-da-tela → experiencia-faxina.

**Recado na página (não gravar):** Sua vez! Investigue o que acontece com o tiro que passa da borda da tela. Você escolhe a ordem dos testes, e o Zappy sugere o que observar. Quando terminar, clique em Próxima parte.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-tiro-fora-da-tela-K1: Debinha substitui “E quando o tiro some da tela, ele sai do grupo também?”. Antes: “é a lista de tiros que o jogo guarda e move em todo quadro. Quando um tiro passa da borda de cima, ele some da tela.”. Depois: “O que você acha? Isso você vai testar na experiência. Agora você vai investigar o grupo de tiros quando o jogo tira do”.

**Experiência em exploração livre:** `cleanup` (`setup.freeExploration`), tela `packages/member-shell/src/components/scene-livre/cleanup.tsx` e falas do Zappy em `packages/core/src/learning/scene/guia-livre/cleanup.ts`. A experiência trabalha só a ideia, sem blocos, áreas do Estúdio nem código; os blocos ficam para a montagem.

**Instrução:** Compare o grupo de tiros quando o jogo tira quem sai da tela e quando não tira. Você escolhe a ordem e pode repetir quando quiser.

**O que investigar (metas, em qualquer ordem):** Sem tirar ninguém do jogo, clique em Passar 1 segundo até dois tiros saírem da tela e observe o grupo. Clique em Tirar do jogo quem sai da tela e passe o tempo até mais dois tiros saírem. Compare o grupo.

**Pistas, do aberto ao direto:** 1) Observe a tela, os bastidores e o número de tiros no grupo. 2) Compare o grupo quando o jogo tira quem sai da tela e quando não tira. 3) Clique em Passar 1 segundo até dois tiros saírem. Depois clique em Tirar do jogo quem sai da tela e passe o tempo até mais dois saírem. Sem palpite e sem pergunta final.

### Seção 8. Retire os tiros que saíram

**Tarefa:** Agora limpe o grupo dos tiros! Coloque a limpeza entre mover e desenhar os tiros, teste os disparos, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.

**Blocos na página:** video-faxina → fala-faxina → projeto.

**Recado na página (não gravar):** Agora limpe o grupo dos tiros! Coloque a limpeza entre mover e desenhar os tiros, teste os disparos, clique em Verificar projeto e envie o seu projeto. Depois, clique em Concluir aula.

**Participação no vídeo:** A professora grava toda a fala. Substituições kids, sem sobrepor vozes:

video-faxina-K1: Debinha substitui “Qual grupo eu escolho aqui?”. Antes: “do grupo quem sair da tela. Arraste e solte logo abaixo de Mover os sprites do grupo tiros, quando aparecer o encaixe.”. Depois: “O grupo de quem sai da tela: os tiros. No grupo, escolha tiros. Repare que o bloco também tem a palavra chamado,”.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar projeto, com o envio confirmado em Enviar meu projeto → Enviar.

- Crie uma única nave em Ao iniciar, com posição dentro da tela e tamanho positivo.
- Crie o grupo tiros em Ao iniciar.
- Toque um efeito no mesmo evento de disparar com Espaço.
- No evento Espaço, crie o tiro a partir da nave, para cima, e toque um efeito.
- Mantenha apenas um comando de criar tiro.
- Mova tiros antes de limpar o grupo.
- Retire os tiros que saem e depois desenhe esse grupo.
- Desenhe o grupo tiros a cada quadro.

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
| Desenhar o grupo | Jogo 2D → Grupos → Desenho e ordem |
| Desenhar o sprite | Jogo 2D → Sprites → Criar e trocar aparência |
| Quando apertar a tecla | Jogo 2D → Controles → Teclado, ações e toque |
| Tocar efeito | Jogo 2D → Som → Efeitos prontos |
| Tirar do grupo quem sair da tela, para cada um (chamado ) | Jogo 2D → Grupos → Participação e limpeza |
| Preparar o jogo em tela cheia, tela × , fundo | Jogo 2D → Jogo e telas → Preparar a área do jogo |
| Criar tiro no grupo em x y raio cor vx vy | Jogo 2D → Grupos → Criar e percorrer |
| a posição y do sprite | Jogo 2D → Movimento → Posição e tamanho |
| Desenhar fundo de estrelas (velocidade ) | Jogo 2D → Cenários → Fundos |
| A cada quadro do jogo | Jogo 2D → Tempo → Quadros e intervalos |
| Mover os sprites do grupo usando suas velocidades | Jogo 2D → Grupos → Movimento |
| Número | Programação → 🔣 Valores |

## Continuidade e produção

Aula 3 na cadeia `nave-contra-asteroides`. Entrada: etapa 2; saída: etapa 3 de `qa/nave-contra-asteroides-etapas.ts`. Os cinco marcos originais e o código do jogo permanecem preservados.

A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.
