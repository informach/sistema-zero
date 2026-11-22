# Revisão independente da fila causal do Pinta

O cliente `e28bb5dbbc9cfa27e0b4d60b89678f3d4eb78b44` passou em 19 casos e 127 asserções no Bun 1.3.11. Os ensaios chamam EditorStore, GalleryStore, a persistência e a fila do host. O adaptador transacional de IndexedDB do repositório guarda os registros em memória. O transporte de teste controla respostas, expirações e interrupções para reproduzir cada sequência. O controle separado do Members executou em PostgreSQL 16.13.

| Sequência | Evidência observada |
| --- | --- |
| Primeira adoção com colisões | As cópias conservaram os destinos de portas por ID e nome, inclusive quando o mapa continha uma folha privada com o mesmo ID do mapa público. Uma sombra local na primeira descida foi recuperada. Uma sombra posterior impediu a instalação do novo epoch. |
| Edição anterior à primeira leitura | Pintar uma peça após criar a folha e o mapa preservou o identificador da operação e a leitura do mapa. Uma exclusão sem base confirmada restaurou o documento da conta, com aviso na galeria. |
| Retomada após corrigir o desenho | A conta manteve o epoch anterior enquanto faltava uma referência. Remover a referência no editor permitiu adotar o documento oficial e preservar uma cópia da edição. |
| Autoria offline | Depois de alterar a opacidade de um mapa, remover uma peça que ele não usava publicou as duas operações na ordem original. |
| Remoção, desfazer e refazer | O editor preservou as células, a operação inversa e as leituras do grupo, inclusive depois de renovar um ticket expirado. |
| Recriação | Uma criação posterior à compactação aceitou a nova revisão 1 só com o identificador e o digest corretos. |
| Mapa regional privado | A recuperação de um mapa de 10.000 × 10.000 células conservou origem negativa, conteúdo esparso, vínculo explícito da folha e datas de criação. |

O Members em `d75bb7f7949f42b4865ba8816bb9b6673ae2693b` passou nos controles SQL de índice estável contra índice removido (1 caso, 3 asserções) e de consumidor ausente, interrupção no segundo upload e ordem das operações (2 casos, 19 asserções). O acesso usou o banco descartável `kids_journey_pinta_causal_release` na porta local 55553. O índice também identifica os recibos anteriores e as falhas corrigidas no caminho até esse candidato. [Índice de fontes e recibos](indice.json)

## Reprodução

Use checkouts dos commits indicados com as dependências instaladas, Python 3.10 ou mais recente e o Bun no PATH. Os comandos a seguir partem desta pasta. Sem argumentos, o script verifica o SHA-256 dos logs e dos fontes reconstituídos. Com um checkout, o script cria arquivos temporários sob `.cache` nos respectivos pacotes e registra a saída do Bun.

```powershell
python ./repetir.py
python ./repetir.py --cliente C:/caminho/do/checkout-cliente
python ./repetir.py --members C:/caminho/do/checkout-members
```

A terceira execução lê `PINTA_CAUSAL_TEST_DATABASE_URL` do ambiente. Use um banco PostgreSQL descartável em loopback para as migrações e registros de teste. O usuário deve ter permissão para executar as migrações do Members. Os casos usam identificadores de conta novos.

O índice guarda tanto o hash dos logs originais quanto o dos logs UTF-8 com LF, nos quais o caminho de trabalho foi substituído por `⟨worktree⟩`. Os casos do host compartilham um prefixo textual arquivado. O verificador recompõe o arquivo individual antes de conferir seu hash. A cópia temporária do caso do Pinta ajusta apenas a distância dos imports relativos à pasta `src`.

## Conflito com um escritor anterior

O candidato `5ef94cc8593c847d9c4a25c395f7a8a6f5797b94` apresentou quatro falhas na recuperação de documentos que uma instalação anterior havia sobrescrito. Cada caso abre o mesmo banco do perfil por meio da API de persistência do escritor `64c197d5332a36b73af54de6ae5bf045a4a7699e`. O teste compartilha o adaptador de IndexedDB em memória entre as duas versões. O relógio de epoch, os estados da reserva e a interrupção de transporte são controlados.

