---
status: resolved
file: packages/studio/src/python/extensions/operations.ts
line: 70
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Revalidar a política atual ao instalar extensões

## Review Comment

A instalação consultava a autorização apenas antes das suspensões de importação, validação e CAS. Em Classic e Pro, uma chamada inicialmente autorizada ainda instalava Turtle depois de `grantedExtensionIds` ser revogado: a reprodução com `environment.access()` dinâmico registrou uma única consulta e terminou com a extensão instalada, embora a política atual devolvesse `[]`. A identidade do projeto e a guarda de observação não representam essa política contextual.

A primeira correção acrescentou `beforeCommit` após o reader Classic e dentro do `beforePublish` Pro, antes de registrar histórico. Esse posicionamento cobre a revogação observada pelo mesmo callback, mas o painel ainda passava o `environment` e o `allowedIds` capturados na renderização que iniciou a ação. Uma segunda reprodução com React/happy-dom confirmou a lacuna: retardar a chamada de `applyPythonExtensions`, clicar Instalar, atualizar o Provider com outro ambiente que nega Turtle e liberar a chamada ainda conclui a instalação. A verificação final consulta o objeto antigo, mesmo após a atualização legítima das props/contexto do host. Trocar o ambiente por `null` ou substituir a curadoria tem a mesma fronteira.

Preservar a guarda síncrona imediatamente antes da publicação e fazê-la consultar a política vigente do host/atividade, por exemplo com getter apoiado em referência atualizada no painel. Não basta revalidar antes de `applyProEditorChange`, porque esse caminho ainda suspende. A recusa deve manter documento, dirty state e histórico intactos; remover a extensão continua possível sem runtime aprovado, conforme o contrato desta fatia.

## Triage

- Decision: `VALID`
- Notes: Duas formas da mesma causa reproduzidas com funções reais e corrigidas pelo implementador. Revalidação independente confirmou `policy()` obrigatório, referência da última política React commitada via `useLayoutEffect`, revogação no unmount e checagem síncrona final em Classic e Pro. Testes atuais cobrem troca do Provider e da curadoria; provas adicionais recusaram ambiente trocado por `null`, desmontagem durante instalação e substituição da política Pro somente após a segunda verificação, exigindo a terceira no commit. Documento, dirty state e histórico permaneceram intactos nos cenários recusados. Nenhuma fonte foi alterada pelo revisor.

## Verification

- `bun test src/python/extensions/operations.test.ts src/components/extensions/PythonExtensionsPanel.test.tsx src/state/proRevision.test.ts src/state/pythonProApplication.test.ts`: 22 pass, 0 fail, 102 expect() calls, exit 0.
- Provas adicionais em memória/React real: `environment-null`, `unmount` e substituição tardia de política Pro passaram; a última registrou três consultas ao getter e nenhum item de histórico.
- Biome dos cinco arquivos de correção/ação/painel/Pro examinados: exit 0, sem alterações. Sem TSC ou navegador.
