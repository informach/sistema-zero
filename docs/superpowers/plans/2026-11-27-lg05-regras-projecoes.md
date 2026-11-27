# LG05 — regras e projeções do Pinta

**Estado atual — 27/11/2026, 16:13 UTC:** candidata `75d2d00f535a4e901d0e4d238c45919c1f504a92` no PR 299; staging seletiva `e7aab3f43e3f5bcce5ad8cd4a6fabf7ac0a99300`. Imagem Linux oficial qualificada e copiada ao registro sem reconstrução; manifesto comprimido `sha256:f2b8dd741331e713027e55b5c6d614bed1629041c124dd6f15671b8ac7a90449`, configuração e camadas originais conferidas. Simulações dos dois Workers aprovadas, apontando para os quatro pools existentes com nomes explícitos. Leitura remota: pools saudáveis, vínculos, variáveis, cron e limites preservados. Ainda não houve implantação Worker/imagem, nem nova promoção Railway de produção. CI do PR `46025504124` e da staging `46022790220` recusaram a prova de criação de autorregra isométrica por toque: sete dos oito casos passaram; matriz de destinos 16/16 aprovada. Windows passou em ambos. Reproduções isoladas em Windows e Linux passaram; causa ainda não comprovada. Coleta de ponteiros, estado da regra e artefatos sendo ampliada, sem retirar exigências ou promover a fonte reprovada. Ativação do único gravador público 8/teto 9 preparada e aprovada nos testes de conta e host (2 testes externos, 4 expectativas); a fonte pública foi restaurada e continua 7/8 até implantar os leitores compatíveis. Nenhum post de QA foi criado.

A coleta ampliada de diagnóstico passou no ensaio de toque e nos tipos do Estúdio. CI novo do PR `46031189795` em execução; configuração `46031189760` aprovada. CI staging `46031230402` aguarda a rodada anterior finalizar; preflight SSH `46031230451` aprovado. A etapa projetada passou para antes dos testes longos Chromium, sem retirar verificações. A pasta de resultados agora integra o artefato de diagnóstico. Reproduções adicionais: sequência original 8/8 em Linux com Playwright 1.64.1; caso isométrico isolado também aprovado em Linux com 1.65.1/Chromium 159, correspondente à versão do CI. Essas aprovações locais não explicam nem anulam a recusa remota.

Diagnóstico remoto `46031189795`, artefato `15214463012`: canvas 262 → 282 px; área da regra 10/7, gesto antigo pintou 9/6 e guardou entrada/saída vazias. Causa no ensaio: reutilização da coordenada em pixels após mudança de layout. Reprodução mínima Linux com aumento de 20 px falhou com o gesto anterior (exit 1) e passou com o toque no centro atual (exit 0). O ensaio comum agora usa o gesto recalculado pelo locator, toque real no projeto touch, resize explícito e comparação da casa e dos valores da regra; mesmos requisitos de prévia/aplicar/reabertura. Nenhum limite ou código de produto foi alterado por essa correção. Matriz corrigida aprovada: oito casos desktop/toque em Windows/Chrome e oito em Linux/Playwright 1.65.1/Chromium 159, ambos em 1,5 minuto, com resize e valores da regra conferidos. Nova rodada CI integral e implantação ainda pendentes.

Os registros datados abaixo preservam a sequência e hipóteses substituídas; este estado prevalece.

**Objetivo:** preservar autoria nativa 9 (autorregras, isométrico e hexagonal), na edição, conta, recuperação e destinos compatíveis, sem antecipar a liberação pública de um percurso incompleto.

**Arquitetura:** continuar usando a autoridade local e a fila causal V4, o manifesto existente e a prova de bytes do BFF. O formato é uma capacidade negociada, sem flags. Separar a preparação do leitor da ativação do gravador público: a versão anterior de retorno deve ler os dados que a seguinte poderá gravar.

**Tecnologias:** TypeScript, Bun, IndexedDB, React e protocolo HMAC/R2 existentes. Nenhuma dependência nova.

**Escopo aprovado:** [plano gradual](../../plans/2026-11-23-plano-de-liberacao-gradual.md), LG05; autorização da responsável em 27/11/2026. Execução nesta sessão, na staging compartilhada, preservando alterações concorrentes.

