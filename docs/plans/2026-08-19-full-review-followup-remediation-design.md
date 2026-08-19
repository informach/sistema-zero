# Correções do full review de 19/08/2026

## Objetivo

Eliminar os dez achados do full review sem reduzir isolamento, durabilidade ou cobertura. Cada correção atua na causa-raiz e recebe um teste de regressão que falha antes da mudança.

## Exclusão de conta

O Auth mantém um registro durável da exclusão concluída. O `prepare` distingue usuário inexistente de exclusão já concluída, e o BFF pode repetir a operação com segurança.

Members e Hub mantêm uma cerca por conta. Toda mutação associada à conta consulta essa cerca, inclusive chamadas feitas com um JWT emitido antes do bloqueio. A exclusão agenda uma segunda purga para depois do TTL máximo do access token; essa purga cobre dados relacionais e objetos R2 que uma requisição já autenticada possa ter criado durante a primeira passagem.

## Limpeza durável do R2

Uma única função implementa exclusão em lote. Ela trata exceções de `DeleteObjects`, respostas parcialmente recusadas e cai para `DeleteObject` por chave. Admin e member-shell reutilizam essa função em vez de manter cópias divergentes.

O repositório da fila aplica backoff monotônico em `notBefore`. O worker nunca reclama o mesmo job na mesma execução e valida também a resposta do endpoint de falha. Um job defeituoso deixa os seguintes avançarem.

## Sincronização de criações

O reconciliador relê o estado local depois do download. Ausência local ou lápide criada durante a rede cancela o `apply`, preservando o DELETE.

Uma cópia de conflito recebe identidade estável para a tentativa corrente. Se `apply` falhar, o adaptador desfaz a cópia; uma repetição não acumula duplicatas.

## Isolamento e revisão de desenhos

A varredura de desenhos captura, no início, o scope de projetos e o namespace da biblioteca pessoal. Relógio, single-flight e falhas pendentes ficam indexados pelo scope. Trocar de perfil não redireciona uma operação em andamento nem entrega sua Promise ao perfil seguinte.

`libRevision` deixa de representar horário de parede. O fluxo usa uma revisão lógica monotônica transportada com o desenho. Quando não há ordem autoritativa, bytes divergentes preservam os dois lados.

## Lifecycle e testabilidade

O cache de `IntersectionObserver` mantém contagem de consumidores por raiz. Ao sair o último card, ele desconecta o observer e remove a raiz do registro.

Os testes injetam clientes R2 e decodificadores por factories/adaptadores. Módulos de produção deixam de exportar setters globais exclusivos de teste.

## Verificação

Os testes cobrem: JWT residual, repetição da exclusão, backoff e progresso da fila, fallback R2 por prefixo, exclusão durante download, rollback de conflito, troca de perfil durante varredura, relógios divergentes, desmontagem dos observers e isolamento das dependências de teste. O fechamento executa Biome, `git diff --check`, typecheck dos nove pacotes e as suítes afetadas.
