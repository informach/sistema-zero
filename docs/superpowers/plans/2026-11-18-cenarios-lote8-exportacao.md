# Lote 8 — Cena compilada e destinos de exportação — Implementation Plan

> Execução: writing-plans e executing-plans na sessão principal, sem delegação nem pausas de aprovação. Lotes 0–7 fechados, testados e revisados; staging conferida em `dac38c6ee`, árvore limpa. Somente este lote ativo.

**Goal:** exportar e consumir a mesma cena resolvida em three.js, GLB, Python/Raylib, quatro destinos de blocos do Estúdio e Arquipélago, conservando relevo, composição, colisões, metadados e licenças.

**Architecture:** contrato portátil e regras puras em `molda-cenarios-core/compilar`; um adaptador Three no motor materializa a geometria com os mesmos geradores do palco, sem depender de câmera, DOM da oficina ou WebGL ativo. Pacotes, runtimes e perfis consomem a cena compilada. Eles não recalculam por conta própria caminhos, margens ou assentamento. Autoria e assets do Estúdio permanecem nos seus sistemas existentes.

**Tech Stack:** TypeScript/Zod, Three e GLTFExporter instalados, geradores de terreno/água/caminhos já validados, PNG16 existente, ZIP existente do Molda/Estúdio, Raylib/Python e contratos atuais do Members/BFF/R2.

**Spec:** [plano normativo, Exportação e lote 8](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), [interface aprovada](../../plans/2026-11-16-cenarios-reforma/interface-aprovada.pdf), [fechamento do lote 7](../../plans/2026-11-16-cenarios-reforma/revisao-lote7-jogo-luz.md), [execução integral](2026-11-16-cenarios-reforma-execucao.md).

## Restrições globais

- Uma cena compilada alimenta todos os destinos; o documento autoral não é substituído pelo manifesto de distribuição. Escala em metros, Y para cima, transformação final conforme o palco.
- Modelos usados somente, GLB simples sem Draco/Meshopt/KTX2; terrenos e malhas derivadas em partes de até **65.000 vértices**. Preservar normais, UVs, materiais e orientação das faces, inclusive espelhos.
- Resolver conjuntos, apoios de terreno/objeto/água/caminho e ocultação herdada. Não transformar guias do editor em geometria do jogo. Propriedades, zonas, rotas, câmeras e luzes são dados portáteis, não scripts executáveis.
- Terreno inclui malha por partes, PNG16 de alturas e pintura. Água visível, margens, campo de nado e colisão devem corresponder. Pontes/caminhos preservam recortes/encontros e apoios já testados.
- A exportação preserva fontes e revisões. Não modifica modelos originais, reorganiza o documento silenciosamente, arredonda posições para acomodar destinos nem concede recompensas de campanha.
- Licença restrita: pessoa sem equipe não copia/exporta esses modelos. Equipe recebe aviso nominal e licenças no pacote. Permissão é conferida no servidor a partir da revisão real, não de um booleano enviado pelo cliente.
- Estúdio: **48 malhas, 5 MB por modelo, 24 MB por projeto**. Medir os arquivos e malhas finais, oferecer junção estática por região e recusar o destino excedido antes de alterar o projeto. Não chamar contagem de objetos de contagem de malhas.
- Um bloqueio de destino não impede os outros destinos válidos. Não entregar pacote parcial ou omitir assets para caber no orçamento. Erros, progresso, cancelamento e retomada não alteram a autoria.
- Código, runtimes e caminhos de arquivo gerados não interpolam nomes como JavaScript/Python. Serialização de dados e nomes portáteis; impedir caminhos absolutos, `..`, URLs arbitrárias, colisões de nomes e referências fora do pacote.
- Preservar interfaces Kids/adulta/Molda e fila/histórico existentes. Publicação é explícita e versionada. Não abrir a ferramenta a membros nem implantar produção neste lote.
- Uma verificação pesada por vez; navegador sem edição concorrente das fontes. Revisão e commit por recorte, fechamento integral antes do lote 9. Implantação/validação de staging no encerramento global.

