# Remediação integral do full review de 19/08/2026

## Objetivo

Corrigir os dez achados ainda presentes no fluxo de criações em nuvem, exclusão de conta,
isolamento por perfil, reconciliação do Pinta/Studio, assinatura R2 e documentação, sem
substituir mudanças locais fora desse escopo.

## Decisões

### Exclusão de conta e URLs pré-assinadas

1. A exclusão começa no Auth com uma preparação idempotente que bloqueia a conta e devolve
   todos os seus perfis, inclusive arquivados. Assim nenhum perfil novo aparece depois da
   descoberta dos donos que precisam ser purgados.
2. A purga no Members instala uma cerca persistente por conta antes de remover os dados. A
   reserva de criação consulta essa cerca e recusa novas escritas mesmo se um JWT antigo ainda
   estiver válido.
3. A mesma transação registra uma limpeza durável dos prefixos `creations/<owner>/`, agendada
   para depois do TTL máximo de PUT pré-assinado mais uma margem de relógio.
4. A limpeza imediata do R2 continua reduzindo a janela e o uso de storage. O job posterior é
   a garantia: cobre PUTs que terminarem depois da limpeza imediata, sobrevive a reinícios e
   permanece pendente quando o R2 falhar.
5. O job usa lock distribuído, paginação e exclusão em lotes. O registro só é concluído depois
   que todos os prefixos estiverem vazios.

### Isolamento e orçamento das descidas

1. A persistência local do Studio passa a aceitar um namespace explícito e todas as funções do
   adapter ficam ligadas ao scope capturado. Uma troca do namespace global não redireciona uma
   operação já criada.
2. Cada `pullMissing` recebe um `AbortController` próprio. A troca de perfil cancela a descida
   anterior imediatamente, enquanto a fila de uploads pode terminar separadamente.
3. O reconciliador passa um `AbortSignal` para cada fetch e disputa a operação contra o prazo
   restante. O sinal cancela a rede real; a disputa garante que um fetch injetado que ignore o
   sinal também não retenha a inicialização.

### Convergência do Pinta e dos desenhos pessoais

1. Nomes escolhidos durante descidas paralelas são reservados antes do primeiro `await`,
   impedindo duas gravações com o mesmo sufixo.
2. `ProjectAsset` recebe um carimbo opcional da revisão do desenho pessoal que originou seus
   bytes. O restauro compara esse carimbo com `PersonalAsset.updatedAt` e só substitui o lado
   comprovadamente mais antigo.
3. Em assets legados sem carimbo e com bytes divergentes, os dois lados são preservados: a
   versão restaurada vira uma cópia pessoal com outro id e o projeto é religado a ela. Não há
   escolha silenciosa baseada em relógio ou em ordem de carregamento.
4. O DELETE de criação devolve a revisão autoritativa da linha. A lápide só fica `sent` depois
   de receber essa revisão; lápides antigas sem revisão ocultam o remoto e reenviam o DELETE,
   nunca comparam relógios de dispositivos.

### Testes, assinatura e documentação

1. Testes de UI do Pinta usam persistências IndexedDB explicitamente isoladas por arquivo/caso
   e deixam de limpar o registry global compartilhado durante execução paralela.
2. O presigner de PUT do member-shell inclui `content-type` e `content-length` em
   `signableHeaders`, com teste sobre a URL assinada real.
3. Comentários sobre reordenação vetorial, limite removido do Pinta e purga R2 são atualizados
   para refletir o comportamento efetivo.

## Estratégia de implementação

Cada achado ganha primeiro uma regressão que falha. As correções serão aplicadas em lotes
pequenos: protocolo de exclusão, sync compartilhado, adapter Studio, Pinta/desenhos, isolamento
de testes, assinatura e documentação. Cada lote roda seus testes focados antes de avançar.

## Verificação final

- `git diff --check` e Biome nos arquivos alterados.
- Typecheck de auth, members, member-shell, admin, community-kids, Pinta e Studio.
- Testes focados de cada regressão.
- Suítes completas dos pacotes afetados, com repetição da suíte Pinta para provar que a falha
  entre arquivos deixou de ser intermitente.

