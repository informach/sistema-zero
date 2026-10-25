# Rotas financeiras: falha real do Admin e regularização — 25/10/2026

Na tela autenticada de staging, `/admin/pagamentos/regularizacao`, a configuração carregou, mas a lista de conferências mostrou erro. A requisição real `GET /api/payments/recovery/review?limit=25&offset=0` retornou 404 / `NOT_FOUND`. Admin, Gateway, Payments, Messaging e Funil estavam no mesmo commit de staging `c7190ce`; portanto não era diferença de versão entre esses serviços.

A revisão encontrou nove rotas implementadas nos BFFs/Payments e ausentes do catálogo do Gateway: leitura da fila, confirmação de período, entrada histórica revisada, confirmação de pagamento, resolução de pagamento posterior e quatro operações de `retry-intents` do titular. Sem as últimas, o assinante também não conseguiria regularizar o ciclo original pela interface.

A correção acrescenta rotas explícitas, sem wildcard: JWT e conta ativa para todas; leitura financeira para staff/admin/superadmin, mutações administrativas para admin/superadmin e operações próprias para o titular, cuja posse continua conferida no Payments. Escritas têm corpo de 1.024 bytes, auditoria e limites por principal. A atualização preventiva do cartão permanece separada do débito explícito.

## Verificação

- RED: nove testes de resolução falharam na configuração real anterior.
- Configuração e rotas: 65 testes / 305 asserções.
- Pipeline HTTP real do Gateway, JWT assinado e encaminhador de teste: 92 asserções de autenticação, papéis, status, identidade substituída pelo Gateway e recusa de Content-Length acima do teto. Não chama a operadora nem executa efeito financeiro.
- Gateway completo: 301 testes / 1.340 asserções, zero falhas; dois casos opcionais de Redis não executados. Tipagem completa: exit 0.
- Logs locais: `finance-routes-red-r1.log`, `finance-routes-green-r1.log`, `finance-route-http-r2.log`, `gateway-financial-full-r1.log`, `gateway-financial-types-r1.log` em `.cache/python-missions-20261024`.

O primeiro teste HTTP com `Request` construída localmente não enviava Content-Length, diferente do transporte do corpo string. Esse negativo foi preservado; o teste passou a informar o tamanho real. Ele não pretende qualificar corpo streaming sem tamanho declarado; o BFF e o Payments continuam validando o corpo recebido.

Nenhum cliente, cartão, assinatura ou mensagem real foi alterado. A política permanece desativada. Ainda faltam implantação da correção, nova leitura autenticada, conferência dos pré-requisitos e corte financeiro previsto na especificação. Produção continua nas versões anteriores dos serviços financeiros até a promoção integrada.
