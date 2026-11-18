# Revisão da rodada 44291902479

SHA `6aa3e791e`, workflow de homologação isolada, sem produção ou deploy.

Contratos, suíte isolada e typecheck passaram em Linux e Windows. Duas shards
Chromium passaram, assim como os casos selecionados Windows, Firefox e WebKit.
O job hospedado construiu a imagem e passou os ensaios reais de build, validação,
Python e objetivos Three em Docker. A shard Chromium 3 terminou com 123 aprovados,
10 pulados pelas condições existentes e uma falha no player público. Os pulos não
são cobertura executada; o workflow inteiro continua reprovado.

## Player público

O trace da falha registra CSP bloqueando `https://evil.test/strict`, como esperado.
Para `creative`, mostra `net::ERR_NAME_NOT_RESOLVED`: a requisição não passou pela
interceptação registrada na página. Portanto a ausência da requisição contada não
provava recusa pela CSP criativa. A hipótese anterior de viewport, suficiente para
algumas execuções Windows, não fechava a causa no Linux.

A interceptação agora pertence ao BrowserContext inteiro, abrangendo o renderer
isolado. O teste confirma também `naturalWidth=1`, exigindo que a resposta de imagem
tenha sido recebida e decodificada. No perfil estrito espera `complete=true` e
`naturalWidth=0`, além de nenhuma requisição interceptada; foi retirada a pausa
fixa de 400 ms. CSP, sandbox e runtime não foram relaxados. Três repetições Windows
passaram; a confirmação Linux do novo SHA continua exigida.

## Auditoria

O [aviso GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)
foi marcado como retirado em 18/11/2026, depois da consulta anterior registrada.
O mantenedor descreve os padrões como expressões não confiáveis na
[discussão upstream](https://github.com/micromatch/picomatch/pull/235).
Uma nova execução local de `audit:image` ainda recebeu o aviso pelo npm e falhou.
Não há exceção automática, downgrade forçado ou filtro para transformar esse
resultado em aprovação. A retirada do aviso não demonstra ausência de custo
patológico em globs não confiáveis; os limites e o isolamento dos builds continuam
necessários. Confirmar novamente a auditoria oficial no próximo run.

## Nova rodada e correções posteriores

`44348035213`, SHA `b40a335dd`: Docker, duas shards Chromium, Firefox/WebKit
selecionados e medição passaram. O runner Windows de navegador sofreu ECONNRESET
durante `npm ci`; não é resultado dos fluxos do produto. Contratos em Linux e
Windows reprovaram o caso real de reload no WebKit. A investigação e correção
estão em [Transação de saída](2026-11-18-studio-exit-transactions.md).

A interceptação por contexto ainda não fechou o player público no Linux. A fixture
passa a usar um servidor HTTPS real em loopback e uma imagem GIF de um pixel,
contando GETs recebidos pelo servidor. Não depende mais da interceptação do primeiro
pedido do iframe opaco, cuja corrida aparecia como resolução DNS de `evil.test`.
Um certificado de teste é gerado com OpenSSL em pasta temporária validada e removido
com o servidor; sua chave nunca entra no Git ou nos artefatos. Somente este teste
aceita o certificado autoassinado. CSP e sandbox do produto permanecem idênticos.

O controle estrito exige imagem completa sem pixels e nenhum GET no servidor;
o criativo exige pixels decodificados e exatamente o GET `/creative`. Três repetições
Windows passaram em 7 segundos. É prova com rede real local, sem serviço externo;
confirmar também no Linux. O mock anterior e os passes Windows isolados não eram
suficientes para declarar a falha encerrada.
