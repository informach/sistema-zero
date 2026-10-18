---
status: resolved
file: packages/studio/src/python/extensions/turtle/catalog.ts
line: 36
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Curadoria Turtle omite comandos necessários ao efeito

## Review Comment

As dependências declaradas adicionam imports, receptor e callback, mas omitem parceiros de execução necessários para compor as APIs oferecidas. Isso reproduz a lacuna de composição pedagógica da seção 7.2 no novo catálogo Turtle, apesar de o resolvedor de seleção já estar corrigido para as famílias de Programação.

Com o catálogo real e todos os IDs aprovados, selecionar somente `sz_py_turtle_module_onkey` retorna como único bloco Turtle o próprio onkey. Selecionar `sz_py_turtle_screen_onkeypress` retorna apenas esse método e o construtor Screen: não há listen nem mainloop/done para foco e processamento dos eventos. Os próprios métodos upstream, em vendor/turtle.py:1394 e :1424, exigem foco e apresentam listen no exemplo. Outras duas reproduções: tracer isolado, cujo default é zero, não disponibiliza update; end_fill isolado não disponibiliza begin_fill. Essas relações são descritas nos próprios textos pedagógicos de labels.ts, mas não aparecem na seleção.

Declarar as dependências funcionais dessas famílias, respeitando o proprietário correto para métodos e formas procedurais. Eventos precisam de uma forma acessível de manter/processar eventos e teclado precisa de foco; tracer desativado precisa permitir atualização; preenchimento precisa permitir início e conclusão. Verificar também os aliases canônicos. As dependências devem continuar sujeitas à aprovação do host e à instalação explícita da extensão; não ampliar autorização silenciosamente.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador com mainloop, listen, update, pares begin_fill/end_fill e stamp. Revalidação independente confirmou sete curadorias isoladas, incluindo onkeyrelease e formas de método/procedurais; retirar a aprovação de um parceiro produziu dez recusas explícitas. O uso de parceiros procedurais para Screen/Turtle conserva a tela compartilhada e passa pelos gates de instalação/aprovação. Regressão fresca: 21 pass, 0 fail, 1399 verificações; Biome, exit 0. A seleção inicial adicional disponibiliza exatamente dez comandos canônicos quando Turtle está instalada e aprovada; não inclui fd duplicado nem apresenta Turtle sem instalação ou sem aprovação.
