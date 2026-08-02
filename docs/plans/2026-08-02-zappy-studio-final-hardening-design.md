# Design — hardening final do Zappy no Estúdio Completo

**Data:** 2026-08-02  
**Escopo:** `studio`, `member-shell`, `members` e `admin`

## Objetivo

Resolver os seis achados remanescentes do full review: classificação de crise, vazamento de segredos, corrida de revisão no RAG, referências de blocos sem ação no modo Pro, corpo HTTP sem limite antecipado e backfill síncrono sem retomada.

## Abordagem aprovada

A correção será feita em profundidade, com validação defensiva nas duas bordas e contratos explícitos entre os serviços. Fontes RAG que não possam provar a revisão de origem serão invalidadas e reconstruídas. O backfill passará a operar em lotes pequenos, idempotentes e retomáveis, conduzidos pelo Admin com progresso visível, sem introduzir uma nova infraestrutura de filas no piloto.

## Segurança da criança e privacidade

O classificador normalizará as variantes comuns de suicídio e autoagressão. A intenção de crise terá precedência sobre o aviso genérico de PII, garantindo que uma mensagem com telefone ou e-mail ainda receba a orientação de emergência.

O Studio removerá arquivos sensíveis antes de montar o contexto e redigirá o conteúdo completo antes de truncá-lo. O BFF repetirá as duas proteções, pois o cliente não é uma fronteira de confiança. A redação cobrirá valores entre aspas incompletos e credenciais embutidas em URLs, preservando apenas informação estrutural útil.

## Consistência do RAG

Cada trabalho de sincronização transportará a revisão esperada do bloco. O `members` comparará esse token com a revisão autoritativa imediatamente antes do `upsert`; uma extração antiga nunca poderá ser promovida como atual.

Uma nova migração invalidará fontes de bloco existentes que foram carimbadas sem essa garantia. Os chunks correspondentes deixarão de ser pesquisáveis até o próximo backfill, privilegiando correção sobre disponibilidade temporária do índice.

## Compatibilidade com o modo Pro

No modo Pro, o servidor solicitará e persistirá `blockReferences` vazias. O painel aplicará a mesma regra antes da renderização. Respostas históricas continuam legíveis, mas não mostram ações que tentariam abrir uma área de blocos inexistente.

## Limite de transporte

A rota de perguntas fará uma rejeição rápida por `Content-Length` e também lerá o stream incrementalmente, interrompendo-o ao ultrapassar 1 MiB. A validação semântica continuará a cargo do schema depois do parse. Requisições rejeitadas antes da reserva não consomem cota nem criam mensagens.

## Backfill incremental

O backfill será dividido em páginas ordenadas e estáveis. Cada chamada processará somente um lote, devolverá cursor, contadores e estado de conclusão, e reconciliará fontes removidas ao terminar a varredura. O Admin repetirá as chamadas enquanto a tela estiver ativa, exibirá progresso e poderá retomar com o último cursor. Reiniciar do começo permanece seguro porque a sincronização é idempotente e revisionada.

## Testes e verificação

Os testes de regressão serão escritos antes das correções e cobrirão:

- variantes de suicídio e combinação crise + PII;
- arquivos sensíveis forjados diretamente no BFF, URLs com credenciais e aspas incompletas;
- rejeição de extração obsoleta após mudança concorrente do bloco;
- ausência de referências Blockly no modo Pro;
- body acima de 1 MiB, inclusive sem `Content-Length`;
- paginação, progresso, retomada e conclusão do backfill.

Ao final serão executados os testes direcionados, typecheck, Biome, builds relevantes e o Playwright do Zappy.

## Critérios de aceite

- Toda intenção de crise reconhecida recebe a resposta de segurança, mesmo contendo PII.
- Nenhum arquivo sensível ou segredo reconhecido entra no prompt do provedor.
- Conteúdo extraído sob uma revisão não pode ser persistido sob outra.
- Fontes legadas sem prova de revisão não participam da busca até serem reindexadas.
- O modo Pro nunca oferece chips de bloco inoperantes.
- A rota não materializa mais de 1 MiB de corpo antes de rejeitar a requisição.
- Nenhuma chamada de backfill depende de processar toda a base dentro de um único request.
