# Exemplos JavaScript e Python no Estúdio — Implementation Plan

> Executar em lotes com revisão, preservando a validação em andamento do runtime. Usar os agentes existentes somente em escopos explícitos e sem disputar a janela pesada.

**Goal:** acrescentar o filtro JavaScript/Python aos exemplos e oferecer versões modernizadas dos jogos de referência como projetos Python completos, editáveis e exportáveis.

**Architecture:** uma galeria visual comum usa catálogos separados por linguagem. O caminho JavaScript atual permanece; os exemplos Python carregam fontes e materiais por clique e criam projetos pela factory e pelas permissões frescas do host. A metadata do cartão não concede execução nem instalação.

**Tech Stack:** React/TypeScript, factory v3, persistência com escopo do owner, Python/Pyodide/Turtle e áudio portátil já em implementação. Não antecipar Pygame, Pygame Zero ou Raylib.

**Spec:** ampliação solicitada e autorizada pelo usuário em 19/10/2026; modernização permitida desde que o resultado seja igual ou bem parecido. Os contratos R21/P01–P16 e R22/S01–S10 continuam exigindo compatibilidade com o corpus original. Memorando de exploração local: `python-gallery-analysis-20261019.md`, SHA `4be43fcd70e890b98de1e858d232035f3e7f7688c947f71a419798489253a008`.

## Comportamento e limites

- Nos exemplos, JavaScript é a seleção inicial. O filtro de linguagem compõe com busca, dificuldade e tipo; os exemplos JS atuais e seus 158 contratos permanecem íntegros.
- Esta mudança não altera o público autorizado a ver exemplos. Preservar `showExamples`: Kids e Community já o fornecem para os perfis privilegiados admitidos. Os comentários antigos que dizem apenas playground precisam de correção factual, sem liberar a galeria globalmente.
- A galeria de projetos salvos mantém o comportamento atual. O pedido é o filtro dos exemplos; não esconder projetos Python já salvos nem ampliar esse escopo incidentalmente.
- Linguagem não é modo: jogos Python completos e complexos entram no Pro/código. Um futuro cartão Clássico só promete Blocos/Ponte depois de provar o caminho com a paleta Python real, sem fonte escondida usada como substituto de blocos.
- Turtle continua extensão explícita. O host precisa autorizar a instalação antes da única persistência; não salvar um projeto vazio e instalar depois.
- JavaScript não deve carregar o interpretador, fontes ou materiais Python por abrir a galeria. Trocar para Python carrega apenas metadata; escolher um jogo carrega somente seu payload.
- Catálogo indisponível, release revogada, Pro negado ou extensão negada produzem diagnóstico e retry apropriados, sem downgrade de linguagem/modo e sem release fictícia.
- Preservar owner, geração e cancelamento durante carregamento, autorização e gravação. Uma resposta tardia não pode gravar nem abrir projeto em outro perfil.

## Lote G1 — filtro e contratos da galeria

**Arquivos:** `packages/studio/src/projects/KitGallery.tsx`, `ProjectList.tsx`, testes relacionados e `core/i18n/{pt-BR,en}.ts`; novos tipos/catálogo metadata Python separados dos catálogos Blockly JS.

- [ ] Introduzir discriminante de linguagem e filtro acessível, responsivo, com JS inicial.
- [ ] Manter o builder e os contratos JS atuais; separar a criação Python para não passar `.py` pelo gerador HTML/CSS/JS.
- [ ] Reutilizar o escopo e a configuração de criação do ProjectList nos dois mounts da galeria.
- [ ] Distinguir erro de descoberta de catálogo vazio, preservar troca/retry/cancelamento e revisar o grafo lazy.
- [ ] Executar testes de filtro/lifecycle e os contratos JS afetados, sem mudar suas contagens para acomodar Python.

## Lote G2 — criação Python autorizada

