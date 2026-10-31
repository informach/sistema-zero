# Arquipélago Vagalume: proposta original versus implementação

Data: 29/10/2026. Base de código: `a3cd791de786df3961e94ecbefe29f5d1d610a36`, ramo `staging`.

## Parecer

O jogo já tem um mundo amplo, com as seis ilhas completas ligadas, muitos sistemas de movimento, construção, cuidados, programação e uma base técnica bem estruturada. Não é apenas uma demonstração visual.

Entretanto, **a proposta original ainda não está integralmente entregue**. A cobertura geográfica está mais adiantada que a continuidade do progresso, o conteúdo pedagógico, as relações com moradores e a equivalência entre Kids e adultos. Algumas fases chamadas de concluídas entregam uma versão delimitada da ideia, não tudo o que o HTML descreve.

Minha recomendação é consolidar a experiência existente antes de acrescentar novas ilhas: guardar o progresso recente, completar o conteúdo das ilhas já abertas, fechar as integrações e provar o ciclo completo com contas reais e aparelhos modestos.

## Fontes e limites

- Proposta lida: `C:/Users/tocha/Downloads/Arquipélago Vagalume.html`, 248.168 bytes. O documento se apresenta como versão 3. Foram considerados o texto estático e os detalhes das ilhas embutidos no JavaScript do HTML.
- SHA-256 da proposta: `1922980444673ee2ff59df18b518f47e4d56d8949f9cef2c27cf03dfdcd17e7b`.
- Código: 301 arquivos TypeScript/TSX no jogo, 23 nos contratos e 56 no serviço, além dos consumidores pertinentes no Members, member-shell, Estúdio e Admin. O inventário adjacente registra os 380 arquivos e seus hashes.
- Método: comparação dos requisitos com regras, contratos, componentes montados, rotas, testes, manifestos e evidências de QA. A presença de um arquivo não foi considerada suficiente para concluir que uma função está entregue.
- Não é uma declaração de leitura manual linha a linha dos 380 arquivos nem uma prova de ausência de defeitos. As conclusões de ausência indicam o que não foi localizado nos caminhos examinados. Achados de comportamento diretamente demonstrados pelo código estão identificados como confirmados.
- Testes de navegador documentados por outras entregas são evidência histórica, não execução nova desta auditoria. Foram inspecionados também prints de computador e celular emulado das Nuvens. Não houve nova homologação visual completa, uso por crianças ou teste em celular físico nesta auditoria.
- Não houve escrita em banco de staging/produção, alteração de arte, GLB, `.env` ou workflows para este levantamento.
- **Implementado no Git não significa publicado e configurado.** Os últimos ambientes integralmente conferidos estavam em `cd0e92389`; esta comparação inclui o código posterior. Importação/publicação de desafios no Admin não foi inferida dos arquivos locais.

Legenda: **implementado** significa caminho presente no código; **parcial** significa parte da proposta ausente ou limitada; **não localizado** exige confirmação antes de assumir inexistência absoluta; **decisão pendente** não é defeito de implementação.

## Inventário por experiência

