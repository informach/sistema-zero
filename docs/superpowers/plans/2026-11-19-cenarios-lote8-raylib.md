# Lote 8.4 — Destino Python/Raylib — Implementation Plan

> Execução na sessão principal com writing-plans/executing-plans, sem delegação ou pausa de aprovação. Staging conferida em `1ba3f0193`, limpa e enviada. Este é o primeiro recorte de 8.4; Estúdio por blocos só começa após seu teste/revisão.

**Goal:** abrir a cena compilada no Raylib nativo e no Python do Estúdio, preservando geometria, transformações, relevo, metadados e licenças.

**Architecture:** `cenario.py` é um módulo oficial compartilhado do Raylib, distribuído pelo contrato existente e serializado pelo gerador Python existente para os exportadores. Recebe o mesmo manifesto compilado e arquivos conferidos; não resolve autoria ou gera terreno/caminhos novamente. A exportação Raylib usa a junção estática compartilhada e realoca GLBs para `models/`, sem alterar conteúdo, fonte ou licenças. `scene3d`/blocos e publicação permanecem nos recortes seguintes.

**Tech Stack:** Python 3.12+, Raylib `6.0.1.0`, módulo browser `_szraylib`, ZIP/compilador/GLB existentes, Bun e Chrome instalados.

**Spec:** [plano normativo](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), [8.4 e restrições globais](2026-11-18-cenarios-lote8-exportacao.md).

## Contrato

`cenario.carregar(caminho='cenario.json') -> Cenario` confere manifesto, referências locais, tamanhos/digests e limites antes de carregar os modelos. Falha descarrega tudo o que já tiver sido alocado. `Cenario.desenhar()` usa as matrizes completas e recursos compartilhados estáticos, sem juntar atores animados. `altura(x,z)`/`tem_chao(x,z)` consultam alturas triangulares, domínio, peças, buracos e recortes; não inventam piso fora do terreno. `colide_caixa(minimo,maximo,ignorar=(),tipos=...)` consulta AABBs compiladas, explicitamente aproximações, sem alegar física de malha. Metadados, marcadores, águas, rotas e propriedades ficam disponíveis como dados. `descartar()` é idempotente; carregar não inicia loop nem muda a câmera do programa.

## Ordem exclusiva

- [x] Escrever testes CPython para desenho/matriz, recurso duplicado, relevo triangular e buracos/recortes/peças, metadados, colisões por caixa, digest/caminho inválido, falha parcial/descarte e dois cenários independentes; executar vermelho antes do módulo.
- [x] Implementar `studio/src/runtime/python/raylib/py/cenario.py`, distribuir em `contract.ts`/`moduleSources.ts`, reconhecer módulo oficial condicionado à extensão Raylib e respeitar `cenario.py` autoral.
- [x] Integrar fonte canônica no gerador `scripts/gen-python-text-sources.ts` e export desktop existente, ao lado do entrypoint, sem sobrescrever arquivos/pacotes da pessoa. Registrar arquivos gerados no manifesto de exportação e testar conflitos/nomes/case/precedência.
- [x] Implementar `molda-cenarios/src/exportar/raylib.ts`: junção compartilhada, arquivos em `models/`, manifesto verificável, módulo de dados com nome portátil, auxiliar, exemplo, requisito fixado e licenças/limitações. Gerar código fixo e serializar dados, nunca interpolar nomes como código. Sem GLB/bytes privados no Git.
- [x] Conectar o destino real à interface de exportação; ensaiar download e execução do pacote real em CPython com Raylib fixado e no runtime Python browser do Estúdio. Verificar alturas contra núcleo, modelos/água/caminhos e atores, cancelamento/limites/licenças/autoria.
- [x] Regressão, tipagem/build pertinentes, revisão, capturas/vídeo/resultado e commit/push. Manter 8.4 aberto até concluir também `scene3d`, importação atômica e os quatro motores de blocos. Implantação somente no encerramento global.

## Limites explícitos

Água é geometria estática neste destino; iluminação, céu e névoa são dados para o programa Raylib, não shaders Three. O exemplo explica essas diferenças. Animação usa a API Raylib nativa; não criar outro motor de animação. Tetos e verificações dos pacotes compilados continuam valendo. Não aumentar limites nativos do Estúdio para acomodar uma cena.

Recorte de pacote/auxiliar Raylib fechado localmente em 19/11: [revisão e evidências](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-raylib.md). 8.4 permanece aberto; próxima parte: scene3d/importação e quatro motores do Estúdio, incluindo o fluxo Python Trazer do Molda.
