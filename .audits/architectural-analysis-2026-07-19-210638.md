# Full review — extensão Jogo 2D

Data: 19 de julho de 2026  
Escopo: `packages/studio/src/official-extensions/game-2d` e os contratos compartilhados diretamente usados pela extensão.  
Natureza: auditoria somente leitura; nenhum código de produto foi alterado.

## Veredito

A extensão está funcionalmente muito mais sólida do que a versão que motivou as
revisões anteriores: o ciclo de vida das três áreas funciona, o reinício é em
memória, os eventos são deduplicados, os 14 cartões abrem no Chromium em largura
normal e todo o pipeline IR/Blockly/JavaScript passa.

Ela ainda não deve ser considerada encerrada para gravação definitiva dos cursos.
Há dois achados altos: as orientações sobre as três áreas se contradizem em quatro
fontes e a automação não percorre a promessa de 12 dos 14 exemplos exatos. Também
há problemas pedagógicos, de acessibilidade, estabilidade do scheduler e
manutenibilidade.

Resumo: **0 críticos, 2 altos, 6 médios e 2 baixos**.

## Inventário auditado

- 190 blocos, sendo 189 visíveis e apenas `sz_g2d_on_start` oculto para migração.
- 23 subcategorias; todo bloco visível aparece exatamente uma vez na toolbox.
- 14 exemplos: 9 jogos, 4 demonstrações e 1 exploração.
- `runtime.ts`: 4.385 linhas, 258 funções internas e 188 chaves em `SZGame2D`.
- `blocks.ts`: 3.118 linhas.
- `examples.ts`: 3.101 linhas.
- `manifest.ts` + `ai.ts`: 53 KB adicionais de orientação duplicada.

## Achados altos

### A1. A extensão ensina duas arquiteturas de ciclo de vida incompatíveis

O contrato atual é correto: preparo em **Ao iniciar**, chapéus em **Eventos** e
raízes contínuas/periódicas em **Loop principal**. O gerador envolve as três áreas
na fábrica reiniciável `SZGame2D.onStart`, e os checks do Blockly impedem encaixes
errados.

Contudo, as superfícies que orientam criança e IA ainda dizem o contrário:

- `manifest.ts:133-136` manda pôr setup dentro de **Quando o jogo começar**, bloco
  oculto e legado.
- `blocks.ts:1553` e `blocks.ts:1565` mandam encaixar **A cada N quadros/segundos**
  dentro de **A cada quadro**, embora agora sejam raízes independentes.
- `ai.ts:148-150` descreve os temporizadores como condições dentro de `gameLoop`.
- `runtime.ts:1684-1687` preserva o mesmo modelo antigo nos comentários da API.

Impacto: a criança procura um bloco que não existe, tenta um encaixe que a trava
corretamente recusa, e a IA recebe instrução capaz de produzir uma árvore inválida.
O teste de drift só valida nomes de categorias; ele não detecta instruções
semanticamente obsoletas.

Correção recomendada: atualizar todas as superfícies e criar guardas negativas
para as frases legadas. A solução durável é gerar tooltip, resumo de IA e trechos
da documentação a partir do mesmo catálogo de `placement`, em vez de manter a
mesma regra manualmente em quatro lugares.

### A2. Os cenários de aceite não são executados para 12 dos 14 exemplos

`qaContracts.ts` descreve corretamente um cenário próprio para cada cartão, mas o
E2E genérico apenas abre o cartão, pressiona cada controle uma vez, aguarda 300 ms
e verifica primeiro frame/console (`e2e/examples-gallery.spec.ts:287-297`). Ele
não observa objetivo, pontuação, vitória/derrota, técnica prometida ou reinício.

O harness de exemplos exatos (`examplePlaythrough.test.ts`) percorre somente:

1. Pong simples;
2. Plataforma com inimigos.

Os outros 12 passam por schema e round-trip, e algumas mecânicas dos kits têm
testes isolados, mas o exemplo montado não é jogado até cumprir sua promessa. Isso
deixaria passar novamente a classe de defeito “o código promete, mas ao jogar não
acontece”.

Correção recomendada: um playthrough exato por cartão. Jogos devem alcançar
conclusão/falha e reiniciar; demos devem provar a técnica observável; Aventura com
câmera deve coletar as quatro moedas e confirmar deslocamento da câmera. Os
contratos precisam dirigir asserções, não apenas uma lista de teclas.

## Achados médios

### M1. A categoria `⏱️ Quando…` contradiz visualmente as três áreas

Em `blocks.ts:2661-2672`, a mesma categoria reúne:

- evento-raiz: tecla, clique e contato sprite × sprite;
- loop-raiz: a cada quadro, a cada N quadros e a cada N segundos;
- operação contínua de corpo de loop: contatos com grupos.

