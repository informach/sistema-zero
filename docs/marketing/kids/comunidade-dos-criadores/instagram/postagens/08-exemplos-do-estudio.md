# Exemplos do Estúdio para o calendário

**Atualização de 13/10/2026:** a reescrita trocou a maior parte dos exemplos por outros mais variados, de todas as extensões do Estúdio. O catálogo está na [vitrine de exemplos](14-vitrine-de-exemplos.md), e o que capturar em cada postagem está na linha **Produção** da ficha. A seleção de 11 bases abaixo fica como registro.

**12/10/2026.** A seleção parte da habilidade e da situação da família. São 11 bases de quatro extensões, citadas nas fichas deste ciclo. P27 trata de contratação, sem demonstração; P32, P33 e P41 usam apenas os relatos reais. P34 e P35 separam o depoimento e a demonstração da equipe. A ficha de cada post determina se a captura entra na arte, no vídeo ou apenas como exemplo na legenda. Os extras podem usar cursos existentes; E03 usa Corre Dino.

A copy pública continua nas fichas. Este mapa serve à equipe que prepara as demonstrações. Os exemplos ilustram possibilidades de criação; não são anunciados como cursos disponíveis. A Chave do Farol permanece nos conteúdos que explicam ou oferecem o Desafio.

## Catálogo e finalidade

| Exemplo | Extensão | Posts | Habilidade mostrada |
| --- | --- | --- | --- |
| Jogo da Memoria | Jogo 2D Avançado | P09, P21, P26, P43, P60 | Organizar regras e explicar o que acontece em cada situação. |
| Quiz de números | Jogo 2D | P05 | Escrever instruções claras e considerar a dúvida de quem lê. |
| Meu Mundo | Mundo 3D | P01, P14, P31, P47, P54 | Fazer escolhas próprias sobre um espaço e explicar seus motivos. |
| Fazenda Feliz | Jogo 2D | P02, P06, P13, P24, P42, P56 | Organizar etapas e retomar uma construção. |
| Quebra-blocos | Jogo 2D Avançado | P10, P25, P30, P34, P36, P38, P45, P55 | Comparar o efeito de uma escolha e considerar quem vai jogar. |
| Pong | Jogo 2D | P08, P12, P18, P48, P50, P51 | Mostrar uma dificuldade, explicar controles e testar uma reação. |
| Mini plataforma | Jogo 2D | P04, P07, P16, P17, P23, P28, P37, P39, P49, P53, P57 | Construir uma primeira parte e investigar uma mudança. |
| Aventura do Herói | Jogo 2D | P03, P11, P19, P35, P52, P58 | Transformar uma ideia de história em objetivo e ações. |
| Cobrinha | Jogo 2D Avançado | P15, P22, P29, P46, P59 | Adaptar regras conhecidas e entender decisões por trás de um jogo. |
| Corrida Maluca | Jogo 3D | P40, P44 | Dar instruções precisas e usar números para representar o que aconteceu. |
| Atravesse a Rua | Jogo 3D | P20 | Criar obstáculos pensando nas possibilidades de quem joga. |

## Regras e cenas a preparar

As fontes abaixo foram lidas no catálogo e nos projetos locais. Essa conferência confirma a base escolhida; não substitui executar e gravar a cena antes de produzir as outras mídias.

### Jogo da Memoria

- **Fonte:** [game-2d-advanced/examples/jogoDaMemoriaExample.ts](../../../../../../packages/studio/src/official-extensions/game-2d-advanced/examples/jogoDaMemoriaExample.ts).
- **Regra conferida:** Virar duas cartas; iguais permanecem, diferentes desviram.
- **Preparação:** Captar duas cartas diferentes voltando e duas iguais permanecendo. São três pares na base; nova quantidade é adaptação.

### Quiz de números

- **Fonte:** [game-2d/examples/textGames.ts](../../../../../../packages/studio/src/official-extensions/game-2d/examples/textGames.ts).
- **Regra conferida:** Perguntas, três alternativas e avanço após responder.
- **Preparação:** A base é um quiz de números com três alternativas. Texto de outro tema precisa ser preparado e conferido; não anunciar um curso novo.

### Meu Mundo

- **Fonte:** [world-3d/examples.ts](../../../../../../packages/studio/src/official-extensions/world-3d/examples.ts).
- **Regra conferida:** Cenário explorável com objetos, terreno e caminho.
- **Preparação:** Captar objetos e caminho em 3D. Separar a base do cenário personalizado pela equipe.
- **P01 produzido em 13/10/2026:** adaptação com terreno plano, malha de estradas e moedas, executada no runtime oficial. Capturas em partida, com vistas de cinema e de cima. [Registro da captura e alterações](../producao/postagens/p01-uma-ideia-dele/apoio/captura-real.json) · [Código da demonstração](../producao/postagens/p01-uma-ideia-dele/apoio/meu-mundo-variante.js). Não é projeto atribuído a um aluno.

### Fazenda Feliz

- **Fonte:** [game-2d/examples/clearcode/fazendaFeliz.ts](../../../../../../packages/studio/src/official-extensions/game-2d/examples/clearcode/fazendaFeliz.ts).
- **Regra conferida:** Plantar, esperar crescimento e colher. Não incluir rega ou loja da versão avançada.
- **Preparação:** Usar a versão básica: plantar, crescimento por tempo e colher. Não acrescentar rega, loja ou inventário que não pertencem a esta base.

### Quebra-blocos

