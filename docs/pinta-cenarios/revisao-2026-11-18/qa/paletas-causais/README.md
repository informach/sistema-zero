# Sincronização da biblioteca de paletas

O host em `4f1f1cb1559de928473a8e5bf2d91dc7f5a29e8a` passou nos seis ensaios com a persistência do Pinta e a fila do Member Shell. O transporte controlou a ordem das respostas e o adaptador de IndexedDB do repositório isolou os perfis. O mesmo conjunto falhou em quatro casos no commit anterior, `5dd13e641`. [Índice e hashes](indice.json)

| Sequência reproduzida | Resultado no host corrigido |
| --- | --- |
| Galeria adotada recebe um snapshot válido e o download de um desenho falha | A biblioteca desce pelo item reservado e o evento de paletas ocorre independentemente do encerramento da tentativa do grafo. |
| Perfil A sai com GET pendente e o perfil B abre no mesmo dispositivo | A resposta tardia preserva as duas bibliotecas locais, a marca da sessão anterior e a fila de upload. |
| Primeiro GET falha sem rede e depois retorna 404 para uma biblioteca que contém só uma lápide | Uma nova tentativa enfileira a biblioteca e conserva a remoção. |
| GET da revisão 2 cruza um 409 que exige revisão 3 | A leitura antiga cede lugar à revisão 3 sem introduzir a cor da biblioteca antiga. |
| A confirmação de uma subida da revisão 2 chega após a leitura confirmada da revisão 3 | A marca permanece na revisão 3, com seu timestamp. |
| Item reservado retorna outra identidade, seguido de 404 com biblioteca vazia | A leitura inválida preserva as marcas e a biblioteca vazia dispensa upload. |

O teste de integração do Community Kids passou em 80 casos e 455 asserções. A persistência local passou em sete casos e 14 asserções. Entre eles estão a recusa dentro da transação após troca de sessão, a criação após uma primeira leitura ausente e a edição depois da remoção de uma encarnação conhecida. [Recibo do Community Kids](focado-community.txt) [Recibo de IndexedDB](focado-idb.txt)

## Reprodução

Use Python 3.10 ou posterior e Bun com as dependências do checkout instaladas. Execute a partir da pasta deste relatório. O primeiro comando confere os hashes. Os dois seguintes executam a mesma fonte nos checkouts indicados. O código de saída 1 é esperado no commit anterior. Os caminhos e os espaços finais dos logs foram normalizados no recibo. O índice identifica os hashes dos originais.

```powershell
python ./repetir.py
python ./repetir.py --checkout C:/caminho/do/checkout-5dd13e641
python ./repetir.py --checkout C:/caminho/do/checkout-4f1f1cb15
```

Os focados do pacote podem ser repetidos a partir da raiz do checkout corrigido.

```powershell
bun --no-env-file test ./packages/community-kids/tests/pinta-cloud-persistence.test.ts
bun --no-env-file test ./packages/pinta/src/state/paletteLibraryPersistence.test.ts
```
