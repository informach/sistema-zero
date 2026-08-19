# Remediação do full review de 18/08/2026

## Objetivo

Corrigir os seis defeitos reproduzíveis encontrados no fluxo de criações em nuvem, isolamento do Pinta e recuperação administrativa, além de reconciliar o sétimo achado com a remoção intencional do teto de assets que ocorreu durante o review, sem substituir as mudanças já presentes no worktree.

## Decisões

1. A quota pertence ao repositório de criações. O commit revalida a capacidade sob lock por perfil, porque várias reservas podem existir enquanto os PUTs acontecem fora da transação. Reservas abandonadas não bloqueiam capacidade para sempre; um commit recusado tem seu blob sem referência removido pelo BFF.
2. A exclusão de conta só remove o índice após o BFF apagar todos os objetos UGC sob os prefixos dos perfis. A listagem e a exclusão em lote ficam encapsuladas no adaptador R2.
3. O espelho global do Studio ganha identidade: um detach só remove a instância que ele próprio instalou.
4. O clipboard persistente do Pinta recebe namespace explícito do host; o perfil faz parte da chave de `localStorage`.
5. A restauração administrativa valida o payload depois de descobrir o tipo do bloco: Studio exige `files`; Pinta usa o validador estrutural do asset copiado para o serviço.
6. O teto local de 64 assets foi removido do contrato enquanto o review ocorria. A reconciliação deixa de referenciar `maxAssets`; quantidade passa a ser limitada apenas pelas quotas de nuvem e pelo orçamento portátil de 32 MiB, como documentado no pacote.
7. A sincronização decide conflito a partir da marca confirmada da última sincronização. Datas do cliente servem como metadado, não como relógio global entre dispositivos.

## Testes

- PostgreSQL real para commits concorrentes e revalidação atômica da quota.
- Testes de rota/adaptador para a limpeza completa do prefixo UGC.
- Testes puros de lifecycle para a troca de mirror do Studio.
- Testes do clipboard com dois namespaces.
- Teste de banco restaurando payload real do Pinta.
- Teste de reconciliação garantindo que mais de 64 assets continuam válidos sob o contrato sem teto.
- Testes de sincronização com relógio adiantado e edição dos dois lados.

## Fora de escopo

- Redesenhar o protocolo inteiro de storage ou introduzir nova infraestrutura de filas.
- Alterar os limites comerciais existentes.
- Criar compatibilidade retroativa para blobs que já tenham sido apagados.