| Experiência da proposta | Estado encontrado | Evidência e ressalva |
|---|---|---|
| Ilha central, seis ilhas no anel e Farol ao lado da casa | Implementado | `mundo/anel.tsx`, `ilha-central.tsx`, `ilha-completa.tsx`; os seis registros completos e vivos estão ligados. |
| Ilhas cinzentas, abertura pela jornada, pontes e cor por desafios | Implementado como sistema | `sistemas/cor-da-ilha.ts`, contratos de ilhas, Quadro das Cores. Depende de conteúdo publicado para completar a experiência. |
| Carregar a ilha próxima e liberar ao sair | Implementado, boa solução | `sistemas/ilhas-completas.ts`, `mundo/carregar-ilha.ts`, `ilha-completa.tsx`: estados explícitos, limite de uma completa, preparação e descarte. |
| Luneta antes de abrir uma ilha | Implementado | Sistema de luneta e componentes do anel. Não substitui conteúdo jogável da ilha. |
| Chegada narrativa de barco, tempestade, chave e carta | Não localizada como sequência completa | Há barco, casa e apresentação do mundo, mas não foi localizada a encenação inicial completa descrita no HTML. Não confundir o barco de transporte com a introdução. |
| Bosque: Capi, quatro bichos, presente único | Implementado | `conversa-da-capi.ts`, `bichos.ts`, salvamento e testes da API para presente e concorrência. |
| Bosque: adoção, cuidados, truques e crescimento | Implementado | `bichos.ts`, `cuidar.ts`, acompanhamento no mundo. O bicho adotado tem estado persistido. |
| Bosque: cipó, escalada e percurso das copas | Implementado | Modos de movimento, percurso, colisores e verificadores próprios. |
| Vila: Bento, amizade, pedidos, receitas e diário | Implementado | `bento.ts`, `conversa-do-bento.ts`, `receitas.ts`, `diario.ts`. |
| Vila: padaria, sorveteria e feira | Parcial | Turnos jogáveis em `turnos.ts`. Pagam ingredientes/sementes; ainda não pagam as moedas previstas. |
| Vila: telhados e patins | Implementado | Percurso, modo patins e respectivas provas de colisão/movimento. |
| Tema semanal de construção e feira que muda semanalmente | Não localizado | Turnos e catálogo existentes não constituem uma programação semanal de temas/produtos. |
| Festas das quatro estações | Parcial | Arte e montagem das quatro existem. Calendário ativa Carnaval e junho; Lanternas sem data e fim de ano ainda proposto. |
| Pipoca da Junina feita com milho na fogueira | Implementado | Entrada de receita, interação sazonal e efeito de diversão. |
| Roupas e receitas sazonais variadas que retornam anualmente | Parcial/não localizado como catálogo completo | Decoração e pipoca não completam a coleção sazonal descrita. |
| Recife: Maré, lagoa, mergulho, navio e labirinto | Implementado | `recife*`, modos de mergulho e provas documentadas. Baú, página e tesouro têm estado no salvamento. |
| Recife: replantar coral e ganhar aquário | Implementado | Progresso dos corais e `ganharProjetos` concedendo aquário. |
| Barco entre ilhas vizinhas pelo anel | Parcial | `sistemas/barco.ts` representa dois portos e uma travessia central/Recife. Não é ainda uma rede de viagens entre as seis ilhas. |
| Mapa revelado conforme a exploração | Parcial | `sistemas/mapa.ts` mostra ilhas abertas pela jornada. Não guarda descoberta de regiões/caminhos. |
| Pico: Floco, subida, trenó e caverna | Implementado | Ilha completa e sistemas próprios. Apresentação do morador não equivale a amizade completa. |
| Pico: iglu, chocolate quente, banda e planador | Implementado | Componentes e regras próprios; projetos azuis associados. |
| Vale: Jade, pegadas, escavação e ninhos | Implementado | `jade.ts`, sistemas do Vale, provas geométricas e salvamento. A mecânica atual dos ninhos privilegia observar/proteger, não reproduz literalmente toda a cena sugerida no HTML. |
| Vale: ovo, filhote, cuidados, museu e montaria | Implementado | Salvamento V15, `filhote-do-vale.ts`, projeto museu e modo montaria. |
| Nuvens: Iriê e plataformas móveis | Implementado | Desenho/colisor preparados juntos, regras de movimento e verificações específicas. |
| Nuvens: saltos, corrida de balão e constelações | Parcial | Jogáveis, mas recordes novos e constelações ficam apenas na sessão. |
| Nuvens: passeio de balão | Implementado | Movimento e controle próprios, além da corrida. A operação em aparelho físico ainda precisa ser provada. |
| Controlar clima da ilha central | Parcial | Sol/nublado/chuva afetam desenho e horta, mas a escolha não é persistida. |
| Terraformar a ilha e jardim celeste completo | Não localizado como experiência entregue | Controle do clima, construção e minijogo de jardim não equivalem a modificar terreno. |
| Farol: última página, seis fachos e volta da Íris | Parcial | Sequência existe, com pausa e menos movimento. Leitura e retorno da Íris não sobrevivem à reabertura. |
| Final como percurso usando todas as habilidades | Parcial | A entrada atual usa uma transição para o interior; não é a subida combinando os modos de movimento sugerida na proposta. |
| Modo livre da Lenda e galeria de criações no Farol | Não localizado como entrega específica | Acesso ao Farol e construção normal não demonstram esse modo final. |
| Construção por grade, paredes, portas/janelas e quintal | Implementado | `sistemas/construcao/*`, editores e mundo. Há casa e cabana no salvamento. |
| Expansões arquitetônicas completas, incluindo segundo andar | Parcial | Não foi demonstrado o conjunto inteiro de ampliações do HTML. O iglu visitável do Pico não prova um iglu residencial construível. |
| Quarto compartilhado com a plataforma | Implementado como integração | Porta da plataforma lê/grava o quarto. Deve continuar sendo testado com ida e volta real, não apenas playground. |
| Projetos azuis funcionam antes da aparência | Implementado | `construcao/projeto-azul.ts`, objetos e geladeira. Função e visual são separados. |
| Pinta e Molda abrem com molde e devolvem aparência | Implementado como integração | `member-shell/src/lib/arquipelago-objeto.ts`, host e contratos; frente, faces e limite de triângulos no pedido. Falta homologação completa desta composição com contas reais em ambos os públicos. |
| Aparências já criadas e galeria | Implementado, com divergência | Criações são referenciadas por ID; catálogo da galeria do jogo é próprio e ainda tem uma aparência por objeto. |
| Inventário único de compras entre jogo e quarto | Parcial | Carteira é única; propriedade das aparências do jogo é registrada em `compras_da_galeria`, no serviço do jogo. Não há equivalência demonstrada com o inventário de compras do quarto. |
| Aconchego por variedade, luz, plantas e autoria | Implementado | Cálculo e painel; comprar não retira pontos. |
| Aconchego chama moradores e libera festas em casa | Ainda não ligado | Os limiares existem, mas o código declara que não acionam visitas ou festas. |
| Fome, energia, diversão, descanso e cochilo seguro | Implementado | `necessidades.ts`, descanso, pausa e retorno. |
| Humor aumenta velocidade, colheita e ganho nos pedidos | Parcial | Há multiplicador de velocidade. Não foi localizada a mesma cadeia de bônus de colheita e moedas. |
| Amizade, aniversário, gostos e pedidos de todos os moradores | Parcial | Capi e Bento têm o sistema mais completo. Maré, Floco, Jade e Iriê têm apresentações/interações específicas, não a mesma profundidade social. |
| Todas as páginas do diário | Parcial | Textos e abertura para Bosque, Vila, Recife e Farol; Pico, Vale e Nuvens seguem sem texto/entrega completos. |
| Horta em tempo real e clima sem perda por ausência | Implementado com limites | Horta e bônus de rega existem. Colheitas especiais causadas pelo clima não foram localizadas. |
| Receitas brasileiras | Parcial | Sete entradas atuais, incluindo salada, pipocas, fubá, pão de queijo, brigadeiro e chocolate. Açaí/moqueca/peixe com coco não estão no catálogo examinado. Os valores e exemplos do HTML não são automaticamente obrigações literais. |
| Álbum, coleções e modo foto | Implementado | `album.ts`, `diario.ts`, foto e painéis. Publicação no Clube depende do fluxo/permissões da plataforma, não apenas de baixar a foto. |
| Recordes dos percursos e visitas da família | Implementado parcialmente | Recordes, leitura da família e casa de irmãos existem. A visita é uma leitura da casa, não presença simultânea. |
| Correr contra um fantasma do irmão | Não localizado | Comparação de recordes não contém uma trajetória gravada/reproduzida do fantasma. |
| Borrões noturnos, lanterna e coleção de Lumis | Implementado | Famílias, espécies comuns/raras, captura e estados do mundo. |
| Cada espécie de Lumi tem velocidade/capacidade próprias | Parcial | Há 14 espécies em sete famílias; o ritmo de trabalho ainda é comum. |
| Programar rotinas e automatizar horta/geladeira | Implementado, ponto forte | Intérprete compartilhado, formato validado, execução no mundo e cartões conquistados no serviço. |
| Mini Estúdio de blocos dos Lumis com prévia | Implementado | Editor no member-shell, ponte da ferramenta, prévia pelo mesmo intérprete e fallback do jogo. Não é Python nem exige um segundo motor de regras. |
| Desafios do Estúdio verificados no servidor | Implementado como infraestrutura | Revisões, objetivos, tentativas, disponibilidade e pagamento após verificação. |
| Seis desafios do Quadro das Cores em cada ilha | Conteúdo incompleto no repositório examinado | Há um principal no quadro 6 e três variações diárias por ilha nos seis manifestos locais. Não foi localizado o conjunto dos quadros 1 a 5 nessas pastas. Conteúdo cadastrado só no Admin não foi inventariado. |
| Desafio diário e indicação do curso necessário | Implementado como sistema | Seleção diária, blocos conquistados e `Aprenda isso em`. Depende de cursos e desafios publicados. |
| Minijogo aprovado vira atração e família pode jogar | Implementado | Repositório de projetos aprovados, fliperama/atrações, rotas do jogador e da família. |
| Jogos do Mural também entram no fliperama | Não localizado no caminho examinado | O serviço de minijogos abre os projetos aprovados dos desafios. Não foi localizada a seleção de publicações do Mural para esse destino. |
| Carteira única, idempotência e teto semanal | Implementado, ponto forte | Members autoriza débito/crédito; pedidos pendentes podem ser retomados. Valor atual do código: 150/semana, documentado como decisão posterior. |
| Comprar sementes, iscas e ingredientes com moedas | Não implementado no fluxo examinado | A regra atual declara a galeria como único gasto do jogo. Pode ser uma simplificação intencional, que precisa constar como mudança da proposta. |
| Kids e adultos com mesmas ilhas | Implementado na base | Público/jornada, montagem comum e tema adulto próprio. Isso não entrega automaticamente conteúdo pedagógico equivalente. |
| Adultos sem limite dos pais | Implementado | Serviço retorna limite nulo para adulto. |
| Visitas opcionais entre adultos | Não implementado no serviço examinado | O serviço de visitas só oferece irmãos Kids da mesma conta. |
| Desafios vinculados a cursos adultos | Infraestrutura possível, conteúdo local incompleto | Os seis manifestos examinados têm público Kids. |
| Cartão dos pais, limite e permissões | Implementado como integração | Serviço da família, rotas e host; volta ao curso usa conclusão de aula até 24h após sessão. |
| Medição de retorno, cursos e criações nos dois públicos | Parcial | Medição tem privacidade e agregações, mas retorno adulto e conclusão de cursos antes/depois estão sem fonte. |
| Satisfação dos pais e permanência na assinatura atribuídas ao jogo | Não localizado como medição pronta | Exige fontes e definição de análise; não se deduz de tempo de jogo. |