## Levantamento confirmado

- `core/v2` já expõe `resolverConjuntos`, `posicaoNoMundo`, `transformacaoDoMarcador`, volumes, campo de alturas, PNG16, recortes/encontros e geometria pura. Aproveitar essas funções.
- `motor/Terreno.ts`, `agua/aguas.ts` e `curvas/caminhos.ts` possuem grupos e fontes físicas sem exigir renderer para construir geometria. `modelos.ts` valida SHA-256/GLB e mantém partes/materiais; `modelo-estatico.ts` e `geometria-instanciada.ts` resolvem pose inicial e transformação. O compilador precisa materializar **toda** a região, sem capturar somente o LOD visível de uma câmera.
- A oficina não tem exportador v2. `CenariosHost` já disponibiliza conteúdo autorizado de modelos/texturas/terreno e o armazenamento confirmado por hash. Ampliar esse contrato para preparação/publicação, mantendo hosts HTTP e memória equivalentes.
- O Estúdio tem `model3d`/`environment3d`, importação pull do Molda, ponte de assets e limites; ainda não tem `scene3d`. `StudioMoldaLibraryAdapter` hoje retorna uma criação, então uma cena com dependências precisa de uma importação atômica explícita, sem fingir que é um modelo isolado.
- Raylib usa o módulo oficial compartilhado de 2D/3D e exporta `raylib==6.0.1.0`. `cenario.py` deve ser acrescentado ao contrato/distribuição e ao export desktop, respeitando módulos da pessoa que sombreiem módulos oficiais.
- A composição atual da Faísca é código com perfil do jogo; o serviço de cenários legado do Arquipélago é v1. A publicação compilada será autoria Members e o perfil do jogo consumirá o resultado; não aumentar o sistema v1 que será retirado no lote 10.

## 8.1 — Contrato portátil, preparação, limites e licenças

**Files:** criar `packages/molda-cenarios-core/src/compilar/{index,tipos,schema,preparar,dividir-malha,orcamento,licencas}.ts`; modificar `packages/molda-cenarios-core/package.json`; testes `tests/compilar-{contratos,preparacao,malhas,orcamento,licencas}.test.ts`.

**Interfaces públicas deste recorte:**

```ts
type DestinoDeExportacao = 'three' | 'glb' | 'raylib' | 'studio' | 'arquipelago'
interface FonteDaCompilacao { cenario: string; revisao: number }
interface LicencaDaBiblioteca {
  id: string
  nome: string
  licenca: 'propria' | 'livre' | 'restrita'
}
interface ContextoDeLicencas {
  equipe: boolean
  bibliotecas: readonly LicencaDaBiblioteca[]
}
interface ArquivoCompilado {
  caminho: string
  digest: string
  bytes: number
  mime: string
}
interface PacoteCompilado {
  cena: CenaCompilada
  arquivos: ReadonlyMap<string, Uint8Array>
}
```

`CenaCompilada` terá identificador de formato/versão próprios, fonte/revisão, arquivos por digest/caminho, referências visuais, transformações finais, colisões, terreno/alturas/pintura, águas, marcadores e ambiente. Schema estrito, relações verificadas e limites de trabalho/bytes antes de alocar. `PreparacaoDaCena` mantém a projeção resolvida e as referências usadas para o adaptador, sem transferir campos editoriais como malhas.

- [x] Escrever e executar testes que falham antes da implementação: nomes de arquivo hostis; arquivo ausente/digest inválido; transformação não finita; terreno sem alturas; apoio/conjunto/ocultação herdados; fonte/revisão; panorama e modelos realmente usados; biblioteca desconhecida/restrita; malha de 65.000/65.001 vértices; índices e atributos inválidos; excedente de destino.
- [x] Implementar `prepararCenaParaCompilacao(documento, fonte, contexto, alturas?)`: validar documento, resolver conjuntos, ocultação e assentamento com funções existentes; selecionar dependências usadas e gerar avisos de licença. Não editar o argumento.
- [x] Implementar `dividirMalhaParaExportacao(malha, limite = 65_000)`: remapear índices/atributos por triângulo, conservando winding, sem cortar triângulos ou exceder o limite. Rejeitar limites/índices/layout inválidos antes de copiar dados.
- [x] Implementar `avaliarOrcamentoDaCena` usando bytes e malhas materiais efetivos. Os três tetos do Estúdio são independentes; relatório inclui excedentes e alternativa de junção estática, sem alterar automaticamente a cena.
- [x] Definir schema/leitor portáteis e tabelas de arquivos/referências verificáveis para todos os consumidores. Tipagem, suíte do núcleo, revisão e checkpoint com API real antes de seguir.

