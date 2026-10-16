# Review F3 — produção assistida e fluxo de revisão

Concluído em 16/10/2026, antes das provas visuais do F4.

- O pedido usa o executor existente. Exemplos das três receitas apenas preenchem a instrução; não executam nem aprovam automaticamente.
- Guia deriva do catálogo tipado e de evidências factuais atuais do contexto. No máximo seis imagens verificadas são anexadas; pedido limitado a texto não anexa imagens. Preview identifica as fontes e distingue capturas de gravações.
- Texto pode mudar título/rótulos; efeito pode mudar foco. Identidade, hash e evidência permanecem protegidos nesses escopos. A validação central também alcança gravação direta, fora da IA.
- Corrigido no review: transporte nativo precisava de `demonstration` obrigatório e nullable, convertido para campo ausente no contrato persistido. Round-trip com demonstração preenchida preserva todas as fontes.
- Acrescentada defesa de projeto no seletor de imagens, além da autorização central já existente.
- PostgreSQL isolado: 32 testes existentes de execução/aprovação/arquivos passaram. Dois testes adicionais da demonstração passaram: hash adulterado reverte a transação; contexto inclui fonte fora da pauta; conta sem acesso é rejeitada; aprovação fixa a fonte e sua invalidação bloqueia novo aceite sem alterar edição anterior.
- Diagnóstico de teste: a asserção `bun:test` `.rejects.toThrow` deixou uma transação aguardando o cliente. Instrumentação mostrou fixture, contexto e rollback concluídos; a chamada seguinte de autorização travava. `node:assert/strict.rejects`, já usado nas suítes PostgreSQL, eliminou o bloqueio. Nenhum timeout aumentado ou código de produção alterado para contorná-lo.
- Typechecks dos contratos, serviço, produção, workbench e desktop passaram. Build desktop passou. Suíte SQLite em Node: 10 testes passaram. Testes de domínio e round-trip nativo: 6 testes, 63 asserções passaram antes da defesa adicional, reexecutada no F4.

Provas de imagens/MP4 e build web ficam em F4. Fixtures de banco não comprovam upload real, aprovação humana ou campanha publicada.