## O que está especialmente bem construído

### 1. Fronteira entre jogo e plataforma

O jogo tem entrada própria, raiz React própria, contrato versionado e compartilhamento explícito. O teste `packages/arquipelago/tests/fronteira.test.ts` verifica imports proibidos. A plataforma abre ferramentas e fornece identidade/dados, sem importar as regras do mundo.

Isso é uma boa base para crescimento e implantação independente. Não significa que qualquer mudança de contrato seja automaticamente compatível: versões antigas e novas ainda precisam ser ensaiadas durante rollout.

### 2. Regras puras e execução compartilhada

Movimento, qualidade, calendário, necessidades, cuidados e construção são testáveis sem desenhar a cena. O editor dos Lumis e o jogo usam o mesmo intérprete do contrato, evitando duas implementações que poderiam discordar sobre o resultado de uma rotina.

### 3. Carregamento das ilhas

Há dono do cache, limite de uma ilha completa, preparação de colisores e shaders antes da troca, estados de falha e descarte explícito. É melhor que carregar todo o arquipélago pesado de uma vez. A solução merece ser preservada; precisa de medição prolongada em GPU real para confirmar estabilidade de memória.

### 4. Salvamento e operações sensíveis

O projeto tem versões explícitas, migrações, limite de tamanho, fila, tratamento de conflito e testes. O presente único da Capi tem verificação no serviço. Nas moedas, idempotência, estado pendente e carteira central evitam tratar uma resposta de rede perdida como autorização para cobrar novamente.

