# Preservação da biblioteca pessoal antes da promoção regional

A biblioteca conserva uma única cópia do PNG 5 por ID de origem, sob `region-map:<id>` no IndexedDB do perfil. A chave `asset:<id>` continua com o contrato de cenas 1–3. O gravador privado exige uma capacidade explícita e a revisão observada. Ele admite o PNG e seus destinos antes de abrir a transação. O commit guarda o PNG exato e remove a imagem legada daquele ID na mesma transação.

Os leitores de materiais legados omitem um ID com autoridade regional, inclusive se uma aba antiga recriar `asset:<id>`. Um registro futuro continua protegido. Os gravadores comuns conferem a autoridade na transação antes de gravar ou excluir. Novas gravações contabilizam o espaço das duas chaves quando há uma sombra legada, com um item por ID. A aba publicada ainda pode escrever sua parcela legada. O próximo commit novo confere o gasto combinado e recusa se ele já ocupar o orçamento. O sinal de mudança só sai depois de confirmar o commit.

Projetos legados continuam autocontidos. As rotas atuais recusam transportar ou combinar uma referência regional sem suporte, inclusive o PNG 5 canônico sem marcador no caminho de mescla pessoal. Elas mantêm os bytes e o programa existentes. O consumidor gráfico ainda deve decodificar pixels antes de instalar uma cena. O editor, o preview público e os runtimes continuam com as capacidades anteriores.

## Verificações

- `personalRegional.test.ts` usa o emissor real, dois namespaces, revisão concorrente, falha no último `put`, cota por contagem e bytes, versão futura opaca, origem Molda e preservação de arquivos/blocos.
- `pinta-personal-authority-probe.mjs` usa Chrome com IndexedDB real, duas abas, o bundle reconstruído da árvore `16bf6725f8704ed3305e5783397cdee0b230b6ab` e o bundle candidato. Exercita upsert, lote, exclusão legada, volta ao namespace padrão, a garantia de revisão do gravador novo e a reabertura. O código antigo troca o handle no reset de namespace. A biblioteca publicada não limpa nem migra seu banco nessa troca.

## Reproduzir o navegador

Use a fixture real da sonda `pinta-regional-boundary.cases.ts` arquivada no commit `d4775d66d7c1e29d0a58194146087c590aeffc60`. Executá-la com `PINTA_REGION_BROWSER_FIXTURE=1` gera `.cache/pinta-regional-browser-fixture.json`.

Monte um ponto de entrada em cada checkout que reexporte `getPersonalAsset`, `listPersonalAssets`, `savePersonalAsset`, `savePersonalAssetBundle`, `removePersonalAsset` e `setPersonalAssetsNamespace` de `packages/studio/src/asset-library/personal.ts`. No candidato, reexporte também `PINTA_REGIONAL_PERSONAL_CAPTURE`, `savePersonalRegionalMap` e `readPersonalRegionalMap` de `personalRegional.ts`. Compile os dois pontos com `bun build --target browser --format esm --minify`.

Em `packages/studio`, chame a sonda com os caminhos dos três arquivos.

    node ./scripts/qa/pinta-personal-authority-probe.mjs .cache/pinta-regional-browser-fixture.json .cache/pinta-personal-old.mjs .cache/pinta-personal-new.mjs

A sonda usa origem loopback interceptada em memória pelo navegador. O ensaio não precisa de acesso a staging nem escreve fora do contexto isolado.

## Resultado no Chrome

Chrome 157.0.8103.80. A aba antiga gravou, excluiu e recriou apenas a sombra. A aba nova recusou gravar ou excluir pela via antiga. O perfil alternativo e o banco padrão não assumiram a captura. Das duas gravações com a mesma revisão observada, uma foi aceita. Depois de fechar as abas, o leitor reabriu a revisão vencedora com o PNG 5 original.

| Artefato | SHA-256 |
| --- | --- |
| Bundle antigo | `1e2ab97b85dfcce9c5078b10355532bfbb713a02329cfbd6d5d1475ceb9af59f` |
| Bundle novo | `3dbcf2c8413183654074b5f97b84d06f25ab6e73feb46ea44b63af7e0fb37820` |
| PNG 5 reaberto | `08dd5ea5181ee5802134a4812c8c729520949381bd40c59f887bb760b3cf3642` |