**Orientação adicional da responsável em 27/11:** continuar até o funcionamento integral da versão nova e não manter duas implementações ao final. A separação leitor A/gravador é somente uma transição de implantação. O fechamento deve retirar gravadores, seletores e caminhos executáveis substituídos, preservando a leitura/importação e a migração dos projetos anteriores pela autoridade canônica. Contextos de aula conservam seu isolamento e suas permissões, usando os mecanismos comuns aplicáveis.

## Restrições

- Não elevar o teto do editor nem o escritor público apenas para passar um upload. Nativo 9 e nuvem 8 só são anunciados ao público quando o percurso estiver completo.
- Não converter hexágonos ou isométrico em mapas ortogonais. Não descartar o livro de regras, camadas, propriedades, transformações, colisões ou referências.
- Manter a política do gravador legado (`PINTA_MAX_READ_FORMAT_VERSION`/`PINTA_MAP_WRITE_FORMAT_VERSION` 6): a LG05 usa o canal causal, não o canal legado.
- Preservar nativo 8/nuvem 7 e a recusa dos clientes antigos; arquivos futuros/inválidos não podem gerar selo nem confirmação.
- Não editar Molda Cenários nem os catálogos Python de áreas/raylib. Distribuição Python permanece na LG08; não declarar o destino Python projetado pronto sem sua qualificação.
- Uma tarefa pesada por vez, pela trava `C:/Users/tocha/backup-pinta-codex-20261122/pesado.mjs`.
- Não publicar posts de QA, enviar recados, alterar cursos ou conceder progresso.

## Diagnóstico inicial

As três variantes nativas 9 já fazem ida e volta pelo codec físico, exportador, leitor e recuperação privada. A base focada passou em 27/11: 15 testes, 188 expectativas, zero falhas.

O bloqueio da conta está em três pontos: inventário causal com leitor máximo 7, BFF condicionado ao leitor 8 e host com leitor/escritor 7/teto nativo 8. Há outro bloqueio funcional: projetados são preservados na galeria, mas não têm editor nem cartão. O PNG público permanece 5/cena 4. Portanto, desbloquear somente os três primeiros pontos e anunciar teto 9 não conclui a LG05.

## Entrega A — leitor compatível e prova da conta

### 1. Admissão de nativo 9 no servidor

**Arquivos:** `packages/core/src/creations/pinta-format.ts`, `packages/core/src/creations/pinta-format.test.ts`, `packages/member-shell/src/server/pinta-causal-proof.ts`, `packages/member-shell/tests/pinta-causal-regions-routes.test.ts`.

**Interfaces:** `PINTA_INVENTORY_READER_VERSION` admite 8 nos schemas causais; `readPintaCausalBlob` e `inspectPintaCausalDocument` verificam os mesmos bytes e formato; `readerOptions` habilita apenas a capacidade efetivamente anunciada.

- [x] Rodar a base focada antes de alterar o código.
- [x] Reproduzir a recusa de nuvem 8 pela rota real do BFF com livro, hexágono com livro e isométrico sem livro.
- [x] Preparar o leitor causal 8; manter o gravador público em nuvem 7 e a oficina pública no teto 8.
- [x] Conferir selo byte a byte, atestado, manifesto e recusa de corpo 9 declarado como nuvem 7, futuro ou adulterado. O leitor 9 continua inválido.

### 2. Preparação do host para ler sem antecipar escrita

**Arquivos:** `packages/member-shell/src/components/creator/pinta-client.tsx`, contrato puro compartilhado de capacidades do host, fixture/testes de host e conta em `packages/member-shell/tests/`.

**Interfaces:** separar o leitor causal do escritor e teto público; a fila pode ler 8 sem ter permissão para enfileirar uma autoria 9. O canal legado continua em 6. Preservar o escopo conta/perfil e a ausência de flags.

- [x] Compartilhar a seleção explícita das capacidades entre a montagem real e as provas, sem repetir números divergentes.
- [x] Provar que o host público lê e reexporta os três documentos completos sem rebaixamento, mas recusa criar/editar nativo 9 antes da entrega B. O backup integral e a recuperação também passaram nas suítes existentes.
- [x] Provar armazenamento frio, fila após interrupção, repetição de confirmação e edição offline na mesma autoridade, sem canal de upload paralelo; gravador 8 somente na fixture de qualificação.
- [x] Provar que o leitor 7 é recusado quando o piso sobe a 8, tanto num aparelho vazio quanto numa aba que compartilha a fila.

