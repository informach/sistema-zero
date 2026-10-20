<!-- Versão adulta gerada por docs/aulas-interativas-tecnico/qa/adulto/gerar-adulto.ts a partir de kids/nave-contra-asteroides/nave-contra-asteroides-dia-2.md e de qa/adulto/traducoes/nave-contra-asteroides/nave-contra-asteroides-dia-2.json. Não edite este arquivo: edite a tradução e gere de novo. -->

# Nave Contra Asteroides · Aula 3 · Faça a nave atirar

Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](modulos.md).

## Resumo

- Estado de entrada: Nave com setas, limpeza, bordas e estrelas; mesmo resultado do primeiro marco original.
- Resultado da aula: Tiros saem da nave, sobem, têm som e são retirados do grupo ao sair da tela.
- Seções: 7. Vídeos: 7.

**Vozes e gravação:** Só a professora fala nos vídeos; não há avatar nem mascote. O recado da página é texto, sem personagem e sem voz no vídeo. A versão adulta ainda não foi gravada.

## Diagnóstico e decisão

O evento é ensinado no próprio projeto. Duas experiências cobrem informações invisíveis: ler a posição no disparo e retirar objetos que não aparecem mais.

## Triagem dos conceitos

| Conceito | Como e quando trabalhar | Razão |
| --- | --- | --- |
| Evento | once-vs-always com tiro antes do disparo | Comparar espera pela tecla e repetição automática. |
| Posição lida | fixed-vs-read antes da origem do tiro | Comparar número fixo e posição atual da nave. |
| Velocidade vertical | velocity antes de vx e vy | Observar o sinal e a mudança do y. |
| Grupo e limpeza | cleanup antes da retirada | Distinguir sair da tela de sair do grupo. |

## Proposta final

### Seção 1. Compare esperar a tecla e repetir tiros

**Tarefa:** Sua vez: compare Criar um tiro em Quando acontecer e em Enquanto estiver rodando. No primeiro teste, espere parar e só depois clique em Apertar a tecla. Quando terminar, clique em Próxima seção.

**Blocos na página:** video-tecla-e-repeticao → fala-tecla-e-repeticao → experiencia-tres-areas.

**Recado na página (não gravar):** Sua vez: compare Criar um tiro em Quando acontecer e em Enquanto estiver rodando. No primeiro teste, espere parar e só depois clique em Apertar a tecla. Quando terminar, clique em Próxima seção.

**Experiência existente:** `once-vs-always`. Coloque Criar um tiro em Quando acontecer. Clique em Começar o jogo e espere o teste parar, sem clicar em Apertar a tecla. Observe o contador de tiros. Depois clique em Apertar a tecla e observe de novo. Leve Criar um tiro para Enquanto estiver rodando. Clique em Começar o jogo e espere o teste parar. Compare com o primeiro teste. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 2. Faça o tiro acompanhar a nave

**Tarefa:** Sua vez: atire de dois lugares com cada opção de x e depois ligue Marcas da caixa e atire de novo. Quando terminar, clique em Próxima seção.

**Blocos na página:** video-escrito-e-lido → fala-escrito-e-lido → experiencia-escrito-e-lido.

**Recado na página (não gravar):** Sua vez: atire de dois lugares com cada opção de x e depois ligue Marcas da caixa e atire de novo. Quando terminar, clique em Próxima seção.

**Experiência existente:** `fixed-vs-read`. Com O número 400, atire, mude x da nave e atire de novo. Repita com O centro x da nave. Depois ligue Marcas da caixa e atire mais uma vez, mantendo O centro x da nave. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 3. Compare a direção do tiro

**Tarefa:** Sua vez: compare -9 e 9 em velocidade para baixo, avançando os quadros e olhando o y. Quando terminar, clique em Próxima seção.

**Blocos na página:** video-direcao-do-tiro → fala-direcao-do-tiro → experiencia-direcao.

**Recado na página (não gravar):** Sua vez: compare -9 e 9 em velocidade para baixo, avançando os quadros e olhando o y. Quando terminar, clique em Próxima seção.

**Experiência existente:** `velocity`. Na experiência, mantenha velocidade para o lado em 0. Coloque velocidade para baixo em -9 e clique em Avançar 1 quadro algumas vezes. Observe o tiro e o y. Troque velocidade para baixo para 9 e avance outros quadros. Compare a direção e o y nos dois testes. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 4. Monte o disparo da barra de espaço

**Tarefa:** Agora faça a sua nave atirar. Crie o grupo tiros, monte o disparo da barra de espaço e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Blocos na página:** video-criar-tiro → fala-criar-tiro.

**Recado na página (não gravar):** Agora faça a sua nave atirar. Crie o grupo tiros, monte o disparo da barra de espaço e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Crie o grupo tiros em Ao iniciar.
- Em Quando acontecer, coloque Quando apertar a tecla: barra de espaço.
- Dentro de Espaço, crie o tiro usando centro x e posição y da nave.
- Toque um efeito no mesmo evento de disparar com Espaço.
- No evento Espaço, crie o tiro a partir da nave, para cima, e toque um efeito.
- Mantenha apenas um comando de criar tiro.

### Seção 5. Mova e desenhe os tiros

**Tarefa:** Agora faça os tiros voarem. Mova e desenhe o grupo tiros em cada quadro, atire de dois lugares e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Blocos na página:** video-tiros-voam → fala-tiros-voam.

**Recado na página (não gravar):** Agora faça os tiros voarem. Mova e desenhe o grupo tiros em cada quadro, atire de dois lugares e clique em Verificar esta etapa. Depois, clique em Próxima seção.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa.

- Mova o grupo tiros a cada quadro.
- Desenhe o grupo tiros a cada quadro.

### Seção 6. O tiro saiu da tela. E do grupo?

**Tarefa:** Sua vez: deixe dois tiros saírem com a limpeza desligada, depois ligue a regra e compare o grupo. Quando terminar, clique em Próxima seção.

**Blocos na página:** video-tiro-fora-da-tela → fala-tiro-que-sai-da-tela → experiencia-faxina.

**Recado na página (não gravar):** Sua vez: deixe dois tiros saírem com a limpeza desligada, depois ligue a regra e compare o grupo. Quando terminar, clique em Próxima seção.

**Experiência existente:** `cleanup`. Use Tempo para soltar o tempo se estiver parado. Com Tirar do grupo quem sair da tela desligado, deixe dois tiros saírem e observe o grupo. Depois ligue a regra, deixe o tempo passar novamente e compare. Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.

### Seção 7. Retire os tiros que saíram

**Tarefa:** Agora limpe o grupo dos tiros. Coloque a limpeza entre mover e desenhar os tiros, teste os disparos, clique em Verificar esta etapa e envie o seu projeto ao professor. Depois, clique em Concluir aula.

**Blocos na página:** video-faxina → fala-faxina → projeto.

**Recado na página (não gravar):** Agora limpe o grupo dos tiros. Coloque a limpeza entre mover e desenhar os tiros, teste os disparos, clique em Verificar esta etapa e envie o seu projeto ao professor. Depois, clique em Concluir aula.

**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa, com o envio confirmado em Enviar para o professor → Enviar.

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

A ordem vídeo → recado → atividade é editorial. Configurar videoBeforeActivity no curso adulto e conferir com um perfil adulto; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos adultos, anexar o PDF do Caderno do Aluno quando existir e ensaiar com adultos antes de declarar o percurso validado.
