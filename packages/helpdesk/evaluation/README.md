# Avaliação de respostas

`helpdesk-eval-v1.json` contém 100 casos sintéticos: 60 respondíveis e 40 de encaminhamento. Inclui paráfrases, responsáveis/adultos, fonte insuficiente/retirada/vencida, conflito, pedido humano, assuntos sensíveis, tentativa de instrução maliciosa e conversa longa. Não foi executado contra um modelo real nem aprovado editorialmente. Os testes unitários do scorer usam resultados fabricados identificados como sintéticos e não registram avaliação no produto.

Antes de medir, a equipe revisa os 100 enunciados, comportamento esperado e fontes aceitáveis. Ajustes geram nova versão; não treinar ou ajustar o prompt com o conjunto congelado de avaliação. Use outro arquivo para experimentos de desenvolvimento. O relatório incorpora SHA-256 do dataset, vínculo de fontes, resultado e revisão.

Em ambiente isolado de avaliação, publique cópias minimizadas das fontes aprovadas. Prepare também cenários de retirada, validade vencida, públicos incompatíveis e conflito; confirme essas condições nas provas determinísticas do backend. Copie `source-bindings.example.json` e associe cada chave editorial aos UUIDs dos artigos aceitáveis. Não use dados pessoais reais ou credenciais nos enunciados. Não publique fontes artificiais/maliciosas na base de atendimento real.

Salve a política pretendida em modo desligado ou sombra, com todos os temas dos casos respondíveis habilitados. Defina no ambiente `DATABASE_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_HELPDESK_MODEL`, `EVALUATION_MAX_COST_USD` e `EVALUATION_ATTEMPT_RESERVE_USD`. O custo por tentativa é reservado antes da rede; desconhecido continua consumindo a estimativa. Esta execução tem custo de provedor, não é um teste unitário.

No diretório `packages/helpdesk`:

```text
bun scripts/evaluate-knowledge.ts run evaluation/helpdesk-eval-v1.json bindings.json output.json
```

O runner usa os mesmos filtros, busca top-6, prompt e cliente do produto; uma tentativa por caso, deadline 30 s. Escreve execuções com finalidade `test`, sem ticket, envio ou ativação. A saída inclui decisões, respostas, fontes recuperadas, tempo e custo. O modelo de revisão é `output.json.reviews-template.json`: preencha revisor, comentário e veredito de cada caso. Marque erro crítico para exposição privada, ação indevida, citação inacessível ou afirmação sensível sem sustentação. Não marque testes determinísticos aprovados sem executar a suite com PostgreSQL.

```text
bun scripts/evaluate-knowledge.ts score evaluation/helpdesk-eval-v1.json output.json reviews.json report.json
```

O scorer recusa revisão parcial, IDs duplicados e alteração dos artefatos após revisão. Produz `report.json` para importação administrativa e `report.json.metrics.json` com recall, precisão, handoffs indevidos e custo conhecido/desconhecido. O piloto também verifica no servidor os limites, data, modelo, prompt, índice e hash de política. A data `evaluatedAt` nasce no início da execução e acompanha os hashes; a validade de 30 dias não se renova ao importar novamente. Todos os casos precisam de revisão. Importar relatório não ativa o piloto.

Conserve artefatos completos de avaliação pelo prazo definido para a rodada, no máximo 30 dias como padrão operacional; controle acesso e apague após a revisão. Só agregar números não dispensa conferir as respostas. O backend não apaga automaticamente arquivos locais do operador.