**Prova de comportamento:**

```ts
const original = JSON.stringify(documento)
const preparada = prepararCenaParaCompilacao(documento, fonte, licencas, alturas)
expect(JSON.stringify(documento)).toBe(original)
expect(preparada.objetos.find(o => o.id === 'apoiado')!.transformacao.posicao.y).toBe(alturaEsperada)
for (const parte of dividirMalhaParaExportacao(malha))
  expect(parte.atributos.position.valores.length / 3).toBeLessThanOrEqual(65_000)
```

## 8.2 — Materialização compartilhada da geometria e dos recursos

**Files:** criar `motor/src/compilar/{compilar,recursos,geometria,terreno,arquivos-glb,pintura}.ts`; exportar subpath `motor/compilar`; adaptar pontos de extração dos geradores existentes sem duplicá-los. Testes do motor em `tests/compilar-*.test.ts`, playground `verificar-compilacao-cena.mjs`.

**Contrato:** `compilarCenario` recebe documento/revisão e portas de conteúdo por hash, prepara a cena pelo núcleo e retorna `Promise<PacoteCompilado>`. O motor é o único adaptador de materialização. Os destinos seguintes recebem somente o pacote e não consultam o estado privado do Palco.

- [ ] Testar igualdade entre cenário desenhado e compilado: terreno com relevo/buraco/recorte/pintura, encontros de trilha/praça, estrada conformada, ponte arqueada e apoios, água de catálogo e procedural, conjuntos com giro/escala por eixo, modelo espelhado e animável.
- [ ] Carregar/conferir todos os recursos autorizados da revisão; falha, digest errado e cancelamento descartam cópias/bitmaps/geometrias e não produzem manifesto parcial. Conteúdo original é somente leitura.
- [ ] Materializar terreno inteiro por setores, PNG16 e dados de alturas para runtimes. Conservar a topologia de buracos/recortes. Pintura em textura portátil por setor usa as mesmas camadas/pesos e amostras do editor; não substituir por uma cor média.
- [ ] Reutilizar os construtores de Água/Caminhos e fontes do Testar, incluindo geometrias de modelos conformados. Extrair colisões correspondentes. A malha de água estática usa material portátil; parâmetros dinâmicos continuam no manifesto para os runtimes que os suportam.
- [ ] Gerar GLBs simples e dependências com os materiais/texturas corretos. Usar divisão de malha do núcleo e agrupar estático por região/material quando solicitado. Elementos animáveis ou definidos como atores pelo perfil não serão assados silenciosamente.
- [ ] Validar o pacote final: caminhos/digests/bytes/referências, limites de malha, triângulos, memória, licenças e identificação da compilação. Três ciclos de compilação/cancelamento/descarte e comparação visual/física no navegador. Revisão e checkpoint.

## 8.3 — Pacotes three.js, GLB único e interface de exportação

**Files:** criar `molda-cenarios/src/exportar/{pacote,three,glb,licencas,nomes}.ts`, `oficina/useExportacao.ts`, `oficina/telas/Exportar.tsx`; integrar em `telas/Mundo.tsx` e oficina. Reutilizar ZIP validado do Molda. Criar runtime portátil em `motor/src/compilar/runtime-three.ts` e exemplo correspondente, com dependências/licenças distribuídas explicitamente.

