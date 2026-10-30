# Implantação futura das visitas adultas

Esta entrega é local e não altera configurações ou dados remotos.

1. Aplicar a migração gerada `0016_convites_adultos`, depois da 0015 de medição. Cria uma tabela vazia,
   sem backfill ou consentimento automático. Não altera salvamento nem limite de 64 KB.
2. Esta composição também contém a medição A06. Publicar o Admin que aceita o relatório novo
   antes da API nova, como explica `docs/qa/2026-10-30-medicao-aparencias/README.md`. O Admin
   anterior rejeita o campo adicional. A migração sozinha não muda a resposta do serviço antigo.
3. Publicar API, gateway e BFF adulto da mesma composição. Os caminhos de convite têm
   GET/POST/DELETE; abrir e conferir usam POST. Corpo máximo de 1024 bytes. Conferir JWT,
   origem interna, no-store e rate limit. Nenhuma variável ou seed nova.
4. Publicar o cliente do jogo e conferir versão/hash do build. A versão anterior da API pode
   manter as visitas indisponíveis, mas não pode impedir o jogo ou marcar consentimento ativo.
5. No aceite L14, usar duas contas adultas reais: gerar, abrir, voltar, girar código e revogar
   durante visita; conferir também Kids, suporte e uma resposta perdida. Não transferir a
   prova da plataforma falsa para esse aceite autenticado.

O convite é um segredo de acesso escolhido por quem recebe. Só o hash fica no serviço,
com FK ao save. Não registrar corpo de pedido, código ou resposta de geração em observabilidade.
Apagar o save remove o convite; a exclusão de identidade continua dependendo do procedimento
de exclusão entre serviços. Não confundir logout com revogação. Reverter o cliente não remove
automaticamente consentimentos, por isso a API deve conservar o caminho de revogar.
