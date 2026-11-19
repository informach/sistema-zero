# Identidade e recuperação dos layouts locais v1/v2

Base: `e99cffbdd`, laboratório isolado. O padrão de escrita permanece v3.

## Defeitos reproduzidos

O digest por JSON.stringify tornava indistinguíveis metadados com -0/0 e uma propriedade explícita undefined/ausente. Os dois testes vermelhos mostraram a fonte antiga sendo consumida sem outra cópia. Os recibos de backup também aceitavam uma versão futura desde que os records coincidissem; dois testes vermelhos reproduziram esse reconhecimento indevido.

## Contrato e implementação

A identidade usa o codec de grafo iterativo já existente e SHA-256, preservando valores e limites. O marcador declara `sourceHashAlgorithm: project-json-graph-v1` e conserva seus outros campos. Um marcador antigo sem essa declaração não prova igualdade pelo hash anterior: uma fonte que voltar pode virar cópia recuperada, preservando a revisão atual.

O mesmo migrador aceita destino v3/v4. Backups v3 conservam o namespace e array de records; os novos recibos declaram versão 1. Backups v4 usam namespace versionado e recibo 2, com records mapeados pelas chaves originais. O mapa preserva partições ausentes como propriedades undefined, sem introduzir undefined em arrays do documento portátil. Os backups antigos permanecem intactos.

Recibos são conferidos por versão, origem, chaves e snapshot completo antes de consumir a fonte. A promoção CAS continua atômica. O preparo físico profundo v4 ocorre antes da transação viva. Dados do jogo permanecem em sua chave própria e não são interpretados como envelopes do Estúdio.

## Verificação

- 13 testes focados / 65 asserções: variantes de identidade, destinos v3/v4, origens v1/v2, metadados com 128 níveis, jogo intacto e contratos futuros.
- Suíte ampliada: 517 testes / 2.744 asserções / 76 arquivos / 58,09 s, zero falhas.
- Typecheck completo incremental e lint dos quatro arquivos alterados: saída 0.
- Chromium/WebKit reais: ambas as origens promovidas para v4, backup completo relido, variante de zero preservada em cópia e dados do jogo inalterados. O driver também repetiu recuperação profunda, recargas e conflitos. Resultados/hashes em `2026-11-19-studio-legacy-layout-native.json`.

A primeira execução nativa falhou porque a fixture Bun não aplicava a substituição process.env usada pelo Vite. A causa foi confirmada no definePlugin instalado e no bundle real de project-migrations (`{}.BABEL_TYPES_8_BREAKING`). A fixture agora usa as mesmas definições de compilação: objeto vazio e NODE_ENV production; não lê/embute variáveis do host nem cria um objeto process global. A falha original está preservada em `legacy-layout-full.txt`; a rodada corrigida completa está em `legacy-layout-reviewed-full.txt`, sob `.cache/mission` ignorada.

## Limites

Os carregadores/listagem ainda precisam da integração e da ativação v4 no laboratório. Isto não conclui a missão nem comprova digitação/arrasto responsivos de 10.000 blocos, depuração ou profiling. O ensaio é de desenvolvimento, não um aparelho físico de 8 GB.


Bundle final: 366274 bytes brutos / 119545 gzip; 1 teste / 35 asserções, sem alteração dos limites (`legacy-layout-reviewed-bundle.*`).
