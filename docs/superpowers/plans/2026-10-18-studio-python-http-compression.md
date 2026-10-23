# Compressão HTTP da distribuição Python

> **For agentic workers:** Use executing-plans para executar em lotes com revisão. O usuário já autorizou a implementação; commit e merge local somente após a revisão global.

**Goal:** Diminuir os bytes transferidos dos módulos executáveis sem modificar o código executado, o isolamento, a aprovação das releases ou os arquivos exportados.

**Architecture:** Gerar gzip no empacotamento, registrar cada representação como um artefato imutável da release e relacioná-la ao arquivo lógico na distribuição verificada. O serviço escolhe a representação por Accept-Encoding e transmite os bytes já armazenados; não comprime no caminho de execução. Navegador, SDK e exportação continuam usando os mesmos nomes e bytes lógicos.

**Tech Stack:** TypeScript, Zod, APIs públicas zlib/DecompressionStream, R2, Bun para build, Node24/Playwright para qualificação.

**Spec:** `2026-10-18-studio-python-immutable-boot.md`, slice de compressão HTTP; proposta original do Estúdio Python/Turtle.

## Evidência e limites

F1 sem compressão, distribuição4a, Chrome/Edge: cada reexecução transfere 3.125.197 B; a20Mbps somente esses bytes custam pelo menos1250ms. Os tempos de cache/editado medidos foram3597,7/4664,8ms e4548,2/4012,4ms, acima das metas3000/1500ms. Os três dados do interpretador,16.783.568B, já são reutilizados sem compartilhar worker/FS. Protótipo8 mostrou ganho com gzip dos módulos, mas não qualifica F1. Score da oportunidade: impacto5 × confiança5 ÷ esforço3 =8,33.

O baseline não é uma série estatística. F1Pro tem uma falha aberta na consulta secundária `/network` por conexão reutilizada de APIRequestContext: primeira amostra preservada, fases seguintes incompletas. Diagnóstico4: consulta independente undici200/18ms, socket antigo ESTABLISHED nos dois lados, requisição antiga sem entrada no handler. Controles pequenos de idle, concorrência, processoNode, Pyrightreal com sync/query e shaperreal não reproduziram. Nenhum timeout/retry/transporte do teste foi alterado. Não usar desaparecimento incidental após compressão como correção dessa falha. Revisão independente: `.cache/studio-python-l0/review-live-network-timeout.md`.

## Contrato e equivalência

- A receita de compressão preserva os arquivos lógicos recebidos e seus SHA/nomes; gzip é transporte, não outra implementação Python. A extensão necessária do contrato Core pode alterar módulos de infraestrutura recompilados que incorporam esse verificador; registrar o diff desses artefatos em relação à distribuição4a e validar o comportamento. Não afirmar que todos os bundles recompilados são idênticos à release anterior.
- `httpRepresentations` opcional na distribuiçãov1 preserva releases anteriores. Cada item `{path, encoding:'gzip', artifactPath}` referencia dois arquivos declarados. Artefatos gzip ficam exclusivamente em `_http/gzip/<sha256>.gz`; nenhum pode ficar órfão, recursivo ou substituir arquivo lógico. Entradas duplicadas/ausentes/incompatíveis são recusadas.
- Todos os artefatos entram no manifesto da release e no marcador final. Upload verifica gzip e bytes descomprimidos, com limite igual ao arquivo lógico, antes de tornar o marcador visível. O serviço continua verificando checksum/tamanho R2 sem descomprimir no hot path.
- Inicialmente gerar somente módulos.mjs com pelo menos1024B, quando gzip reduz tamanho. Bibliotecas Python, WASM, ZIP e projeto não mudam neste lote. zlib pública level9, header sem timestamp; repetir geração e verificar roundtrip SHA.
- Negociar gzip/identity conforme [RFC9110 §12.5.3](https://www.rfc-editor.org/rfc/rfc9110.html#name-accept-encoding), incluindo q=0, wildcard, caixa e preferência explícita por identity. Header ausente/vazio usa identity. Sem representação aceitável:406 sem cache. Header inválido não habilita gzip proibido.
- `Vary: Accept-Encoding` nas respostas de arquivos negociáveis; MIME/CSP/CORS/status de release preservados. Content-Length e ETag descrevem os bytes da representação enviada. HEAD e304 usam a mesma seleção, sem corpo e com descarte do stream. Namespace interno gzip não é uma rota lógica pública.
- Ausência/corrupção de gzip declarado é falha de integridade; não executar fallback silencioso. Revogação continua sendo revalidada após IO, inclusive em HEAD/304.
- SDK/ZIP continuam contendo os arquivos lógicos originais. Não presumir compressão em hospedagem externa da exportação; comprovar que continua executável sem servidor especial.
- O conjunto executável materializado é definido por `studioPythonLogicalFiles` no Core: todos os descritores lógicos, excluindo somente os `artifactPath` de transporte declarados no manifesto já verificado. Deployment/approval/pin completos são preservados, inclusive os hashes das representações; o pacote exportado/SDK não alega conter os artefatos de armazenamento gzip. Cada arquivo lógico materializado mantém verificação de tamanho/SHA. O mapa fechado do SDK compara exatamente esse conjunto contra o deployment integral e recusa ausência, duplicidade ou alteração. O namespace gzip continua404 e não é importável.
- Ordem, ponto flutuante e RNG inalterados. Golden: SHA dos módulos lógicos antes/depois, CPython/stdlib, Turtlebitmap/stdout/input/isolamento/Stop. Rollback do lote: remover a geração das representações e a seleção HTTP, preservando o cache privado já validado; nenhum catálogo remoto será ativado durante a prova.

## Lotes e validação

- [x] Criar seletor HTTP puro e testes de casos de negociação/condicionais; executar vermelho antes de implementar.
- [x] Acrescentar contrato opcional Core e testes de referências fechadas, colisões, órfãos e captura defensiva.
- [x] Acrescentar receita gzip determinística e teste com módulos reais, repetição e roundtrip.
- [x] Upload: verificar igualdade descomprimida limitada e impedir marcador em erro; cobrir bytes incorretos e expansão acima do tamanho declarado.
- [x] Serviço: seleção, integridade, headers, HEAD/304/406, revogação e cancelamento; testes com bucket existente.
- [x] Biome e typechecks Core/Studio/runtime; revisão independente do lote e correções antes da nova distribuição. Reviews118–121 encerradas; TSC8 completo e perfil bd560c69...cc67f0 verificados. Ajuste posterior de QA F1 tem TSC9 próprio ainda pendente.
- [x] Build e conferir os módulos lógicos contra distribuição4a: Pyodide/stdlib/Turtle permanecem idênticos; diferenças de bundles de infraestrutura devem corresponder ao contrato Core. Gzip descomprimido deve ser byte a byte igual ao respectivo módulo lógico da nova release. Atualizar perfil de validação somente quando o lote coeso estiver pronto. Build3d8/39 verificado; perfilbd560c69...cc67f0; runtime SDK/navegador com bytes atuais ainda têm gates próprios.
- [ ] Browser real Chrome/Edge comprovar wiregzip + decodedSHA, Turtle/análise/REPL/Stop e reuso. Revalidar SDK/preview e exportação web.
- [x] Adaptar evidência F1 para contar bytes de representação efetivamente negociada, mantendo a prova de boot frio. Não comparar bytes comprimidos com soma lógica nem relaxar metas. Review leve de callback/piso+TSC9 EXIT0; F1real atual em execução.
- [ ] Medir F1 frio/cache/editado e investigar falha aberta do contador; somente então série30 e demais gates globais de desempenho.
