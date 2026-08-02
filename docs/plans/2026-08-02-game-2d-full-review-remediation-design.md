# Design — remediação dos achados do full review do Jogo 2D

**Data:** 2026-08-02  
**Escopo:** `packages/studio`, com foco na extensão oficial `game-2d`  
**Exceção aprovada:** não alterar níveis, categorias ou quantidade de blocos exibidos no nível iniciante.

## Objetivo

Encerrar todos os demais achados do full review com correções na fronteira que possui cada invariante, preservando projetos históricos, os 31 exemplos e a API infantil da extensão.

## Decisão arquitetural

Foi escolhida uma remediação incremental completa. O runtime continuará composto por fragmentos JavaScript autocontidos, mas sua saída única seguirá submetida ao `checkJs` no CI e compartilhará uma única função para calcular os limites efetivos de hitbox. Não será feita uma reescrita integral do runtime para TypeScript neste lote, pois ela ampliaria muito o risco sem melhorar o comportamento entregue à criança.

## Runtime e entradas

- O broad phase de colisões usará os mesmos bounds efetivos do teste exato, incluindo `hitboxScale` abaixo e acima de 100%.
- Eventos de pressionar o ponteiro só nascerão no canvas do palco. Movimento e soltura continuarão globais para preservar arraste e captura após o início dentro do palco.
- IDs de extensão serão normalizados e deduplicados, preservando a primeira ordem, na fronteira comum de carregamento usada pelo preview e pelo player.
- O backing store calculará um DPR efetivo limitado por DPR máximo, dimensão máxima e orçamento total de pixels. A degradação será proporcional e avisada no máximo uma vez.
- Tilemaps manuais terão limites nomeados para texto, linhas, colunas, células e sólidos. Entradas excedentes serão truncadas de maneira determinística e gerarão um aviso didático único.

## Preview, player e API pública

- O nome explícito `renderProjectToPreviewDocAsync` será a API principal.
- `renderProjectToPreviewDoc` continuará exportado como alias assíncrono depreciado, evitando quebra de import e oferecendo uma migração clara a consumidores já atualizados para `Promise<string>`.
- Player e preview terão estados `loading`, `ready` e `error`, status acessível e proteção contra respostas assíncronas obsoletas. Ao trocar de projeto, o documento anterior poderá permanecer visível até o novo estar pronto.
- A documentação pública registrará a migração síncrono → assíncrono e o uso do novo nome.

## Descoberta dos exemplos

`ExtensionExample` ganhará metadados editoriais opcionais e compatíveis: dificuldade, conceitos, gênero, ordem recomendada e destaque. O catálogo do Jogo 2D preencherá esses dados sem alterar a IR dos exemplos.

A galeria oferecerá:

- percurso inicial destacado;
- busca por nome, descrição, gênero e conceitos;
- filtro por dificuldade e tipo de experiência;
- opção explícita para ver todos os exemplos.

## Tipagem e manutenção

O teste de `checkJs` continuará compilando o runtime composto como um único arquivo virtual junto ao contrato TypeScript. A geometria de colisão será centralizada, e regressões comprovarão que o caminho otimizado e o exaustivo têm a mesma semântica. Isso transforma o achado de dependências implícitas em uma proteção executável sem criar uma segunda fonte do runtime.

## Documentação e versão

- O manual trocará “modo Código” por “Ponte”.
- O manifesto receberá bump patch por alterar comportamento do runtime e documentação.
- O relatório de auditoria registrará os achados encerrados e a única exceção de produto.

## Verificação

- regressões unitárias primeiro, incluindo os dois lados do limiar de 2.048 pares;
- testes do player/preview para Promise pendente, erro, troca rápida e IDs duplicados;
- testes do catálogo e da galeria para metadados, busca, filtros e percurso;
- testes de DPR extremo e tilemaps acima dos limites;
- `runtimeTypecheck`, suíte completa de `game-2d`, typecheck, Biome e Playwright filtrado;
- revisão final do diff para evitar alterações no nivelamento pedagógico excluído.
