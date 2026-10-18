# Estado

- [x] L0 local revisado e aprovado; teste externo adiado por instrução do usuário.
- [x] L1.1 contratos/schemas/resolver implementados; 13 testes/114 verificações, typecheck Core.
- [x] Review L1.1 e correção do conflito de caminhos, registrado em reviews-001.
- [x] L1.2 envelope Core de quatro variantes, cópia JSON, metadados Pro compartilhados e upgrade puro 2→3. Review/correção em reviews-002; 15 testes/92 verificações.
- [x] Reutilizar cópia JSON no Studio e separar transformações históricas 1→2. Migração/Coordinator: 31 testes/162 verificações; review sem novos achados.
- [ ] Integrar variantes/refinos semânticos e factories com o catálogo real, mantendo writer 2 até os consumidores preservarem 3.
- [x] L1.3 fingerprint Studio v2, leitura v1, fronteiras HTTP e comparação de reenvio compartilhada. Review/correção em reviews-003. Pinta/canonicalJson preservados.
- [ ] L1.3 revisão Pro v2: contrato puro implementado e revisado, dois achados de caminhos corrigidos (reviews-004). Regressão independente: 24 testes/137 verificações. Store ainda captura v1; integrar com Project v3.
- [ ] L1.3 projeções e resumos preparados/revisados; quatro variantes atravessam IDB/CAS/recuperação e cloud parts/JSON. Falta ativação com reader/writer/Project e export de produto. Review005 corrigiu lock grande no meta.
- [ ] Verificação e review completo L1 antes de L2.

Evidência atual: Core 1.228 testes/77.159 verificações/94 arquivos, zero falhas; typechecks Core, Studio, Members e Shell passaram. Nova suíte de persistência/regressão: 115/530; nuvem: 48/218. Correção do meta: 11/73. Factory v3 preparada com catálogo do host: 5/26; review e typecheck dessa última adição pendentes. Regressores Pro/Coordinator 30/169; builder BFF/tools/orchestration 37/173; envios/rascunhos HTTP Members 13/38; BFF criações 47/190. Não representa Python habilitado na interface.
