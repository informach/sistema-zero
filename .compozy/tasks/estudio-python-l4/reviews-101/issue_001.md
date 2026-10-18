---
status: resolved
file: packages/core/src/studio/pro-revision-configuration.ts
line: 48
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Ordenar extensões no CAS muda a identidade de execução

## Review Comment

O parser da configuração v2 ordena extensions por id. A captura CAS chama esse parser, enquanto preparePythonProExecutionSnapshot preserva a ordem de installedExtensions do documento. Como a receita de execução v1 inclui a lista nessa ordem, a nova materialização prepareStudioPythonProExecution reconstitui outra configuração/revisão para o mesmo projeto quando a ordem de instalação difere da ordem alfabética. A identidade resultante não corresponde ao snapshot do editor que a ponte promete preservar.

Reprodução independente `packages/members/.cache/review101-extension-order.test.ts`: mesmo projeto Pro Python refinado, ordens [a-extension,z-extension] e [z-extension,a-extension]. O controle ordenado coincide; na ordem inversa, editor preserva [z,a], captura CAS/base+helper devolvem [a,z] e outro digest de execução. Extensões sintéticas válidas no contrato portátil; não se afirma que sejam aprovadas ou concedidas pelo catálogo do host. Próprio+permanentesB1/B2.1:16pass1fail/56asserts exit1, falha na configuração reconstituída. Setup inicial de probe teve erros próprios de formato de test.each/timestamp, corrigidos antes desta reprodução; não eram defeitos do produto.

Preservar a ordem de extensões ao capturar/recompor configuração v2, mantendo objetos canônicos e isolamento dos valores. Não alterar a receita/hash de execução v1 ou reinterpretar publicações existentes. Conferir as duas ordens também no CAS, aplicação de alterações e inverso v2; JavaScript v1 não usa esse parser e deve permanecer byte compatível.

Raiz na ligação CAS→execução introduzida nesta feature; não duplica100 (admissão/path dist) nem revisões anteriores do transporte. B2.1 ainda é materialização isolada, sem executor/preview/UI ativados; não se classifica essa ausência explícita como defeito.

## Triage

- Decision: `VALID`
- Notes: Resolvido após confirmação do implementador e revalidação independente. Parser v2 agora retorna o clone validado sem ordenar extensions; receita de execução v1 permanece a existente. Prova própria original mantém as duas ordens: ambas devolvem configuração/revisão exatamente iguais ao snapshot do editor. Próprio+permanentesB1/B2.1:19pass0fail/67asserts exit0; matriz permanente aplica mudança de fonte e inverso v2, restaurando pacote/hash completo em ambas ordens. Regressões StudioPythonProRevision+PythonProApplication8pass0fail/35asserts exit0 e Biome3arquivosexit0/nofixes. Dados antigos já ordenados conservam o mesmo valor/lista; não foi reinterpretado manifesto de publicação nem alterado JavaScript v1. Nenhum outroachado confirmado no recorteB2.1. Produção/permanentes intocados pelo revisor; sem executor/preview/UI ligados ou qualificaçãoSDK/browser/performance/disponibilidadeglobal.
