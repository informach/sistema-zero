# Lote 2 — persistência, catálogo e autorização

O serviço mantém projetos compartilhados, revisões imutáveis, restauração como nova revisão e compare-and-swap. IDs de operação permitem repetir uma requisição sem duplicar a alteração. O catálogo tem identificador e SHA-256 fixados no documento; os modelos são privados e endereçados pelo conteúdo.

As rotas do gateway e do BFF Admin têm lista explícita de operações e exigem administrador ativo. Staff, Kids e chamadas sem identidade válida não recebem acesso ao acervo. Uploads têm limite de tamanho, concorrência, integridade e validação de GLB incorporado. Nenhum GLB foi adicionado ao Git.

Revisão: corrigida a identidade duplicada de Elysia causada por atualização indireta de @types/bun; dependência fixada na versão compatível. Rotas GET não geram auditoria de escrita. A aplicação ao ensaio ainda depende do runtime do lote 5.

Evidências: 9 testes de serviço/PostgreSQL real aprovados, 100 testes direcionados do gateway aprovados, tipagem dos serviços/gateway/Admin aprovada. As 107 peças GLB locais passaram pela validação de SHA-256, formato e recursos incorporados. O armazenamento R2 foi detectado como configurado; isso não equivale a um teste ponta a ponta de publicação. Testes do BFF e upload são executados antes do commit deste lote.

As migrações foram geradas pelo comando do pacote e verificadas em PostgreSQL descartável local, sem aplicar alterações ao banco da plataforma.
