# Pedidos remunerados dos moradores

Prova local de 30/10/2026, sobre staging `6461f19c0` com alterações ainda não publicadas.
Não houve gravação em banco de staging ou produção.

## Navegador

Chrome com SwiftShader e serviço falso do playground, por
`playground/verificar-amizade-browser.ts`:

- `r4-kids-computador`: 1280 × 720, Kids, conversa e pedido da Iriê.
- `r5-adulto-celular`: 390 × 844, toque emulado, adulto, mesma sequência.
- Nos dois: conversa, presente, entrega com crédito de quatro moedas, amizade 230, saldo 84,
  um crédito, reabertura sem repetir cesta nem moedas, página no Diário e console sem erros.
- Os PNGs mostram conversa e Diário. A câmera e o painel permanecem na conversa durante a
  confirmação; o diálogo modal impede comandos enquanto a entrega aguarda o serviço.

O caso r2 confirmou a entrega mas perdeu o painel: a pausa fechava a conversa e a resposta
era descartada durante a retomada do relógio. Dois testes causais reproduziram essa perda.
A correção preserva o painel na confirmação transitória e mostra o recibo informativo sem
liberar ações durante a sincronização. Conflito e fim de tempo ainda fecham a conversa; uma
resposta tardia não reabre um painel que a pessoa deixou. Os três testes do painel passaram.

R3 passou a conversa e a reabertura, mas falhou no próprio verificador: créditos falsos são
um mapa e o teste usava `length`. Corrigido para contar as chaves; r4 e r5 são as provas finais.
R1 não chegou ao navegador por resolução do pacote quando o bundle estava fora do pacote.
Os negativos foram preservados, sem reinterpretá-los como positivos.

## Serviço e carteira

- `arquipelago-api/tests/db/pedidos.test.ts`: seis testes, 80 asserções. HTTP real em processo,
  conta/público, suporte, campos extras, ilha da jornada, concorrência, revisão, dia de São Paulo,
  compra pendente, teto terminal e recuperação com save mais recente.
- `pedidos-members.test.ts`: um teste, 36 asserções, duas bases Postgres locais e carteira real.
  Perde a resposta após o commit, retoma sem duplicar, ocupa o restante do teto semanal e
  confirma que outro pedido mantém amizade/cesta sem ultrapassar 100. Repete para Kids e adulto.
- O serviço calcula a entrega com a mesma regra pura do jogo. O cliente não envia o prêmio.
  A chave financeira é gerada no servidor. O teste não transforma o save em prova de origem
  histórica de cada item: este limite do modelo está explícito no plano.

## Verificações adicionais

- Contratos de pedidos/insumos: oito testes, 1961 asserções, incluindo UTF-8 e entrega inteira.
- Conversas afetadas: 72 testes, 10146 asserções.
- Painel, fila de pedidos e compras: 15 testes, 112 asserções, incluindo diário antes do envio.
- BFF: 27 testes, 104 asserções. Gateway: três testes, 51 asserções.
- Suíte do jogo: 1176 passaram, zero falhas, um teste condicionado ao Postgres ficou sem executar.
  O teste omitido é o de recuperação da fila de tempo; não foi contado como positivo.
  Depois, esse teste foi executado separadamente no Postgres local: passou com três asserções.
- Tipagem do jogo, API e BFF passou. A primeira tipagem do teste novo detectou uma fixture sem
  `rascunhoInicial`; foi corrigida com `null`, sem cast nem supressão, e conferida novamente.

O ajuste de pausa também foi conferido na feira: `../2026-10-30-insumos/r7-adulto-celular`.
A compra conserva o painel e limpa a confirmação antiga. R6 preserva a reprodução negativa.

## Reproduzir

No pacote do jogo, compilar o verificador para `.cache` do próprio pacote:

```text
bun build playground/verificar-amizade-browser.ts --target=node --format=esm --external=playwright-core --external=three --external=three/* --outfile=.cache/verificar-pedidos-browser.mjs
node .cache/verificar-pedidos-browser.mjs
```

Definir por processo `ARQUIPELAGO_MORADOR=irie`, `ARQUIPELAGO_PUBLICO=kids|adulto`,
`ARQUIPELAGO_CELULAR=0|1` e `ARQUIPELAGO_PRINTS` em diretório novo. `ARQUIPELAGO_CHROMIUM`
permite escolher o executável; sem ele, usa o Chrome instalado. O runner sobe somente servidor
local e encerra navegador e servidor em `finally`. Não editar `.env`.

Os testes de banco usam `ARQUIPELAGO_PEDIDOS_TEST_DATABASE_URL` em localhost com nome
`arquipelago_test*` e `ARQUIPELAGO_INSUMOS_MEMBERS_TEST_DATABASE_URL` local `kids_journey_*`.
Os helpers recusam host remoto e criam somente perfis próprios.

## Limites

A revisão do host encontrou uma lacuna que o playground não exercita: a lista de caminhos
permitidos ainda não incluía insumos, pedidos nem profissões. O teste causal reproduziu 404
antes da rede. A lista agora inclui somente os seis caminhos exatos. A regressão percorre os
dois públicos, preserva corpo e AbortSignal e mantém caminhos arbitrários bloqueados. Host,
BFF e sugestões de avatar passaram em 42 testes/223 asserções após a correção.

Não é homologação de ambiente publicado, celular físico, GPU real, todos os seis moradores
no navegador, teste prolongado ou revisão integrada de L01 a L14. O protocolo não altera V18.
Migrações e ordem de implantação estão em `docs/operations/arquipelago-insumos.md`.
