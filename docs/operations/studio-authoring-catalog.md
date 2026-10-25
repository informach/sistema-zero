# Catálogo do Estúdio no Members

O catálogo aprovado contém os manifestos e as permissões das releases. Não contém tokens nem
origens dos serviços. O catálogo com duas releases excede os 32.768 bytes aceitos em uma variável
do Railway. Em staging e produção, ele acompanha o código da imagem; a variável
`STUDIO_AUTHORING_POLICY_SHA256` seleciona o arquivo por SHA-256 dos bytes completos.

Os arquivos ficam em `packages/members/src/infrastructure/config/studio-authoring-catalogs/`.
O Dockerfile já copia essa árvore de fontes. Não é necessário copiar docs, caches ou provas para
a imagem. O Members verifica tamanho, hash, schema, manifestos e consistência do catálogo antes
de abrir conexões. Arquivo ausente ou inválido interrompe o boot. Não há download nem fallback.

## Preparar uma revisão

1. Gere e revise o catálogo pelo plano canônico de promoção Python, preservando as releases
   necessárias para projetos salvos. Empacotar um arquivo não qualifica um runtime.
2. Formate o JSON antes de empacotar. A partir da raiz, execute:

   ```sh
   bun packages/members/scripts/package-studio-authoring-policy.ts caminho/catalogo.json
   bun test packages/members/tests/unit/studio-policy-configuration.test.ts
   ```

3. Versione o arquivo produzido e revise suas diferenças. Não renomeie nem edite um arquivo
   depois de calcular o hash. Uma alteração produz outro arquivo. O teste confere todos os
   arquivos distribuídos, inclusive os mantidos para rollback.
4. Integre e implante o código com o novo arquivo, mantendo a configuração atual até o serviço
   concluir a atualização. Confirme o SHA da aplicação e a presença do arquivo na imagem.

## Ativar e voltar

`STUDIO_AUTHORING_POLICY_JSON` continua disponível para configurações locais e implantações
existentes. As duas origens são mutuamente exclusivas: configurar JSON e SHA256 juntos falha.
Ausência de ambas preserva o comportamento JavaScript sem catálogo Python.

Após a qualificação do runtime e sem uma onda concorrente de deploy:

1. Confira o plano aprovado e leia as variáveis atuais sem registrar credenciais.
2. Com deploy automático suprimido, configure o SHA256, remova a variável JSON e configure
   `STUDIO_RUNTIME_HOSTS_JSON` com os hosts do mesmo plano. Antes de reiniciar, releia e confira
   os três valores. Não implante estados intermediários.
3. Faça o redeploy do Members, aguarde a saúde da nova instância e confirme o ambiente realmente
   carregado. Verifique descoberta, abertura de projeto existente e execução na release nova.
4. Para rollback, restaure o conjunto completo de política e hosts anteriores, com a mesma
   supressão de deploys intermediários, releia e reinicie. Não deixe os hosts de uma release que
   não existe no catálogo selecionado.

O seletor não altera direitos por conta, conquistas, privilégios de admin ou curadoria de aulas.
É somente a origem da configuração de implantação. Revogar uma release ou excluir seu arquivo
é uma decisão separada: não faça isso para reduzir tamanho de variável.

## Catálogo desta entrega

- SHA256: `88a14e73605fa5b3ddaee7344c35b3571db8bba7cd9d1e7722856e356430e6c7`.
- Tamanho: 74.491 bytes formatados; o JSON compacto tinha 51.612 bytes.
- Conteúdo igual ao campo `configuration.members` dos planos R4 de staging e produção.
- Inclui as duas releases; a nova é `2026-10-25-raylib-1`.
- Provas locais do carregador não substituem CI, implantação ou a aceitação pelas interfaces.
