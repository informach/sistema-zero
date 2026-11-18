# Lote 8.1 — Contrato portátil e preparação da cena

18/11/2026 · `staging`, base conferida em `4fe2aac0f` · **8.1 fechado; lote 8 permanece aberto.** As alterações externas do Pinta foram preservadas. Este recorte não implementa exportação, publicação ou interface de download.

O núcleo oferece `CenaCompiladaSchema`/`lerCenaCompilada`, com formato e versão próprios, fonte/revisão/digest, inventário, nós visuais, colisões, terreno, águas, caminhos, marcadores, ambiente e procedência/licenças. A leitura verifica referências, duplicações inclusive em sistemas sem distinção de maiúsculas, matrizes afins invertíveis, organização sem ciclos, limites de trabalho, arquivos de alturas e coerência dos dados derivados. Rotas têm distâncias correspondentes aos pontos e fechamento consistente; câmeras conservam posição e campo de visão.

`prepararCenaParaCompilacao` valida e projeta o documento sem alterar a autoria. Reutiliza a expansão de conjuntos, ocultação herdada, assentamento, rotas e câmeras do núcleo. Retorna objetos em pose absoluta, recursos realmente usados, procedência das montagens e referências do terreno. Terreno exige a fonte real de alturas; perfis antigos exigem conversão. O adaptador do motor fornecerá também as superfícies reais dos caminhos, sem aproximá-las por um plano.

`PacoteCompilado` reúne manifesto e mapa de bytes. `conferirInventarioCompilado` recusa arquivos ausentes, extras, truncados ou com hash divergente, e respeita cancelamento. Essa conferência **não valida o formato interno dos binários**: a inspeção de GLB/accessors, imagens e campos antes dos decoders pertence a 8.2. Nenhum consumidor deve tratar o inventário como substituto dessa inspeção.

O snapshot resolvido completo em `PreparacaoDaCena.documento` serve aos geradores compartilhados. Não é o manifesto de distribuição. O adaptador usará as listas explícitas de elementos visíveis e os mesmos critérios do palco; geometria de guias editoriais não será exportada. Procedência de um modelo não implica distribuir uma cópia ociosa do GLB original quando a geometria utilizada é derivada.

## Verificação e revisão

- 18 novos testes / 77 verificações: preparação, contrato e inventário. Incluem ausência de alturas, transformação herdada, escala de apoio na água, dependências usadas, conjuntos e licenças, referências/ciclos, caminhos hostis, dados não finitos, matrizes refletidas e inválidas, panorama, dimensões de terreno, distâncias/câmeras incoerentes e cancelamento.
- Inventário falhou inicialmente por módulo ausente; passou após implementação. A revisão acrescentou o teste de rota fechada, que falhou antes da correção e passou depois.
- Suíte completa do núcleo: **336 testes, 10.529 verificações, zero falhas**. `tsc --noEmit` e Biome passaram nos arquivos do recorte.
- Revisão: contratos estritos; buffers/documento de entrada preservados; sem IO na preparação; sem autorização baseada em declaração do cliente. Os helpers de limite/licença/orçamento do [primeiro checkpoint](checkpoint-lote8-limites.md) permanecem cobertos.

**Próximo recorte exclusivo: 8.2**, materialização da geometria com os geradores do motor, validação dos binários, pintura portátil e comparação com o palco. Exportadores, interface, Estúdio/Raylib, publicação/perfil e fechamento do lote 8 continuam pendentes. Lotes 9–10, composição final da Faísca e validação de implantação permanecem no encerramento global.