**Arquivos:** novo helper Studio para criar exemplo Python; `member-shell/components/studio/use-free-options.tsx`, `creator/studio-full-client.tsx` e composição equivalente do playground, apenas conforme necessário para a autoridade de criação.

- [ ] Capturar owner/generation antes do primeiro await; obter configuração fresca pelo caminho de criação existente.
- [ ] Reutilizar a escolha de release aprovada compatível com Pro/código e com todas as extensões; não fixar no documento a release do corpus.
- [ ] Acrescentar um port pequeno do host para validar o candidato destacado com os mesmos grants/capabilities/installation rules existentes. A factory e o catálogo isoladamente não concedem instalação.
- [ ] Criar v3 com id novo, preencher árvore/fontes/materiais, instalar configuração Turtle no candidato e validar leitura sem perda, hashes, paths e quotas.
- [ ] Persistir uma vez no scope capturado e abrir somente se a operação continuar atual. Não copiar publicação, lease, revisão remota ou identidade de outro projeto.
- [ ] Cobrir perfil A→B→A, revogação entre discovery e clique, unmount, falha parcial, fonte/material inválidos, modo e extensão negados. Nenhuma gravação parcial nesses casos.

## Lote G3 — jogos e materiais distribuíveis

**Arquivos:** payloads Python por exemplo, manifestos de origem e licença, créditos e QA Python próprios. Os caches originais de corpus permanecem separados do produto.

- [ ] Inventariar os repositórios fornecidos e registrar por jogo os controles, mecânicas, visual, sons, vitória/derrota, reinício e oportunidades de aprendizagem.
- [ ] Modernizar estrutura e laços quando necessário, preservando a experiência. Manter uma revisão identificada da adaptação de compatibilidade e outra da versão editorial do produto, se os recursos diferirem.
- [ ] Conferir licença de código e de cada recurso separadamente. Pac-Man tem código MIT; Space Arena declara GPL no repositório e inclui som com restrição NC. Não copiar recursos sem autorização de distribuição; substituir por recursos próprios/licenciados, com créditos e licença preservados onde aplicável.
- [ ] Não substituir o corpus original nesses testes: ele continua comprovando compatibilidade dos recursos reais, inclusive os oito WAVs. Os recursos próprios do exemplo editorial são uma prova separada.
- [ ] Cada cartão indica linguagem, Pro, Turtle, dificuldade, conceitos e controles. Fontes organizadas e instruções acompanham a exportação; não prometer Pygame/3D para versões Turtle.

## Lote G4 — qualificação integrada e entrega

- [ ] QA Python por id: payload, fonte/assets/licença, factory, salvamento/reabertura, entrada e comportamento do jogo.
- [ ] Fluxo real pela galeria autorizada: criar → editar → salvar → reabrir → jogar; Mural/player anônimo, remix e exportação com o novo pacote e release.
- [ ] Instalar ZIP desktop novo fora do monorepo, verificar tipos no editor e executar com Python/Tk e áudio; não chamar um teste de terminal de teste da UI do VS Code.
- [ ] Rodar gates de desempenho existentes no artefato final e preservar negativos; não herdar aprovação da distribuição996.
- [ ] Review independente entre lotes e full review final, correções, verificações afetadas, commit/merge/push de staging conforme autorização existente. Produção continua aguardando a validação de staging.

## Estado de implementação e aceite

G1/G2 estão implementados localmente: filtro, catálogo separado e factory autenticada. JavaScript continua selecionado inicialmente; a criação Python consulta permissões frescas, instala Turtle no candidato e persiste uma vez no escopo capturado. A revisão desses lotes não equivale à aprovação de todos os jogos G3.

O primeiro cartão G3 é **Corrida das Tartarugas**, projeto original Pro/código com cinco arquivos de fonte/configuração. O payload é carregado sob demanda. Não copia código nem materiais dos repositórios de referência. Passaram os cenários gráficos Chrome/Edge, execução com Turtle/Tk oficial e execução do ZIP fresco fora do monorepo. No gate de interface, os componentes reais da galeria e do editor criaram, editaram, salvaram e reabriram o mesmo projeto nos dois navegadores (2/2 testes, sem retries). Auth/PG eram fixtures controladas; isso não qualifica o shell Next nem a publicação no Mural.