### 3. Qualificação e registro da entrega A

- [x] Executar testes focados de protocolo, BFF, conta, persistência e recuperação, depois os conjuntos relevantes completos de Pinta, Core e Member Shell. Condicionais e tentativas anteriores discriminados no recibo.
- [x] Executar tipos dos pacotes tocados, Biome e conferências dos gerados afetados.
- [x] Executar guardas das aulas antes de integrar: `bun test docs/aulas-interativas-tecnico/qa`, `protected-lessons.spec.ts`, `ilha-do-farol-browser.ts`, pelos comandos oficiais do repositório. Cinco aulas e sete objetivos de execução aprovados no Chrome.
- [x] Registrar o resultado real, limitações e código no plano gradual. Não marcar LG05 entregue nem anunciar o gravador 8.
- [ ] Qualificar e implantar o leitor compatível antes de ativar a entrega B. Registrar fonte, serviços e retorno compatível; a implementação local não comprova deploy.

## Entrega B — autoria e destinos públicos

Depende da entrega A qualificada. Não é substituída pela elevação de constantes.

- [x] Integrar abertura/edição dos mapas projetados à oficina com persistência transacional, desfazer/refazer, coordenadas e seleção próprias de cada projeção. Preservar livros e dependências.
- [x] Qualificar captura, PNG 6/cena 5 e destinos compatíveis usando a mesma admissão integral; explicitar recusas dos destinos incompatíveis. Não achatar o material.
- [x] Provar importar → editar → salvar → fechar → reabrir em contexto vazio → exportar → usar no Estúdio → publicar/atualizar no mesmo link com preservação autoral. Publicação pelo BFF/comandos reais com Hub/R2 controlados; imagem Linux e implantação hospedada conservam suas verificações pendentes.
- [ ] Só então elevar o escritor causal a 8 e o teto público a 9, com retorno para o leitor A. Manter a distribuição Python na LG08.
- [ ] Qualificar CI, staging e produção separadamente e atualizar LG05 no plano geral somente após observar a entrega.
- [ ] Concluir a transição para o caminho novo único: remover gravadores/seletores/código substituídos e provar a migração e reabertura dos projetos existentes, sem descartar os leitores necessários à recuperação de arquivos antigos.

## Acompanhamento

27/11: plano geral reconciliado com LG03/LG04 e autorização de execução LG05. Base focada: 15 testes, 188 expectativas, zero falhas. Leitor A implementado e qualificado localmente: Core 3.371, Pinta 3.010 aprovados/18 condicionais, Member Shell 2.832 aprovados/dois condicionais; 893 guardas, cinco aulas e sete objetivos do Farol aprovados. Tipos, Biome e gerados aprovados. [Recibo local e limites](../../qa/2026-11-27-lg05-leitor-compativel.md). Qualificação hospedada do leitor A, entrega B e liberação pública pendentes.

