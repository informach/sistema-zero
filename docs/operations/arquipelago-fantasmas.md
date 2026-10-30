# Implantação das trajetórias familiares

Esta nota é um procedimento futuro. A implementação e as provas desta entrega são locais.

1. Aplicar a migração gerada `0014_fantasmas_dos_percursos` no serviço do Arquipélago pelo
   procedimento normal de migrações. Ela cria uma tabela vazia e não altera a V18 ou saves.
2. Publicar API, gateway e host/BFF que conhecem os caminhos de trajetórias. PUT recebe até
   129 KB; o artefato é limitado a 128 KB. Preservar JWT, token interno, revisão e rate limit.
3. Publicar o cliente compilado do jogo e os apps que usam avatar-quarto. O componente comum
   recebeu a correção de isolamento de esqueletos e cores; não publicar só o fantasma sem ela.
4. Conferir manifesto/hash do cliente, saúde do serviço e versão da migração nos dois ambientes.
   Não há variável nova, seed ou cópia de trajetórias de teste para executar.
5. Qualificar o fluxo com dois perfis Kids da mesma conta: completar um percurso, confirmar o
   save, abrir no outro perfil e seguir o trajeto. Desligar visitas nos responsáveis e conferir
   a retirada da referência após a revalidação. Conferir outro responsável, adulto e suporte.

API anterior ou trajeto ausente não devem impedir a corrida. Um envio não confirmado fica no
diário do próprio perfil e pode ser retomado. Não apagar esse diário para esconder falhas.
Uma reversão do cliente pode manter a tabela; ela não concede recompensa nem muda o save.
Ao excluir um salvamento, a FK elimina seus artefatos. Não há histórico de sessões, nome ou
roupa nessa tabela. Exclusão de identidade no Auth continua seguindo o processo entre serviços;
a leitura familiar do BFF exige que o perfil ainda conste da lista atual do Auth.