As travas de encaixe funcionam, mas a organização ensina que tudo é “Quando”. Para
uma criança iniciante, a toolbox deveria espelhar o lugar onde o bloco pode entrar.

Correção recomendada: sem esconder nem reduzir nenhum bloco, separar as raízes em
`🎯 Eventos` e `🔁 Loop principal`. Manter colisões contínuas de grupos nas
categorias temáticas correspondentes, com tooltip dizendo que pertencem ao corpo
do loop.

### M2. O scheduler transforma uma pausa normal do navegador em warning

O driver aceita no máximo cinco passos de recuperação. Uma lacuna de pouco mais de
aproximadamente 100 ms entre `requestAnimationFrame`s já descarta o acumulador e
emite “o jogo ficou muito tempo sem desenhar” (`runtime.ts:539-568`). Ao perder
foco/visibilidade, o runtime solta entradas, mas não reinicia o relógio do driver
(`runtime.ts:1505-1516`).

Evidência no Chromium:

- os 14 cartões passaram em largura normal;
- a amostra estreita de Herói que anda falhou com esse warning;
- em três repetições isoladas, uma falhou e duas passaram.

É uma condição temporal esperada — troca de aba, estabilização do iframe ou CPU
ocupada — tratada como problema do jogo. Para a criança, o diagnóstico é falso; na
automação, gera flake.

Correção recomendada: zerar `_lastDriverTime`/acumulador em suspensão e retomada,
e só diagnosticar atraso sustentado enquanto a página estiver visível. Preservar o
limite de catch-up, que é uma proteção correta contra espiral de atualizações.

### M3. Os cinco blocos mais fundamentais são os únicos sem tooltip

Os 184 demais blocos visíveis têm tooltip. Faltam justamente:

- `sz_g2d_create_sprite` (`blocks.ts:13`);
- `sz_g2d_set_position` (`blocks.ts:38`);
- `sz_g2d_set_velocity` (`blocks.ts:51`);
- `sz_g2d_collides` (`blocks.ts:64`);
- `sz_g2d_score` (`blocks.ts:76`).

Para o público totalmente iniciante, são conceitos que mais precisam explicar o
que criam, onde usar e a diferença entre posição e velocidade.

Correção recomendada: completar os cinco tooltips e adicionar uma guarda que exija
tooltip em todo bloco visível da extensão.

### M4. O canvas é focável, mas não tem nome ou alternativa acessível

`ensureStage` adiciona `tabIndex` e `touchAction` (`runtime.ts:3317-3341`), o que é
bom para teclado e toque. Não há `aria-label`, descrição textual, região de status
ou alternativa às instruções/pontuação desenhadas no canvas. Para tecnologia
assistiva, os exemplos são essencialmente uma área vazia focável.

Correção recomendada: dar nome acessível ao palco e oferecer um canal textual para
instruções e estados importantes. A descrição deve ser configurável pelo projeto;
um rótulo genérico não substitui objetivo e controles.

### M5. Três módulos monolíticos concentram mudanças demais

`runtime.ts`, `blocks.ts` e `examples.ts` somam 10.604 linhas. O runtime é um único
template literal JavaScript, portanto o TypeScript não valida suas 258 funções nem
as 188 entradas da API. `runtimeContract.ts` tipa apenas oito membros do ciclo de
vida. A varredura não encontrou helper morto nem ciclo de importação, e a cobertura
de testes compensa parte do risco, mas qualquer mudança exige navegar e revisar um
arquivo de 177 KB.

Correção recomendada: particionar por domínio (core/scheduler, sprites, input,
tilemap, grupos, áudio e cada kit) e compor o bootstrap no build; separar um arquivo
por exemplo ou família. Manter o teste de template final e criar um contrato
compilável para a API que os geradores chamam.

### M6. Documentação, IA, tooltips e comentários repetem a mesma semântica

O desvio de A1 não é casual: `manifest.ts`, `ai.ts`, `aiSummary.ts`, `blocks.ts` e
comentários do runtime descrevem independentemente onde cada operação entra. Já
há divergências de terminologia e até comentários de cor que dizem “ciano” para a
base rosa (`blocks.ts:2554-2560`).

Correção recomendada: metadados canônicos por bloco/capacidade, dos quais sejam
derivados toolbox, tooltip, tabela resumida de docs e contexto da IA. Textos
narrativos continuam manuais; regras mecânicas não.

## Achados baixos

### B1. As quatro demonstrações não mostram seus controles no preview

Herói que anda, Mini plataforma, Sala com paredes e Jogo desenhado por código
dependem das setas, mas nenhum desenha uma instrução. O texto existe apenas no
cartão da galeria, que deixa de estar visível depois da abertura do projeto.

