# Lote 4 — review de exportação

- Instruções derivadas de package.json, devScript, scripts existentes, engines.node, packageManager e lockfiles. Não presume Vite/dist/dev em todos os projetos. README, LEIA-ME e créditos do autor permanecem intactos.
- Caminho de fonte não recebe avisos exclusivos de Docker/deploy. Conflitos de gerenciadores, manifesto ausente/inválido e lockfile npm ilegível são visíveis, sem execução de scripts no download.
- Pedido único por instância, cancelado ao desmontar/trocar projeto. Buffers síncronos são descarregados antes e depois dos writers assíncronos. Snapshot usa a autoridade canônica; identidade do adapter/perfil e troca A → B → A são cercadas.
- Falhas não produzem ZIP parcial; avisos aparecem em modal depois do download. Compressão grande usa o worker validado no lote 1.
- Doze testes de fonte/instruções/concorrência passaram, mais a regressão de 56 testes da barra/builders/fonte. Chromium confirmou texto recém-editado no ZIP, materiais, avisos visíveis e falha real de carregamento do worker sem download parcial.
- As provas de exportação e a medição comparativa estão consolidadas no [full review](full-review.md), com os achados corrigidos, verificações finais e limites externos.