A ressalva importante é a migração V14→V15 descrita nos achados abaixo. A existência de infraestrutura de migração não torna toda transformação automaticamente segura.

### 5. Qualidade adaptativa e acessibilidade de movimento

`sistemas/qualidade.ts` define três níveis, detecção conservadora, histerese e intervalos diferentes para piorar/melhorar. DPR 1,75 / 1,25 / 0,75; vento zerado e ondinhas desligadas no leve; meta de 60 ou 30 quadros. A física permanece separada do desenho. Pausa e menos movimento aparecem também nos sistemas recentes.

### 6. Privacidade e honestidade na medição

Os resultados agregados suprimem grupos com menos de cinco pessoas e também complementos pequenos. Fontes indisponíveis aparecem como indisponíveis, sem fabricar zero. A limitação é de cobertura das métricas, não falta de cuidado com o dado apresentado.

### 7. Evidências de QA úteis

Há testes de regras, contratos, rotas, banco descartável, geometria/colisores e verificadores por ilha, além de screenshots. Os documentos recentes distinguem emulação, teleporte de conferência e SwiftShader de uma prova real de controle/performance. Essa honestidade é positiva e deve continuar.

**Eu classificaria esses fundamentos como muito bons, com aspectos de excelência técnica. Ainda não classificaria a experiência inteira como excelente:** faltam continuidade, conteúdo, integração final e validação de uso real.

