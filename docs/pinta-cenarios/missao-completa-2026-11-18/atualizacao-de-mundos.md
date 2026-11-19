# Novos destinos nos jogos já vinculados

Continuação da etapa 2a, após o lote de envio/importação integral. Manter o editor e os
contratos existentes; não programar comportamentos no Pinta nem modificar os arquivos de Molda.

- [x] Reproduzir um jogo já ligado cujo mapa recebe uma porta para outro mapa depois do
  primeiro envio. Provar o destino ausente no projeto aberto e em um projeto fechado.
- [x] Extrair a política pura de identidade/merge dos materiais pessoais para permitir seu
  reuso pelo importador de lotes e pela sincronia sem criar um ciclo de módulos.
- [x] Resolver o fechamento das cenas a partir da biblioteca capturada: IDs antes de nomes,
  portas de conjuntos/camadas ocultas e referências tipadas; ciclos deduplicados, até 16 mapas.
  Recursos autocontidos continuam embutidos. Destinos ausentes ou nomes ambíguos conservam
  o jogo anterior e mostram recusa. Não importar criações sem vínculo com o cenário.
- [x] Atualizar o projeto aberto com um único commit orçado do conjunto. Revalidar alvo,
  perfil, autoria e cancelamento depois dos awaits. Conservar arquivos, IR, blocos, IDs e
  nomes existentes; evitar reaplicar o mesmo mapa durante a varredura.
- [x] Reutilizar a preparação pura na partição de assets dos projetos fechados, com o CAS
  existente e sua guarda de abertura concorrente. Uma recusa conserva o mundo anterior.
- [x] Rever o lookup do player quando um destino colide com o nome de uma imagem comum.
  Referências tipadas dão precedência ao ID da cena; textos legados conservam a escolha
  por nome. O fallback por nome resolve apenas mapas válidos.
  Exercitar Jogo 2D e Avançado, sem alterar o comportamento dos mapas legados sem cena.
- [x] Provar acréscimo, ciclos, destinos inválidos, quota, troca de perfil/autor e projeto
  aberto durante a varredura. Ensaiar o fluxo real no navegador; rever, verificar e commitar.

A leitura do catálogo pessoal é por perfil e limitada pelo orçamento já existente da
biblioteca. Compartilhar a captura dentro da varredura; não ler o catálogo inteiro a cada
objeto ou a cada mapa. Não tratar uma falha de leitura como autorização para apagar materiais.

## Implementação e revisão

`personalAssetMerge.ts` concentra a política de merge anterior, mantendo os exports antigos
de `personalSync.ts`. A extração evita que o preparador puro do lote importe a própria
sincronização que agora o utiliza. A política de modelos e céus do Molda não mudou.

`pintaMapWorld.ts` percorre as cenas derivadas já salvas na biblioteca do perfil. Conserva
recursos embutidos, propriedades e relações; não consulta o documento nativo nem tenta
transformar uma imagem comum em mapa. O catálogo completo é lido uma vez por varredura,
somente quando há referência externa. A raiz e os destinos vêm do mesmo `getMany`; a
listagem anterior de chaves pode não incluir um desenho recém-criado, caso em que um destino
ausente recusa a operação e mantém a atualização pendente para o próximo foco.

O projeto aberto recebe `importPintaMapBundle`, com revalidação após a leitura. Projetos
fechados reutilizam `preparePintaMapBundle` e o CAS da partição de materiais, incluindo a
guarda de abertura concorrente. Mapas já tentados não são reaplicados no segundo passe.
A recusa de orçamento, a falha do catálogo e a falha física de gravação não consomem o
marcador pessoal. A próxima conferência normal pode tentar novamente, sem um laço de tentativas.

O ensaio local do navegador configura uma porta no Pinta após criar o jogo e adicionar
programação pela Ponte. A volta ao Estúdio acrescenta a cabana, conservando arquivos, IR,
IDs, nomes e o estado completo dos blocos. API de nuvem permanece desconectada nesse ensaio;
ele não substitui o ciclo autenticado de staging nem comprova outros aparelhos físicos.

Os hosts JavaScript e Phaser recebem uma indicação de referência por ID do player comum.
Ela só é usada por uma propriedade de porta com `type: 'asset'`. `createMapScene` e portas
antigas com destino em texto continuam escolhendo o material pelo nome. Uma imagem comum
sem cena deixa de bloquear o fallback para um mapa. Os dois motores JavaScript têm provas
de regressão para as três escolhas, incluindo o nome de material que coincide com outro ID.

Ver [provas e limitações deste lote](qa/atualizacao-de-mundos/README.md). A etapa 2a continua
com o fechamento de mapas no caminho estruturado Python e com a homologação autenticada;
o rollout do leitor continua condicionado à implantação verificada em staging.
