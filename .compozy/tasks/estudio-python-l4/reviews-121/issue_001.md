---
status: resolved
file: packages/studio/src/export/pythonWeb.ts
line: 81
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Coletores pedem artefatos gzip pela rota lógica proibida

## Review Comment

A nova distribuição inclui os artefatos internos `_http/gzip/<sha>.gz` em distribution.files. buildPythonWebFiles itera todos esses descritores e faz GET de directory/file.path, mas o registry recusa explicitamente esse namespace antes de servir o objeto. Assim qualquer distribuição com httpRepresentations interrompe a exportação web ao chegar ao primeiro gzip, apesar de runtime/metadata/projeto válidos e autorização fresca.

A mesma raiz alcança o serviço protegido: withIsolatedPythonProject (`packages/studio-runtime/src/python-inspection.ts`115) materializa todos distribution.files; o readRuntime fornecido por `src/python-requests.ts`363 chama registry.serve na rota lógica pública e recusa a resposta404 como409. Portanto inspeção/validate SDK dessa nova distribuição também não pode completar a coleta por esse caminho. Esta segunda consequência é estabelecida pela cadeia de fontes real; não é alegada uma nova execução SDK/Docker independente.

Prova causal independente: `bun test ./.cache/review121-compressed-consumers.test.ts` no worktree raiz, exit1,0pass/1fail/1assert. Usa buildPythonWebFiles real, Core/release/catalog/snapshot e store/registry reais, projeto Classic real refinado, runtime inerte com um gzip declarado e upload validado; somente o transporte fetch delega diretamente ao registry, sem inventar resposta404. Metadata e arquivos lógicos anteriores retornam200, seguido de `_http/gzip/340d352b...gz`404 e erro “Não foi possível obter um arquivo do pacote Python”. Não abre interpreter, navegador, SDK ou R2 remoto. A distribuição recém-gerada f67a contém12 desses artefatos; o probe usa um para isolar a causa.

Definir coleta dos artefatos de transporte separada da resolução de módulos lógicos, preservando pin/manifesto/SHA/completude e a proibição de importar/servir namespace interno como módulo público. SDK e export precisam materializar exatamente o pacote autorizado, inclusive relação logical/representação; não basta ignorar descritores mantendo uma alegação de pacote completo ou relaxar o registry sem contrato explícito. Acrescentar regressão real de export e entrada protegida com distribuição comprimida, mantendo legado sem representações.

## Triage

- Decision: `VALID`
- Notes: Raiz também reproduziu em permanentes `l8-http-compression-consumers-before-1.log`: staging SDK real via registry pede gzip→404; browser-resource map recusa conjunto lógico. Plano: definir no Core o conjunto completo de arquivos lógicos de uma distribuição verificada, excluindo somente artefatos de transporte declarados. Exportação/SDK coletam e verificam todos esses arquivos lógicos; preservam deployment completo original e pin, sem repinar nem expor namespace gzip. Mapa fechado SDK compara conjunto exato de arquivos lógicos contra o deployment integral verificado e recusa faltantes/duplicados/tamper; gzip não é dependência executável nem arquivo autoral. Contrato/planos documentarão que o pacote executável lógico é completo, não que todos os artefatos de transporte foram materializados. Extensão mínima necessária em Core/helper, contrato Node gerado, browser-resource map e testes além dos dois coletores; perfil/imagem precisam regeneração/revalidação. Webexport red independente preservado; gates e patch pendentes.
- Resolution: Helper Core e três consumidores/mapa corrigidos; independente10testes/96asserts exit0, incluindo reproduzidor original fortalecido, export Classic/Pro, staging via registry e mapa FS fechado. Fullmetadata/pin/SHA lógico/namespace404 preservados. Recibos TSC8 produção Runtime/testes/Studio lidos, todos exit0 (12:45:21/24 e12:49:28-03:00). Raiz informou genvalidationprofile+--check exit0 após TSC; JSON atual lido fingerprintbd560c69d4419d3a119136ca2b0104d8d22f4ff790b0908f68a9c3f322cc67f0. Resolve compatibilidade lógica dos coletores; Build3/imagemSDK/browser/exportE2E novos permanecem gates separados, sem claim de execução ou desempenho. Nenhuma produção/permanente alterada pelo revisor.
