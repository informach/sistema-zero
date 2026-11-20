# Lote 8.5 — Publicação versionada e Arquipélago — Implementation Plan

> Execução principal com writing-plans/executing-plans, sem delegação ou aprovação intermediária. Staging local/remota conferida após `4b26a3e69`; 8.4 fechado com implementação/testes/revisão. Não iniciar 8.6 ou lote 9 antes de concluir este recorte. Implantação/validação remota ficam no encerramento global.

**Goal:** publicar uma revisão compilada e imutável da oficina, confirmada pela equipe, e executá-la no `/macro` com o controlador, Rapier e sistemas nativos do Arquipélago.

**Architecture:** Members guarda versões e referências aos mesmos blobs por espaço/hash, com CAS do perfil e da fonte. O BFF confere os arquivos no armazenamento e afirma a publicação por HMAC; o navegador não confirma conteúdo. A leitura do jogo resolve somente perfis publicados, passando pela autorização existente de acesso ao Arquipélago. O cliente usa o carregador canônico e traduz metadados para os sistemas atuais.

**Tech Stack:** núcleo compilado/validação existentes, Drizzle/PostgreSQL, Elysia, Members/BFF/gateway, upload confirmado R2, React/R3F/Three 0.184 e Rapier nativos, ensaios Bun/Chrome/PostgreSQL.

**Spec:** [plano normativo](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), [8.5](2026-11-18-cenarios-lote8-exportacao.md), [fechamento de 8.4](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-studio-pro.md).

## Restrições e estado inicial

**Checkpoint de 19/11:** contrato, serviço, reserva/conferência e persistência estão implementados e testados localmente; ver [base da publicação](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-publicacao-base.md). Ainda faltam rotas/hosts/interface, consumidor nativo e fechamento integrado. O 8.5 permanece aberto.

**Continuação de 19/11:** rotas, hosts, confirmação na oficina e leitura autorizada do jogo implementados e verificados neste [checkpoint](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-publicacao-oficina.md). O consumidor nativo e as provas no `/macro` continuam pendentes; 8.5 não está fechado.

- Preservar sete territórios, seis distritos/cabeceiras, avatar Cute nativo, controlador/Rapier/câmera/toque, velocidades, inventário, Morada, campanha e identidades Kids/adulta.
- O posto libera a Missão do Núcleo; instalar o Núcleo reconstrói a ponte. Publicar cenário não concede progresso nem altera a ponte por posto.
- Sem outra biblioteca, inventário ou serviço de autoria v1. Proteger arquivos referenciados por qualquer versão publicada, mesmo depois de editar/apagar a fonte.
- Publicação exige equipe sem suporte, fonte realmente salva no espaço da equipe, licença autorizada e pacote/arquivos conferidos. Leitura do jogo não permite informar outro espaço ou abrir a biblioteca privada.
- Os recursos compilados permanecem nos mesmos blobs/cota/PUT imutável. Acrescentar somente papéis/MIMEs fechados para manifesto e dados compilados, conferidos contra o pacote; não liberar binário/JSON arbitrário.
- Aplicar confirmação de produto à versão concreta dentro da ferramenta. A autorização de desenvolvimento já está concedida; não pedir outro aceite entre etapas.
- Migrar somente schema novo. Gerar pelo script `db:generate`, revisar SQL/journal/snapshot e testar banco local descartável. Não editar SQL gerado nem incorporar trabalho concorrente. Há `0163_commerce_blocks` em trabalho; conferir journal e Git novamente antes de gerar para evitar colisão.
- Uma publicação só substitui a anterior quando todos os arquivos e física estiverem prontos. Sem publicação, usar a composição em código. Falha de pacote é explícita.
- Reservar o ensaio `/macro` e seu salvamento local para as provas; não conceder progresso de conta. Nenhum deploy intermediário ou abertura aos membros.

## 1. Contrato, autorização e publicação imutável

**Files:** novo contrato puro de publicação em `molda-cenarios-core`; novos `members/src/domain/cenarios/publicacoes.ts`, `domain/ports/cenarios-publicacoes-repository.port.ts`, `application/cenarios/publicacoes.service.ts`; testes unitários com repositório de memória e fonte/exportação existentes.

**Interfaces:** perfil `arquipelago-v2` com alvos fechados `sua-ilha`, `bosque`, `vila-doce`, `recife`, `pico`, `vale-dos-dinos`, `nuvens`. Pedido identifica cenário/revisão/digest da fonte, perfil/versão esperada e `operacaoId`. Versão publicada fixa manifesto compilado, recursos, proveniência e autor do servidor; o apontador do perfil muda por CAS.

- [x] Escrever testes vermelhos: pessoa comum/suporte recusados antes de reservar/publicar; fonte alheia ou privada recusada; revisão/digest vencidos; perfil inválido; recurso ausente/incompatível; pacote inválido e licença restrita sem autorização.
- [x] Testar publicação 1→2, repetição idempotente sem nova versão, mesma operação com outro conteúdo recusada e duas publicações concorrentes com apenas uma troca de perfil.
- [x] Implementar serviço usando `ExportacaoDeCenariosService.preparar` e autorização existentes. Capturar entrada antes de awaits, revalidar fonte/perfil na transação e não aceitar autor/espaço do navegador.
- [x] Testar leitura somente do perfil publicado e referências de versões antigas, sem seleção arbitrária de espaço/biblioteca. Rodar/revisar o contrato e serviço antes da persistência.

