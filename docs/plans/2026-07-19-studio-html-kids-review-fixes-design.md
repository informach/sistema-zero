# Correções da categoria HTML para crianças

Data: 19/07/2026

## Objetivo

Corrigir todos os achados do review da categoria HTML do Studio sem perder o código de projetos existentes. Os blocos usam linguagem infantil; o modo Ponte continua responsável por mostrar a sintaxe e os nomes das tags.

## Decisão aprovada

Novos encaixes seguem o modelo de conteúdo do HTML. Projetos antigos passam por uma migração pura antes do carregamento: conteúdo incompatível sai do contêiner inválido e vira irmão na posição válida mais próxima. A migração preserva blocos, campos, IDs e ordem; itens de lista órfãos ganham uma lista ao redor.

## Contrato central

Um catálogo HTML sem dependência de DOM ou Blockly passa a definir:

- tags e blocos suportados;
- forma do elemento: contêiner, texto inline, folha ou vazio;
- modelo de filhos: fluxo, texto inline, itens de lista ou nenhum;
- atributos representados por campos;
- tipos aceitos por campos de formulário;
- degrau pedagógico dos blocos HTML.

Parser, Blockly, serialização e curadoria de níveis consomem esse catálogo. Testes de conformidade impedem que as listas voltem a divergir.

## Segurança e fidelidade

- Texto solto no corpo vira nó de texto escapado, nunca `rawHTML`.
- Comentários neutralizam sequências que encerrariam o comentário antes da hora.
- HTML avançado continua sendo a saída explícita para código que os blocos não representam.
- Scripts canônicos preservados no cabeçalho não são duplicados no corpo.
- Scripts inline no meio do corpo permanecem como HTML avançado na posição original.
- Nós inline recebem faixas próprias no source map.

## Formulários e IDs

- Campos suportam tipos comuns, inclusive checkbox e data; tipos desconhecidos permanecem como HTML avançado.
- Área de texto representa conteúdo inicial e placeholder separadamente.
- Atributos vazios não são inventados no round-trip.
- IDs padrão ficam vazios para evitar duplicatas e para não alterar código importado.
- Botões novos usam `type="button"`; o round-trip preserva a ausência do atributo em código existente.

## Progressão e linguagem

Lista e item de lista aparecem juntos. Formulário e seus campos também aparecem no mesmo degrau. Os blocos não mostram nomes de tags; mensagens e tooltips explicam função, hierarquia e significado em linguagem concreta.

## Verificação

Cada achado recebe um teste mínimo. A entrega exige testes focados de parser, gerador, source map, migração, conexões, round-trip e toolbox, seguidos por `bun test src`, `bun run typecheck` e `bun run check` no pacote Studio.
