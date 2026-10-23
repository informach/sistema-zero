---
status: resolved
file: packages/studio/src/components/preview/PythonEditorPreview.tsx
line: 37
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Mostrar a omissão reportada pelo buffer de console Python

## Review Comment

O adapter de eventos encaminhava somente `event.text` ao logsStore e descartava `omittedLines` e `omittedChars`. Esses contadores informam o descarte que já ocorreu dentro do buffer limitado do runtime, antes de o host receber os eventos. O rate limit próprio do logsStore não detecta nem substitui essa informação.

Reprodução independente com createPythonConsoleBuffer e PythonEditorPreview/stores reais: append de 100.000 caracteres em stdout e drain produziram 15 batches; o primeiro informou 36.864 caracteres omitidos. Após encaminhá-los pelo componente, havia 15 logs e nenhum aviso de omissão. A saída aparecia incompleta sem indicar que o runtime havia descartado parte dela. O batch pode conter simultaneamente texto retido e contadores de descarte.

Emitir um aviso limitado e explícito quando os contadores forem positivos e preservar o texto do mesmo batch. Eventos que contêm somente o aviso não devem produzir uma linha vazia adicional. Respeitar os limites existentes do console e não ampliar o buffer para esconder o problema.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador: o adapter emite warn antes do texto retido, e só cria um log textual quando event.text não está vazio. Revalidação independente com buffer/componente/stores reais passou. O revisor não modificou implementação.

## Verification

- Prova independente por stdin (`bun -`) repetiu o buffer de 100.000 caracteres: primeiro log warn com 36.864 caracteres omitidos, seguido dos 63.136 caracteres retidos, comparados integralmente. Um evento adicional com somente contadores produziu exatamente um warn e nenhuma linha vazia.
- A nova regressão permanente usa createPythonConsoleBuffer real e confere a concatenação integral da saída preservada.
- `bun test src/components/preview/PythonRuntimePreview.test.tsx src/runtime/capture.test.ts`: 9 pass, 0 fail, 49 verificações, exit 0. Nenhum browser ou TSC foi iniciado pelo revisor.