## 2. Persistência, arquivos e PostgreSQL

**Files:** tabelas/índices de versões, arquivos referenciados e apontadores de perfil no schema Members; repositório Drizzle focado; ajuste das consultas canônicas de arquivos sem referências; migration/journal/snapshot gerados. BFF `server/cenarios-conteudo.ts` ou módulo focado de compilados, usando os validadores canônicos.

**Interfaces:** reserva reaproveita `reservarBlobs`, cota e chaves `cenarios/<espaço>/blobs/<digest>`. A confirmação confiável inclui os digests/bytes/MIMEs reais. A transação usa a mesma trava do espaço que lotes/reservas e protege versões e seus recursos.

- [x] Acrescentar somente tipos compilados necessários; conferir manifesto pelo leitor estrito e todo conteúdo pelo validador compilado existente. Cancelamento, digest/tamanho/Float32/máscara/GLB inválidos impedem publicação completa.
- [x] Gerar schema-only migration pelo script, preservando journal concorrente; revisar FK/índices, imutabilidade e nenhuma remoção de dados da plataforma.
- [x] Testar PostgreSQL isolado: CAS simultâneo, idempotência, fonte alterada antes da transação, rollback de arquivo ausente e leitura por perfil. Recursos publicados resistem à exclusão da biblioteca/cenário e continuam na cota.
- [x] Rodar tipagem/testes/review do repositório e documentação de implantação antes das rotas.

## 3. HTTP, BFF e confirmação na oficina

### Intenção da interface

A pessoa é da equipe e acaba de guardar uma composição. Precisa reconhecer exatamente qual revisão irá para qual ilha e qual versão será substituída. A linguagem continua sendo a oficina do Molda: cenário, revisão guardada, ilha, publicação, equipe e bibliotecas. A assinatura do fluxo é revisão → ilha → nova versão, também expressa na confirmação e no recibo.

Preservar a paleta existente: fundo creme/claro `mld-bg`, superfície clara `mld-surface`, tinta escura `mld-text`, cinza de apoio `mld-muted`, azul de ação `mld-accent` e linha suave `mld-border`; no tema escuro, os mesmos tokens fornecem os valores navy existentes. Tipografia herdada, espaçamento na base de 4 px e separações por bordas suaves, sem novas sombras ou cores. Reutilizar os campos e botões da oficina. Não acrescentar um dashboard, outro menu global ou uma etapa de autorização de desenvolvimento. O aceite na tela é a confirmação de produto da versão concreta, já prevista no plano.

**Files:** rotas focadas Members, composition root/error handler, allowlist gateway e testes; BFF/contratos de `CenariosHost`, host HTTP/memória e tela `oficina/telas/Exportar.tsx`; portas de leitura do Arquipélago/BFF nos dois apps.

**Interfaces:** preparar/reservar upload autorizado, confirmar por rota interna HMAC exclusiva do `member-shell`, listar versão do perfil e ler publicação/arquivos vinculados. Para o jogador, o BFF primeiro exige sessão e acesso ao Arquipélago pelo fluxo atual; somente depois consulta a publicação fixa. Não assinar chave fornecida pelo cliente.

- [x] Testar rotas de equipe sem suporte, JWT que tenta afirmar upload, digest fora da versão, perfil desconhecido, leitura sem acesso ao jogo e tentativas de outro espaço. Preservar políticas Kids/responsável.
- [x] Implementar “Publicar no Arquipélago”: compilar revisão salva pelo preparo real, mostrar ilha/revisão/versão e confirmação concreta; enviar recursos, confirmar e mostrar resultado publicado. Alteração/fechamento/troca de perfil durante awaits cancela; falha conserva versão anterior.
- [x] Testar host/interface/BFF, operação repetida e dois editores concorrentes. Capturar a confirmação e resultado no estilo atual, com fluxo de produto, sem aprovação adicional de desenvolvimento.
- [x] Implementar leitura limitada aos blobs da publicação, sem exposição de biblioteca ou inventário autoral. Autorizar cada pedido e conferir prefixo/digest antes da assinatura.

## 4. Perfil e carregador nativos no Arquipélago

### Contratos e cuidados observados durante a execução

