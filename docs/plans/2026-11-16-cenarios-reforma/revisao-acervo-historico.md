# Molda Cenários — acervo da equipe e histórico persistente

16/11/2026. Continuação do plano integral, após `5c23003a2`. Avança os lotes 2 e 3; não representa o fechamento desses lotes.

## Acervo publicado em staging

Os 3.218 modelos do catálogo preparado foram enviados às 18 bibliotecas restritas do Espaço da Equipe. O importador usa o mesmo worker, medidor, fotógrafo e host HTTP da oficina: reserva, envio direto assinado e registro autenticado. A retomada consulta os hashes já registrados; não duplica os modelos nem depende de uma aba do editor. Uma segunda passagem consultou todas as páginas da API e confirmou os 3.218 hashes esperados, sem modelos recusados. As 18 capas também foram carregadas e verificadas no navegador.

[Galeria real no staging](evidencias/acervo/bibliotecas-equipe.png), [resumo da auditoria por coleção](evidencias/acervo/resultado.json). O espaço mostrou aproximadamente 900 MB utilizados de 20 GB. As bibliotecas continuam exclusivas da equipe; nenhuma arte binária ou credencial foi incluída no Git.

O comando reproduzível está em `scripts/molda-cenarios-publicar-acervo.mjs`. Recebe a origem de staging conferida e o caminho externo das credenciais. Valida o manifesto e os arquivos locais por SHA-256 antes de autenticar; recupera fontes ausentes pela revisão fixa ou pelas adaptações locais já produzidas. O processador compilado é servido somente no loopback, sem HMR e sem acesso ao workspace pelo navegador. Arquivos adaptados da Faísca preservam seus hashes próprios.

Uma captura inicial foi tirada antes de as imagens e transições terminarem. O script passou a aguardar a decodificação das capas e o fim das animações finitas, além de verificar o carregamento de todas elas. A evidência versionada corresponde à nova passagem. O primeiro ensaio da auditoria usava um título que a tela não possui; o seletor foi corrigido para o cartão real, sem alterar a interface por causa do teste.

## Histórico e versões

A migração **0154_cloudy_the_twelve**, gerada por `db:generate`, acrescenta as pilhas de referências no cenário, os comandos inversos no registro de lotes e as fotografias esparsas do documento. A primeira fotografia preserva a cabeça existente; depois há uma a cada 50 lotes. Uma versão é reconstruída pela fotografia anterior e pelos lotes seguintes. Não há documento completo por pequena edição.

Desfazer e refazer usam o histórico persistido, inclusive depois de recriar o controlador. Edições por agente usam os mesmos lotes e entram no mesmo histórico. Uma edição nova abandona o refazer, preservando o registro das revisões. Lotes sem mudança não bloqueiam o desfazer anterior. A pilha mantém até 200 passos, por referências de revisão. O painel de versões permite retornar a uma versão disponível; essa restauração também pode ser desfeita.

As operações mantêm revisão esperada, idempotência e autorização pelo espaço. Se a resposta de um desfazer se perde, a tentativa seguinte reutiliza a mesma operação. Durante uma operação incerta o controlador impede novas edições sobre uma cabeça desconhecida. A escrita usa a trava do espaço e revalida os arquivos novos dentro dela, impedindo corrida com exclusão de biblioteca. Arquivos presentes nos lotes ou nas fotografias ficam preservados para restauração.

A saída da oficina também foi revisada: se a gravação falhar, voltar ao mundo mantém a edição aberta e a fila pendente. O ensaio no Chrome simulou falha de rede, tentou sair, retomou o envio e reabriu o cenário com a alteração. Falhar ao reabrir não passa a mostrar “Guardado”; tentar de novo consulta a cabeça real.

Foi reproduzido um caso em que desfazer 500 objetos bloqueados gerava mil comandos, acima do teto do lote. O núcleo agora permite restauração atômica do documento, conservando sua identidade e validando os modelos do mesmo espaço. O inversor utiliza essa operação quando a diferença ultrapassa o teto. Não foram criadas revisões artificiais para repartir um único desfazer.

[Versões no tema claro](evidencias/historico/versoes-light.png), [tema escuro](evidencias/historico/versoes-dark.png), [celular](evidencias/historico/versoes-celular.png), [ensaio no Chrome](evidencias/historico/resultado.json). A casca aprovada do Molda permanece; o histórico abre por um botão na barra superior. Os testes locais usam o host em memória, enquanto as regras de persistência também foram exercitadas no Postgres real descartável com o DDL 0151–0154.

Verificação do recorte: 44 testes do core, 32 da oficina, 39 do serviço/HTTP de Members, dez de Postgres, cinco do gateway e 18 do BFF aprovados. A tipagem do core, oficina, Members e member-shell foi conferida; o registro de execução guarda os resultados locais. Os testes específicos incluem limite de 500 comandos, 51 edições com apenas duas fotografias, conteúdo de outro espaço recusado, resposta perdida, retomada e restauração sem diferença idempotente.

O CI remoto de `5c23003a2` não terminou verde: o job geral encontrou uma falha de `PreviewIframe` no Estúdio (esperava a fase de erro e recebeu execução). O diagnóstico SSH de staging também registrou falha de conexão. Esses resultados não são apresentados como aprovação global; precisam ser acompanhados na próxima execução. Nenhuma barreira foi desativada.

## Limites e continuidade

O acervo já está no staging; o novo histórico precisa seguir a implantação de Members, gateway e apps e receber uma prova remota específica. As capturas do histórico não comprovam persistência remota. Retratos por versão ainda não estão implementados. Tampouco estão concluídos chãos/texturas, conjuntos, conversão espacial da Faísca, ferramentas completas, teste jogável ou lotes 4–10.

A inspeção do catálogo encontrou 83 GLBs animados e 84 com esqueleto. Não encontrou Draco, Meshopt, KTX2 nem GPU instancing. Há 1.188 modelos com `EXT_texture_webp`; o exportador deverá conferir/transcodificar imagens conforme o suporte de cada destino, especialmente Raylib.

**Pendência de integridade para fechar as bibliotecas:** o BFF atual confirma a existência do objeto por HEAD antes do registro. A revisão identificou que falta conferir o conteúdo recebido, o tamanho real e o GLB no servidor, conforme o plano. A conferência de SHA no navegador e no renderer já existe, mas não substitui essa etapa. Ela permanece aberta e deve ser corrigida antes de considerar os lotes 1/2 integralmente concluídos.
