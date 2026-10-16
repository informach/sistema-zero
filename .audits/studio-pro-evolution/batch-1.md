# Lote 1 — review

- Hashes: cache fraco por nó/conteúdo e cache por rodada no diagnóstico. A revisão continua exigida. Ver `diagnostics-review.md`.
- Busca: leitura por linha somente quando necessária e sem execução oculta. Onze golden outputs idênticos. Ver `search-review.md`.
- Símbolos: consulta sintática só invalida pelo conteúdo do arquivo ativo. Respostas antigas são descartadas; referências/renomeação continuam exigindo a árvore inteira atual. Teste cobre edição concorrente e alteração em outro arquivo.
- ZIP: a implementação instalada de fflate comprime sincronamente entradas pequenas mesmo na API assíncrona. Um worker curto por exportação maior faz conversão e compressão; saída é transferida, entradas são clonadas e permanecem intactas. Pequenos ZIPs e consumidores Node preservam API. Sem worker persistente ou por arquivo.
- Prova real Chromium/produção: 80 fontes mais binário, descompactação íntegra, exatamente um worker e encerramento após conclusão/cancelamento. Três testes unitários de ZIP e oito de símbolos/linguagem passaram.
- Review não encontrou mudança nos contratos de persistência, autoria, FS ou Zappy. O limite por pedido na interface e cancelamento ao trocar escopo serão fechados no lote de exportação.
- A separação de guias elimina a computação invisível no lote de navegação. Não foi introduzido cache global de árvores/compilação: reduzir a validação global de refatorações seria incorreto.
