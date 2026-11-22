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
