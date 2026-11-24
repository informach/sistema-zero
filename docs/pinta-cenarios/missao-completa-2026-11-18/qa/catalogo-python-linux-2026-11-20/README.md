# Catálogo Python Linux e verificação integrada — 20/11/2026

A CI 44808020483 da fonte 2662 encontrou um teste da gaveta Pro que procurava
o comando Python de forma síncrona. A importação adiada já estava correta, mas
o teste de outro grupo começava com o módulo frio. O caso foi reproduzido sozinho
e passou após aguardar o próprio elemento, sem elevar o timeout, importar o
componente antecipadamente ou alterar o produto. Passaram oito casos da gaveta
e 134 de modos. O ajuste desta entrega é exclusivamente no teste.

## Suíte, ambiente e tipos

A execução completa local parou em src/state: faltava o Vite do compilador
confiável dentro de studio-runtime/runtime/node_modules. O log preserva a falha.
Foi executado npm ci com os mesmos argumentos da CI, sem alterar fontes ou lock.
A retomada utiliza a descoberta e os grupos do runner oficial, a partir do grupo
que falhou. selecao-testes.json confirma todos os grupos anteriores e restantes;
os dois logs conservam os resultados. Não apresentar a primeira tentativa como
uma execução inteiramente verde nem somar wrappers/subprocessos como casos novos.

Os seis gates da retomada passaram: grupos restantes do Estúdio, política/hosts,
tipos completos do Estúdio e Members, perfil oficial e Biome. Os hashes das
fontes congeladas foram conferidos antes de retirar a primeira candidata local
do catálogo. A candidata Linux foi validada depois pelo empacotador e carregador
canônicos e pelos 11 testes de política/hosts. Passaram também 59 testes do promotor.

## Artefato exato

A CI Linux 44813052295 qualificou a fonte 6c4b50299 e reteve a distribuição
52ec7bb5b7f4a11dd3ad915064a6b6b9b0f32bb33b8335dba4dbfebc389dcd13,
além da imagem. Os 126 arquivos foram relidos e conferidos. A compilação Windows
55471575 conserva os mesmos 110 arquivos lógicos; somente os 16 gzip diferem.
Foram descomprimidas e conferidas as 32 representações das duas compilações.
A promoção utiliza os bytes Linux, sem reinterpretar a prova nativa como se
ela tivesse executado outro manifesto. A imagem foi armazenada e relida pelo
digest, sem implantação do Worker ou alteração de seletor.

Sobre esse artefato passaram 83 ensaios compartilhados no Chrome instalado,
conforme os canais das configurações oficiais Python/Raylib, e 17 Pinta/Pygame
no Chromium 159 fornecido pelo Playwright. Os casos Pinta verificam todos os
erros do console. Incluem Vila → Cabana → Vila, plataformas, escalas e PyDew Valley.

O ensaio ampliado dos 83 no Chromium fornecido passou em 77 e divergiu em seis
imagens Raylib. Os seis controles passaram no Chrome, com os mesmos bytes,
referências e tolerância. As diferenças foram preservadas, sem trocar imagens,
enfraquecer a comparação ou modificar o motor. Não afirmar paridade gráfica
dessas cenas Raylib entre os dois navegadores. A prova de Pinta no Chromium
está separada da comparação Raylib.

## Catálogo ainda desligado

O arquivo público preparado é 87a8e72812995c056381fcae6a76298fc5ca4c817f70808095c931df3fa94985.
Foi criado pela fábrica oficial sobre a configuração de staging conferida ao
vivo. Conserva as duas releases anteriores e seus manifestos; a fábrica retira
a autoria ativa anterior ao acrescentar a release 2026-11-20-pinta-cenarios-4.
Essa mudança só terá efeito quando o seletor for explicitamente ativado.
A candidata Windows anterior, nunca ativada nem commitada, foi retirada apenas
após conferir seus bytes, posse e condição de arquivo não rastreado.

Não foram modificados estilos do Pinta nem fontes funcionais de Molda/3D.
O fechamento de código do runtime é idêntico ao de 6c4b50299; o perfil segue
18aedad… e o novo commit precisa de sua própria CI geral. Política, seletor
Python, gravador, rollout autenticado e conclusão da missão continuam separados.
Estas provas locais usam somente esta máquina Windows; a CI Linux é uma prova
distinta. Não houve teste físico em outro aparelho nem participação infantil.

Anexos grandes repetidos foram deduplicados em arquivos anexo-* por SHA-256.
Os relatórios conservam tamanho e hash dos corpos originais; seus bytes não
foram formatados nem alterados. Os relatórios completos também permanecem no cache local.
