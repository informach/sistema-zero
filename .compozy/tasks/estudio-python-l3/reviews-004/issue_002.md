---
status: resolved
file: packages/studio-runtime/src/python-distributions.ts
line: 136
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Exceções após GET deixam o stream do artefato aberto

## Review Comment

Depois de abrir o objeto do artefato, o handler cancela o body nos retornos explícitos de recusa, HEAD e 304. Porém, se ocorrer uma exceção antes da transferência do stream para a Response, o catch externo retorna 404 sem cancelar o body já adquirido. Há dois caminhos reproduzíveis: status(hash) lançar na segunda consulta, na linha 141; ou pythonFrameContentSecurityPolicy recusar uma requisição HTTP não local, na linha 153, depois dos dois GETs.

Reprodução independente com uma distribuição válida e streams instrumentados: tanto a consulta de status que falha quanto a URL http://runtime.example retornam HTTP 404; os objetos abertos são complete.json e files/pyodide.asm.wasm, mas somente complete.json recebe cancel(). O stream de WASM fica sem consumo nem cancelamento explícito. Isso perde a liberação determinística da leitura do armazenamento justamente nos caminhos de erro e pode acumular recursos sob requisições repetidas.

Manter a posse do body adquirido em um escopo com finally, cancelando qualquer stream que não tenha sido entregue com sucesso à Response. Preservar o retorno fechado em caso de falha da política, sem deixar uma falha de cancelamento substituir a resposta original. A política derivada da URL também pode ser validada antes de abrir objetos, mas isso não elimina a necessidade de cleanup se a segunda consulta operacional lançar. Acrescentar provas de status que lança após o GET e de URL recusada, verificando que todos os streams não entregues são cancelados.

## Triage

- Decision: `VALID`
- Notes: Reprodução via Bun/stdin, sem navegador, confirmou 404 e ausência de cancelamento do body do artefato nos dois caminhos. A reprodução não atribui consumo específico de memória ao R2 nem demonstra vazamento permanente após o encerramento da requisição; confirma a falta de cleanup explícito do recurso adquirido.

- Resolution: pendingBody acompanha o stream adquirido até seu cancelamento ou entrega à Response; finally cancela os recursos não entregues. As duas reproduções originais agora retornam 404 com 2 streams abertos e 2 cancelados. Controle adicional confirmou que uma rejeição de cancel() não substitui a resposta 404 original.
- Verification: bun test tests/python-distributions.test.ts: 8 testes, 60 verificações, nenhuma falha. Reprodução independente via Bun/stdin confirmou a eliminação do sintoma original; Biome dos dois arquivos e git diff --check passaram. Nenhuma fonte foi modificada pela revisão.
