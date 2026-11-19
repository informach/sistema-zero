# Lote 8.4 — Jogo 3D

19/11/2026 · `staging` · recorte implementado, testado e revisado localmente. O lote 8.4 completo permanece aberto.

## Implementação

O Jogo 3D recebe o cenário completo do Molda na sua própria `THREE.Scene`, pelo mesmo SDK qualificado em Mundo e Canvas. Dois comandos da paleta existente selecionam o cenário por ID estável e colocam um objeto explicitamente no início compilado. Blocos, IR, schema, codec, referências semânticas, gerador, parser, reabertura e documentação acompanham a versão 0.33.0 da extensão.

A primeira carga segura os callbacks da partida até a base ficar pronta. As trocas seguintes conservam a base vigente durante o preparo; falha conserva essa base, e cancelamento ou descarte impedem montagem atrasada. Cada mundo tem sua própria instalação. O SDK administra os recursos da base; o jogo conserva renderer, câmera, controles, objetos e luzes autorais. Somente as luzes padrão identificadas na criação do mundo são retiradas depois de uma instalação bem-sucedida.

A chegada usa o marcador/fallback canônico e a área real dos pés. Converte a posição dos pés para o centro do objeto sem ampliar o avatar. Pode ser pedida durante o preparo, inclusive durante uma substituição: espera o cenário novo. Uma posição explícita posterior cancela o pedido. Não há teletransporte automático de todos os objetos.

O controlador e a física existentes continuam responsáveis pelo movimento. `topDown`, gravidade e passo do corpo consultam os triângulos/BVH emprestados da cena. Sólidos autorais, caronas, contatos, áreas permitidas, orientação, clipes e unidades anteriores continuam no kernel. Com uma base importada, ausência de chão é ausência de chão, e não um piso zero. O recorte permite queda contínua.

O contato nativo usa uma cápsula vertical, dimensionada pelas extensões do corpo, com subdivisão por raio e falha explícita acima do limite seguro. É física arcade; não promete simulação rígida exata de caixas ou malhas arbitrárias. O controle de exploração mantém apoio em rampas e toras por consultas reais próximas dos pés; não mantém esse apoio durante salto nem cobre buracos. Os corpos dinâmicos continuam sujeitos à gravidade e às normais do contato.

A câmera que segue o personagem é limitada pelos triângulos reais. Enquadramento manual e panorâmico continuam autorais. O ambiente canônico passou a consultar a posição mundial da câmera e aceita a câmera ortográfica existente; isso evita céu e alcance de sombra errados quando uma câmera está sob um objeto pai. Água, setores e clipes são atualizados no loop do jogo, com delta zero durante a pausa. O cenário conserva dados de água, mas esta integração não acrescenta outro sistema de nado.

## Correções encontradas na revisão

- Na troca com uma base já ativa, o pedido de chegada estava usando o início antigo. A chegada agora aguarda o preparo corrente; uma regressão usa duas cenas compiladas em origens diferentes.
- Em toras e rampas, um personagem parado podia deslizar como um corpo dinâmico e mudar também o enquadramento entre medições. O apoio do controle de exploração foi separado desse deslizamento, usando as superfícies reais. A regressão mede repouso numa rampa triangular; recorte, salto e teto continuam testados.
- O descarte definitivo liberava o renderer antes dos caches globais de modelos/texturas. Isso impedia os listeners GL de registrar a liberação final de uma textura do atlas. O encerramento para os loops, libera os caches e depois descarta os mundos e renderers. Os contadores não são zerados artificialmente.
- O recomeço no canvas HTML tentava criar um renderer depois de perder o contexto daquele mesmo canvas. O navegador reproduziu a falha de inicialização WebGL. Durante o recomeço síncrono, o renderer desse canvas é transferido ao novo mundo; objetos, cenário, animações e listeners da partida anterior são descartados. Caches de modelos continuam pertencendo ao documento. Renderers que a nova partida não reutiliza são encerrados; o encerramento definitivo também libera o renderer reutilizado e seu contexto.
- Tanto o bootstrap do SDK quanto o contexto compartilhado da execução encerravam recursos no `pagehide` persistido. Agora distinguem a entrada no cache de navegação da saída definitiva. As regressões verificam preservação do estado/scheduler e liberação posterior. O ensaio de navegador usa evento sintético, não certifica uma navegação real de ida e volta pelo histórico.
- O primeiro produtor do ensaio utilizava a lista plana do gerador e não sua entrada de comportamento com ciclo de vida gerenciado. A prova de recomeço detectou isso. O produtor agora usa o mesmo envelope do editor, exige `runProject` e reabre com o parser de projeto. Um teste adicional conserva carga e chegada nesse ciclo completo.

## Evidências locais

O produtor cria o projeto pelo ciclo IR → Blockly → IR → código gerenciado → parser de projeto. O validador canônico reabre o projeto e confere seus assets antes de produzir preview strict e site exportado. O cenário completo vem da galeria real; a segunda cena é um recorte compilado pelos comandos do domínio. O personagem completo usa o modelo real do catálogo e o controlador/animações existentes do Jogo 3D. O recorte usa um corpo de referência.