| Ensaio | Resultado observado em 5ef |
| --- | --- |
| Escrita selada com pixel 3, escritor anterior grava 5, conta traz 7 | Restaram os valores 5 e 7. O cliente apagou o gzip com valor 3 nos estados expirado, abortado e ausente após avanço de epoch. |
| Escrita selada 3 e sucessor local 4, depois escritor anterior grava 5 | A API havia confirmado a edição 4 no aparelho. Antes da sobrescrita, o candidato pendente fornecia o valor 4. Depois, a preparação perdeu sua fonte e a resolução do conflito conservou somente 5 e 7. |
| Escritor anterior apaga o último documento selado | O blob, o identificador e o digest sobreviveram a cada tentativa. A fila ficou em erro, com o epoch antigo. |
| Último PUT falha e outra sessão confirma durante o abort | A fila conservou os dois blobs após o HTTP 503. No reinício, verificou novamente o primeiro objeto e escreveu o segundo. Recusou o recibo com digest diferente e confirmou os dois documentos com o recibo correto. |

O comando abaixo repete as onze variações. No commit 5ef, as quatro perdas de autoria produzem código de saída 1. Os casos que caracterizam a fila bloqueada por exclusão verificam a retenção do Blob nesse candidato.

```powershell
python ./repetir.py --terminal C:/caminho/do/checkout-5ef --legado C:/caminho/do/checkout-64c
```

## Retenção da última edição aceita no aparelho

Em `85e506f85f1e2d23bceb69bcea2407c3076f734d`, passaram 17 dos 22 casos de retenção e quota, com 179 asserções executadas. O escritor anterior continua sendo o checkout 64c. Quando o PUT do mapa incluía a folha e o mapa de destino, cada cópia abriu os recursos da respectiva edição. As referências tipadas e as portas foram conferidas depois de reabrir a galeria.

| Sequência | Resultado no checkpoint 85e |
| --- | --- |
| Edição 3 selada, seguida de exclusão ou edição 5 na instalação anterior e versão 7 da conta | A fila instalou a versão 7 e recuperou a última edição local. Quando existia, a edição independente 5 ganhou uma cópia. Uma resposta 404 com o mesmo epoch preservou os dados até o servidor apresentar um epoch posterior. |
| Edição 4 aceita após selar 3, seguida de 5 e 7 | A galeria recuperou 4, 5 e 7. O caso exige especificamente a edição 4 que o aparelho havia confirmado como a mais recente. |
| Substituição da edição pendente | Uma falha na última gravação física preservou o gzip, a revisão e o desenho anteriores. A tentativa seguinte substituiu os três valores e o congelamento aproveitou a mesma chave de blob. |
| Galeria cuja margem comportava o desenho, mas era inferior ao tamanho de seu gzip | A escrita recusou o conjunto inteiro. Depois de reduzir um desenho da galeria, a repetição gravou a folha e o gzip. |
| Primeira adoção de um mapa regional alterado por outro escritor | O mapa esparso de 10.000 × 10.000 células conservou a origem (−64, −64), as versões locais 4 e 5 e suas folhas. A leitura oficial instalou o mapa de valor 7. |
| Exclusão anterior à primeira adoção | A fila reteve o gzip de valor 4, mas deixou de instalar a versão oficial 7 após a lápide do escritor anterior. |
| Mutação do argumento enquanto o gzip está pronto e a transação ainda aguarda | Tanto na primeira escrita quanto após reconhecer um epoch, o aparelho confirmou um desenho de valor 4 junto a um gzip de valor 3. O ensaio usa uma barreira após a compressão real. |
| Mapa salvo após observar o pixel 3 de uma folha já confirmada, escritor anterior muda somente a folha para 5 | O PUT continha só o mapa e identificava a leitura exata da folha por revisão e hash. Ao receber a versão 7 da conta, a sincronização declarou sucesso e a cópia do mapa passou a exibir o pixel 5. A folha autoral de valor 3 se perdeu. |
| Mesmo PUT, escritor anterior muda a folha e o mapa | O cliente pediu arquivos para recuperação. O gzip guardado continha só o mapa. A folha original de valor 3 continuou indisponível. |

O comando seguinte executa os 22 casos. No checkpoint 85e, as cinco falhas das quatro últimas linhas produzem código de saída 1. Os recibos incluem a recuperação do grupo, o teste de fronteira com 32 MiB e o controle separado para a folha externa observada. [Índice de fontes e recibos](indice.json)

```powershell
python ./repetir.py --retencao C:/caminho/do/checkout-85e --legado C:/caminho/do/checkout-64c
```

## Arquivos da fila de disco v3

No checkpoint `4cfb1d323f78c7f96256fe9ffc84156df09aeb02`, 20 dos mesmos 22 casos passaram. O desenho e o gzip conservaram o mesmo pixel mesmo quando o chamador editou o argumento durante a compressão. A primeira adoção preservou a criação local quando a instalação anterior a excluiu. Nas duas sequências em que só o mapa tinha gzip, o cliente interrompeu a descida com o epoch e o arquivo originais.

