# Integração do Pinta com staging 6c32a1fb3

Árvore combinada do remoto publicado 6c32a1fb3 com a entrega Pinta c08075547,
em worktree isolado. A combinação não apresentou conflitos; as mudanças privadas
do diretório principal não foram copiadas nem alteradas. Os imports de workspace
foram conferidos para resolver dentro desta árvore. A correção de tipos em quatro
arquivos produz JavaScript idêntico ao remoto publicado, incluindo o contrato 3D.

## Gerados autorizados

A qualificação Linux 44772285336 parou no SDK desatualizado do próprio remoto.
Os verificadores locais reproduziram a falha nos três gerados cuja regeneração
o usuário já autorizou. Apenas esses três foram regenerados pelos scripts oficiais,
com Bun 1.3.11. Imports e licenças permaneceram iguais; os deltas exatos constam
em gerados-comparacao.json. Os verificadores oficiais passaram depois disso,
assim como as regressões de documentos/exports e compiladores Three selecionadas.
Nenhuma fonte funcional do Molda foi editada. O perfil integrado é db27c95b…;
ele ainda precisa de imagem Linux qualificada e implantação independente.

## Sinal de atualização sem depender do relógio

A revisão reproduziu duas gravações no mesmo milissegundo: a segunda ficava salva
na biblioteca, mas não chegava ao projeto. O marcador agora acrescenta changeId
ao at legado e o sincronizador compara sua identidade completa. Marcador ausente
ou corrompido exige releitura; falha na notificação invalida somente o marcador,
preservando os dados já gravados. A exclusão captura o namespace antes do await.
Os testes mantêm a otimização C3 com um sinal válido criado pelo salvador real.
Não há mudança de formato autoral, declaração de nuvem ou aparência do Pinta.

## Correções da tipagem remota

A primeira checagem integrada encontrou 20 erros em código de diagnóstico novo
do remoto. A fixture KitApi passou a selecionar as sete operações que já exercita
do contrato canônico GameKitRuntimeApi. A busca de JSON de bloco agora expressa
seu teste existente de id/tipo como uma guarda de tipos, conservando o objeto.
Os 17 testes correspondentes passaram, sem remoção de asserções. As tentativas
inicial e posterior foram preservadas em tentativas.json; os resultados finais
selecionados não apagam a falha anterior nem fingem uma única execução sem erros.

## Provas e limites

Todos os 14 gates locais listados passaram, em sequência para evitar competição
de memória. A suíte Pinta passou 2.272 testes, sem falhas nem pulos, usando o
Pygame real disponível nesta máquina. Cenários/Phaser e integração usam Chrome
instalado; toque é emulado. Os logs distinguem wrappers dos casos isolados da
biblioteca. Tipos de Estúdio e Members foram conferidos com orçamento de 6 GiB.

Esta evidência local ainda exige nova CI, nova imagem Linux, rollout do leitor,
política/Python e gravador em ondas distintas, além da repetição autenticada e
publicação da Vila. A CI anterior não foi reclassificada como verde. Nenhuma
operação em produção, nenhum aparelho adicional e nenhum participante infantil.
