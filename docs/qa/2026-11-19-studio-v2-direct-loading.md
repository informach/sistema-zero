# Abertura direta de documento local v2

## Defeito reproduzido

O migrador já reconhecia `sz:v2:project:<id>`, e a listagem detectava essa chave. O fallback de abertura direta verificava somente documento v1 e metadados v1/v2. Sem passar pela listagem, um projeto v2 de documento único era tratado como ausente.

Seis testes reproduziram a falha antes da alteração: leitura do documento, shell, metadados, blocos, resumo e lote de resumos. Todos falharam porque o registro atual não era criado.

## Correção

Incluir a chave de documento único v2 na sondagem histórica existente. O mesmo migrador transacional continua responsável pela validação, backup, conversão, conflitos e retirada da fonte. Nenhum formato, interface ou limite foi alterado.

Após a correção, seis testes passaram com 18 asserções. Cada teste usa um banco transacional isolado, chama diretamente o carregador sem listar projetos, confere metadados atuais e retirada da fonte pelo migrador.

Comando, em `packages/studio`:

```powershell
bun test ./src/state/projectHistoricalLoad.test.ts
```

A leitura de assets de projetos fechados mantém seu contrato documentado de não migrar documentos legados durante varredura. Esta correção não ativa v4 nem conclui a integração dos carregadores com essa versão.

Regressão final: 480 testes / 2.529 asserções, zero falhas, 44,93 s. Typecheck completo e Biome aprovados. O teste de lote foi atualizado para incluir a chave adicional, mantendo duas leituras em lote. Bundle inicial: 368.200 bytes brutos / 119.801 gzip, limite de 120.000 mantido.
