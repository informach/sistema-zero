---
status: resolved
file: packages/studio/src/runtime/python/workerSupervisor.ts
line: 115
severity: high
author: claude-code
provider_ref:
---

# Issue 003: Falha de imagem mata o worker sem exceção capturável em Python

## Review Comment

Toda rejeição do renderer cai em `fail('program-error', ...)`, termina o worker e não envia `graphics-response`. Isso também ocorre em erros normais de recursos, como falha de decodificação de um arquivo de imagem, impedindo o programa de tratar a operação com `try/except` como faria no Turtle oficial. `_exchange` já reconhece uma resposta com `error`, mas esse caminho não recebe as falhas de decode do frame.

Reprodução: PNG de 33 bytes, com signature/IHDR/CRC válidos e sem IDAT, passa `readTurtleImage` (1x1) e chega ao decoder. Tk lança TclError `unexpected end of file`, capturável, e o programa continua. Em prova isolada do supervisor, uma rejeição do callback gráfico resultou em fase failed, uma terminação, um release e zero graphics-response. Não foi executado E2E browser desse arquivo nesta revisão; o fluxo terminal foi confirmado diretamente no supervisor.

Distinguir violações de protocolo/cotas, que podem revogar a sessão, de erros recuperáveis da API de recursos. Devolver erro limitado/correlacionado ao único request gráfico pendente para ser levantado em Python, mantendo a sessão e liberando recursos parciais. Acrescentar prova real de `try: register_shape(corrompida); except ...: ...` seguida de desenho válido e Stop.

## Triage

- Decision: `VALID`
- Notes: Corrigido e revalidado. TurtleImageError retorna envelope limitado, `_exchange` levanta TclError capturável e a prova real Chrome/Edge carrega um GIF após PNG inválido. A perda de eventos encontrada na primeira revalidação também foi corrigida: o envelope de erro devolve events vazio e conserva a fila para a próxima troca.

## Revalidation

O catch de TurtleImageError retorna `events: inputs.splice(0)`, porém `_exchange` levanta TclError antes de `_flush` incorporar esses eventos à fila Python. Reprodução independente: enfileirar keypress 'a', provocar decode inválido; a resposta de erro contém a tecla, a próxima resposta tem events vazio e o backend captura TclError mas `update()` posterior não despacha nenhuma tecla. A recuperação de imagem agora existe, mas perde entrada recebida durante a operação.

Preservar eventos para a próxima troca ou incorporá-los à fila Python antes de levantar o erro, mantendo ordem e evitando entrega duplicada. As provas20/20 de runs/2026-10-16T23-33-04.863Z/report.json não incluem entrada durante decode inválido. Dispose durante decode foi exercitado separadamente: bitmap concluído depois do descarte é fechado uma vez e a troca rejeita como encerrada.

Revalidação final independente: tecla 'a' antes do decode inválido e 'b' depois dele; resposta de erro events=[], troca seguinte entrega ['a','b'] em ordem e a subsequente events=[]. Backend CPython com esse mesmo contrato captura TclError e despacha as duas teclas uma única vez em updates posteriores. Ambos os ensaios terminaram com exit 0. Nenhum novo browser foi iniciado para essa correção localizada.
