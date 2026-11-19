# Novos destinos nos jogos já vinculados

Continuação da etapa 2a, após o lote de envio/importação integral. Manter o editor e os
contratos existentes; não programar comportamentos no Pinta nem modificar os arquivos de Molda.

- [ ] Reproduzir um jogo já ligado cujo mapa recebe uma porta para outro mapa depois do
  primeiro envio. Provar o destino ausente no projeto aberto e em um projeto fechado.
- [ ] Extrair a política pura de identidade/merge dos materiais pessoais para permitir seu
  reuso pelo importador de lotes e pela sincronia sem criar um ciclo de módulos.
- [ ] Resolver o fechamento das cenas a partir da biblioteca capturada: IDs antes de nomes,
  portas de conjuntos/camadas ocultas e referências tipadas; ciclos deduplicados, até 16 mapas.
  Recursos autocontidos continuam embutidos. Destinos ausentes ou nomes ambíguos conservam
  o jogo anterior e mostram recusa. Não importar criações sem vínculo com o cenário.
- [ ] Atualizar o projeto aberto com um único commit orçado do conjunto. Revalidar alvo,
  perfil, autoria e cancelamento depois dos awaits. Conservar arquivos, IR, blocos, IDs e
  nomes existentes; evitar reaplicar o mesmo mapa durante a varredura.
- [ ] Reutilizar a preparação pura na partição de assets dos projetos fechados, com o CAS
  existente e sua guarda de abertura concorrente. Uma recusa conserva o mundo anterior.
- [ ] Rever o lookup do player quando um destino colide com o nome de uma imagem comum.
  IDs da cena têm precedência e o fallback por nome deve resolver apenas mapas válidos.
  Exercitar Jogo 2D e Avançado, sem alterar o comportamento dos mapas legados sem cena.
- [ ] Provar acréscimo, ciclos, destinos inválidos, quota, troca de perfil/autor e projeto
  aberto durante a varredura. Ensaiar o fluxo real no navegador; rever, verificar e commitar.

A leitura do catálogo pessoal é por perfil e limitada pelo orçamento já existente da
biblioteca. Compartilhar a captura dentro da varredura; não ler o catálogo inteiro a cada
objeto ou a cada mapa. Não tratar uma falha de leitura como autorização para apagar materiais.