Um controle adicional abre a fila do escritor de disco v3, executa a escrita concorrente pela API 64c, fecha o host e reabre a sessão sem rede. Com o leitor 4cf, o ZIP produzido pela API continha o mapa original, com ID, nome, ID da folha e digest conferidos depois da descompressão. A galeria deixou de mostrar o botão após reiniciar quando o escritor anterior tinha alterado só a folha. O controle chegou à nona asserção e falhou na visibilidade do botão.

O parâmetro `--v3` permite repetir esse caso com a mesma fila antiga e um leitor posterior. O script preserva o escritor v3 mesmo quando o primeiro caminho aponta para um leitor novo. [Recibos da fila v3](indice.json)

```powershell
python ./repetir.py --retencao C:/caminho/do/checkout-leitor --legado C:/caminho/do/checkout-64c --v3 C:/caminho/do/checkout-4cf
```

## Recursos observados na fila de disco v4

No cliente `f1667cfaf7fee6f0cee49dd07f99a5f32f9cae87`, os 29 casos passaram com 264 asserções. Os 23 casos de retenção e leitura da fila v3 foram repetidos com os escritores originais. O arquivo de recuperação da fila v3 voltou a ficar disponível após reiniciar offline.

Os seis controles adicionais usam a persistência e o host do candidato. Os testes verificam o conteúdo dos blobs pela descompressão e conferem o resultado no catálogo reaberto.

| Sequência | Resultado observado |
| --- | --- |
| Dois mapas editados leem a mesma revisão da folha | A mesma chave guardou uma única cópia do gzip após coalescência, selagem e confirmação do primeiro mapa. Confirmar o último permitiu liberar o blob. Cada PUT continha somente seu mapa. |
| A folha muda entre a compressão e a escrita final | A revisão do mapa e a fila permaneceram intactas. A edição feita em paralelo pela instalação antiga sobreviveu. |
| Falha na gravação física do gzip da folha | O banco reverteu a transação. Uma nova tentativa gravou o mapa e uma cópia da folha. |
| Restam 4 KiB na galeria, o mapa cabe e o gzip da folha supera 8 KiB | A escrita lançou o erro de quota antes de publicar o mapa. Reduzir um fundo e repetir permitiu guardar a edição completa. |
| O único caminho até a folha é a porta por nome do mapa para a cabana | Depois que a instalação antiga mudou a folha para 5, a cópia da vila abriu a cabana com o pixel 3 observado pelo autor. A vila oficial exibiu o 7. A edição 5 também permaneceu na galeria. |
| Um host v3 abre o mesmo banco após um host v4 gravar recursos | A leitura da fila e a escrita causais antigas falharam. A edição, o identificador da operação e os bytes da folha continuaram intactos. O host v4 pôde seguir editando. |

Os recibos identificam o resultado anterior no 4cf e as execuções no f166. Estes controles do cliente usam armazenamento transacional em memória, respostas de rede controladas e o codec de ZIP real. [Índice de fontes e recibos](indice.json)

```powershell
python ./repetir.py --retencao C:/caminho/do/checkout-f166 --legado C:/caminho/do/checkout-64c --v3 C:/caminho/do/checkout-4cf --recursos-v4
```

## Recuperação da autoria e das referências

O grupo de aceitação usa o escritor de registro v1 de `64c197d53` e o leitor v2 de `5ef94cc85`. Em cada caso ambos compartilham o armazenamento do candidato pelo adaptador IndexedDB do Pinta. O Bun executa vinte testes com três estados terminais, reinício, exclusão, coalescência, falha de escrita e primeira adoção. No candidato anterior à sombra durável, os vinte testes falharam em 124 asserções executadas. [Recibo de referência](recibos/duravel-5ef.txt)

```powershell
python ./repetir.py --duravel C:/caminho/do/candidato --legado C:/caminho/do/checkout-64c --leitor-v2 C:/caminho/do/checkout-5ef
```

O ensaio da vila abre cada mapa recuperado, segue a porta pelo nome e lê a peça usada pela célula em ambos os lados. A variante indireta usa outra folha na vila, de modo que a alteração na cabana só afeta a vila por meio da porta. Duas variantes mudam uma folha que o grupo leu sem gravar. Uma delas mantém a revisão exata da folha na conta. A outra elimina essa fonte e exige que o aparelho conserve o selo, os bytes e a edição posterior.
