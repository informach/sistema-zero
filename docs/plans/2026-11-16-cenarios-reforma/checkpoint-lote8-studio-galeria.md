# Lote 8.4 — Galeria de cenários no Estúdio

19/11/2026. Continuação do preparo/store Python de `deb6a3e36`. **Galeria implementada, testada e revisada localmente; 8.4 continua aberto.** A integração dos quatro motores é o próximo recorte.

## Implementação

O diálogo existente **Trazer do Molda** oferece Minhas criações e Cenários quando o servidor confirma a disponibilidade. Uma resposta negativa mantém a galeria antiga; uma falha de conexão aparece com opção de tentar novamente. Isso não altera permissões, rollout ou acesso de alunos.

Os cenários são listados pelo mesmo `CenariosHost`, com nome, jogo, espaço, revisão e capa quando disponível. A entrada pública restrita `molda-cenarios/studio-library` prepara a revisão autorizada com o compilador existente. A revisão, o digest, o espaço e o contexto de licenças são conferidos novamente depois da compilação, antes de entregar o pacote ao Estúdio. A fila de compilação é compartilhada com a exportação da oficina.

O host distingue o namespace de armazenamento local do ID real da pessoa. Cada operação captura seu perfil e sinal antes das esperas; trocar perfil, fechar o editor ou cancelar impede entregar o resultado antigo, inclusive em A→B→A e StrictMode. O cliente HTTP usa `sessionFetch` e a prova de perfil existentes. Pedidos diretos ao armazenamento não recebem os cabeçalhos de sessão.

A interface chama o preparo e a ação atômica do store já qualificados. Nenhum segundo inventário foi criado: o manifesto, modelos, imagens e dados de terreno continuam nos assets do projeto. O manifesto tem apresentação própria e não é enviado ao renderizador de GLB nem à grade de imagens. Os dados internos de terreno ficam em seção recolhida, com a proteção existente contra exclusão de dependências referenciadas.

Se o orçamento real exceder os limites e admitir junção, a interface oferece uma nova compilação explícita com peças estáticas reunidas. Não retira objetos ou dependências silenciosamente. A revisão, origem e licenças aparecem no resultado; repetir uma revisão já presente não duplica recursos. Python exige Raylib 3D e uma release compatível quando o host fornece catálogo, conservando os módulos autorais e o arquivo principal.

## Achados de revisão

- A galeria antiga podia ler o namespace global ativo mesmo recebendo outro contexto. O teste reproduziu leitura de B numa solicitação de A. O acesso à persistência compartilhada agora recebe o namespace explícito; listagem e exportação capturam esse contexto e o sinal sem mudar o perfil global.
- Reinstalar a extensão Raylib 3D podia tentar mover os recursos de um cenário e invalidar o mapa físico do módulo gerado. A realocação conserva os caminhos do manifesto e de suas dependências. Mudar um projeto que contém cenários para Raylib 2D informa a incompatibilidade antes de alterar arquivos.
- Um projeto Python vazio precisava mostrar a aba 3D para permitir trazer seu primeiro cenário. A capacidade existente do Molda habilita essa entrada, sem exigir um asset prévio nem expor o fluxo a Raylib 2D.
- Uma revisão alterada em outra janela precisava de recuperação no próprio diálogo. O teste reproduziu a ausência dessa ação; agora Atualizar cenários relê as revisões e permite importar a atual, mantendo o projeto intacto após a tentativa recusada.

## Qualificação

- Regressão do Estúdio: 144 testes, 689 asserções, sem falhas, incluindo o fluxo existente de materiais, fonte autorizada, preparo, contratos de assets e commit atômico. O wrapper do diálogo executa também seus 26 casos isolados. O teste isolado do host confirma os 39 casos; a galeria/exportação antiga do Molda passou em 14 testes/60 asserções. Núcleo, motor e export Raylib: 609 testes/15.857 asserções.
- Oito combinações reais de navegador: 1440 × 900 e 1024 × 768 com JavaScript Classic/claro e Pro/escuro; 1366 × 768 e 390 × 844 com Python Classic/claro e Pro/escuro. Todas importaram a cena de 20 nós e 28 assets, preservaram o programa/extensões e reabriram os mesmos arquivos e recursos. São oito combinações dirigidas, não todas as permutações de linguagem/tipo/tela/tema. [Antes/depois Classic](evidencias/lote8-studio-galeria/js-classic-1440-900-light-depois.png), [Pro](evidencias/lote8-studio-galeria/js-pro-1440-900-dark-depois.png), [celular claro](evidencias/lote8-studio-galeria/python-classic-390-844-light-depois.png), [celular escuro](evidencias/lote8-studio-galeria/python-pro-390-844-dark-depois.png), [vídeo](evidencias/lote8-studio-galeria/importacao-classic.webm), [recibo completo](evidencias/lote8-studio-galeria/galeria.json).
- Os projetos Python saídos desse botão foram reabertos e exportados pelo pipeline real. Reimportar a mesma cena resultou em zero atualizações e conservou todo o projeto. Somente uma cópia de execução recebeu o programa de prova; o programa da pessoa continua intacto. Classic e Pro executaram no Raylib nativo 6.0.1.0 e no navegador/Pyodide, com quatro clipes, desenho, descarte e precedência do módulo autoral. [Classic renderizado](evidencias/lote8-studio-galeria/python-classic-render.png), [Pro renderizado](evidencias/lote8-studio-galeria/python-pro-render.png), [recibo de importação](evidencias/lote8-studio-galeria/python-pro-importacao.json), [recibo do navegador](evidencias/lote8-studio-galeria/python-pro-browser.json).
- Tipagem integral do Estúdio e do host, mais as conferências isoladas de núcleo, Molda e oficina, aprovadas. Build real e 29 asserções de orçamento aprovados sem elevar limites: inicial 365.070 bytes/118.271 gzip; Blocos 4.727.423/1.266.064; Ponte 4.206.407/1.129.431; Código 2.644.571/741.288. O runtime Three portátil permanece exatamente com 1.106.050 caracteres e SHA-256 `7d66f2567a028af248087cb96c3789f68cc2e10f86e76fbf291559dc498143a6`.
- A exportação da oficina foi repetida depois de extrair a fonte comum do ensaio: ZIP Three e GLB, licença, autoria, foco do diálogo e descarte dos Object URLs conferidos. A prova Python anterior por preparo/store também foi repetida e conservou uma atualização por importação; os projetos já importados pela galeria continuam idempotentes, com zero atualizações. A prova da galeria lê os recursos do próprio projeto, sem depender dos arquivos do pacote anterior.
- Biome dos 40 arquivos de código/JSON alterados ou novos e `git diff --check` aprovados. As evidências versionadas contêm imagens, vídeo e recibos; os arquivos pagos da biblioteca e os projetos com seus bytes permanecem em `output`.

O ensaio de navegador usa a interface, o hook de perfil e o cliente HTTP reais, com backend em memória e identidade sintética isolada. O preview fica desativado nesse host de autoria; a execução Python ocorre no ensaio separado acima, com distribuição local explicitamente qualificada. Isso não constitui validação do backend implantado, de conta real, de execução JavaScript nos quatro motores, de desempenho físico ou de aprovação artística. GLBs, projetos com bytes de arte, pacotes e caches continuam fora do Git.

## Trabalho restante

Registrar o commit desta qualificação; depois carregador compartilhado e os quatro motores, um por vez. Publicação/perfil, lotes 9–10, composição final da Faísca, full review, CI e implantação/validação de staging continuam no encerramento global.
