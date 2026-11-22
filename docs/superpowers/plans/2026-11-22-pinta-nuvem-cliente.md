# Controle de alterações vinculadas no cliente do Pinta

Base `c34117d6a`. A publicação causal mantém uma folha, seus mapas e os conjuntos que precisam mudar juntos em uma única revisão observável da galeria. O cliente conserva o nativo 7 e a nuvem 6. O protocolo de transporte, seus limites e as provas do servidor são detalhados no plano da unidade causal da galeria.

## Banco local e histórico

- [x] Em `localAssetAuthority.ts` e `persistence.ts`, validar a base de cada membro e aplicar escritas, lápides e a fila no mesmo commit. Pôr a fila no banco do perfil, em chaves próprias. A comparação usa a revisão local observada, inclusive em tombstones. Documentos legados sem revisão usam o retrato exato que o editor leu.
- [x] Guardar a intenção estrutural e suas precondições com os membros. Uma unidade pendente referencia as revisões locais correntes. Antes da reserva, selar uma única unidade em voo por perfil, com seus bytes gzip e bases exatas. O recibo confirma apenas a revisão enviada, preservando edições sucessoras.
- [x] Capturar a transformação de índices em `TileStrip.tsx` e acompanhar os slots nos snapshots existentes de salvar, desfazer e refazer.
- [x] Testar em IndexedDB falha no último membro, coleções de dois perfis, reinício entre gravação e envio e recibo após editar um membro novamente.
- [ ] Ligar a exclusão em `galleryStore.ts` e os vínculos do documento externo em `mapSetEditorStore.ts`. As referências novas guardam o layout ou documento que a pessoa realmente leu. Uma referência a um recurso da própria unidade pode apontar para esse membro.

## Fila da conta

- [ ] Ativar a fila causal em `pinta-cloud-persistence.ts` e `creations-cloud.ts` usando o contrato privado. A reconciliação precisa carregar a propriedade dos membros antes de enfileirar envios avulsos. Uma tentativa selada usa o mesmo ID e o mesmo hash após timeout ou reinício. Confirmar todos os membros e avançar as marcas em um commit. O status de um membro acompanha a unidade a que pertence.
- [x] Implementar o transporte privado, a selagem antes do PUT, a recuperação do recibo e a descoberta persistente sem retorno ao protocolo individual.
- [x] Atualizar a sessão de `pinta-client.tsx` para capturar módulo, banco, perfil, público e fila juntos. Ao trocar de sessão, abortar efeitos em voo e deixar os registros pendentes no banco anterior. O fluxo local sem perfil usa sua própria autoridade.
- [ ] Preparar o remapeamento a partir da prova do servidor, incluindo consumidores remotos ausentes. Uma nova referência criada durante a edição invalida a base no commit. Uma escrita compatível e sem mudança de índices continua pelo caminho que o servidor admitir. Nenhuma falha transfere os membros da fila causal para envios individuais.
- [ ] Testar envio offline e retomada, resposta do commit perdida, duas abas e dois perfis, nova referência concorrente e exclusão recusada. A folha e seus consumidores não podem ser lidos entre dois estados do mesmo lote.

## Descida da conta

- [ ] Capturar todas as páginas no mesmo epoch, conferir as revisões pinadas e preparar os bytes fora da transação de aplicação. Reusar o portão de formato e o codec atuais. Computar a ausência a partir de um inventário completo e de marcas confirmadas no mesmo banco.
- [x] Implementar a aplicação de todo o delta Pinta, marcas e lápides em uma transação. Conferir revisões locais e propriedade da fila outra vez no fim. Provar em navegador que uma aba pode adiar o delta inteiro pelo mesmo namespace e que uma edição concorrente invalida o commit.
- [ ] Preservar os nomes e vínculos oficiais em um fechamento de portas por nome. Um conflito com trabalho local impede aplicação parcial, inclusive quando a alternativa seria alterar apenas um nome remoto.
- [ ] Testar epoch alterado entre páginas, falha no último download, aba aberta e fechamento, quota, nomes e edição concorrente. Exercitar os caminhos reais com folhas e conjuntos densos, além dos controles de aula e de envio de arte.
