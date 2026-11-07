# Arquivos públicos e arquivos locais

O repositório público contém o código do produto, testes, migrações, lockfile,
configurações de build e deploy, documentação técnica e assets usados pela plataforma.
Exemplos de configuração podem ser versionados quando não contêm credenciais.

As pastas `.agents`, `.claude` e `.cache`, em qualquer nível, ficam apenas no disco local.
Skills de terceiros, configurações pessoais dos assistentes, conversas, caches, credenciais,
backups e resultados temporários de execução não devem ser enviados ao GitHub.
O `.gitignore` impede a inclusão acidental dessas pastas; não é necessário apagar as
cópias locais para removê-las do versionamento.

Documentação e assets de produto devem ter autoria ou autorização adequadas. Evidências
brutas de auditoria, transcrições e arquivos recebidos de terceiros merecem avaliação antes
da publicação; somente o que é necessário e autorizado deve entrar no repositório público.

Após uma reescrita de histórico, os clones precisam usar as novas referências. Não mesclar
uma branch antiga no histórico limpo: isso pode republicar os arquivos retirados. Trabalho
pendente deve ser recuperado a partir de um backup privado, trazendo apenas as mudanças
necessárias para uma branch criada sobre o histórico novo.
