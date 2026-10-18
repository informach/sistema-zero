---
status: resolved
file: packages/studio/src/runtime/python/turtle/_sz_turtle_backend.py
line: 298
severity: medium
author: claude-code
provider_ref:
---

# Issue 004: Referência a tartaruga antiga falha após limpar a tela

## Review Comment

O backend assume que todo identificador solicitado pelo engine ainda existe em `_items`. Porém `Screen.clear()` remove os itens gráficos sem destruir as referências Python mantidas pelo programa. Na referência Tk, consultas de coordenadas de um item apagado retornam uma lista vazia e operações sobre esse identificador são inócuas; o estado semântico da tartaruga continua acessível.

Reprodução pública, sem APIs privadas: `t = turtle.Turtle(); screen.clear(); t.forward(10); print(t.position())`. CPython 3.14.2/Tk termina normalmente e imprime `(10.00,0.00)`. O backend lança `KeyError: 4` em `_pointlist`, chamado pelo registro de undo interno de `RawTurtle._goto`, antes de atualizar a posição.

Reproduzir a semântica de item apagado nas primitivas de leitura/escrita relevantes (`_pointlist`, `_type`, patches e imagens), sem recriar silenciosamente objetos visuais que o Tk não recria. Acrescentar conformance de clear seguido de uso/reset de referência antiga, conferindo estado e cena quando o renderer estiver disponível.

Revalidação: `forward` agora retorna `(10,0)` e `reset` retorna `(0,0)` em ambos os backends, sem erro. Entretanto, o novo early-return em `_bind` estende incorretamente o no-op às vinculações: após `clear`, `t.onclick(lambda x,y: None)` lança `_tkinter.TclError: item "3" doesn't exist` na referência, mas é aceito silenciosamente no backend. Consultas de coordenadas e patches têm semântica diferente de `tag_bind` sobre item apagado. Manter diagnóstico explícito para esta última operação, sem exigir/importar Tk no navegador.

## Triage

- Decision: `VALID`
- Notes: Corrigido e revalidado. Movimento/reset de referência antiga preservam estado; vínculo em item apagado agora gera erro explícito com nome TclError e mensagem compatível, sem importar ou simular um módulo Tk. A fixture ampliada produz `[10.0, 0.0]` e `['TclError', 'item "3" doesn\'t exist']` em ambos os backends. Harness fresco: dez pares aprovados, engine-1792192825333614600.json. Nenhuma mudança de implementação feita pelo revisor.