Correção recomendada: uma linha discreta no canvas com controles e técnica a
observar. Não transformar demos em jogos nem acrescentar narrativa.

### B2. A paisagem de Aventura com câmera é semanticamente abstrata demais

O cartão promete casas e árvores, mas `examples.ts:2302-2417` representa toda a
paisagem com sprites retangulares sem forma, imagem ou rótulo. A câmera, as moedas
e a conclusão existem, porém os marcos não são visualmente inequívocos.

Correção recomendada: desenhar os mesmos poucos marcos com figuras simples ou
assets embutidos. Não ampliar o mundo; apenas tornar legível o que já é prometido.

## Matriz dos 14 exemplos

| Exemplo | Classe | Estado observado | Lacuna de aceite |
| --- | --- | --- | --- |
| Pong simples | Jogo | Fluxo exato de vitória, derrota e reinício passa | Nenhuma relevante |
| Herói que anda | Demo | Primeiro frame, assets e controles passam | Sem asserção de troca visual; warning estreito intermitente |
| Mini plataforma | Demo | Primeiro frame e controles passam | Pulo, queda e limites não são medidos no exemplo exato |
| Plataforma com inimigos | Jogo | Vitória, derrota e reinício passam | O harness força HP; não percorre combate humano completo |
| Jogo desenhado por código | Demo | Sem imagens, formas e primeiro frame passam | Coleta exata não é executada |
| Sala com paredes | Demo | Assets, tilemap e primeiro frame passam | Paredes não são testadas nas quatro direções no exemplo exato |
| Nave contra Asteroides | Jogo | Estrutura de cenas e mecânicas isoladas passam | Objetivo, derrota e novo jogo não são percorridos no fixture |
| Asteroides clássico | Jogo | Primeiro frame e controles passam | Destruição, derrota e reinício não são percorridos |
| Dino Run | Jogo | Kit e persistência gerada passam | Três obstáculos, bônus, derrota e recorde não são percorridos |
| Guerra de Gorilas | Jogo | Kit e cenas livres passam | Turnos, cratera, acerto e reinício não são percorridos no fixture |
| Guerra de Gorilas vs Robô | Jogo | IA isolada e primeiro frame passam | Resposta automática e conclusão do fixture não são afirmadas |
| Equilibrista | Jogo | Runtime do kit e primeiro frame passam | Travessia, queda e reset do exemplo não são percorridos |
| Balão | Jogo | Runtime do kit e primeiro frame passam | Combustível, colisão e reset do exemplo não são percorridos |
| Aventura com câmera | Exploração | Câmera/áudio/4 moedas existem no IR e o frame passa | Caminho completo e quatro coletas não são executados |

## Pontos sólidos confirmados

- Projetos novos podem começar sem áreas; a extensão não injeta área visível.
- As três áreas compartilham o mesmo escopo e são recriadas pela fábrica no
  reinício.
- Eventos e loops-raiz recebem checks incompatíveis e não se aninham.
- Cenas aceitam nomes livres e `ganhou1`/`ganhou2` round-trippam sem warning.
- Todos os exemplos usam IR V2, sem `rawJS`, `rawHTML` ou `rawCSS`.
- Os exemplos com imagens são autossuficientes.
- O runtime limita grupos, partículas e catch-up, deduplica warnings/eventos,
  solta entradas ao perder foco e isola erro por callback.
- Não foram encontrados ciclos de importação, helper interno claramente morto,
  dependência externa inesperada ou ampliação de permissão.
- A extensão continua com a paleta completa; nenhuma recomendação depende de
  divulgação progressiva.

## Evidência executada neste snapshot

- `bun test src/official-extensions/game-2d/__tests__`: **547 pass, 0 fail**.
- Contratos da galeria + ciclo de vida compartilhado: **94 pass, 0 fail**.
- `bun test src`: **4.124 pass, 0 fail, 35.008 asserções**.
- `bun run typecheck`: aprovado.
- `bun run check`: 637 arquivos aprovados, sem correção.
- Chromium, largura normal: **14/14 cartões aprovados**.
- Chromium, 390×844: warning de atraso; falha inicial e **1 falha em 3**
  repetições isoladas.

## Ordem recomendada de correção

1. Eliminar todas as instruções legadas e alinhar a toolbox às três áreas.
2. Criar playthrough exato para os 12 exemplos hoje não percorridos.
3. Corrigir o relógio/diagnóstico do scheduler e travar a regressão sem flake.
4. Completar tooltips, instruções no preview e acessibilidade do canvas.
5. Melhorar a leitura visual de Aventura com câmera.
6. Particionar os módulos e centralizar metadados/documentação sem mudar a API.
