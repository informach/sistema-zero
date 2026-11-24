# Integração publicada 39fc

A fonte combina o leitor A1 4db9390c2 com o remoto publicado 39fc593c3.
Pausa Python, republicação no mesmo link e a migração do Hub são preservadas.
Os quatro conflitos de tipos inicialmente mantiveram as versões publicadas,
com JavaScript idêntico. A CI desse próprio remoto revelou que o Pick de
ReadonlySet ainda herdava, no callback forEach, a coleção ESNext inteira.

A primeira rodada passou em 20 gates e falhou no typecheck completo do Members,
como a CI. A reprodução isolada também falhou. A regressão nova compila um
consumidor real com ES2022 e ESNext e confere que o callback não oferece escrita
nem union. Antes da correção, o caso ESNext falhou. A assinatura foi corrigida
somente no tipo. TypeScript e Bun geram JavaScript exatamente idêntico; o guest
Python foi reconstruído e seus 126 arquivos continuam byte a byte iguais.

Passaram os 16 gates da continuação, incluindo a regressão, tipos completos,
perfil, SDKs oficiais, controles nativos e os ensaios Python reais. A cobertura
das 29 categorias está em cobertura-de-verificacao.json. Não foi uma única
invocação inicial inteiramente verde: a falha e as duas fontes congeladas
estão preservadas. O runtime da suíte completa do Estúdio e dos 35 ensaios
de navegador/12 de integração permanece idêntico após a correção apagada.
Os 22 casos Pygame/Pinta e 90 compartilhados usam o guest final reconstruído.

O derivado canônico 3D recebe somente os 35 caracteres da regeneração de SDK
anteriormente autorizada. O restante do módulo, imports e licenças permanece
idêntico. O timeout da publicação usa conexão HTTP real, sem alterar prazos;
o diagnóstico está em ../publicacao-timeout-2026-11-20/README.md.

A primeira tentativa de commit parou na checagem de espaços de quatro linhas
já publicadas. A análise da AST confirmou que elas ficam dentro da string do
SDK, cujo hash precisa permanecer exato. `.gitattributes` aplica ao arquivo
específico a mesma preservação de `blank-at-eol` já usada pelo runtime Python
gerado. Nenhum byte do SDK foi alterado; a checagem completa do índice foi
repetida. `sdk-whitespace.json` registra as linhas e os hashes conferidos.

Esta é uma prova local. Ainda faltam CI geral da fonte final, imagem e guest
Linux exatos, rollout e homologação autenticada. Nenhum seletor, política ativa
ou gravador de nuvem foi alterado por estes testes. A missão segue em andamento;
não há prova de aparelhos adicionais ou participação de crianças.

Os relatórios foram formatados sem alteração semântica. hashes.json identifica
os arquivos arquivados; tentativas e avisos dos comandos são preservados.
