# LG02 — aquecimento com posse exclusiva

Execução do escopo aprovado pelo usuário em 24/11/2026. Base: `538ae843b`, comum a main e staging, com a LG01 em produção. A branch local de outras frentes permanece preservada.

## Problema e resultado esperado

R12 foi reproduzido no executor real: duas abas compartilham uma máquina e a falha de uma destrói a máquina usada pela outra. Separar pastas não separa a posse da máquina. A LG02 deve reduzir a espera nas verificações JavaScript/Pro sem introduzir essa interferência. Python permanece fora do escopo.

## Alternativas consideradas

1. Serializar todas as verificações do perfil: evita sobreposição, mas a segunda aba espera um teste inteiro e pode consumir seu prazo sem executar.
2. Compartilhar a máquina entre detentores e adiar destruição: exige coordenar processos presos, falhas e expiração com detentores concorrentes; um processo ruim ainda disputa recursos com o teste válido.
3. **Uma reserva exclusiva do contêiner aquecido, com contêiner exclusivo separado para sobreposição.** Mantém o benefício em verificações sucessivas e a proteção já demonstrada na LG01 quando há concorrência. Esta é a abordagem adotada dentro do escopo aprovado.

## Posse e persistência

Um Durable Object por classe física guarda um cache limitado em SQLite: 10 vagas gerais e 2 vagas 3D, dentro dos tetos existentes de 50/10 instâncias. Cada vaga pertence exclusivamente a um perfil; a máquina nunca passa entre perfis. A identidade continua derivada no Members, com as guardas existentes de sessão, perfil, acesso à aula/parte e revisão.

`acquire(operation: 'check' | 'warm', profileId, threeD)` retorna `{sandboxId, token, pooled}` ou uma indicação de aquecimento dispensado. A vaga livre recebe um token novo e um prazo superior ao orçamento de execução/limpeza. Se estiver ocupada, outra verificação recebe um nome novo de contêiner descartável; outro aquecimento não cria uma segunda máquina. Se a reserva expirar, o próximo dono recebe **outro nome de contêiner**, nunca a máquina da operação atrasada.

Ao atingir a cota do cache, um novo aquecimento é dispensado e uma verificação de outro perfil segue pelo caminho exclusivo. Uma máquina ociosa saudável não é trocada só para aquecer outro perfil, evitando criar gerações aquecidas desnecessárias. As vagas ociosas expiram em 5 minutos. Para retirar uma vaga expirada ou falha, primeiro a transação invalida sua posse; depois o SDK destrói a máquina fora da transação. Somente a confirmação permite remover a vaga e admitir outra. Descarte sem confirmação permanece contabilizado. O limite controla as vagas lógicas e a criação de gerações aquecidas; não promete recuperação imediata quando a cota física está saturada.

`release(lease, reusable, destructionConfirmed)` só modifica a vaga quando nome e token coincidem com a reserva vigente. Uma liberação atrasada não pode liberar a máquina de um sucessor. Uma reserva expirada não volta a ficar reutilizável com o mesmo nome. Falha sem confirmação de destruição mantém a vaga em retirada. As transições de leitura/escrita são síncronas e atômicas, persistidas antes da resposta RPC; não dependem de uma trava na memória de uma réplica do Members.

Uma execução só deixa a máquina disponível depois de remover sua pasta com sucesso. Falha de execução ou limpeza destrói apenas a máquina reservada por essa operação, antes de encerrar a reserva. Após tentar liberar uma máquina reutilizável, o chamador nunca a destrói: a resposta RPC pode se perder depois da gravação e um sucessor já pode tê-la adquirido. A reserva é uma geração de posse, não autorização para matar um recurso depois de devolvê-lo.

Falha de coordenação impede acesso ao recurso reutilizável. Uma verificação pode manter o caminho exclusivo por pedido da LG01, com motivo registrado; aquecimento falho não bloqueia a criança. Limites de capacidade e suspensão continuam aplicados pelo Sandbox SDK; não haverá aumento de tetos nesta etapa.

`STUDIO_CHECK_WARMING_ENABLED=0` permite interromper o aquecimento e voltar ao caminho exclusivo da LG01, conservando a nova classe e sua migração SQLite. Isso evita depender de rollback para uma versão anterior à criação do Durable Object. A ausência da opção também conserva o caminho exclusivo. Leituras/escritas RPC da reserva têm orçamento próprio de 3 s; uma resposta perdida nunca permite destruir uma máquina já devolvida.

## Integração e limites

Restaurar somente os caminhos de aquecimento retirados na LG01, preservando R10/R13/R14/R15, o teto de 32 falas, os catálogos Python de produção/staging e as liberações de outras etapas. Aquecer ao abrir/editar uma parte elegível, com aba visível, respeitando o intervalo já definido e sem conceder conclusão ou XP. O palco continua respondendo que não aquece.

## Aceite

- Regressão mínima antes/depois para falha sobreposta e limpeza falha, sem matar a operação válida.
- Persistência após recriar o coordenador, reserva expirada, liberação atrasada e resposta de liberação perdida.
- Duas abas reais: verificações válidas, falha sobreposta, aquecimento sobreposto e recuperação posterior.
- Isolamento entre perfis e entre as classes 2D/3D; recusas de sessão, acesso e revisão.
- Executor e imagem reais: falha de execução, falha de limpeza, suspensão e capacidade. Injeções de falha ficam no instrumento QA, sem métodos de teste no produto.
- Medidas antes/depois, com tamanho da amostra e limites da conclusão; nenhum ganho garantido por uma única execução.
- Percurso autenticado completo da aula em homologação antes de promover a versão.
- CI, plano, staging e produção pelos fluxos canônicos; main e staging recebem os commits, sem descartar trabalho concorrente.

Documentação oficial consultada: [SQLite e transações síncronas](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/), [regras de Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/). As provas anteriores estão em `docs/qa/2026-11-23-lg02-executor-real.md` no checkout original/branch de registros da LG01.