## Achados prioritários e correções recomendadas

### A1. Conquistas recentes desaparecem ao reabrir

**Confirmado; prioridade alta de produto.** `estado/loja.ts:65` guarda recordes da sessão, constelações e clima fora do salvamento; `estado/farol.ts` mantém o final em memória. As regras documentam expressamente essas limitações.

Impacto: uma pessoa pode achar uma constelação, terminar uma corrida ou trazer a Íris de volta e, na visita seguinte, perceber que isso não permaneceu. Recordes e descobertas são progresso; clima é preferência, com impacto menor.

Correção: uma próxima versão de salvamento, com migração, registro compacto das constelações, recordes dos percursos novos e final concluído; decidir se clima persiste como preferência. Testar salvar, fechar, reabrir, conflito, duas abas, retorno de versão anterior e limite em bytes. Há teste atual que reserva mais de 4 KB, portanto a antiga justificativa de ausência total de espaço precisa ser recalculada contra a V15.

### A2. Migração V15 remove aparências aceitas pela V14

**Comportamento confirmado; ocorrência em contas reais não demonstrada.** `arquipelago-contracts/src/salvamento.ts:644` filtra IDs maiores que 40 e limpa a aparência ativa correspondente. A V14 aceitava até 80. A justificativa é que IDs reais são UUIDs ou IDs curtos de catálogo.

Isso não prova perda real, mas a migração descarta dados estruturalmente válidos da versão anterior. Para uma base robusta, é melhor demonstrar a invariável em todos os produtores ou preservar/remapear essas referências explicitamente, em vez de simplesmente eliminá-las. Também convém testar tamanho UTF-8 dos IDs aceitos, e não apenas fixtures ASCII.