27/11, continuação autorizada: leitor A isolado em `release/lg05-leitor-20261127`, commit `27c112d9fb1054927cf4e59982f14c3fb1d55fe2`, [PR 298](https://github.com/informach/sistema-zero/pull/298), a partir de `main`. Não inclui as entregas concorrentes da staging local. CI em andamento; nenhum deploy atribuído a esse PR. Entrega B em implementação local: catálogo único da galeria, editor/histórico/orçamento comuns para os projetados, mutação esparsa compartilhada entre células de 16/32 bits, seleção integral, leitor PNG 6 no mesmo ponto de admissão e expansão do avaliador existente de regras. Provas focadas do catálogo/armazenamento: 11 testes/94 expectativas; seleção: um/seis; regras comuns e projetadas: dez/79; envelope PNG 5/6: oito/54. Ainda faltam a qualificação da interface real, destinos, fluxo completo, revisão e implantação; estes resultados não autorizam marcar a entrega B concluída nem elevar o escritor público.

27/11, continuidade: o mesmo leitor A foi integrado seletivamente à staging remota (`d0cbbaa3a2b44d08c74a4fddb585ffe200e95f38`, [CI](https://github.com/informach/sistema-zero/actions/runs/45999172917)), sem empurrar os outros trabalhos locais. Entrega B: Chrome real aprovou as duas projeções no fluxo galeria → pintar → desfazer/refazer → salvar → reabrir → PNG 6; a repetição inclui a captura da biblioteca “Trazer do Pinta” e a mesma saída da ponte. As provas de biblioteca/autoridade/runtime do Estúdio passaram nas duas projeções (dois testes, 24 expectativas). O exportador externo anterior foi retirado: mapas passam pelo preparador comum; a cópia editável dos documentos suportados mantém projeções e livros, e mapas ortogonais usam o mesmo pacote estruturado. Arquivos antigos continuam legíveis; não há seletor para produzir o antigo pacote.

A primeira suíte ampla B terminou com 3.013 aprovados, 18 condicionais e sete falhas: quatro timeouts e três expectativas da quarentena substituída (incluindo a guarda de acesso às células). As expectativas foram atualizadas para a autoria no catálogo comum; os testes de orçamento passaram isoladamente sem alterar limites (17 testes/73 expectativas; também a suíte da fábrica regional). Nova suíte ampla, tipos dos consumidores, gerados, aulas e implantação continuam pendentes. O leitor de retorno também precisa admitir os artefatos PNG 6 antes de sua produção pública; o leitor causal A, sozinho, não comprova essa capacidade do Estúdio.

27/11, revisão do leitor A: PR 298 integrado em main por merge commit `0a8d77918c3aec8c1409afad81334a3629602e8f` após CI completo aprovado (run 45995595244); conferência de configuração aprovada (46006708387). Isso é integração de fonte, ainda sem promoção LG05 para produção. A sincronização automática main→staging recusou sobrescrever trabalho novo (46006708444). A tentativa local de reconciliação encontrou conflitos de cursos/Admin alheios à LG05 e foi abortada, sem alterações; a promoção continua isolando somente os commits desta entrega.

Entrega B, provas adicionais: quatro casos Chrome desktop/toque aprovaram importar → pintar → desfazer/refazer → salvar → fechar/reabrir → captura integral na biblioteca → backup → restauração em outro contexto vazio, com células, projeção e livro preservados. A prova desktop também interrompe a aba durante gesto depois de observar o checkpoint realmente durável, sem alegar preservação de RAM ainda não salva. O teste descobriu pintura fora do autosave durante o arrasto; corrigido para substituir o documento pela autoridade comum a cada pincelada e registrar um único desfazer no fim do gesto. O botão real Jogar passou nas duas projeções e no controle nativo 8 (três casos), com projeto reabrível e execução efetiva no Studio. Essa prova descobriu e corrigiu o construtor de jogos que tratava células da cena 5 como array legado; a reprodução no código anterior falha em ambas as projeções e os testes positivos atuais passaram (sete testes/44 expectativas incluindo admissão de materiais).

O leitor público ainda mantém escritor causal 7/teto nativo 8. O editor respeita essa capacidade numericamente: documentos 9 abrem para leitura e backup; mutação é recusada antes do histórico e persistência. Não existe seletor de versão. O retorno compatível a preparar deve incluir também PNG 6/cena 5, antes da ativação do escritor 8/teto 9. A validação ampla B está em repetição; resultados parciais ou da entrega A não são atribuídos à entrega B.

27/11, repetição B: Pinta terminou com 3.021 aprovados, 18 condicionais e uma falha: a prova Godot ainda exigia ausência do arquivo editável. O pacote comum agora o produz; a prova foi ampliada para reimportar e comparar ambos os mapas pelo codec canônico, ainda aguardando repetição. Member Shell completo: 2.832 aprovados, dois condicionais, zero falhas/18.407 expectativas. Studio focado: 17 aprovados/90 expectativas. Guardas das aulas desta árvore: 891 aprovadas/191.236 expectativas; não confundir com os 893 do corte A. A conferência do player regional Phaser pediu regeneração; executado o gerador oficial com Bun 1.3.11, sem editar o arquivo gerado manualmente.

A árvore isolada de produção partiu de main em `release/lg05-oficina-20261127`. Tipos Core e Pinta aprovaram nessa árvore; tipos dos consumidores seguem em execução. Oito provas do editor passaram em Chrome desktop/toque, incluindo criação do mapa e livro pela interface, desfazer/refazer e reabertura. A matriz de destinos aprovou 12 casos; quatro casos novos de publicação pararam porque a fixture não montava a rota pública (HTML em vez de JSON). A montagem foi corrigida para usar o serviço de provas existente; a repetição continua pendente. Nenhum post remoto foi criado.

Preparação de implantação: o serviço de revisões Worker também valida o schema do marcador PNG, portanto precisa receber o leitor 6 antes da ativação do escritor. A referência remota em 27/11 é Worker produção `5df90fce-6396-4e52-81e3-ec56f57a7b0c`, 100%, e staging `2b23ad0e-efd7-4ca7-a985-9ce04317cbe3`, 100%. Produção usa imagem `096f5368eb8c8018087671f039ae04d08894d7a9df98db152539d762288c2a1b` (Pro 16/Three 9); staging usa `a384a191ad22984c60043955cdcfb9723737b22fcef0ffab90d04fcd6abb4134` (Pro 44/Three 21). Ambos os pools têm cinco instâncias saudáveis e nenhuma falha/rollout pendente. Configurações, vínculos e cron de 15 minutos foram conferidos, e a preparação mantém imagens/variáveis/catálogo por implantação somente do Worker. Nenhuma mutação Cloudflare foi executada nesta preparação.

Retirada do código substituído em andamento: removidos o emissor Phaser antigo sem consumidor e o exemplo Pygame antigo sem consumidor; o leitor Pygame continua sendo fonte do gerador Python existente. O construtor Godot deixou de gerar o pacote antigo: trinta ramificações do emissor substituído foram retiradas mecanicamente. A prova de SHA dos dois scripts atuais deve continuar idêntica; ainda não declarar essa conferência aprovada antes da execução.

Conferência posterior dos perfis: a fonte main e a imagem de produção do Jardim usam `720ddc18e570aa87898fab13b073ab54edb30ffec15a354465976aeca444923c`. O Worker confere esse perfil nas respostas do contêiner. Staging ainda usa a imagem anterior; publicar somente o Worker main ali criaria incompatibilidade. A preparação de staging foi corrigida para adotar as duas referências imutáveis da imagem já qualificada e ativa em produção (digest `096f5368…c2a1b`), pelos mecanismos normais de rollout dos pools existentes. Limites, DOs, R2, cron, variáveis e catálogo Python permanecem iguais. Produção segue com implantação somente do Worker, sem nova imagem. Ainda não foi executada mutação Cloudflare.

Os quatro testes Godot passaram após a retirada do emissor antigo, incluindo reimportação exata dos dois mapas e os SHAs anteriores dos scripts atuais (60 expectativas, Bun 1.4.4). Essa rodada extra e o Core completo (3.372/214.402 expectativas) foram executados na versão exigida pelo servidor de provas; a rodada canônica final mantém Bun 1.3.11 para testes/geradores e confina Bun 1.4.4 ao servidor de runtime do navegador.

A conferência canônica com Bun 1.3.11 mostrou outra exigência: `validation-profile.ts` inclui todos os schemas de `core/src/studio`. Portanto, a alteração PNG 6 exige novo perfil e nova imagem, mesmo sem alterar o interpretador Python. Perfil gerado pelo comando oficial: `abd210274a33506b4fc68c8fd720c70ae906c1fff86e032d1778c89b5d07083f`; somente o JSON do perfil mudou entre os gerados da imagem. A preparação anterior de reaproveitar 096f… foi invalidada antes de qualquer deploy. Os arquivos operacionais prontos foram retirados; os templates agora exigem a imagem LG05 qualificada. A imagem final deve vir da qualificação Linux oficial da staging, com seu digest e perfil conferidos, sem promoção do catálogo/distribuição Python.

Provas finais já observadas: oito casos do editor desktop/toque aprovaram também captura de antes/depois, regra guardada, borracha, prévia sem gravação e aplicação explícita seguida de reabertura. Dezesseis casos dos destinos passaram (58,1 s): PNG 5 preservado, PNG 6 isométrico/hexagonal em Classic/Pro com Jogo 2D/Avançado, botão real Jogar e reabertura. Os quatro casos Classic PNG 6 passam pelo BFF real e comandos reais de publicação, atualizam o mesmo publicationId/link e executam o PNG novo no player; Hub/R2 são portas controladas, sem post remoto. A configuração do ensaio foi corrigida para um único servidor: `defineConfig` concatenava os dois `webServer` sobre a mesma porta, em vez de substituir a configuração. Não se habilitou reutilização de um servidor antigo.

Revisão de orçamento: duas regressões reproduziram a aceitação indevida do 1.025º bloco hexagonal, tanto no escritor esparso quanto na soma de camadas. Corrigidos o padrão e a autoridade do orçamento explícito para `PINTA_HEX_REGION_MAX_CHUNKS`; o editor soma todas as camadas antes da mutação. Sete testes focados/40 expectativas passaram em Bun 1.3.11, conservando o teto de quatro MiB e o documento anterior. Cinco aulas protegidas passaram em 8,3 minutos; sete objetivos do Farol aprovados novamente.

A conferência do esquema portátil Python também apontou uma diferença real: o gerador copiava toda a capacidade do leitor comum, que agora lê 5/6, embora seu adaptador atual execute somente PNG 5/cena 4. O gerador agora restringe explicitamente o cabeçalho ao contrato implementado em Python. A conferência oficial passou sem mudar nenhum byte do pinta.py nem das duas tabelas Python geradas. As recusas de PNG 6 já presentes nas provas Python permanecem; a importação pública de cenário completo para Python também mantém sua recusa. Não se ampliou a promessa desse destino.

O contrato Pro foi ampliado no mesmo harness para controle ortogonal PNG 5 e os dois projetados PNG 6. Projeção do BFF e contrato do compilador: quatro aprovados/23 expectativas, com três casos de imagem ainda condicionais localmente; o CI Linux fornece a imagem obrigatória. Após atualizar a descrição do leitor comum, o perfil final da candidata é `c8b14ec4cb1d032eb41cc4db429dc74481ee790cd236723a62713f7e9c6a69b8`. O perfil abd210… acima é intermediário e não será promovido. A imagem LG05 final ainda precisa ser construída e qualificada na staging oficial.

[Recibo consolidado da candidata B e limites](../../qa/2026-11-27-lg05-oficina-projetada.md). A rodada staging A teve treze jobs de validação aprovados, mas o deploy geral falhou no Funnel depois de o build terminar e enviar sua imagem: erro de serialização na orquestração Railway. Os sete serviços do Pinta ficaram saudáveis; isso não autoriza declarar o workflow de staging aprovado. Tipos dos três consumidores, Core completo e gerados canônicos finais aprovados; Pinta completo e runtime seguem na rodada final.

Rodada canônica final da implementação: Pinta 3.024 aprovados/18 condicionais/zero falhas (36.058 expectativas); runtime 442 aprovados/56 condicionais/zero falhas (4.691 expectativas); tipos do runtime aprovados. Candidata isolada 4fc70d1ef1ed0bac4c7e393e5afff05cde9915de no PR 299; staging seletiva 8d65e23d7cd44e63473f363f0ea796e92fa084ea. CI do PR 46019699444 e imagem staging 46020040316 recusaram a rodada: consumidores de homologação ainda esperavam o pacote antigo e o carregador 3D gerado precisa acompanhar o leitor comum. Provas estão sendo migradas para o único pacote novo; a imagem ainda não foi qualificada nem implantada.

Migração dos consumidores de homologação: dez provas Phaser desktop/toque aprovadas, com geometria, apoio, salto, colisões, pixels, animação, portas e medições de consultas 4× preservados. O verificador Tiled usa a admissão regional e compara a cena integral. Os carregadores 3D foram regenerados oficialmente em Bun 1.3.11, seguidos do contrato da imagem; conferências dos gerados aprovadas. Perfil resultante a27f45d08088a57e72f2283d7965c3a0493d4ef3eded8a78dd2b8a3bbe2723e7 substitui c8b14… intermediário. Nenhuma imagem desses perfis foi implantada.
