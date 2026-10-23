# Review — busca incremental de linhas

- Mantidos ordenação, limite, busca literal Unicode, coluna UTF-16 e primeira ocorrência por linha.
- Evita alocar todas as linhas de cada arquivo. Arquivos sem correspondência são descartados antes da leitura por linha. Consulta oculta não é recalculada.
- Comparação dos 11 fingerprints de `cpu-search.json` contra `cpu-baseline.json`: todos iguais.
- P95 sem correspondência: 80 arquivos, 7,29 → 5,24 ms; 2.000 arquivos, 44,40 → 17,31 ms. Trinta amostras por cenário, mesma máquina; não são medidas de latência de browser.
- Testes: Unicode, CR/LF/CRLF, limites exatos, linhas longas e consulta multilinha sem correspondência. Sete testes de modelo/navegador passaram.
- Sem índice global ou worker adicional: os valores medidos atendem aos limites laboratoriais com menos estado derivado.