Aceite: migração preserva todas as referências legítimas; casos inválidos são diagnosticáveis; teste de limite cobre os formatos realmente admitidos. Não recomendo aumentar arbitrariamente o teto de 64 KB.

### A3. Diário apresenta páginas ainda impossíveis de obter

**Confirmado; prioridade alta para a história.** `sistemas/diario.ts:98` tem textos apenas de Bosque, Vila, Recife e Farol. O fallback em `paginasDoDiario` informa que as outras páginas estão com o morador, mesmo sem um caminho de entrega implementado.

Correção: escrever e ligar Pico, Vale e Nuvens, com critérios claros e persistentes; até lá, não indicar uma ação que o jogador não consegue completar. O final precisa ser coerente com a descoberta dessas páginas, sem transformar o jogo em requisito para os cursos.

### A4. O conteúdo do Quadro das Cores não acompanha a infraestrutura

**Confirmado para os arquivos locais; publicação remota não conferida.** São seis manifestos com quatro desafios cada: seis principais e dezoito variações diárias, todos Kids. Cada principal ocupa o quadro 6. As variações diárias não preenchem os cinco quadros restantes.

Correção: matriz de seis objetivos por ilha e por público, distinguindo conteúdo preparado, importado, publicado e acessível com blocos reais. Conferir também a primeira experiência da ilha central, sugerida como Pega-conchas. Não importar automaticamente sem validar pré-requisitos e executor.

### A5. Carteira unificada não equivale a galeria/inventário unificados

**Divergência confirmada.** `ServicoDaGaleria` debita no Members, mas registra propriedade em `compras_da_galeria` do jogo. O catálogo `arquipelago-contracts/src/galeria.ts` é próprio. O HTML prometia que comprar no jogo ou no quarto daria acesso ao mesmo inventário.

Há duas soluções coerentes: completar a unificação de catálogo/propriedade no Members, ou formalizar que os projetos funcionais do jogo são uma categoria separada, com a carteira compartilhada. A decisão deve ser explícita antes de multiplicar aparências e preços. Não recomendo transferir tabelas sem definir identidade, posse, compatibilidade de modelo e migração.

### A6. Métrica de criação não mede necessariamente o ato de criar no período

**Confirmado.** `repositorio-medicao.ts` filtra por `projeto.ganhoEm` e classifica a aparência atualmente aplicada. Assim, um projeto azul ganho em janeiro e pintado em fevereiro pode ser contado no recorte de janeiro com sua aparência de fevereiro.

Não é um histórico de criações ou compras. O próprio relatório lista compras como sem fonte. Recomendo rotular como fotografia dos projetos ganhos no período ou instrumentar eventos próprios de criação/aplicação/compra. Para comparar aprendizagem e autoria ao longo do tempo, o evento precisa ter data e origem adequadas.

### A7. Adultos ainda não têm toda a experiência prometida

**Confirmado nos caminhos examinados.** Sem limite parental e com tema próprio já existem. Visitas entre adultos, retenção adulta e conteúdo adulto dos manifestos locais não estão completos. `ServicoDaMedicao` calcula volta ao curso apenas para Kids; `ServicoDasVisitas` restringe às crianças da mesma conta.

Correção: tratar adulto como uma entrega explícita, com conteúdo, fontes de atividade e visita opt-in. Não copiar permissões familiares para adultos.

### A8. Vida cotidiana menos profunda que o cenário sugere

**Confirmado em parte e ausência de integração localizada em parte.** Aconchego mostra pontos, mas não chama moradores; profissões pagam itens, não moedas; espécies de Lumi não mudam o ritmo de trabalho; quatro moradores não têm a mesma amizade da Capi/Bento. Tema semanal e renovação da feira não foram localizados.

Essa é a maior lacuna para a vontade de voltar depois de explorar as ilhas. Completar alguns ciclos de amizade, criação e automação trará mais valor que adicionar novas áreas vazias. Moedas de tarefas só devem ser adicionadas com validação de servidor e chave idempotente.