Evidências: `.cache/studio-python-l0/python-gallery-g3-product/final-ui-qualification-r4.json`, `manifest12.json` e `.cache/studio-python-l0/python-gallery-g3-qualification/zip-and-native-qualification-r1.json`. Os 12 arquivos do lote permaneceram com os mesmos hashes no gate de interface. Negativos anteriores continuam preservados e descritos nos recibos.

Pac-Man P01–P16 e Space Arena S01–S10 ainda precisam de qualificação integral e de versões distribuíveis para a galeria. A preparação do corpus não é um exemplo publicado. A correção isolada de eventos na pausa do Space Arena portátil 1.1 também não qualifica sua partida completa. Mural, desempenho normativo, review final, commit e implantação dos lotes locais permanecem pendentes. A autorização do usuário abrange a implementação; não há solicitação de aprovação adicional neste plano.

Há uma versão editorial separada, **Labirinto das Luzes**, em cache: cinco módulos derivados do código MIT de Pac-Man com créditos, nove formas poligonais próprias e três efeitos sonoros originais. Não inclui os GIFs/WAVs de origem individual não comprovada. O mapa e as mecânicas seguem a referência; exceções de callbacks são propagadas pelo ciclo de vida explícito. Três cenários nativos e seis de navegador verificaram início, vitória e derrota com o fechamento autoral de três segundos; os screenshots foram revistos. Esses recibos antecedem a integração do cartão descrita abaixo e não equivalem à aprovação integral P01–P16.

O checkpoint funcional r4 passou em seis execuções, nativo/Chrome/Edge: quatro movimentos por comandos e três paradas em paredes, mais14 casos explícitos de colisão/alinhamento/bordas. Recibo `qualification-functional-r4/functional-qualification-r4.json`, SHA1fad8f6d. A rota longa anterior encontrou um inimigo; outro oráculo rejeitou o resíduo trigonométrico normal do Tk. Esses dois negativos permanecem identificados. A revisão encurtou apenas a rota de QA e passou a comparar pontos finitos com tolerância absoluta1e-9, preservando valores exatos para direção, estado e contagens. Nenhuma regra do jogo foi alterada.

Coleta, bônus com retorno real de velocidade, dano/reposicionamento e radar passaram em quatro cenários nativos. Coleta, dano e radar passaram também em Chrome/Edge: dez execuções em `qualification-functional-r3/functional-positive-qualification-r3.json`, SHA4a29b29b. Um primeiro teste Chrome do bônus terminou por timeout sem diagnóstico suficiente; a repetição explícita com registro de eventos passou em Chrome/Edge sem alteração do projeto, ZIP, observer, jogo ou runtime. Agregado `qualification-boost-diagnostic-r2/diagnostic-qualification-r2.json`, SHAd68e7db2. A causa daquele timeout continua desconhecida.

Os túneis verticais reais passaram nos seis casos r5, nativo/Chrome/Edge, com colocação inicial explicitamente registrada no portal e comandos reais no navegador. Recibo `qualification-tunnels-r5/tunnel-qualification-r5.json`, SHA977f39d4; pontos usam a mesma tolerância finita1e-9, mantendo direção, estado, vidas e salto>700. Os oito grupos funcionais agora têm provas nos três ambientes, com seus limites e negativos separados. Integração pela galeria, publicação e desempenho permanecem abertos. Os cenários funcionais usam encerramento de QA após500ms; não substituem as provas separadas do fechamento autoral nem uma partida completa.

### Integração das fontes Python com o empacotador dos hosts

