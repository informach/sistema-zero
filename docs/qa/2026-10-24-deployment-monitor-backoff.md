# Acompanhamento de deployments e cota da API

## Causa e alteração

O deploy de gravação chegou ao Railway, mas os workflows não conseguiram atestar
seu término: staging consumia uma consulta por serviço a cada 20 segundos e
produção tinha um prazo de aplicativo de 20 minutos. Os resultados negativos dos
workflows e a posterior reconciliação dos deployments estão preservados em
`2026-10-24-recording-deploy-verification.md`; não são convertidos em CI/CD verde.

O monitor de staging agora consulta os IDs reconhecidos no ACK em uma única
operação GraphQL por round, a cada 30 segundos. Com 16 serviços, são até 120
consultas regulares/hora em vez de aproximadamente 2880. Não há cache de sucesso,
mutação, disparo novo ou redescoberta de um deployment para substituir o ID original.
Identidade de projeto/ambiente/serviço/deployment e SHA de SUCCESS são conferidos.

O transporte readonly compartilha backoff exponencial para falhas transitórias e
respeita `Retry-After` de HTTP 429, inclusive HTTP-date e intervalos maiores que o
backoff normal. Cada consulta tem até 15 segundos, limitada pelo saldo da onda;
espera por cota não estende esse saldo. Falhas transitórias comuns encerram após
cinco tentativas; cota pode esperar dentro do prazo. Erros GraphQL/autorizações,
dados parciais, identidades e estados desconhecidos nunca viram sucesso.

A mesma regra de leitura é aplicada ao polling da onda canônica (inclusive
retirada de predecessores). Mutações mantêm uma tentativa: uma resposta incerta
não autoriza repetir deploy. Permanecem as barreiras de retirada, coorte e
admissão; nenhum teste de produto teve o limite alterado.

O orçamento de aplicativo de produção de 60 minutos, limitado também pela janela
global, já foi conciliado na mesma branch financeira e será publicado junto.

## Verificação

- Negativo causal de wiring preservado: nova prova recusou o workflow antigo
  antes de a chamada ao monitor ser substituída (28 pass / 1 fail).
- Suíte `scripts/ci`: 300 testes, 1067 asserções, zero falhas, sem provider I/O.
- Modelo de 16 serviços comprova uma consulta/round e sucesso aos 25 minutos.
- Casos cobrem 429 com 120/180 segundos, prazo absoluto, resposta após o prazo,
  cinco corpos inválidos, erros parciais e divergências de identidade/SHA.
- O fluxo canônico mantém um único deploy mesmo após 429; mutação com erro
  continua incerta e não é repetida.
- Biome e sintaxe Node dos módulos alterados sem erro.

Na primeira rodada integrada houve cinco regressões de teste/código e um timeout
do controle Git sintético de Windows (5s). Foram corrigidos o callback `map` que
recebia índice como deadline e a tradução de deadline na fronteira canônica;
expectativas passaram a contar os backoffs de leitura. A suíte completa posterior
usou orçamento local de teste de 20s, sem mudar os limites da aplicação/CI.

Fonte: [Railway Public API — limites e retries](https://docs.railway.com/integrations/api),
consultada em 24/10/2026. Este lote não executou deployments. Ativação fica junto
da entrega financeira, conforme orientação da responsável.
