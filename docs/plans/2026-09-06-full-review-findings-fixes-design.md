# Correções dos achados do full review de 06/09/2026

## Objetivo

Corrigir os quatro defeitos encontrados no review do trabalho de 06/09 sem ampliar o escopo funcional. Cada correção atuará na origem da decisão incorreta e terá uma regressão que falha contra o código atual.

## Abordagem escolhida

Aplicar correções localizadas nos invariantes compartilhados. Uma refatoração ampla das máquinas de estado aumentaria o risco sem melhorar estes casos; proteções nos adaptadores duplicariam regras e esconderiam a causa.

## Fila de criações na nuvem

Um trabalho substituído perde a autoridade para executar callbacks. Se um upload receber `CREATION_STALE_BASE` depois que `enqueueRemove` o substituiu, a fila manterá a remoção e não chamará o `onStale` do upload antigo. A remoção resolverá seu próprio conflito com a revisão remota.

A regressão controlará a resposta do upload, enfileirará a remoção enquanto ele estiver em voo e responderá com stale. O teste confirmará que o callback antigo não executa e que a remoção permanece na fila.

## Ranking administrativo

A plataforma identifica o conjunto paginado. `RankingPage` manterá apenas a leitura da plataforma; um componente interno, identificado por `key={platform}`, possuirá busca, offset e resultados. Trocar Kids por Adultos criará um estado novo antes da consulta, com `offset=0` e busca vazia. Isso evita um efeito corretivo e a requisição intermediária com offset antigo.

A regressão navegará para a segunda página, trocará a plataforma e verificará que a primeira requisição da nova audiência usa offset zero.

## Seleção múltipla do Molda

O viewport decidirá primeiro se existe um grupo. Para grupos, anexará a alça coletiva e manterá peças trancadas fora da mutação. A regra “peça trancada não tem alça” ficará restrita à seleção individual.

A regressão selecionará uma peça trancada como principal, somará uma peça livre e confirmará que o grupo recebe a alça e move somente a peça livre.

## Gestos vetoriais do Pinta

O listener global pertencerá ao `pointerId` que abriu o gesto. Eventos de término de outros ponteiros permanecerão visíveis ao documento, mas não removerão os listeners nem encerrarão o gesto principal.

A regressão soltará primeiro um ponteiro secundário e depois o principal. Ela confirmará que o primeiro evento não limpa o listener e que o segundo encerra exatamente uma vez.

## Verificação

Executar cada regressão em vermelho antes da correção e em verde depois dela. Em seguida, executar testes, typecheck e Biome de Admin, Community Kids, Molda e Pinta; build de Admin e Community Kids; e E2E do Molda. Registrar qualquer dependência ambiental que impeça uma etapa.
