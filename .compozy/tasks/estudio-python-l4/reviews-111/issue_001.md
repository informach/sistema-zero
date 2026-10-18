---
status: resolved
file: packages/studio/scripts/python/compile-stdlib.mjs
line: 11
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Compilador síncrono exige JSPI ausente em Node24 suportado

## Review Comment

O guard inicial exige typeof WebAssembly.Suspending==='function', embora a ferramenta só use loadPyodide/FS/runPython síncrono para compilar fontes confiáveis da stdlib. Isso recusa o Node24.15Linux usado na prova offline antes de importar qualquer vendor, contrariando o requisito anunciado Node24+ e impedindo a montagem padrão nessa instalação. JSPI não é necessário para esse caminho síncrono; a receita não usa run_sync, async Python ou I/O Python assíncrono.

Evidência real fornecida pelo implementador e conferida independentemente por leitura: `.cache/studio-python-l0/l8-stdlib-promoted-linux-1.log` contém AssertionError WebAssembly JSPI is required, actual undefined/expected function, compile-stdlib.mjs:11 e Node.jsv24.15.0. Na mesma imagem de ferramenta offline18ba…, o spike anterior executou a receita via loadPyodide/FS/runPython e produziu afc02bfc…/7066273bytes (`l8-stdlib-wasm-linux-spike-2.log`). Os ZIPs Linux/Windows do spike foram comparados byte-a-byte pelo revisor anteriormente. Não se afirma que a ferramenta promovida já passou após o patch.

O vendor pinado pyodide.asm.mjs detecta jspiSupported opcionalmente e só instala suporte de suspensão quando disponível. A documentação oficial [JavaScript Promise Integration in Pyodide](https://blog.pyodide.org/posts/jspi/) distingue o caminho: runPython desabilita stack switching; runPythonAsync/callPromising habilitam quando suportado. Isso sustenta remover apenas o requisito desnecessário da ferramenta síncrona.

Remover o guard JSPI do compilador de build e ajustar sua documentação; preservar Node24, checks SHA de todos os vendors/receita antes do import, versões CPython/Pyodide/magic, receipt e pin completo da saída. Não acrescentar flags experimentais nem relaxar o requisito JSPI do runtime interativo no browser. Reexecutar a ferramenta promovida offline em Node24.15Linux e verificar exatamente o pin afc… antes de declarar portabilidade corrigida.

## Triage

- Decision: `VALID`
- Notes: VALID/resolved após prova promovida corrigida fornecida pelo implementador (sessão51502 exit0, l8-stdlib-promoted-linux-2.log) e verificação independente leve. Removido apenas guard JSPI de build, com comentário de separação síncrono/browser; Node24, vendors, receita, versões/magic, receipt e outputpin preservados. README correto experiments/studio-python-runtime/README.md agora distingue Node24+Bun do JSPI interativo. CPython inline read-only comparou output/compiled.zip de stdlib-linux-promoted-1 ao cache preparado: bytes inteiramente iguais,7066273 eSHAafc02bfca854c42376d79358e1c808da58c49801de3b0e9e8b16e01b3a4d9b1a. Os4arquivos staged (compiler/recipe/stdlibmanifest/vendormanifest) são byte-a-byte iguais aos atuais;7vendors staged conferidos por tamanho/SHA. Receiptv2 confirma CPython3.14.2/magic2b0e0d0a/559módulos/fontes preservadas. Prova DockerLinux/Node24.15/offline foi executada pelo implementador, não repetida pelo revisor. Não qualifica novo runtime/SDK/desempenho, nem altera requisito JSPI browser. Nenhuma fonte de produção editada pelo revisor.