### A9. Performance ainda é meta, não resultado homologado em aparelhos modestos

**Lacuna de validação confirmada.** Os documentos de Nuvens/clima usam SwiftShader e deixam explícito que não medem GPU real. Alguns percursos de QA usam transporte de conferência, embora testes separados cubram saltos reais.

Falta: sessão prolongada percorrendo todas as ilhas; memória antes/depois de voltar; FPS e p95 de tempo de quadro; carga fria; alternar ferramentas; rede lenta; Android/iPhone/Chromebook reais; ergonomia de toque. Não atribuir 60/30 FPS alcançados apenas porque a preferência de qualidade está configurada.

### A10. Documentação precisa distinguir fase técnica de experiência completa

**Confirmado.** `docs/arquipelago.md` ainda contém descrições antigas, como salvamento V2 e enquadramento de fase inicial, enquanto o contrato já é V15. Algumas notas de fases indicam funcionalidades futuras que já chegaram em outras seções.

Correção: um catálogo único de funcionalidades com quatro estados separados: código, teste, conteúdo/configuração e implantação. Isso evita que “fase 4 concluída” seja interpretado como “toda a proposta entregue”.

## Ajustes de produto que não são necessariamente defeitos

- **Datas das festas:** Carnaval e junho ativos; fim de ano e Lanternas dependem de decisão. Não ativar datas inventadas.
- **Teto de moedas:** o histórico desta conversa menciona 100, mas código e regras posteriores registram 150. Há justificativa econômica documentada. Consolidar a decisão vigente antes de declarar divergência como bug.
- **Acesso:** a proposta associa o jogo à assinatura; decisões posteriores permitem entrada por cadastro, respeitando progressão/ferramentas, e menu só para admins durante validação. A intenção mais recente prevalece.
- **Exemplos de receitas, preços e prêmios:** o HTML identifica vários números como exemplos. Sua diferença não é, sozinha, falha de implementação.
- **Editor dos Lumis:** a decisão posterior de mini Estúdio de blocos substitui os cartões como experiência principal; manter cartões como fallback é coerente.
- **Interações mais gentis:** a versão atual de algumas atividades do Vale privilegia observação. Avaliar a diversão e o objetivo pedagógico, não exigir confronto apenas para reproduzir literalmente a proposta inicial.

## Acabamento visual e experiência

Os prints examinados das Nuvens mostram linguagem visual consistente, botões grandes, diálogo legível e foco de teclado aparente. O tema adulto tem escopo próprio em `.arq-adulto`.

Ainda recomendo uma rodada específica de UX: no print desktop da conversa com Iriê, a dica de câmera continua atrás do diálogo; no celular, HUD, dica, inventário e controles disputam uma área considerável. Priorizar a informação da ação atual, recolher dicas já aprendidas e provar alvos de toque em aparelho real. Os prints são de QA em modo leve, não julgamento da qualidade gráfica final.

Também falta um percurso de descoberta com pessoa que nunca viu o jogo: entender por que entrar no curso, como ganhar um projeto azul, onde criar sua aparência, como programar um Lumi e o que ficou guardado ao voltar no dia seguinte.

## Sequência recomendada para fechamento

| Ordem | Entrega | Critério concreto de conclusão |
|---|---|---|
| 1 | Continuidade do progresso e revisão da V15 | Nada legítimo desaparece ao migrar; Nuvens/Farol retomam após reabrir; limite de bytes provado. |
| 2 | Diário e conteúdo das ilhas | Cada indicação aponta para algo realizável; matriz dos Quadros completa ou escopo reduzido explicitamente; publicação auditada. |
| 3 | Integração real jogo/plataforma | Conta aluno e admin, Kids e adulto; quarto, Pinta, Molda, mini Estúdio, minijogo e moedas com salvar/reabrir e falhas de rede. |
| 4 | Performance e controle em aparelhos reais | Medição 60/30, sessão longa sem crescimento contínuo de memória, saltos e ferramentas utilizáveis por toque. |
| 5 | Vida social e rotina | Amizade dos demais moradores, aconchego produz consequência, turnos e Lumis com efeitos coerentes. |
| 6 | Paridade adulta e dados confiáveis | Conteúdo adulto, visitas opt-in, fontes de retorno/curso e métrica de autoria com semântica correta. |
| 7 | Extensões da proposta | Rotas entre todas as ilhas, fantasma familiar, terraformação, modo livre Lenda, catálogo sazonal e temas semanais. |

