# Arquitetura

Host valida documento, catálogo e autorização; frame confiável limita mensagens e controla geração; worker contém CPython/Pyodide sem privilégios de host. Distribuição de código fixa por SHA256 com licenças. Não alterar COOP/COEP global nem conceder allow-same-origin.

Snapshot captura fontes UTF8 e bytes de assets antes de awaits, com entrypoint e lock do documento. Worker monta o snapshot em FS temporário e executa compile(bytes) em um módulo __main__ real. REPL usa o mesmo dicionário, stdin distingue linha vazia/EOF. Saída passa pelo Writer.write de Pyodide e decoder incremental, com retenção limitada antes do envio; não usar batched, pois uma linha sem LF pode crescer ilimitadamente antes de chegar ao buffer.

Runtime qualificado: Pyodide314.0.7, CPython3.14.2. Bootstrap clássico Blob importa módulo fixado, Trusted Types privado no frame e nome reservado no worker. L0/ADR001 estabelece ACK≤250ms e liberação física≤3s na carga local qualificada; cada integração nova deve repetir os testes pertinentes.