- **Fonte:** [game-2d-advanced/examples/quebraBlocosExample.ts](../../../../../../packages/studio/src/official-extensions/game-2d-advanced/examples/quebraBlocosExample.ts).
- **Regra conferida:** Bola, rebote na raquete, blocos e velocidade. Variantes precisam ser preparadas.
- **Preparação:** Preparar duas velocidades ou dois contrastes e manter o restante igual. Não inventar um botão para mudar a velocidade.
- **P34 produzido em 13/10/2026:** duas variantes executadas com o runtime oficial, alterando apenas a velocidade inicial da bola. Capturas no mesmo intervalo de meio segundo, com posições registradas e rastros acrescentados na montagem para facilitar a leitura. [Registro da execução](../producao/postagens/p34-a-ideia-veio-dele/apoio/captura-real.json) · [Fontes e adaptações](../producao/postagens/p34-a-ideia-veio-dele/apoio/fontes.md). A legenda separa a demonstração do relato de Daniel sobre Rafael.

### Pong

- **Fonte:** [game-2d/examples/clearcode/pong.ts](../../../../../../packages/studio/src/official-extensions/game-2d/examples/clearcode/pong.ts).
- **Regra conferida:** Raquete controlada por setas; disputa até cinco pontos.
- **Preparação:** Registrar a base funcionando. Em P06, criar separadamente uma versão sem a reação esperada da bola; não apresentar o exemplo original como defeituoso. A partida vai até cinco pontos.

### Mini plataforma

- **Fonte:** [game-2d/examples/foundations.ts](../../../../../../packages/studio/src/official-extensions/game-2d/examples/foundations.ts).
- **Regra conferida:** Andar e pular com gravidade. Novos destinos ou obstáculos são adaptações.
- **Preparação:** A base demonstra movimento e pulo com gravidade. Para P16, preparar a plataforma de destino e o ajuste mostrado; não fingir que toda essa cena já vem no exemplo.

### Aventura do Herói

- **Fonte:** [game-2d/examples/clearcode/aventuraHeroi.ts](../../../../../../packages/studio/src/official-extensions/game-2d/examples/clearcode/aventuraHeroi.ts).
- **Regra conferida:** Explorar cenário, cortar mato e enfrentar guardiões. Novo enredo é adaptação.
- **Preparação:** O projeto existente tem exploração, corte de mato e guardiões. Outro enredo ou final é adaptação a construir, não recurso já conferido nem curso anunciado.

### Cobrinha

- **Fonte:** [game-2d-advanced/examples/cobrinhaExample.ts](../../../../../../packages/studio/src/official-extensions/game-2d-advanced/examples/cobrinhaExample.ts).
- **Regra conferida:** Mover, comer maçãs, crescer; fim ao bater na parede ou no corpo.
- **Preparação:** Captar maçã, crescimento e fim ao tocar parede ou corpo. Mudanças de velocidade ou área precisam de duas versões preparadas.

### Corrida Maluca

- **Fonte:** [game-3d/examples.ts](../../../../../../packages/studio/src/official-extensions/game-3d/examples.ts).
- **Regra conferida:** Acelerar, frear e contar voltas completas.
- **Preparação:** Mostrar aceleração, freio e voltas completas. Não tratar a pontuação como contagem de qualquer objeto. Em P40 e P44, captar apenas os comandos e a contagem descritos nas fichas.

### Atravesse a Rua

- **Fonte:** [game-3d/examples.ts](../../../../../../packages/studio/src/official-extensions/game-3d/examples.ts).
- **Regra conferida:** Atravessar uma grade desviando de carros e caminhões.
- **Preparação:** Captar deslocamento na grade e carros/caminhões. Novas posições ou ritmos são adaptações a testar para preservar uma passagem possível.

## Acesso, autoria e uso na copy

O catálogo de exemplos não é liberado de forma geral para crianças por padrão. A [regra de visibilidade](../../../../../../packages/studio/src/studio/examples-visibility.ts) exige ativação explícita pelo host, como no playground de testes. Não instruir a família a abrir a galeria completa nem prometer acesso a todos esses projetos. A demonstração editorial usa o ambiente de produção da equipe.

Uma captura de exemplo, uma adaptação feita pela equipe e um projeto de aluno são fontes diferentes. Não usar um exemplo como comprovação do que Rafael, Jeffrey, André, Débora ou Fernando construiu. Relatos permanecem ligados aos registros autorizados.

Quando for necessário mudar um jogo para explicar uma ideia, preparar a variação, executar, observar e só então captar. A ficha indica o que muda; não redesenhar uma interface inexistente nem gerar uma captura fictícia. Diagramas editoriais podem explicar uma regra e devem ter aparência de diagrama, como os esquemas de regras do Jogo da Memoria.

## Relação entre situação, habilidade e jogo

- **P11:** uma aventura grande precisa de uma primeira parte. A criança escolhe uma cena e aprende a construir uma ação antes de acrescentar outras.
- **P13:** uma tarefa com várias etapas pede uma ordem. Na fazenda, plantar prepara o crescimento e a colheita; a sequência precisa funcionar.
- **P36:** mudar tudo dificulta saber o que resolveu. No Quebra-blocos, comparar duas velocidades com o restante igual permite enxergar o efeito da mudança.
- **P38:** escolher envolve explicar um motivo. Duas versões de contraste permitem conversar sobre o que facilita acompanhar a bola.
- **P44:** a contagem ganha sentido quando representa uma ação. Na corrida, uma volta completa altera o placar conforme a regra.
- **P48:** um resultado na tela vem de regras definidas por alguém. No Pong, a criança pode conferir quando um ponto deve ser acrescentado. Isso não comprova aprendizagem de checagem de fontes ou IA.

O jogo serve à explicação. Não trocar apenas o cenário de um argumento repetido nem prometer transferência automática da habilidade para outras situações. A matriz completa de necessidades está em [Cobertura](12-mapa-cobertura.md).
