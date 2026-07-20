# Auditoria completa da extensão Jogo 2D — 2026-07-20

## Resultado executivo

Os **15 achados** desta auditoria foram corrigidos: um P0, quatro P1, oito P2 e
dois P3. Cinco correções eram de experiência pedagógica e visual; as outras dez
tratavam comportamento do runtime, arquitetura, tipagem e documentação.

A paleta permanece extensa por decisão de produto: são 190 definições de bloco
(189 visíveis e uma legada oculta). A seleção do conteúdo apresentado continua
sendo responsabilidade do perfil de aprendizagem e de cada aula.

A correção técnica desta auditoria foi publicada como **Jogo 2D 0.34.0**. O
manifesto vigente está em **0.35.0** após as correções posteriores de lifecycle.
Não há achados abertos no escopo desta revisão.

## Escopo revisado

- 41 arquivos próprios da extensão;
- 190 definições de blocos e 24 subcategorias;
- 188 métodos e valores públicos em `window.SZGame2D`;
- dez fragmentos que compõem o runtime injetado;
- definição → Blockly → IR → JavaScript → parser → workspace state;
- manifesto, permissões, documentação do aluno e contexto da IA;
- 14 exemplos, assets, classificação pedagógica e execução no Chromium;
- ciclo de vida, pausa, reinício, câmera, grupos, colisões, áudio, DPR,
  segurança, desempenho e tratamento de erros;
- testes da extensão e integrações externas de Blockly/parser.

## Situação dos achados

| Prioridade | Achado | Situação |
|---|---|---|
| P0 | Geometria lógica confundida com backing store em DPR alto | Corrigido |
| P1 | Pausa não congelava o tempo lógico e efeitos autônomos | Corrigido |
| P1 | `pruneOffscreen` ignorava a posição da câmera | Corrigido |
| P1 | Erros de callbacks infantis eram engolidos | Corrigido |
| P1 | `A cada N quadros` aparecia com soquete vazio | Corrigido |
| P2 | Mesmo grupo gerava autoc colisões e pares duplicados | Corrigido |
| P2 | Asteroide da borda não seguia realmente ao centro | Corrigido |
| P2 | Contrato público validava nomes, mas não assinaturas | Corrigido |
| P2 | Reinício conhecia o estado privado de todos os domínios | Corrigido |
| P2 | Toolbox usava áreas do projeto como taxonomia | Corrigido |
| P2 | Rótulos misturavam posicionamento e semântica | Corrigido |
| P2 | Foco do canvas dependia do outline do navegador | Corrigido |
| P2 | Texto acessível tornava o bloco de preparação pesado | Corrigido |
| P3 | Sorteio “inteiro” aceitava limites fracionários | Corrigido |
| P3 | Guia interno continha versão e limite de docs antigos | Corrigido |

### Revisão de combinações — 0.34.0

Uma segunda passagem sobre combinações do runtime corrigiu mais oito pontos:

- todos os helpers de borda, chão, ponteiro e sorteio usam o viewport da câmera;
- imagem e animação substituem corretamente uma figura anterior do sprite;
- eventos de inimigo derrotado coexistem e isolam apenas o callback defeituoso;
- imagens assíncronas não apagam nem cobrem o cenário enquanto carregam;
- colisão grupo × grupo mantém custo O(N×M), inclusive com remoções no callback;
- o contrato de imagem representa `img` nulo, falha, URL e fonte vazia;
- um bloco `Ao iniciar` defeituoso é removido também antes de um reinício;
- a recarga de N quadros volta a ficar pronta exatamente após N chamadas.

O campo infantil `objetivo e controles` foi removido dos dois blocos
`Preparar`. O runtime continua atribuindo ao canvas uma descrição interna
automática, sem exigir que a criança aprenda acessibilidade nesta etapa.

## Correções técnicas

### P0 — Geometria lógica e backing store

`drawTileMap`, `createStickHero` e `createBalloon` deixaram de usar
`canvas.width/height` como coordenadas do jogo. A geometria agora passa por
`stageW(ctx)` e `stageH(ctx)`; o tamanho físico do canvas fica reservado para
nitidez, transformação e limpeza.