As quatro provas de navegador executam preview completo, preview do recorte, site exportado e a rota local `/jogar` com PublicPlayer/StudioProjectPlayer reais e API de publicação controlada. Conferem três substituições, preservação de câmera/renderer, apoio físico, caminhada, corrida, curva, salto/pouso ou queda contínua, pausa/retomada pelos controles existentes, recomeço completo e descarte final.

No cenário completo, os três ciclos permaneceram com **30 geometrias/29 texturas**; no recorte, **quatro/três**. O mesmo renderer é reutilizado pelo recomeço no canvas HTML. O descarte definitivo exige **zero geometrias e texturas** e contexto WebGL perdido. Cada base anterior perde suas árvores de colisão e sai da Scene. O ator compilado conserva quatro clipes; o ensaio ativa o primeiro e acompanha o avanço do mixer. A pausa conserva o tempo de simulação e do mixer enquanto o renderer continua desenhando.

Cada modo completo compara **441 alturas/máscaras** com a referência Raylib nativa, com tolerância de 1e-6 m. Os assets não fazem fetch/XHR de materiais; o player consulta somente a API local esperada. Erros de script, console e CSP não são aceitos. Os únicos avisos admitidos e registrados são a depreciação conhecida de PCFSoft no Three 0.184 e, somente no export, o bloqueio de service workers feito deliberadamente pelo Playwright. Não são usados para esconder avisos do programa.

O início compilado é registrado. O percurso medido começa num trecho parcial conhecido da ponte, com apoio obtido de triângulos reais; não usa teletransporte para simular deslocamento. Não certifica cabeceiras, travessia integral ou acabamento artístico do lago. Capturas e vídeos técnicos não aprovam IK, todos os estados de locomoção ou direção de arte da Faísca.

## Qualificação

- Suíte conjunta de Jogo 3D, Mundo, Canvas/Physics Lite/SDK, parser, arquitetura, blocos e transporte/preview/export: **2.035 testes, 31.290 asserções, 143 arquivos**, sem falha.
- Motor canônico, ambiente, chegada, movimento, água e runtime: **30 testes, 212 asserções, cinco arquivos**, sem falha; tipagem do motor aprovada.
- Regressão adicional de recomeço durante preparo: conjunto de ciclo de vida com **48 testes, 215 asserções, três arquivos**, sem falha. A carga inicial fica retida por uma barreira; a segunda partida é carregada e só depois a primeira é liberada, sem instalação atrasada.
- Tipagem integral do Estúdio aprovada. O contrato do SDK do documento é tipado na origem; o teste `checkJs` do runtime usa o mesmo protocolo público, com o ABI de navegador isolado das declarações ambientais de Bun/React. O prazo original do teste foi mantido.
- Exportador portátil: **dois testes, 22 asserções**, incluindo reabertura do ZIP e conferência dos bytes/digest do runtime regenerado.
- Build/orçamento com limites originais: carga inicial **365.070 bytes/118.273 gzip**, dois arquivos; Blocos **4.744.520/1.270.760**, Ponte **4.223.505/1.134.134**, Código **2.657.657/745.213**. Um teste, 29 asserções, 17,62 s.
- SDK reproduzível em `--check`: **503.970 caracteres**, três imports Three compartilhados, SHA-256 `65511445ac985b3a2b733fa0a8b7949a2b3eaf134818e50362934c5c9663466b`.
- Runtime portátil conferido: **1.106.308 caracteres**, SHA-256 `8f03fcd4b60074b9276a47454b228ac19d3f91ff2a0e6689427c77205a62627e`.
- Repetição final dos quatro casos de Jogo 3D aprovada, incluindo a mesma contagem de recursos depois do recomeço e ausência de avisos inesperados. Os quatro casos de Canvas e os quatro de Mundo 3D também passaram com o SDK, ambiente e contexto de execução atuais.
- Tipagem integral repetida depois do último teste, sem diagnóstico; Biome em 36 fontes e `git diff --check` aprovados. Geradores reproduzíveis conferidos novamente antes do commit.
- Revisão final concluída sobre ID/receita e escopos, espera e chegada durante troca, cancelamento e carga atrasada, propriedade de ambiente/recursos, preservação do caminho legado, contato/apoio/queda/teto/parede, câmera, pausa, recomeço e precisão das evidências. Nenhum limite de tamanho ou prazo de teste foi aumentado.

Os modelos, projetos privados e sites gerados ficam em `output/`. [Quatro capturas, dois vídeos e recibo de medições](evidencias/lote8-studio-jogo3d/recibo.json) acompanham este recorte, sem bytes privados dos modelos. Nenhum aparelho físico ou conta real foi validado neste recorte. O host local usa componentes/CSS reais com fallbacks de fontes; não substitui Next, gateway ou staging. Service workers são bloqueados somente no contexto do export; atualização offline não é certificada por esse ensaio.

## Continuidade

O Jogo 3D está fechado no escopo acima. Registrar/enviar o commit antes de iniciar Avançado. Avançado e Pro autoral continuam abertos; o lote 8.4 permanece incompleto. Depois vêm 8.5/8.6, lotes 9–10, composição final da Faísca pela ferramenta, full review global, CI, implantação e validação real de staging no encerramento global.