Não recomendo reconstruir o motor. Recomendo aproveitar a boa base, fechar seus contratos e completar os ciclos que fazem a pessoa entender, criar, guardar e voltar.

## Verificações desta rodada

| Verificação | Resultado | Limite |
|---|---|---|
| `bun test`, pacote arquipelago | **1.049 passaram, 1 ignorado, 0 falhas**, 121 arquivos, 60,32 s | O ignorado exige integração específica com API/Postgres; não representa sucesso desse cenário. |
| Testes de arquipelago-contracts na mesma base | **139 passaram, 0 falhas** | Registrados na rodada de conciliação que precedeu esta comparação. |
| Testes de arquipelago-api com Postgres descartável na mesma base | **280 passaram, 15 ignorados, 0 falhas** | Inclui os testes de banco; não somar novamente os 47 da execução de banco separada. |
| Typecheck da API | Passou | Não equivale a nova tipagem de todos os pacotes nesta auditoria. |
| Biome do repositório | 13.183 arquivos, nenhum erro | Executado após a correção do CI, antes deste documento. |
| Job Arquipélago do CI `40946046091` | Passou na consulta desta auditoria | CI completo e deploy ainda estavam em andamento; não os declarar concluídos por esse job. |
| QA visual consultado | Nuvens desktop e celular emulado, relatórios de mergulho/clima/aventuras | Evidência histórica; sem nova execução de navegador nem aparelho físico. |

Logs locais: `.cache/arquipelago-audit-tests.log`, `.cache/arquipelago-contracts-remote.log`, `.cache/arquipelago-api-remote-all.log`, `.cache/arquipelago-api-typecheck-remote.log` e `.cache/biome-remote-green.log`.

## Leitura principal do código

Referências relativas a este documento:

- [Contrato de salvamento e migração V15](../packages/arquipelago-contracts/src/salvamento.ts)
- [Estado do jogo e progresso só da sessão](../packages/arquipelago/src/estado/loja.ts)
- [Estado do final](../packages/arquipelago/src/estado/farol.ts)
- [Diário e páginas disponíveis](../packages/arquipelago/src/sistemas/diario.ts)
- [Ilhas completas](../packages/arquipelago/src/mundo/ilha-completa.tsx)
- [Qualidade adaptativa](../packages/arquipelago/src/sistemas/qualidade.ts)
- [Aconchego](../packages/arquipelago/src/sistemas/construcao/aconchego.ts)
- [Calendário](../packages/arquipelago/src/sistemas/festas.ts)
- [Barco](../packages/arquipelago/src/sistemas/barco.ts)
- [Galeria do jogo](../packages/arquipelago-api/src/application/servico-da-galeria.ts)
- [Medição: consulta](../packages/arquipelago-api/src/infrastructure/persistence/drizzle/repositorio-medicao.ts)
- [Medição: disponibilidade das fontes](../packages/arquipelago-api/src/domain/medicao.ts)
- [Visitas](../packages/arquipelago-api/src/application/servico-das-visitas.ts)
- [Editor de rotina Lumi](../packages/member-shell/src/components/arquipelago-rotina/RotinaLumiEditor.tsx)
- [Regras consolidadas](../docs/arquipelago-regras.md)

Esta auditoria não removeu código, não alterou regras de jogo e não considerou funções sem import estático automaticamente mortas. Componentes carregados dinamicamente, ferramentas, entrypoints e exports dos contratos precisam desse cuidado.
