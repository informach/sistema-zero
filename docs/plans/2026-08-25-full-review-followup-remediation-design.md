# Correções complementares do full review de 25/08/2026

## Objetivo

Corrigir os achados remanescentes do full review das implementações de 25/08/2026, preservando dados e contratos válidos. A questão de licenciamento das fontes do DANFSe fica explicitamente fora deste trabalho.

## Biblioteca de paletas do Pinta

A sincronização deixará de usar o limite local de 24 itens como política de truncamento de dados remotos. O merge será comutativo e determinístico, validará toda entrada antes de aplicar limites defensivos de transporte e nunca escolherá um vencedor pela ordem dos argumentos. O limite de produto continuará valendo para criar novas paletas, sem apagar paletas já sincronizadas.

As mutações locais serão serializadas em uma fila do store, para que duas ações disparadas no mesmo frame operem sobre o resultado confirmado da ação anterior. Timestamps lógicos monotônicos evitarão empates acidentais; se ainda houver empate entre atualização e remoção, a remoção vencerá para impedir ressurreição.

A conclusão de um conflito ou sincronização em nuvem publicará um evento específico de biblioteca alterada. Stores montados recarregarão a biblioteca ao receber esse evento. Os dois diálogos de paleta terão identidades React distintas mesmo quando fechados.

## Emissão e renderização do DANFSe

O resultado da alocação de número e série da DPS será materializado em um novo snapshot da nota antes de qualquer finalização ou renderização. Nenhuma etapa dependerá de um repositório mutar por referência o objeto recebido. Os fluxos normal, de substituição/duplicidade e de recuperação usarão o mesmo snapshot alocado.

O comentário operacional do servidor será corrigido para refletir o comportamento real de falha fechada: se o documento fiscal obrigatório não puder ser gerado, a requisição falha explicitamente.

## Persistência de denúncias do Hub

Cada nova denúncia armazenará a audiência do espaço como snapshot. A mudança de schema será aditiva e nullable para permitir implantação e dados legados seguros; um backfill preencherá registros cujo espaço ainda existe.

As consultas deixarão de depender de `INNER JOIN` com espaços vivos. Para denúncias legadas cujo espaço e audiência já desapareceram, a API representará a audiência como desconhecida e as manterá alcançáveis nos filtros administrativos, em vez de ocultá-las. Novas denúncias sempre terão audiência canônica preenchida. O contrato e a interface administrativa distinguirão explicitamente esse caso legado.

## Concorrência de plataforma no Admin

Operações assíncronas de Moderação e Cursos capturarão um token de escopo por plataforma. Ao concluir uma mutação, uma resposta só poderá publicar ou iniciar recarga se o token ainda representar a plataforma ativa. A troca de plataforma invalida o escopo anterior; o efeito da nova plataforma continua responsável pelo carregamento atual.

## Autorização do BFF de membros

O detalhe de membro aceitará a identidade upstream apenas quando tanto o identificador da identidade quanto o `userId` corresponderem à conta solicitada. Respostas estruturalmente válidas, mas pertencentes a outra conta, serão tratadas como falha da dependência e nunca expostas.

## Acessibilidade e consistência

Avatares que acompanham o nome visível da criança serão decorativos (`alt=""`) para evitar anúncio duplicado. Nenhuma alteração será feita nos arquivos ou na política de licenciamento das fontes.

## Estratégia de testes e validação

Cada causa raiz receberá primeiro uma regressão que falha no estado anterior. Os testes cobrirão as duas ordens do merge, excesso remoto, mutações concorrentes, empate de tombstone, atualização por evento, chaves React, repositório fiscal não mutável, denúncias após exclusão do espaço, respostas assíncronas fora de ordem e identidade divergente.

Após as correções serão executadas as suítes focadas, as suítes completas dos pacotes afetados, typecheck, Biome, builds aplicáveis, inspeção da migration, `git diff --check` e validação textual/visual do DANFSe quando os utilitários locais estiverem disponíveis.
