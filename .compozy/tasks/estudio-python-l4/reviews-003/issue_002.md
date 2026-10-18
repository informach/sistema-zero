---
status: resolved
file: packages/studio/src/runtime/python/turtle/turtle.py
line: 1721
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Cota de itens deixa uma tartaruga parcialmente construída

## Review Comment

A guarda nova impede criar a129ª tartaruga, mas não protege a construção contra a cota independente de itens. RawTurtle.__init__ acrescenta self a screen._turtles antes de reservar/criar suas primitivas. Se _createline/_createpoly falha por MAX_ITEMS, a instância permanece registrada sem campos obrigatórios e futuras atualizações da tela falham por AttributeError. A exceção de cota é capturável em Python, mas a tela fica em estado inconsistente.

Reprodução independente com CPython3.14.2, engine/backend reais e transporte sem desenho: criar Screen, tracer(0), uma Turtle e carimbos suficientes para atingir exatamente100.000 itens; capturar RuntimeError de uma nova Turtle; chamar screen.update(). Resultado: screen.turtles() contém duas entradas e update lança `AttributeError: 'Turtle' object has no attribute 'currentLine'`. O teste usa apenas a API pública para criar os itens e a tartaruga; não reduz a cota nem injeta itens falsos.

Na receita de derivação/backend, garantir criação consistente diante da cota de primitivas, reservando o conjunto necessário antes de mutar a lista ou revertendo integralmente o registro e os recursos criados em falha. Aplicar a mesma disciplina ao clone, que também registra q antes de concluir suas alocações. Acrescentar casos com zero e poucas vagas restantes, além do teste existente de128 tartarugas; após recusa, a tela e a tartaruga anterior devem continuar atualizáveis. Regenerar turtle.py pela receita, sem editar somente o arquivo gerado.

## Triage

- Decision: `VALID`
- Notes: A guarda agora verifica a capacidade de todas as primitivas antes da mutação do construtor/clone; clone inclui a primitiva adicional para encerrar uma linha existente. Correção aplicada na receita e engine regenerado, com reprodução independente das fronteiras.

## Revalidation

Ensaios com 100.000 itens criados por stamp(), sem reduzir cotas nem inserir itens falsos: construtor e clone sem linha pendente recusam quando restam 0, 1 ou 2 vagas e aceitam com exatamente 3; clone com linha desenhada recusa com 0, 1, 2 ou 3 e aceita com exatamente 4. Cada recusa preserva número de itens/tartarugas e linha/ID originais; screen.update() funciona após cada tentativa e após cada sucesso. Cada sucesso termina com 100.000 itens e duas tartarugas completas. Processo CPython 3.14.2 -I -B terminou exit 0; transporte controlado, sem alegar prova de renderização.

Derivação novamente executada somente em memória: engine byteidêntico ao gerado atual, SHA256 6c72e4f441b715ab7c4df12934dee81d6da141eec018ac69bed2736cf6063d36; limits.json e constantes Python seguem iguais.
