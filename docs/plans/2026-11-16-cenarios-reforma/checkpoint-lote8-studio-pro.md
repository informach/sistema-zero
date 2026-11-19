# Lote 8.4 — Cenários no Pro autoral

19/11/2026 · `staging` · **implementado, testado e revisado localmente**, sobre a base atualizada `3d408ccf1`. Continuação do Avançado enviado em `2932075e4`. Este recorte conclui o Pro autoral e a conferência local de 8.4. Implantação, conta real e fechamento global permanecem no final.

## Implementação

O Pro criado diretamente pode importar o cenário do Molda pelo painel existente e inserir a receita `carregarCenario(cena, sinal)`. A receita calcula o caminho relativo ao arquivo selecionado, usa o ID estável e não adivinha nomes, câmera, controles ou loop. A biblioteca Three precisa estar declarada pelo autor; o módulo verifica a revisão compatível, sem reescrever dependências.

O materializador e o coordenador existentes projetam três arquivos em `studio-generated`: `molda-cenarios.mjs`, `molda-cenarios-runtime.mjs` e `molda-cenarios.d.mts`. São derivados efêmeros, não fontes persistidas na árvore autoral. Os mesmos caminhos e hashes acompanham o disco local, a revisão, a entrada remota e a exportação. Conflitos com arquivos/pastas do autor são recusados. Remover o último cenário retira somente as projeções pertencentes ao coordenador.

A entrada Pro usa `carregarCena3DDoProjeto`, o instalador, as colisões, a chegada e o descarte canônicos. Não substitui `window.SZScene3D`, não cria renderer/câmera/RAF e não depende de uma conversão do clássico. O gerador qualifica as duas entradas, com os mesmos limites e inventário de licenças; o SDK clássico continua byte idêntico.

O módulo contém metadados do manifesto, sem incorporar outra cópia dos GLBs, imagens ou campos. Ao pedir uma cena, busca seu envelope e somente as dependências referenciadas, pelos caminhos materiais do próprio projeto. Confere tamanho durante a leitura e SHA-256 antes do uso, mantém cache dos recursos completos e cancela leituras parciais. Não segue redirecionamentos. O carregador canônico confere novamente o pacote antes da montagem.

## Tipagem e política

O contrato portátil importa apenas tipos de `three` e oferece carregamento, instalação, chegada, física, alturas, atores/clipes e descarte. Metadados extensos permanecem conservadoramente como `unknown`; o objeto executado conserva todos os dados. Um teste com TypeScript real verifica JS com `checkJs`, TS com `strict` e a atribuição do handle canônico ao contrato exposto. Sem supressões ou mudança do tsconfig autoral.

O canal remoto de materiais aceita os três nomes derivados exatos. Não foi aberta uma pasta genérica de código executável, e variantes, travessia, nomes reservados e colisões continuam recusados. Cotas e limites anteriores permanecem.

## Correções e limites encontrados

- A primeira projeção embutia os bytes dos materiais outra vez no módulo. O ensaio do contrato remoto revelou a duplicação. A versão atual usa os arquivos binários já projetados, com leitura limitada e digest, e carrega só as dependências da cena solicitada.
- O primeiro navegador completou movimento/descarte, mas acusou um 404. A instrumentação HTTP confirmou `/favicon.ico`; a página de ensaio recebeu ícone explícito. A repetição não ignora erros de console.
- O coordenador recusa sobrescrever arquivos anteriores desconhecidos, inclusive em ensaios repetidos. Cada execução agora usa uma pasta privada nova, em vez de apagar arquivos ou contornar essa proteção.
- A revisão reproduziu uma mudança de rótulo durante a espera do módulo. Os metadados agora são capturados antes da primeira espera, conservando o mesmo snapshot do preparo. Teste vermelho/verde preservado.
- A receita nova exige um arquivo processado pelo Vite; não é oferecida em scripts de `public/`, que continuam preservados e não entram automaticamente no grafo do build. Um teste reproduziu e protege esse limite. O caminho clássico convertido continua usando sua integração já qualificada.
- A primeira tipagem integral apontou o contrato incompleto dos mocks de `fetch` do Bun e a leitura não afirmada de um byte na fixture. Os testes passaram a representar a API real, incluindo `preconnect`, sem supressões nem mudanças no runtime de produção para acomodar mocks.
- O cenário completo contém aproximadamente **8,72 MB de materiais originais**. Seu envelope remoto final é **12.436.829 bytes** e é corretamente recusado pelo limite preexistente de **2.000.000 bytes**; os materiais originais sozinhos já excedem essa cota. Execução local e exportação funcionam. O cenário menor tem envelope de **1.311.110 bytes**, aceito pelo parser remoto. Aceitação do contrato não é uma compilação remota executada. Não foi elevado nenhum limite para acomodar o ensaio.

## Evidências locais

