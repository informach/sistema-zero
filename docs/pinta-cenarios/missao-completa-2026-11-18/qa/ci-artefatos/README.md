# Correção autorizada dos artefatos de QA/CI

O usuário autorizou uma exceção restrita à proibição de modificar o Molda: somente
seus artefatos de QA/CI, preservando dados, identidade visual e funcionamento.
O diagnóstico anterior tinha 163 erros: 162 de formatação e um de atribuição em expressão.
Nenhum exigia modificar os editores ou motores 2D/3D.

- Os 147 JSONs foram formatados pelo Biome e comparados por JSON canônico antes/depois.
  Seus dados e resultados históricos permaneceram iguais.
- Dois scripts de playground foram formatados. A atribuição encadeada à página foi
  separada da declaração, conservando criação, referência e tratamento de falhas.
  A árvore sintática foi conferida: só essa mudança deliberada de estrutura foi aceita.
- As 13 referências de código gerado das aulas foram renomeadas de `.script.js` para
  `.script.txt`, byte a byte iguais. O teste continua comparando o texto exato com `toBe`;
  não há formatter nem normalização nova na comparação. A extensão identifica corretamente
  esses arquivos como dados de teste e evita que a formatação de fontes altere o contrato.
- Nenhuma regra de CI, lint ou formatação foi desativada ou enfraquecida.

Os hashes anteriores e posteriores e os nomes das referências constam em
[preservacao.json](preservacao.json). Os testes de navegador das aulas usam o
playground local de produção. Isso é regressão das aulas, distinta da homologação
autenticada do Pinta ou da validação funcional do Molda.
