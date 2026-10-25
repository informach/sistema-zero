# Fila administrativa de conferência

`/admin/pagamentos/regularizacao` passa a mostrar, além da política, casos em andamento,
origens que exigem revisão, operações EXECUTING/UNKNOWN e pagamentos PAID cujo período
ainda não foi confirmado. Confirmar dinheiro não apaga uma operação incerta da fila.

Uma consulta SQL paginada retorna snapshot de itens + total, com ordem estável. Filtros
de tipo, comunidade, assinatura e busca limitada são parametrizados. Público sem origem
validada é `unknown`; não se deduz comunidade de nome/SKU/e-mail. A resposta contém
somente identificação, nome/e-mail do titular e dados operacionais necessários, sem
documento, cartão, token, metadata ou envelope bruto da operadora.

Leitura exige equipe ativa via gateway e Admin BFF; staff pode consultar. BFF valida
filtros e duplicações de parâmetros, encaminha abort e retorna private/no-store.
Interface cancela consulta anterior ao mudar filtros; resposta antiga não troca o
público selecionado. Erro de leitura não é apresentado como fila vazia. Nenhuma ação
financeira ou mensagem é disparada ao consultar, buscar ou paginar.

## Verificação

- PostgreSQL real: três cenários de quatro origens, filtros/paginação, busca literal,
  audiência desconhecida e ausência de documento na resposta.
- Payments: tipagem limpa e suíte completa de 512 testes com PostgreSQL próprio.
- Admin: fixtures UI/BFF isoladas, política/input e tipagem focada passaram. Novos
  cenários verificam resultado incerto, erro de carga, resposta antiga e filtros BFF.
- A tentativa local de Admin completo registrou 890 casos passados e nenhuma linha
  de falha, mas não encerrou/reportou resultado; foi interrompida. Isso NÃO é aprovação
  da suíte completa. A prova isolada do Vimeo (último ponto observado durante a tentativa)
  passou cinco casos; não há diagnóstico causal confirmado do encerramento pendente.
  Logs preservados em `.cache/subscription-recovery-20261023/recovery-review-*` e
  `admin-vimeo-isolated-r1.log`. Full Admin precisa de nova prova completa no CI atual.

## Trabalho restante

A fila deste lote é somente leitura. Ações administrativas ainda precisam de prova
fresca, CAS/autoridade, auditoria durável e reconciliação sem repetir POST. Não se
declara resolução de UNKNOWN, admissão manual do legado ou aprovação de período pela
existência da lista. O caso antigo da Flávia continua sendo falha de renovação, sem
cancelamento confirmado e sem ação automática retroativa.