- A leitura agora tem porta própria opcional em `Plataforma.cenarios`, com respostas no formato existente `RespostaDoServico`. O host usa o BFF publicado e prova de perfil; o jogo não recebe sessão nem chave privada. `lerCenarioPublicado` confere manifesto/fonte/recursos antes do runtime, compartilha aliases por digest e diferencia ausência explícita de falha.
- `lerPerfilDeCenario` interpreta os nomes `arquipelago.*` que o conversor já preserva. Matrizes e marcos estão em coordenadas globais: não somar novamente o centro da ilha. Íris continua sendo única por ilha/interativo; parâmetros inválidos são recusados antes da ativação. Propriedades desconhecidas permanecem nos dados canônicos.
- O conversor `converterFaiscaV1` inclui terreno das **sete** ilhas no documento inicial. Não ativar esse pacote sobre os terrenos antigos nem presumir que seu retângulo cubra somente a Faísca. A substituição e o LOD precisam considerar a cobertura real, preservando as ilhas e o oceano compartilhado.
- Os setores nativos têm lado **80 m** e raio de vizinhança **2**. A preparação da colisão reutiliza o BVH compilado e a identidade instância/triângulo; não corta tabuleiros nas bordas, não duplica triângulos entre consultas e não cria piso sob recortes. Mantém o teto canônico de 20 mil visitas por região, com orçamento agregado explícito.
- O instalador foi extraído do Estúdio para a entrada restrita `motor/instalar`, com a física dos quatro motores permanecendo no adaptador do Estúdio. O modo `luzes-locais` do runtime permite conservar céu/ciclo do dia do jogo e acrescentar as luminárias da composição. O padrão dos outros consumidores continua completo.
- O Three 0.184 instalado oferece `compileAsync(objeto, camera, targetScene)` e reúne luzes do objeto e da cena de destino. Usar essa capacidade no preparo GPU para considerar as luzes/fog do jogo antes de inserir a nova cena; não compilar apenas contra um ambiente vazio.
- A Íris atual clona o GLTF e possui mixer/rotina/interativo próprios. As instâncias compiladas já possuem ossos, clipes remapeados por UUID e mixer. A integração precisa aproveitar a rotina existente com propriedade clara da instância/animação, evitando clonagem adicional com UUIDs inválidos, mixer atualizado duas vezes e descarte duplo de esqueletos.
- Conferir os papéis físicos recuperados antes de registrar colisores: a cápsula genérica usa o volume do modelo (`motor/teste/fontes.ts`), enquanto o tronco nativo usa raio próprio. Fundações importadas também permanecem como propriedades. Matrizes já estão assentadas; não repetir deslocamentos de implantação. Preservar os grupos nativos do corpo/câmera em vez de transformar todas as colisões em uma única categoria.

Essas notas não significam consumidor ativo: `cenario-publicado.tsx`, a composição nativa, salvamento por versão e a prova no `/macro` continuam pendentes.

**Files:** `arquipelago/src/sistemas/perfil-de-cenario.ts`, `mundo/cenario-publicado.tsx`, portas/plataforma e composição macro existentes. Se a integração exigir instalar ambiente/trocar base, extrair o instalador canônico para `motor/runtime` com reexports compatíveis; não duplicar o algoritmo do Studio.

- [x] Testes vermelhos do perfil: atores/placas/marcos/parâmetros físicos e propriedades desconhecidas, coordenadas da ilha, chegada e vínculo com os sistemas existentes. Nenhum motor novo de NPC, câmera, inventário ou navegação.
- [x] Carregar o pacote completo pelos recursos publicados e pelo runtime canônico. Conservar física visual correspondente, setores/LOD e oceano compartilhado; retirar somente a composição substituída. Rapier recebe os triângulos/setores da mesma geometria, sem piso artificial sob recortes.
- [x] Conservar base/colisão vigentes durante preparo; trocar atomicamente depois da preparação GPU. Abort/erro/revisão vencida descartam recursos novos. Uma ilha sem publicação usa o código existente; erro real permanece explícito.
- [x] Preservar posição/retomada local com identidade da versão de ensaio e ponto seguro; não migrar coordenadas do mundo compacto nem tocar dados compartilhados da plataforma.
- [x] Percorrer `/macro` com personagem e controlador reais: caminhar/correr, ponte, água/nado, câmera, pulo, pausa, toque, retomada, descarregamento/reentrada e versão publicada 1→2. Medir recursos; não aprovar arte/IK/aparelhos físicos por contadores.

## 5. Fechamento de 8.5

- [x] Regressão integrada de núcleo/motor/Members/BFF/gateway/oficina/Arquipélago pertinentes, PostgreSQL e builds/tipagem. Se houver extração compartilhada, repetir consumidores afetados e geradores sem elevar limites.
- [x] Capturas/vídeos e publicação de ensaio separada, sem bytes pagos no Git; relatório de implementado/corrigido/provisório/limites reais. Feito em 20/11: capturas da prova em `output/cenarios-reforma/lote8-publicacao/macro-prova` (fora do Git) e publicação de ensaio separada em `macro-qa-12`; o relatório final vai no encerramento global.
- [x] Review linha a linha, commit/push em staging. Somente depois fechar este recorte e iniciar 8.6. Lotes 9–10, composição final da Faísca, full review/CI e implantação/validação real permanecem no encerramento global.

## Revisão do plano

Os seis itens de 8.5 estão distribuídos entre contrato/serviço, persistência/validação, fluxo de publicação e consumidor nativo. A fonte e os recursos são fixados por versão, autorização não depende do corpo do navegador e a consulta do jogo não abre o acervo autoral. A prova final exige controlador real no `/macro`, não uma janela do Testar da oficina.