- [ ] Testar arquivos finais por descompactação e recarregamento: somente referências usadas, nomes portáteis, licenças e LEIA-ME, sem URLs assinadas expiradas nem dependência da sessão local.
- [ ] Emitir `cenario.json`, modelos, setores de terreno/derivados, alturas/pintura e licenças. Gerar `carregar-cenario.js` ES module e `index.html` de exploração com câmera, entrada e colisão, usando a cena compilada. Distribuir dependências necessárias de forma versionada e documentada.
- [ ] Emitir GLB único de toda a composição, sem guias editoriais. Conferir no GLTFLoader independente, materiais, iluminação suportada e transformações; documentar no pacote a representação estática dos efeitos que não pertencem ao formato GLB.
- [ ] Interface Molda: cenário/revisão, destino, orçamento, licenças restritas nominais, junção estática por região, progresso, cancelar, erro/repetir e baixar resultado válido. Guarda pendente impede compilar outra revisão por engano. Nenhum novo desenho de UI.
- [ ] Preparação de exportação pelo servidor verifica a revisão e as bibliotecas reais. Ampliar `CenariosHost`, hosts memória/HTTP e Members/BFF/gateway com o mesmo contrato, sem confiar nas permissões declaradas pelo cliente.
- [ ] Ensaios de download e exemplo andando: Chrome em quatro layouts, claro/escuro, arquivo GLB reaberto, ZIP sem sessão, erro/cancelamento e regressão de autoria. Revisar, documentar e commitar o recorte.

## 8.4 — Python/Raylib e Estúdio nos quatro destinos

**Files Raylib:** `studio/src/runtime/python/raylib/py/cenario.py`, `raylib/contract.ts`, `raylib/moduleSources.ts`, `python/officialModules.ts`, `export/raylibDesktop.ts`; `molda-cenarios/src/exportar/raylib.ts`. Testes Python e testes dos contratos/export desktop.

**Files Estúdio:** `studio/src/core/projectAssets.ts`, `preview/assetsBridge.ts`, `export/fileMap.ts`, novo `studio/src/three/scene3d.ts` e runtime compartilhado; `studio/src/studio/{molda-library,types,StudioCore}.ts*`, importação do painel de assets e `member-shell/src/components/creator/use-studio-creation-libraries.ts`. Blocos/codecs/runtimes existentes de `official-extensions/world-3d`, `blockly/blocks/canvas3d.ts`, `official-extensions/game-3d` e `official-extensions/game-3d-advanced`.

- [ ] Gerar pacote Raylib com `models/`, `cenario_<nome>.py`, `cenario.py`, dados e exemplo. Agrupar estático por região/material para reduzir chamadas. Runtime carrega, desenha, consulta altura e verifica colisões por caixa conforme o contrato do destino; não chamar essas caixas de física de malha.
- [ ] Acrescentar o módulo oficial ao Raylib 2D/3D existente, distribuição browser e export desktop, com a versão upstream já fixada. Módulo da pessoa tem precedência; sem sobrescrever `cenario.py` autoral. Conferir execução CPython e runtime Python do Estúdio.
- [ ] Criar asset `scene3d` estrito com manifesto compacto e referências a assets `model3d` comuns. Validar dependências, hashes, nomes/IDs, MIME, dimensões/limites e remoção/rename. Importar cena/dependências atomicamente pela biblioteca existente, preservando origem/licença.
- [ ] Acrescentar “Usar o cenário” e o tipo de seletor adequado aos quatro destinos. Um adaptador compartilhado carrega a cena; cada motor conecta cena/colisões/altura à sua API. Mundo 3D usa o mapa de alturas como fonte de `heightAt`; Canvas 3D oferece `sz_t3d_load_scene`; Jogo 3D e Avançado conservam seus controladores.
- [ ] Medir projeto existente mais a importação antes de gravar: 48 malhas, 5 MB/modelo, 24 MB/projeto. Oferecer junção estática quando resolver o excedente; caso contrário, erro concreto e projeto intacto. Repetição de importação não duplica recursos idênticos nem perde IDs usados por blocos.
- [ ] Executar o mesmo cenário nos quatro runtimes, com relevo, objetos, água, caminhos, início e metadados; conferir export/reabertura, CSP/offline aplicável e projeto acima do orçamento. Testar importação Python no fluxo “Trazer do Molda”. Revisão e checkpoint.

