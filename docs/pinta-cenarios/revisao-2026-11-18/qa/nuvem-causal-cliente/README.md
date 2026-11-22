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
