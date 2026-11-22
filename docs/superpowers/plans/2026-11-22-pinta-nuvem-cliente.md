# Controle de alterações vinculadas no cliente do Pinta

Base `c34117d6a`. A publicação causal mantém uma folha, seus mapas e os conjuntos que precisam mudar juntos em uma única revisão observável da galeria. O cliente conserva o nativo 7 e a nuvem 6. O protocolo de transporte, seus limites e as provas do servidor são detalhados no plano da unidade causal da galeria.

## Banco local e histórico

- [x] Em `localAssetAuthority.ts` e `persistence.ts`, validar a base de cada membro e aplicar escritas, lápides e a fila no mesmo commit. Pôr a fila no banco do perfil, em chaves próprias. A comparação usa a revisão local observada, inclusive em tombstones. Documentos legados sem revisão usam o retrato exato que o editor leu.
- [x] Guardar a intenção estrutural e suas precondições com os membros. Uma unidade pendente referencia as revisões locais correntes. Antes da reserva, selar uma única unidade em voo por perfil, com seus bytes gzip e bases exatas. O recibo confirma apenas a revisão enviada, preservando edições sucessoras.
- [x] Capturar a transformação de índices em `TileStrip.tsx` e acompanhar os slots nos snapshots existentes de salvar, desfazer e refazer.
- [x] Testar em IndexedDB falha no último membro, coleções de dois perfis, reinício entre gravação e envio e recibo após editar um membro novamente.
- [x] Medir documentos, metadados e bytes do envio selado juntos na mesma transação. Uma mudança que reduz o uso continua possível quando o acervo antigo ultrapassa o teto.
- [x] Validar registros recuperados da fila pelo contrato de epoch, revisão, identificação e intenção. Conservar dados em disco se a validação falhar.
- [x] Antes da primeira leitura autenticada, guardar no mesmo commit as revisões locais, as lápides e os recursos observados. Esse estado não tem epoch remoto. Depois de conferir o inventário inteiro, promover como criações os IDs realmente ausentes, mantendo juntos seus recursos. Se a leitura encontra conteúdo divergente, conservar o rascunho local.
- [x] Migrar o registro local da fila para versão 2 na próxima escrita. Uma aba da primeira implementação causal recusa escrever o registro versionado que não sabe interpretar. Uma exclusão sem base remota volta à galeria caso o desenho ainda exista na conta, com aviso para a pessoa decidir novamente. Se a criação ainda nem foi reservada, cancelar só a criação local e manter os outros membros.
- [ ] Ligar a exclusão em `galleryStore.ts` e os vínculos do documento externo em `mapSetEditorStore.ts`. As referências novas guardam o layout ou documento que a pessoa realmente leu. Uma referência a um recurso da própria unidade pode apontar para esse membro.

## Fila da conta

- [x] Ligar o espelho da conta à fila causal após descoberta do protocolo privado. Em timeout ou reinício, retomar o ID, o hash e o gzip selados. Quando o servidor encerra a reserva, renovar o ID apenas sob o mesmo epoch e as mesmas bases conferidas. Confirmar a unidade inteira e traduzir bases do sucessor só pela revisão local enviada e o recibo correspondente.
- [x] Implementar o transporte privado, a selagem antes do PUT, a recuperação do recibo e a descoberta persistente sem retorno ao protocolo individual.
- [x] Atualizar a sessão de `pinta-client.tsx` para capturar módulo, banco, perfil, público e fila juntos. Ao trocar de sessão, abortar efeitos em voo e deixar os registros pendentes no banco anterior. O fluxo local sem perfil usa sua própria autoridade.
- [x] Preparar remapeamentos a partir de todas as páginas do mesmo epoch, trazendo consumidores remotos ausentes. Compor gestos de remoção, pintura e desfazer pelo histórico de peças do editor. Conferir na entrega de aula a versão pinada e serializada que o editor guardou.
- [x] Congelar candidatos que um gesto sucessor precisa sobrescrever localmente. Todos os gzip guardados concorrem com os desenhos no orçamento existente, com uma única reserva em voo. Gestos compatíveis no mesmo documento continuam coalescidos. Fixar folha ou arte, remapear e depois alterar um mapa conservam a ordem em que foram feitos. O transporte de teste é opt-in por `NEXT_PUBLIC_PINTA_CAUSAL_CLIENT_V1=1`.
- [x] Ao encontrar reserva encerrada e base divergente, consultar o estado da mesma operação. Se o commit venceu o cancelamento, aceitar o recibo exato. Se a reserva expirou ou foi abortada, recuperar o estado local e o da conta em um commit. Se o recibo já foi coletado, exigir snapshot certificado de epoch mais novo, preservar cópias no aparelho e evitar outro envio com a intenção antiga. A falha do último registro mantém a fila e o catálogo anteriores.
- [ ] Testar envio offline e retomada, resposta do commit perdida, duas abas e dois perfis, nova referência concorrente e exclusão recusada. A folha e seus consumidores não podem ser lidos entre dois estados do mesmo lote.

## Descida da conta

- [x] Capturar todas as páginas no mesmo epoch, conferir as revisões pinadas e preparar os bytes fora da transação de aplicação. Reusar o portão de formato e o codec atuais. Computar a ausência a partir de um inventário completo e de marcas confirmadas no mesmo banco. Na adoção, confirmar documento local só após comparação com o corpo remoto. A revisão legada e o relógio podem coincidir após recriação de um ID.
- [x] Recuperar no mesmo commit as versões divergentes na primeira adoção. A versão da conta preserva seus IDs. O plano local de importação religa folhas, mapas, propriedades e portas dentro da cópia. O primeiro save explícito de uma dessas cópias pode levar seus recursos observados numa unidade nova.
- [x] Recuperar edições de um escritor pré-causal encontradas por revisão local após o recebimento de um selo. Uma revisão remota que já coincide com o recibo continua exigindo comparação com o documento atual no aparelho. Preservar as duas versões por uma recuperação atômica e comunicar que a cópia está neste aparelho.
- [x] Implementar a aplicação de todo o delta Pinta, marcas e lápides em uma transação. Conferir revisões locais e propriedade da fila outra vez no fim. Provar em navegador que uma aba pode adiar o delta inteiro pelo mesmo namespace e que uma edição concorrente invalida o commit.
- [x] Calcular as dependências retidas no disco antes de aplicar novo layout. Se um mapa local sem confirmação ainda usa os índices anteriores, manter o delta inteiro aguardando.
- [ ] Preservar os nomes e vínculos oficiais em um fechamento de portas por nome. Um conflito com trabalho local impede aplicação parcial, inclusive quando a alternativa seria alterar apenas um nome remoto.
- [ ] Testar epoch alterado entre páginas, falha no último download, aba aberta e fechamento, quota, nomes e edição concorrente. Exercitar os caminhos reais com folhas e conjuntos densos, além dos controles de aula e de envio de arte.