O comportamento foi coberto no runtime real com palco lógico 800×480 e DPR 2 e
3. Tilemap, Equilibrista e Balão mantêm o mundo lógico, enquanto o backing store
é multiplicado pelo DPR. O Playwright também exerce os três exemplos em DPR 1,
2 e 3 e confirma primeiro frame, controles, acessibilidade e dimensões físicas.

### P1 — Pausa congela a partida inteira

O runtime ganhou um relógio monotônico de jogo que desconta o período pausado.
Temporizadores, animações e demais consumidores de `now()` deixam de avançar
durante a pausa.

Os domínios podem registrar hooks de `pause` e `resume`. Música e tremor de tela
suspendem seus agendamentos, preservam o estado e retomam do ponto correto. As
ações deliberadamente disponíveis para sair da pausa, como teclado e ponteiro,
continuam funcionando.

Há regressões específicas para:

- `everySeconds` não vencer durante a pausa;
- animação não saltar quadros;
- tremor não continuar em RAF independente;
- música não avançar por `setTimeout` enquanto o jogo está congelado.

### P1 — Remoção fora da tela respeita a câmera

`pruneOffscreen` calcula agora o viewport no espaço do mundo:
`camera.x..camera.x+stageW` e `camera.y..camera.y+stageH`. Com câmera em (0,0), o
comportamento anterior é preservado. Os quatro lados foram cobertos com câmera
deslocada.

### P1 — Uma única fronteira para erros do aluno

Callbacks compostos de grupos, colisões, figuras e inimigos não capturam mais a
exceção do código infantil antes do driver. O erro sobe até a raiz responsável,
que diagnostica uma vez e remove somente o handler culpado. Outros loops seguem
rodando.

Uma regressão executa uma exceção dentro de `forEachInGroup`, por sua vez dentro
de um loop raiz: o handler defeituoso roda uma vez, o saudável continua e apenas
um diagnóstico pedagógico é emitido.

### P2 — Colisão do grupo consigo mesmo

Quando os dois argumentos representam o mesmo grupo, `overlapGroups` percorre
somente pares distintos e não ordenados. Um sprite não colide consigo mesmo e o
par A/B não é repetido como B/A. O snapshot da coleção também evita que remoções
durante o callback corrompam a iteração.

### P2 — Trajetória do asteroide

O asteroide é criado primeiro e sua velocidade é calculada a partir do centro
real do sprite recém-posicionado até o centro lógico do palco. O vetor é
normalizado e multiplicado pela velocidade pedida. A regressão verifica
magnitude, produto vetorial e sentido do vetor.

### P2 — Contrato público tipado

`runtimeContract.ts` deixou de reduzir 188 membros a
`(...args: unknown[]) => unknown`. A API foi dividida em contratos explícitos de
ciclo de vida, palco, sprites, física, áudio, matemática/estado, entrada/movimento,
mundo, HUD/cenas e kits.

Estruturas compartilhadas — sprite, grupo, tilemap, inimigo, spritesheet,
animação e estados dos kits — têm tipos próprios. A lista de chaves continua
funcionando como inventário exato, e a cobertura reversa impede um membro tipado
de ficar fora dela.

### P2 — Reset por domínio

Cada fragmento com estado registra seu próprio hook por
`_registerRuntimeDomain`. O `restart` apenas chama `_resetRuntimeDomains()` e
reinicia o ciclo de vida; ele não conhece mais variáveis privadas de áudio,
input, partículas, câmera, mapas, inimigos ou kits.

O teste de arquitetura exige o registro nos oito domínios com estado e impede
que o orquestrador volte a manipular esse estado diretamente.

### P3 — Sorteio inteiro

`randomBetween` normaliza os limites com `ceil(min)` e `floor(max)`, troca pontas
invertidas e devolve sempre um inteiro dentro do intervalo inclusivo. Quando não
existe inteiro entre limites fracionários, usa explicitamente o inteiro mais
próximo do ponto médio. Tooltip e manual descrevem o mesmo contrato.

### P3 — Fonte de verdade da documentação interna

A seção de Jogo 2D 0.23.0 em `CLAUDE.md` está identificada como registro
histórico. A versão vigente aparece como 0.35.0, e o limite de documentação é
obtido do schema em `src/extensions/manifest.ts` (`MAX_DOCS_CHARS = 60_000`), sem
manter um segundo teto divergente no guia.