Uma reprodução mínima com Next16.3/Turbopack encontrou oito erros `Unknown module type`: os imports `.py?raw` funcionavam no Vite, mas os hosts Next não tinham esse loader. O ajuste mantém os oito `.py` autorais como fonte e gera dois módulos TypeScript com seu conteúdo UTF-8/LF, conforme o padrão existente dos kits. O payload da corrida continua sob demanda e a seleção do pacote nativo de áudio continua pela release exata. Não foram acrescentados loaders ou configurações específicas nos hosts.

`gen:python-text-sources` atualiza os módulos; `check:python-text-sources` confere a igualdade no CI obrigatório. A prova rejeitou separadamente os dois artefatos adulterados e restaurou seus bytes originais. Depois do ajuste passaram a compilação mínima Next com os consumidores server/client e os 30 testes de galeria/exportação (241 asserções), incluindo a igualdade das quatro fontes de áudio exportadas com os `.py` originais. Evidências em `.cache/studio-python-l0/next-python-source-probe-r1/`. Esta prova é de compilação dos módulos reais; não substitui o build completo dos hosts nem o fluxo autenticado/publicação no Mural. O recibo gráfico anterior permanece histórico, pois os imports TypeScript mudaram, embora os bytes dos cinco arquivos do jogo tenham sido preservados.

Os dois entrypoints e o gerador também passaram no TypeScript5.9.3/Node24.22 com todo seu grafo transitivo de1.162arquivos (112s, heap1536MiB, pins antes/depois iguais). A configuração de prova em cache foi corrigida para resolver a declaração Vite pelo caminho real; seu negativo original foi preservado. Revisão independente dos oito literais gerados não encontrou P1/P2. Ainda não equivale a repetir o typecheck de todos os hosts.

### Labirinto das Luzes — contrato e payload da galeria

O segundo cartão Python foi implementado localmente como Pro/Turtle. Sua metadata exige o módulo
fornecido `sz_audio` na versão exata `1.0.0`. O creator confere esse requisito na seleção inicial,
antes de carregar o payload, e no contexto fresco de `prepare`, capturado antes dos próximos awaits.
Isso não concede permissão: a autorização atual do host continua necessária antes da única gravação.
Ausência, versão diferente, perda no preparo, mutação dos requisitos durante o carregamento e
revogação na autorização não criam um projeto parcial.

O payload inclui cinco módulos Python, README, NOTICE, LICENSE, requirements vazio e os três WAVs
próprios. As fontes continuam com a mesma AST executável do cache editorial 0.1.1; apenas comentários
e docstrings de módulo foram atualizados. Os bytes dessas cinco fontes são novos. Os WAVs e o arquivo
LICENSE autoral mantêm os hashes originais; a licença no texto gerado/ZIP usa LF, como os outros textos
do gerador. As instruções distribuídas descrevem os controles, a instalação desktop do pacote de áudio
exportado e o laço normal do Turtle, sem expor detalhes internos dos gates.

Os dois novos módulos TS de texto e áudio são carregados somente ao escolher esse jogo. O gerador
canônico verifica os quatro bundles; os dois bundles anteriores permaneceram byte-idênticos.
O gate de loader em processo novo observou a galeria JS sem módulos Python, somente metadata ao
carregar o catálogo Python e somente o payload escolhido após seleção. Os 158 contratos JS passaram
com seus round-trips Blockly, sem mudança de contagem. O teste de criação/exportação real salvou e
reabriu projetos com IDs distintos e preservou no ZIP fontes, documentos, três WAVs e o pacote
`sz_audio` selecionado pela release exata.

Evidências e negativos ficam em `.cache/studio-python-l0/maze-lights-gallery-g3-r1/`.
Este checkpoint não repete a UI da galeria, a execução desktop do ZIP novo, a tipagem completa,
Mural, desempenho ou implantação. Os recibos gráficos do cache editorial e o aceite Pinta D
continuam com seus próprios bytes e escopos; a integração nova segue para review antes desses gates.