## 8.5 — Publicação versionada e perfil do Arquipélago

**Files:** novos `members/src/application/cenarios/publicacoes.service.ts` e contrato de publicação no domínio/porta existentes; `infrastructure/persistence/drizzle/schema.ts` e repositório; migration gerada por Drizzle a partir do schema/journal atuais. Members HTTP, BFF e host conforme os padrões de cenários. Novo adaptador/carregador de cena compilada em `arquipelago/src/mundo/cenario-publicado.tsx` e perfil em `arquipelago/src/sistemas/perfil-de-cenario.ts`; integrar na composição da ilha.

- [ ] Testes antes: publicar exige equipe sem suporte e revisão real, pacote válido e recursos confirmados; transação fixa manifesto/assets/revisão; repetição idempotente; troca concorrente recusada; assets publicados não são apagados enquanto referenciados. Consulta de jogo não abre biblioteca privada ou um espaço arbitrário.
- [ ] Ampliar tipos de blob/conteúdo somente com formatos validados. Reutilizar upload confirmado, hashes e cota. Publicação guarda uma versão compilada verificável e um apontador de perfil/ilha, sem usar o serviço autoral v1 como atalho.
- [ ] Gerar migration pelo fluxo seguro, revisar SQL e testar PostgreSQL isolado, HTTP/BFF e autorização; nenhum deploy intermediário. A escolha do número gerado deve acompanhar o journal atual, sem colidir com mudanças externas.
- [ ] Implementar “Publicar no Arquipélago” com confirmação da versão concreta no próprio fluxo da ferramenta e retorno do estado publicado. É uma ação de produto; não pedir nova aprovação de desenvolvimento, pois a usuária já autorizou a implementação.
- [ ] Perfil traduz propriedades de ator/placa/marcos e parâmetros de física para os sistemas existentes. Carregar setores/modelos/água/colisões publicados sem duplicar a composição em código. Usar código como reserva quando não houver cena publicada, como exige o plano; falha de pacote fica explícita.
- [ ] Testar no `/macro` com Cute Characters nativo, caminhada, ponte, água, câmera, pausa, retomada, descarregamento e nova versão publicada. Preservar narrativa, inventário, Morada, velocidade, geografia e sistemas existentes. Revisar e registrar publicação de ensaio separada.

## 8.6 — Fechamento exclusivo do lote

- [ ] Conferir linha a linha o escopo de exportação do plano normativo: todos os cinco destinos, quatro runtimes do Estúdio, Raylib fora/dentro e publicação/perfil. Não declarar lote fechado com somente um ZIP ou um GLB.
- [ ] Suítes/tipagem de núcleo, motor, oficina, Studio, Members, BFF, gateway e Arquipélago pertinentes; PostgreSQL e builds/workers. Comparar autoria original e geometria/física compiladas.
- [ ] Reabrir pacotes sem a aba autoral; exercitar exemplos jogáveis, limites, licenças, progressos/cancelamentos, falhas e ciclos de recursos. Capturas/vídeos e resultados medidos, distinguindo local/emulado/serviço real.
- [ ] Revisar, documentar e enviar commits/evidências à staging. Só então iniciar lote 9. Composição final da Faísca, full review, CI, implantação e validação remotas continuam no encerramento global.

## Estado atual

**Lote 8 aberto; 8.1 fechado, exclusivamente em 8.2.** [Contrato de 8.1](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-contrato.md). [Superfícies/GLB](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-superficies-glb.md), [pintura/recursos](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-pintura-recursos.md), [modelos animáveis](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-modelos-animaveis.md) e [objetos/metadados](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-objetos-metadados.md) implementados e conferidos em recortes. [Integração em execução](2026-11-18-cenarios-lote8-integracao.md). Montagem completa e comparação/ciclos continuam pendentes antes de 8.3. Nenhum exportador v2 completo foi declarado entregue. Lotes 0–7 fechados localmente; 8–10 e encerramento global pendentes.
