# Diagnóstico paralelo dos gates Linux finais

Fonte de produto: `af09f47d1`. O workflow desta branch copia a configuração e os passos canônicos do job principal, omitindo apenas as seis etapas já exercitadas: smoke da imagem, cancelamento RPC, objetivos Python, objetivos Three, testes dos pacotes e suíte Studio. A lista é explícita em `prepare-linux-gates-r1.ts`, no namespace operacional de QA do coordenador.

Mantém instalação congelada, imagem/perfil, navegadores e compilador corretos, geradores e exports, PostgreSQL descartável e suas migrações/testes, Pensa integrado e tipagem de todos os pacotes. Não usa segredos de produção nem contém job de implantação. Seu propósito é antecipar falhas dos passos posteriores; não substitui o CI obrigatório completo da branch staging.

Execução: pendente. O código da aplicação e seu CI principal não recebem esta alteração.