Projeto Pro criado diretamente, materializado pelo coordenador, serializado e reaberto com fontes e `package.json` preservados. Exportação de fontes feita pelo exportador existente; os bytes de cada projeção coincidem com o payload de revisão. A execução usa a receita real do painel e o controlador Physics Lite existente.

Quatro casos passaram no Chrome com WebGL real: cenário completo e recorte no servidor Vite, e ambos depois do build do site exportado. A mesma instalação npm do Three é resolvida por alias de ensaio, sem alterar o `package.json` do autor. Cada caso faz três trocas, conserva câmera/renderer/loop e verifica que um SDK global já existente não foi substituído.

- Cenário completo: **441 alturas/máscaras** coincidem com Raylib a `1e-6`; ator/clipes conservados, caixa física impede passagem, caminhada/corrida, salto/pouso e curva.
- Recorte: entrada e queda por gravidade, sem piso artificial.
- Erro de ID e sinal cancelado conservam a base ativa. Recursos estáveis: **24 geometrias/22 texturas** no cenário completo, **4/3** no recorte; descarte final **0/0**, sem reset artificial.
- Testes de bytes reais: cache, dependências seletivas, adulteração/hash, fluxo acima do tamanho declarado, cancelamento e ausência de alteração do SDK global.
- Build/orçamento repetido na staging atual: inicial **342.087 bytes/110.777 gzip**; Blocos **4.737.363/1.265.093**, Ponte **4.216.340/1.128.480**, Código **2.650.466/739.604**. Um teste e 53 asserções, 22,35 s, sem elevar limites.
- SDK Pro: **504.262 caracteres**, SHA-256 `5a743638164ff21ad355f7ae7f227c8862941cf8fc6aa8ff402b7cdcd19d6753`. SDK clássico permanece em **504.025 caracteres**, SHA-256 `d76ac4d1ed15297de49243658fcff860ae20fbee527d2baeb31db2e3fa45a154`.
- Regressão final Pro/importação/conversão/revisão/disco/painel: **107 testes, 586 asserções, 13 arquivos**, sem falha em 20,38 s. Contratos core/executor: **23 testes, 108 asserções**, sem falha. Conferência das alterações concorrentes de abertura/preview/cópia preservada: **50 testes, 177 asserções**, sem falha. Tipagem integral do Studio repetida e aprovada sobre a staging atual; gerador com as duas entradas conferido em `--check`, Biome e diff sem erros.

Evidências versionadas: [início no Vite](evidencias/lote8-studio-pro/completo-source-inicio.png), [movimento](evidencias/lote8-studio-pro/completo-source-movimento.png), [site construído](evidencias/lote8-studio-pro/completo-export-inicio.png), [recorte](evidencias/lote8-studio-pro/buraco-source-movimento.png), [vídeo completo](evidencias/lote8-studio-pro/completo-source.webm), [vídeo do recorte](evidencias/lote8-studio-pro/buraco-source.webm), [recibo](evidencias/lote8-studio-pro/recibo.json) e [materialização/revisão/limites](evidencias/lote8-studio-pro/materializacao.json). O percurso começa em um trecho conhecido da ponte e é parcial; a cápsula de referência não certifica animação de avatar ou travessia integral.

## Revisão e continuidade

A revisão conferiu a projeção única pelo coordenador, captura antes de awaits, ausência de bytes duplicados no módulo, caminhos e hashes, seleção de dependências, leitura limitada/cancelável, cache completo, erro e troca atômica, preservação do SDK global, contrato portátil, fonte/reabertura/export e limites remotos. Os projetos, GLBs, sites e vendors privados ficam em `output/`; somente as evidências listadas acima acompanham o registro em staging.

A conferência integrada de 8.4 relacionou o [contrato](checkpoint-lote8-studio-contrato.md), o [preparo](checkpoint-lote8-studio-preparo.md), as [fontes/commit Python](checkpoint-lote8-studio-python-importacao.md), a [galeria/host](checkpoint-lote8-studio-galeria.md), o [carregador](checkpoint-lote8-studio-carregador.md), o [transporte](checkpoint-lote8-studio-transporte.md), [Mundo](checkpoint-lote8-studio-mundo.md), [Canvas](checkpoint-lote8-studio-canvas.md), [Jogo 3D](checkpoint-lote8-studio-jogo3d.md), [Avançado](checkpoint-lote8-studio-avancado.md) e este recorte Pro. A galeria já exercitou Python/Raylib pelo produto em Classic e Pro, com export/reabertura e comparação nativa/browser. Os quatro motores foram requalificados após as mudanças compartilhadas no Avançado. O SDK clássico permanece idêntico neste corte.

Após registrar/enviar este recorte, o próximo é 8.5, perfil/carregador do Arquipélago. O lote 8 inteiro ainda não está concluído.

As provas não certificam conta/implantação, execução do compilador remoto, sandbox do host Pro remoto, cache/PWA, aparelhos físicos, IK ou direção de arte. O fechamento global ainda exige 8.5/8.6, lotes 9–10, composição da Faísca, full review/CI e implantação/validação em staging.
