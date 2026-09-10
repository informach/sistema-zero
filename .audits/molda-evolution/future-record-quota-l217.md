# Lote 217 — quota do writer v1 e payloads Molda desconhecidos

Estado: implementado, revisado e verificado em 09/09/2026.
Pré-requisito do layout por blobs da fase 2, sem ativação de writer/migração/GC.

## Causa e correção

guardedWrite enumera keys/values na transação de escrita, mas descartava do cálculo
os prefixos fora de uma lista fechada de documentos/resumos/recuperação. Assim,
blobs ou futuras partições `molda:*` ocupavam armazenamento sem consumir quota v1.
Não era falta de lock ou necessidade de uma leitura extra: o raw já estava disponível.

Agora o ramo desconhecido soma `structuredBytes(raw)` quando a chave começa
exatamente com `molda:`. Não confia em `raw.bytes`, não faz parsing/reparo nem
remove esses registros. Outras ferramentas no mesmo object store ficam fora.
Retirados e substituídos continuam tratados antes; documentos/resumos reconhecidos
mantêm sua métrica histórica. Sem segunda varredura, cache global ou mudança de CAS.

A métrica continua estimativa do projeto, não tamanho real em disco: assets v1
usam assetBytes/summaryBytes, valores opacos usam structuredBytes. Não confundir
esta correção com mudança global do modelo contábil ou suporte a tipos arbitrários.

## Testes e revisão

- f33fec reproduziu **três falhas** sem tocar produção: limite exato menos um
  permitia save; blob cometido imediatamente antes não consumia quota; dois
  writers conseguiam gastar o espaço já ocupado por conteúdo desconhecido.
- Regressões usam transações reais de fake-indexeddb, manifesto/blobs reais do codec
  216 e dados cíclicos/opacos com tamanho declarado zero. Não há mock de quota/IDB.
- Limite exato permite salvar/repetir; um byte abaixo recusa sem mutação parcial.
  Renomear acima do limite também recusa com CAS e rollback. Dados opacos/estrangeiros
  são iguais antes/depois. Prefixos another-tool e molda-other não entram no orçamento.
- Exclusão de lote com cena v2 continua recusando tudo; exclusão explícita somente
  da criação v1 permanece disponível e não toca manifesto/blobs/futuros.
- 7839a4: **56/0, 305 asserts, quatro arquivos, 660 ms**, incluindo writer existente,
  persistência nativa e promoção. Verificações finais ainda pendentes.

## Fechamento

- Tipos 1ff325/af1498 passaram. Biome 476611: 1.122 arquivos, sem mudanças.
- Integral 1d9b9e/853910: **2.699 passes, zero falhas, 8.346.995 asserts,
  363 arquivos, 164,67 s**. Sete logs de WebGL no teste MoldaApp; nenhum aviso act
  nesta execução. Isso não diagnostica nem encerra a pendência intermitente 203/214/216.
- Vite 54d286 passou em **1,16 s**; index 363,82→363,86 kB, ScenePlayground 197,73 kB,
  CSS 53,64 kB e workers mantidos. Three 579,29 kB continua avisando >500 kB.
- Kids 939f0f/a4f19d passou: 4,8 s compilação, 12,9 s tipos, 59 páginas/496 ms.
- Mudança limitada ao ramo de custo do writer. Sem otimização anunciada; é correção
  de contabilização transacional, não redução de memória ou alteração do teto.

## Limites

Vale para o código atualizado, não retroativamente para uma aba que já executa
o writer anterior. Layout novo continua restrito ao banco separado da oficina;
rollout público exige homologação de abas/guards. Este lote não cria nenhuma chave
de blob em dados de usuário nem transforma o writer v1 em leitor/escritor de cena v2.
