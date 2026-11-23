# Pinta — edição focal na conta (23/11/2026)

Impedimento 2 da auditoria `reaproveitamento-regional-2026-11-22.md`. Hoje a sessão focal grava o
cabeçalho, o espelho e os chunks tocados por um CAS próprio (`commitLocalRegionChange`), fora da
fila V4. Por isso `assertRegionalLocalState` recusa qualquer perfil com outbox, blobs, pins ou preparo.

## Desenho

1. **Uma transação só.** A sessão recebe uma ligação causal (`LocalRegionCausalBinding`). O mesmo
   `updateLocalPintaRecords` do gesto lê também o outbox e os blobs fixados. Depois do patch, chama o
   `stageLocalCausalDraft` de sempre; o `write` dele aplica o patch e devolve as revisões. Se a fila
   mudou (preparação, sucessor, base ou pin), a validação dele recusa e nada é gravado: nem chunk, nem
   outbox. O orçamento soma `localCausalBytes`. Sem ligação, a guarda continua recusando.
2. **A unidade.** Ela tem um membro só: o mapa, com `update`, ou `create` se nunca subiu.
   `baseRevision`, `baseAfter` e `follows` seguem `stagePintaCausalWrite`. Os gestos seguintes
   coalescem na mesma unidade mutável: mesmo opId, preparação nova. Uma unidade mutável com outro
   membro ou com sombra recusa o gesto como conflito. Antes de abrir, o host congela as unidades
   mutáveis (`freezePintaCausalPending`), então essa recusa só aparece se outra aba gravou.
3. **Leituras e pins.** Os recursos da janela (`base.resources`, conferidos pelo CAS do gesto)
   viram arestas. Um membro congelado ou selado com a mesma revisão local dá `predecessor`; uma marca
   confirmada com sha256 dá `snapshot`. Sem nenhum dos dois, o gesto é recusado. Na abertura, o host
   calcula uma vez o gzip do fecho alcançável (`encodePintaObservedResources`). A cada gesto, a ligação
   só recompõe as bases, com o `remote` tirado da marca lida na própria transação.
4. **O que é selado.** Nada no gesto, e não há sombra. Os bytes da unidade mutável são os chunks do
   mapa nativo 8 físico (capacidade 8). Nenhum escritor publicado consegue gravar esse documento: para
   eles ele é "futuro". O upload não muda: `prepare` decodifica o mapa inteiro, `encodeCandidates` faz
   o gzip e `seal` sela. Recibo, renovação e `followVerifiedReceipt` também ficam como estão.
5. **Recuperação.** A descida (`applyPull`/`recoverUnit`) lê o mapa decodificado do aparelho como
   qualquer outro membro. A cópia de recuperação de uma aba anterior segue o caminho atual. A trava de
   editor da conta (`holdOpen`) fica com a sessão focal até ela fechar, como no editor inteiro. Ao
   fechar, o espelho acorda a fila (a subida inteira não roda a cada gesto).
6. **Protocolo.** Nada muda no Members, no BFF ou no formato da nuvem: a mesma intenção, as mesmas
   arestas e o mesmo PUT inteiro. Um perfil ainda sem época (`unbased`) não abre a janela: o primeiro
   gravar vai pelo editor inteiro, que guarda a sombra.

## Fora deste lote

- O host continua com `createPintaCausalPersistence` (leitor e escritor 6). O espelho só oferece a
  sessão focal quando o armazenamento local a tem e a nuvem é causal. A galeria focal na conta
  (`listGalleryIndex` do espelho), o transporte 8 e a promoção ficam para a etapa 1.
- O autosave incremental do editor inteiro (`persistRevision`) continua só local. Na conta, ele
  grava pelo stage inteiro.

## Provas (cada uma falha antes da correção)

- Falha do último PUT local: o IndexedDB recusa a gravação do outbox. Nada muda no disco, e a
  repetição grava a unidade certa.
- Edição concorrente em duas abas: a sessão vencida é recusada sem tocar a fila. O stage inteiro de
  outra aba que leva o mapa também recusa o gesto atrasado.
- Rede caída: os gestos ficam na fila. Quando a rede volta, sobe o mapa inteiro com todos eles.
- Upload ou recibo perdido: o servidor confirma, a resposta se perde e o gesto seguinte encadeia.
  Na repetição, o recibo confirma as duas unidades sem cópia.
- Retomada integral: um aparelho reaberto (persistência nova) sobe o mapa e mantém os bytes fixados
  da folha lida, mesmo depois de um escritor anterior mudá-la.