## Correções de experiência e pedagogia

### Soquete de `A cada N quadros`

O input `N` recebeu sombra numérica 30 tanto na toolbox quanto na restauração de
sombras. A criança vê e pode editar a cadência; o fallback do IR não precisa mais
mascarar um bloco visualmente incompleto.

### Taxonomia por assunto

As três áreas de comportamento continuam sendo `Ao iniciar`, `Quando acontecer`
e `Enquanto estiver rodando` no workspace. Na toolbox, os blocos foram distribuídos pelos assuntos
`Controles`, `Colisões` e `Tempo e repetição`, coerentes com as demais categorias.

### Rótulos curtos e semânticos

Instruções como `Dentro de “A cada quadro”` saíram da face dos blocos. O local de
uso fica em tooltip, manual e aulas. A linguagem agora distingue:

- eventos reais: `Quando apertar...`, `Quando clicar...`, `Quando ... começar a
  encostar...`;
- varreduras contínuas: `Para cada colisão entre...` e `Para cada tiro que
  acertar...`;
- configuração: `Animação do sprite no estado...`.

### Foco intencional do canvas

O palco usa um seletor próprio: remove o outline externo padrão e mostra um
indicador interno em `:focus-visible`. O canvas continua focável e acessível por
teclado sem alterar tamanho ou criar barras.

### Metadados automáticos dos blocos de preparação

Os facilitadores não pedem mais `objetivo e controles`. O runtime cria uma
descrição interna a partir do título do projeto e continua alimentando
`aria-label`, `aria-describedby` e os anúncios de cenas sem expor esse conceito
à criança iniciante.

## Pontos aprovados e preservados

- **Paleta e pedagogia:** catálogo global extenso, com seleção por aula e perfil;
- **Pipeline:** os blocos atravessam definição, Blockly, IR, geração, runtime,
  parser e reconstrução;
- **Campos semânticos:** sprites, grupos, mapas, imagens e animações usam pickers;
- **Ciclo de vida:** preparação, eventos e loops têm áreas próprias e múltiplas
  raízes coexistem;
- **Exemplos:** 14 cartões classificados, com objetivo/controles e primeiro frame;
- **Acessibilidade:** canvas nomeado, descrição associada, foco e anúncio de cena;
- **Segurança:** sem `eval`, `new Function`, scripts remotos ou armazenamento
  próprio no bootstrap;
- **Namespace:** blocos `sz_g2d_`, API `SZGame2D` e conflitos declarados;
- **Limites:** grupos, partículas e catch-up do scheduler continuam protegidos.

## Evidência de verificação

### Ciclo vermelho → verde

As regressões novas reproduziram 14 falhas antes das correções: DPR dos kits,
tilemap em DPR alto, pausa de temporizador/animação/música/tremor, câmera,
callback aninhado, mesmo grupo, asteroide, sorteio fracionário e os dois guardas
arquiteturais de reset. Depois das alterações, os mesmos cenários passaram.

### Resultado após todas as correções

- **Regressões focadas desta revisão:** 301 aprovados, 0 falhas, 1.172
  asserções, nove arquivos;
- **Suíte completa do Studio:** 4.331 aprovados, 0 falhas, 41.833 asserções,
  293 arquivos;
- **Contrato público:** compilação TypeScript isolada aprovada e inventário
  exato das 188 chaves aprovado;
- **TypeScript global:** `tsc --noEmit` aprovado;
- **Biome global:** 682 arquivos aprovados, sem correções pendentes;
- **Chromium:** 25 cenários aprovados — todos os exemplos introdutórios,
  geometria em DPR 1, 2 e 3, viewport estreito e reabertura do projeto.

## Conclusão

Todos os achados desta auditoria foram resolvidos sem reduzir a paleta. O runtime
agora separa coordenadas lógicas da resolução física, trata pausa e reinício como
responsabilidades de domínio, mantém erros do aluno numa fronteira única e expõe
um contrato TypeScript verificável. A experiência dos blocos permanece curta e
organizada por assunto, deixando posicionamento e sequência para documentação e
aulas.
