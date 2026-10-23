# Revisão pedagógica dos objetivos dos cinco cursos

Estado: proposta para revisão. Data: 18/10/2026. Frente paralela à implantação de Python e da jornada. Nenhum manifesto, roteiro, gerador, curso remoto ou regra de produção foi alterado nesta frente.

O desenho de autoria foi aprofundado em [p0-authoring-contract.md](p0-authoring-contract.md), que prevalece nos detalhes de exemplos por parte, diagnóstico do inicial, privacidade, comandos e migração. O review independente e os limites da prova estão em [review.md](review.md).

## 1. Conclusão e direção recomendada

O modelo único de objetivos por parte é uma melhora: a criança vê o que falta, a equipe mantém uma definição canônica, a conferência usa o servidor e a entrega deixa de ser uma segunda prova com nota. Os cursos locais ainda aproveitam apenas a conferência de blocos. A evolução pedagógica deve melhorar a evidência de cada ideia, sem transformar o projeto em cópia obrigatória de um gabarito.

Recomendo um modelo misto: estrutura para a ideia ou o encaixe que a parte realmente ensina; comportamento para um efeito observável que pode ser reproduzido com confiabilidade; experiências e quiz para compreender relações; entrega para receber a criação e permitir retorno humano. Nenhum desses instrumentos sozinho prova compreensão ou autoria. A lista deve ser curta por intenção, sem repetir todo o histórico como vinte instruções técnicas.

Alternativas consideradas:

| Opção | Ganho | Custo/limite | Decisão |
| --- | --- | --- | --- |
| Manter os 364 checks e apenas mudar os rótulos | Mudança pequena | Conserva repetição, rigidez e lacunas entre texto e regra | Insuficiente |
| Trocar tudo por execução | Permite conferir efeitos | Espera, aleatoriedade, observabilidade limitada, dependência de executor; estrutura ensinada pode desaparecer | Não recomendada |
| Revisão por intenção com instrumentos mistos | Evidência mais pertinente e liberdade real | Exige matriz de alternativas, revisão dos geradores e provas de cada regra | Recomendada |

## 2. O que foi efetivamente verificado

Inventário reproduzível: [inventory.py](inventory.py), com saída [inventory.json](inventory.json). A saída inclui os 218 IDs de partes, objetivos editoriais, critérios integrais e SHA-256 dos 37 manifestos. A leitura é de arquivos locais; não é uma auditoria de conteúdo importado no Admin.

| Curso | Aulas | Partes | Partes com workspace | Partes externas | Checks atuais | Gabaritos |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Cadê Todo Mundo? | 3 | 11 | 4 | 0 | 3 | 0 |
| A Chave do Farol | 4 | 20 | 11 | 0 | 49 | 0 |
| Nave Contra Asteroides | 9 | 52 | 27 | 0 | 144 | 0 |
| Corre, Dino! | 13 | 81 | 50 | 0 | 168 | 0 |
| O Jogo do Meu Jeito | 8 | 54 | 0 | 34 | 0 | 0 |
| Total | 37 | 218 | 92 | 34 | 364 | 0 |

Todos os 364 checks são `usesBlock`. Das 218 partes, 87 têm objetivos de projeto, duas são entrega embutida sem checks, três reutilizam workspace sem objetivos, 69 usam atividade interativa, 15 têm quiz, duas certificado, seis contexto/material e 34 ferramenta externa. Os 31 blocos de tipo Studio incluem 27 projetos embutidos e quatro galerias do Meu Jeito; uma galeria não é um projeto inicial a ser executado.

Fontes diretamente consultadas: Diretrizes Pedagógicas completas, Briefing, Especificação de Roteiro completa, Especificação de Manifesto, mapas dos cursos, manifestos, fontes dos geradores, projetos por etapa, critérios Farol, conteúdo Dino/Nave, `core/learning/{section-progression,project-execution,execution-observation}`, `studio/blockly/projectCheckAuthoring`, `studio/check/{serverCheck,instrumentCheckScript}`, `admin/lib/objectives-test` e `members/application/learning/section-progression.service`. Foram lidos os contratos relevantes de `CLAUDE.md` de Core, Admin, Members e Studio; não existem AGENTS.md/CLAUDE.md na raiz deste worktree.

Não foram executados geradores, testes pesados, navegador, Docker ou banco. Validade do JSON e contagem de conteúdo não qualificam a execução dos novos critérios, a importação remota nem a compreensão infantil.

## 3. Instruções do usuário que orientam a revisão

Estas instruções recentes prevalecem sobre números e falas dos materiais antigos:

- Cor, arte escolhida e outros detalhes de aparência são livres quando não são o conceito ensinado. O gabarito é uma solução possível.
- Velocidade mais rápida ou lenta é livre, desde que realize o movimento pedido. No Jogo 2D, aumentar Y desce e diminuir Y sobe. Um `vy` direto negativo pode fazer subir; uma atualização equivalente que subtrai uma magnitude positiva também é válida. Não julgar só o sinal de um campo sem olhar sua utilização.
- Zero não realiza um movimento exigido. Não impor “não zero” a todo número: zero é válido para velocidade horizontal de um tiro vertical, pontos iniciais ou posição, por exemplo.
- Número exato só deve trancar quando a intenção exige aquele valor, como a parte que ensina dar três vidas. Um enunciado antigo pode ser revisto: escrever nele “velocidade 5” não torna pedagogicamente necessário copiar 5.
- Não inventar uma faixa universal de velocidades, posições, escalas ou tempos. Limite de segurança vem do contrato do motor; limite pedagógico depende do efeito exigido.
- Manter acessibilidade, criatividade, progresso, IDs, projetos salvos e mídias. Não fazer uma revolução de conteúdo que apague a criação anterior.

Isso requer revisar falas, cadernos e propostas junto das regras. Relaxar só o JSON e continuar mandando copiar um valor arbitrário no vídeo não cumpre a direção.

## 4. Achados e lacunas prioritárias

| Prioridade | Achado concreto | Efeito | Encaminhamento |
| --- | --- | --- | --- |
| P0 | `Testar agora` acusa cada obrigatório já cumprido pelo inicial como problema; `studioSectionCompletionIssues` também devolve erro de publicação para cada um | Pré-requisitos legítimos podem impedir reimportação/publicação: Cadê A2 já revela; Farol D2 já anda e tem borda | Distinguir parte inteira já aprovada de objetivo de preservação. Rever a régua de autoria antes de popular gabaritos |
| P0 | 0 `solutionProject` nos 37 manifestos | Nenhum novo objetivo de execução pode entrar com qualidade sem preparar a solução | Gabarito por aula embutida, compatível com todas as partes dessa aula e diferente do inicial |
| P0 | Valores de aparência e dinâmica exatos em diversas regras | Solução funcional diferente pode reprovar | Inventariar cada literal: identidade/relação ensinada, requisito real ou mera demonstração |
| P1 | Nave final já tem 20 checks; Dino A7 tem 17 | Adicionar execução indiscriminadamente ultrapassa o contrato e aumenta carga cognitiva | Substituir/reagrupar por intenção; manter mutações de regressão em QA |
| P1 | Dino A10 `colisao-area` promete faixa 70–85, mas só confere presença do bloco no sprite | Texto e prova não coincidem; qualquer entrada estrutural compatível pode parecer validada | Retirar faixa arbitrária da promessa e conferir o ajuste real quando houver observação disponível |
| P1 | Farol exige retirar chave antes de atribuir `temChave` embora o próprio comentário reconheça que as duas ordens funcionam | Reprova alternativa equivalente por reprodução da montagem | Preservar conexão ao evento e consequência; remover ordem sem função semântica |
| P1 | Regra de comportamento atual observa um valor ao final; `changed` não prova direção, causa ou sequência | Um movimento automático pode satisfazer “mudou” mesmo sem responder à tecla | Combinar evidência estrutural pertinente ou qualificar comparação temporal antes de prometer direção robusta |
| P1 | Cliques têm coordenadas de viewport; Farol admite chave em outro lugar e velocidade livre | Rota fixa pode falhar em criação válida | Não colocar percurso fixo como bloqueio de personalização; manter teste estrutural/entrega e planejar observação adequada |
| P1 | A maioria dos sprites/grupos, estado e áudio não tem observação pedagógica pública genérica | “Jogo sem rastro”, “som certo” e “grupo limpo” não se provam por screenshot/DOM textual | Estrutura + teste manual/experiência; não declarar prova automática inexistente |
| P2 | Meu Jeito trabalha fora do workspace da aula | `projectChecks` não recebem esse trabalho externo | Manter galeria, autoavaliação guiada e retorno da equipe; futura inspeção de entrega exige contrato próprio |

### 4.1 Inicial, preservação e gabarito

Há três situações distintas:

1. **Aprendizagem nova:** falta no estado de entrada; deve aparecer depois da montagem. O inicial ou checkpoint imediatamente anterior precisa falhar nesta intenção.
2. **Preservação:** já existe e deve continuar funcionando. Pode passar no inicial, mas não substitui a aprendizagem nova.
3. **Escolha:** trocar cor, espécie, mensagem ou magnitude permitida. Manter a escolha original é válido; não criar um check que exige diferença só para ganhar aprovação.

O problema de “passa sem fazer nada” existe quando todos os objetivos novos obrigatórios e os demais critérios da prática já estão satisfeitos sem prática. A presença de um pré-requisito cumprido isolado não demonstra esse problema. O modelo de autoria precisa explicitar isso; não mascarar a mensagem nem deformar o projeto inicial só para ficar vermelho.

Sugestão de desenho a revisar: a lista pública contém objetivos da parte; preservações essenciais podem compor esses objetivos, mas a validação de autoria diferencia a condição global já satisfeita. Separar no relatório “já estava preparado/preservação” de “intenção nova sem diferença”. Se forem necessários metadados `new`/`preserve`, decidir no contrato compartilhado e no importador, sem campo solto ignorado. Enquanto isso, não inventar metadados no manifesto.

Para QA, usar também o checkpoint imediatamente anterior à parte. Um único `initialProject` por aula não representa o estado de entrada de cada parte. Um gabarito final pode satisfazer a maioria das montagens anteriores; se a parte ensina uma etapa provisória que depois é retirada, usar um projeto de teste específico para a parte. O exemplo confirmado é Dino A10: `ligar-raio-x` e `ajustar-area` exigem `sz_g2d_draw_hitbox`; `retirar-contorno` e `entrega` exigem esse tipo com `count: 0`. Não forçar o gabarito final a ter simultaneamente “com contorno” e “sem contorno”. Isso revela uma limitação adicional do único `solutionProject` por bloco: tratar as soluções transitórias como fixtures de autoria e decidir se o Admin precisa aceitar gabarito por parte antes de exigir todos os objetivos intermediários contra o mesmo final. A borda de Dino A1 é retirada em A2; essa mudança entre aulas não é, por si só, contradição de um gabarito por aula.

### 4.2 Contrato executável atual e seus limites

- Até 20 objetivos totais e oito de execução por parte. Até 20 passos por regra, espera individual até 10 s, soma até 15 s por objetivo, teclas até 5 s, orçamento de esperas/casos até 40 s na parte. Esses são tetos, não metas de duração.
- Cada objetivo de execução abre o jogo do zero. Dois objetivos não compartilham a mesma partida nem efeitos anteriores.
- `behavior` admite esperar, tecla e clique; compara valor clássico, texto, console ou estado de kit Pro. Valor tem caminho de até quatro identificadores, sem índice numérico arbitrário.
- `functionReturns` e `script` não são formas de contornar as limitações dos cursos em Blocos. A autoria atual exige Ponte/Pro para essas regras; não liberar Ponte só para testar o curso de blocos.
- 3D clássico com dependência de internet não é elegível ao executor offline atual.
- Python tem sua própria inspeção estrutural autorizada; esta revisão não qualifica correção comportamental Python nem expande Pensa.
- Publicação valida estrutura e presença de gabarito, mas não exige comprovante persistido de execução aprovada. Portanto “publicável” não significa “testado com sucesso”.
- Executor indisponível/ocupado/inconclusivo não é reprovação infantil. Não persistir aprovação nem consumir conquista por falha de infraestrutura.

Antes de transformar direção, retorno ao chão, limite espacial relativo ou eventos múltiplos em bloqueio automático, avaliar um lote pequeno de contrato compartilhado para observações temporais: valor antes/depois, direção de mudança e condição alcançada durante uma ação. É uma proposta de capacidade, ainda não implementada. Não escrever regras JSON com esses campos antes de validação, executor, Admin e DTOs aceitarem a mesma definição. Não usar pixel exato, script escondido no modo Blocos ou velocidade mínima artificial como substituto.

## 5. Como ler as matrizes por parte

**E** = estrutura/ideia do programa, com escopo/evento/ramo reais e sem literais arbitrários. **B** = comportamento compatível com executor atual, só após prova de observabilidade/repetibilidade. **B+** = comportamento desejável que precisa resolver uma lacuna do contrato; não entra como bloqueio agora. **I** = atividade interativa/experiência já configurada. **Q** = quiz formativo. **D** = entrega real. **H** = conferência humana guiada. **O** = convite opcional.

Cada linha identifica uma parte ou um conjunto explicitamente enumerado de partes do mesmo tipo. “Passa” e “falha” são classes de variantes a materializar como fixtures; não são alegação de testes executados. O inventário preserva individualmente todos os IDs, inclusive partes sem modificação proposta.

### 5.1 Cadê Todo Mundo? — piloto de baixo risco

| Aula/parte | Evidência e decisão | Alternativas que devem passar | Contraexemplos que devem falhar |
| --- | --- | --- | --- |
| A1 `apresentacao` | I + vídeo: jogar até os alvos já existentes | Toque/click e ordem de descoberta livres | Só assistir sem cumprir participação/alvos configurados |
| A1 `seu-caderno-do-aluno` | Vídeo; material opcional | Consultar, ouvir, baixar ou seguir sem baixar | Não transformar download opcional em critério |
| A1 `toque-e-resposta` | I + vídeo: comparar reação ligada/desligada | Diferentes ritmos de manipulação | Vídeo sozinho não cumpre metas da experiência |
| A1 `primeiro-achado` | E: reação no evento do grupo correto; B candidato: tocar e esconder objeto tocado; D no fim | Qualquer bicho/esconderijo oferecido, cor e mensagem livres | Opacidade fora do evento, alvo fixo errado, bloco desativado, objeto já invisível sem responder ao toque |
| A2 `retomada`, `variavel-achados` | Vídeo e I existentes | Revisitar sem apagar projeto | Não substituir manipulação por quiz de memória |
| A2 `contar-achados` | E: incremento no mesmo evento; B: contagem após um e após os três esconderijos, em execuções independentes | Ordem livre de toques, outras artes, outras cores/textos | Contar no quadro, iniciar em três, contar espaço vazio, duplicar incremento ou contar repetição indevida |
| A2 `personalizar` | O nas escolhas + D + envio em dia; não exigir trocar algo | Manter original, trocar só um bicho ou tudo, texto autoral | Entrega antiga quando o projeto mudou; escolha estética não pode reprovar |
| A2 `conclusao` | Vídeo; O publicar segundo acesso real | Publicar ou seguir sem publicar | Não bloquear certificado por Mural opcional |
| Certificado `revisao-final`, `certificado` | Q de três perguntas + emissão preservados | Corrigir sem limite, certificado já emitido acessível | Quiz faltante antes da primeira emissão |

Gabaritos: A1 completo com reação e sem exigir contador ainda não ensinado; A2 completo com reação e contagem. O projeto de abertura não deve ser copiado automaticamente como inicial. Testes de clique usam a geometria real do snapshot, não o nome/cor da imagem; se posição também puder mudar, o clique precisa acompanhar o layout ou permanecer teste de fixture, não critério bloqueante do projeto livre.

### 5.2 A Chave do Farol — movimento, memória e condição

| Dia/parte | Evidência e decisão | Alternativas que devem passar | Contraexemplos que devem falhar |
| --- | --- | --- | --- |
| D1 `apresentacao`, `caderno`, `quadro` | Jogo pronto, consulta e I existentes | Ritmo próprio, consulta opcional | Só vídeo não substitui jogo/experiência |
| D1 `andar` | E: controle usado no quadro; B candidato `personagem.x changed` com tecla + E causal; B+ para direção relativa robusta | Velocidade 2 ou 8, aparência livre, expressão equivalente quando modo permitir | Bloco órfão, velocidade zero, mover outro sprite, movimento automático sem entrada |
| D1 `limite` | I existente | Explorar limites por diferentes lados | Ver demonstração sem fazer metas |
| D1 `borda` | E de contenção após atualização; B+ do personagem permanecer na área; D | Magnitudes livres e arte própria que conserva sprite executável | Contenção antes de mover se permite escapar; limitar outro sprite; nenhuma contenção |
| D2 `contexto` | I da memória já existente | Retirar e guardar em ordens de exploração livres | Confundir sumiço com informação guardada |
| D2 `recolher` | E no encontro personagem/chave; B+ coleta por rota adaptável | Aparência/chave livre e velocidade livre | Destruir chave no início, destruir personagem, coletar objeto não encontrado |
| D2 `guardar` | E: estado inicial falso e mudança causal na coleta; preservar movimento em QA | Remover e atribuir em ordem equivalente; variável adequada à cadeia preservada | Começar com chave verdadeira, atribuir por tempo sem coleta, nunca guardar |
| D2 `programar-chave` | E de aviso ligado à coleta, texto livre; D no fim | Avisos autorais compreensíveis | Aviso em evento errado, ausência de informação de coleta; não impor frase literal |
| D3 `condicao` | I da porta existente | Explorar com/sem chave | Não cobrar definição decorada de `Se` |
| D3 `sem-chave` | E de condição no encontro e resposta sem chave; B+ de cenário sem coleta | Outros avisos e representações equivalentes no modo autorizado | Vitória sem chave, ramo invertido, aviso nunca aplicado |
| D3 `decisao` | E: condição, vitória e resposta visual com chave; B+ ciclo de coleta/porta | Qualquer modelo de farol aceso coerente com apagado; magnitude de movimento livre | Farol acende no início/sem chave; `temChave` nunca lida; vitória em outro evento |
| D3 `personalizar` | O de artes; preservação de acender sem julgar modelo | Todos os pares disponíveis/aliases já salvos | Apagado como resposta final quando intenção é acender; par sem representação coerente |
| D3 `farol-mensagens` | O de textos; não cobrar frases originais | Manter mensagens ou escrever outras legíveis | Ausência da funcionalidade de avisar é regressão funcional, não erro de estilo |
| D3 `posicao` | I de X/Y | Diferentes manipulações dos eixos | Não transferir convenção de Y de Turtle para este jogo |
| D3 `posicionar-chave` | Escolha espacial livre executável + D + envio em dia; H de acessibilidade da chave | Lugar diferente, arte diferente, velocidade diferente | Chave inalcançável ou entrega desatualizada; não impor coordenada do exemplo |
| D3 `fecho` | Vídeo + O publicar | Continuar sem publicar | Não confundir envio, salvar e publicar |
| Certificado `revisao-final`, `certificado` | Q de quatro perguntas + emissão | Corrigir, usar leitor, certificado anterior preservado | Primeira emissão antes do quiz |

Não usar a rota cronometrada da professora para bloquear uma chave que a criança reposicionou. Até resolver a observação adaptável, coleta e condição continuam com E qualificado + I + teste manual orientado + D. Isso já melhora a coerência sem uma automação enganosa.

### 5.3 Nave Contra Asteroides — nove aulas

| Aula/parte | Evidência e decisão | Alternativas que devem passar | Contraexemplos que devem falhar |
| --- | --- | --- | --- |
| `primeira-nave/abertura`, `seu-caderno-do-aluno`, `uma-vez-e-sempre`, `coordenadas`, `criar-e-mostrar`, `desenho-por-quadro` | I/vídeo/consulta existentes | Explorar antes da montagem, consulta opcional | Não considerar experiência prova do projeto próprio |
| `primeira-nave/montar-areas-e-tela` | E de inicialização e quadro; tela executável | Cor livre, dimensões compatíveis com intenção/layout se enunciado revisto | Tela ausente, montagem em área não executada |
| `primeira-nave/criar-nave` | E de criação do sprite que será controlado | Arte/espécie/tamanho/posição executáveis | Criar sprite diferente do usado depois, nenhuma criação |
| `primeira-nave/motor-e-nave` | E de desenhar no quadro; H da visibilidade + D | Outras cores e aparência visível | Criar sem desenhar, desenhar em ramo nunca alcançado |
| `dia-1/seta-e-velocidade`, `limite-da-tela`, `ordem-dos-desenhos` | I existentes | Magnitudes diferentes observadas com mesma ideia | Decorar número do exemplo não basta |
| `dia-1/setas` | E de movimento controlado; B candidato de mudança; B+ de direção | Velocidades lentas/rápidas, atualização equivalente | Movimento zero, sprite errado, movimento sem depender de seta |
| `dia-1/limpeza` | E da limpeza por quadro, H do rastro | Cor e arte livres | Limpar só no início ou depois de apagar o desenho que deveria ficar |
| `dia-1/borda` | E de contenção; B+ relativo | Posições iniciais e dimensões válidas | Nave escapa após atualização; limitar outro sprite |
| `dia-1/fundo-estrelado` | E da camada atrás da nave; H visual | Cor, quantidade e velocidade de estrelas livres | Fundo desenhado após a nave e ocultando-a |
| `dia-1/quiz-final`, `entrega` | Q + D; reduzir lista cumulativa a intenções de movimento, contenção e imagem | Configurações equivalentes | Dar aprovação por ter só o bloco de movimento inativo |
| `dia-2/tecla-e-repeticao`, `escrito-e-lido`, `direcao-do-tiro`, `tiro-que-sai-da-tela` | I existentes | Explorar cadência e sinal | Tiro fora da tela não prova remoção do grupo |
| `dia-2/criar-tiro` | E de evento Space, origem ligada à nave e direção; B+ de direção/causa | `vy=-2` ou `-8`, cor e raio livres, expressão que sobe | Zero vertical; tiro descendo; tiro criado longe da nave por posição fixa sem relação; criação automática |
| `dia-2/tiros-voam` | E de mover e desenhar grupo | Magnitudes livres coerentes | Criar sem atualizar ou desenhar; mover grupo errado |
| `dia-2/faxina` | E de remoção do grupo após sair + D | Diferentes velocidades e aparência | Só sumir visualmente; grupo cresce sem limpeza |
| `chuva-de-asteroides/intervalo-das-pedras`, `posicao-sorteada` | I existentes | Amostras diferentes, sem exigir sequência exata | Não cobrar número específico sorteado |
| `chuva-de-asteroides/relogio` | E de criação por intervalo; retirar “40 quadros” como cópia se não for requisito do conceito | Intervalos que produzem chuva executável | Criar em todo quadro se intenção é intervalo, relógio sem criação |
| `chuva-de-asteroides/asteroide` | E de grupo, sorteio, atualização/desenho/limpeza; B+ observação de queda | VY positivo direto ou expressão equivalente que desce; cores/tamanhos/magnitudes livres | VY zero ou movimento para cima quando tarefa pede cair; nenhum sorteio |
| `chuva-de-asteroides/entrega` | D + regressões por intenção | Outra densidade de chuva funcional | Entregar sem pedras alcançarem a área jogável |
| `dia-3/trombada` | I de colisão existente | Escolher/remover nos cenários da experiência | Vídeo não prova aplicação |
| `dia-3/colisao` | E de encontro tiro/asteroide e consequências ligadas aos envolvidos | Outro efeito visual/sonoro quando autorizado; cor livre | Remover objetos fixos errados, explosão em todo quadro, colisão fora da partida |
| `dia-3/quiz-final`, `entrega` | Q + D + H de acerto real; não simular sorteio determinista oculto | Partidas de durações diferentes | Fixture que teleporta alvo não prova colisão normal |
| `pontos/caixa-de-pontos` | I existente | Diferentes manipulações | Confundir número guardado com mostrador |
| `pontos/placar` | E de iniciar em zero, somar uma vez no acerto e mostrar variável; D | Texto/cor/fonte/posição do placar livres e legíveis | Placar fixo; pontos crescem sem acerto; duplicar soma; iniciar pronto na meta |
| `dia-4/vidas-no-comeco`, `respiro` | I existentes | Testar proteção com diferentes ritmos | Atribuir vidas a cada quadro e torná-las infinitas |
| `dia-4/vidas` | E + B candidato de `nave.health` após confirmação de API: três vidas iniciais, recurso de mostrar vidas | Corações ou representação ensinada/revisada; cor/posição livres | Duas/quatro vidas quando objetivo é três; número fixo sem relação com vida |
| `dia-4/batida` | E de dano e intervalo de proteção; B+ de batidas reproduzíveis | Efeitos livres, tempo de proteção funcional | Dano a cada quadro sem respiro, remover nave errada, recuperar automaticamente sem ensino |
| `dia-4/quiz-final`, `entrega` | Q + D + H | Partida com acertos/erros em ordem diferente | Aprovar proteção só porque existe bloco de dano |
| `comecar-partida/estado-do-jogo` | I existente | Explorar condição ligada/desligada | Não equiparar botão desenhado a estado real |
| `comecar-partida/embrulhar` | E do início e guarda das ações da partida | Textos, fundos e posicionamento livres | Jogo move/ataca no menu quando intenção é aguardar |
| `comecar-partida/relogio-e-tiro` | E das criações protegidas por estado | Relógios/magnitudes livres | Pedra/tiro nasce fora de jogando, cópia de criador fora da guarda |
| `comecar-partida/enter` | E de transição Enter + B candidato se estado observável; D | Aparência e frases próprias | Enter apenas muda tela sem iniciar a partida; início automático |
| `dia-5/finais` | E de condições vitória/derrota; meta configurável se enunciado revisto | Outra meta coerente lida pela regra; mudanças estéticas livres | Meta ignorada, vencer abaixo dela, perder apesar de vida restante |
| `dia-5/telas` | E de respostas por estado, sem HINT literal | Mensagens próprias, fonte/cor/posição livres | Mesma resposta funcional para vitória e derrota quando tarefa distingue estados |
| `dia-5/reiniciar` | I existente | Comparar estado/partida em ritmos diferentes | Confundir trocar estado com limpar partida |
| `dia-5/enter` | E de reinício real nos estados finais; B+ ciclo completo | Frases/cores/magnitudes próprias | Estado volta, mas pontos/vidas/grupos antigos permanecem |
| `dia-5/quiz-final`, `entrega` | Q + D + H de ciclo completo; substituir lista20 por grupos de intenções | Soluções equivalentes e publicação opcional | Não remover evidência de vida/colisão/pontos ao reduzir contagem |

Redução de vinte checks não significa criar um único “usou Se” genérico. Cada intenção ainda precisa de escopo causal: partida, colisão e ramo de resultado. Relatórios da equipe podem guardar subresultados, mas não inventar agrupamento no JSON antes de o contrato suportar. Na primeira revisão, reduzir apenas duplicações ou literais arbitrários comprovados; uma mudança maior de agrupamento é lote próprio.

### 5.4 Corre, Dino! — treze aulas

| Aula/parte | Evidência e decisão | Alternativas que devem passar | Contraexemplos que devem falhar |
| --- | --- | --- | --- |
| A1 `apresentacao`, `caderno`, `uma-vez-e-sempre`, `limite-da-tela`, `coordenadas`, `criar-e-mostrar` | I, vídeo e consulta existentes | Consulta/ritmo livres | Vídeo não substitui experiência |
| A1 `area-e-tela` | E de inicialização e tela | Cor livre; tamanho precisa servir ao jogo, exemplo não é prova universal | Tela ausente/inválida, área sem execução |
| A1 `borda` | E do recurso de borda | Espessura/cor livres quando apenas mostrar limite é objetivo | Borda fora da inicialização, nenhuma borda |
| A1 `criar-dino` | E de sprite criado, posição/tamanho executáveis | Outra aparência/espécie compatível com o papel no jogo | Criar nome que controles não usam, sprite fora do jogo sem intenção |
| A1 `entrega` | D + E das intenções novas | Aparência própria | Só preservar tela sem criar personagem |
| A2 `quadros`, `camadas`, `descricao` | I existentes | Explorar camadas e ouvir com leitor | Só conferir visualmente descrição acessível ausente |
| A2 `motor-e-dino` | E de desenho por quadro; H | Aparência livre | Criar sem desenhar ou desenho inalcançável |
| A2 `limpeza` | E de limpar antes de desenhar | Cores livres | Limpar depois do desenho tornando-o invisível |
| A2 `ordem-certa` | E de floresta atrás do personagem; retirar SPEED=5 | Floresta mais lenta/rápida, outra cor | Fundo cobre personagem ou desenha grupo errado |
| A2 `retirar-borda` | E de remoção da borda provisória e preservação do personagem | Outra aparência | Remover personagem junto com borda |
| A2 `descrever-jogo` | E da descrição + H de clareza/acessibilidade; não exigir frase literal | Texto autoral que informa objetivo/controles | Texto vazio ou sem orientação; presença do bloco sozinha não prova adequação |
| A2 `entrega` | D + H de visibilidade/descrição | Visual e texto próprios | Entrega antiga ou sem personagem visível |
| A3 `gravidade-modelo`, `impulso-modelo` | I existentes | Comparar impulsos diferentes | Não exigir14 apenas por ser demonstração |
| A3 `aplicar-gravidade` | E no quadro, no personagem correto; B+ de cair | Força/visual livres e queda real | Gravidade no sprite errado, bloco inativo |
| A3 `comando-de-pulo` | E de controles; B+ subida e retorno ao chão; manual pelos três controles | Impulsos/magnitudes diferentes que pulam; aparência livre | Zero sem salto, voo contínuo quando tarefa pede pular, só Space funciona se três entradas foram ensinadas |
| A3 `revisao`, `entrega` | Q + D + H dos controles | Testes em outra ordem | Aprovar por um salto automático sem entrada |
| A4 `area-que-espera`, `dedo-e-pulo` | I existentes | Entradas/ritmos diferentes | Confundir tecla com acontecimento do pulo |
| A4 `som-no-pulo` | E do som no evento de pulo, não na tecla; H de áudio | Efeito sonoro escolhido e volume acessível | Som por quadro/tecla repetida sem salto, ausência do som, evento errado |
| A4 `entrega` | D + H de um efeito por salto nos controles | Outro timbre | Screenshot não comprova som |
| A5 `espaco-e-tempo`, `numero-negativo` | I existentes | Comparar intervalos/magnitudes | Decorar1,4/-5 não comprova direção |
| A5 `grupo-e-relogio` | E de grupo e relógio separado do quadro | Intervalo funcional livre | Criar a cada quadro quando intenção é intervalo |
| A5 `criar-cactos` | E de criação no relógio; B+ entrada e direção | VX=-2/-8 ou atualização equivalente para esquerda; tamanho/cor livres | VX zero, deslocar para direita se devem vir de fora da direita, criador fora do relógio |
| A5 `mover-e-desenhar` | E de atualizar/desenhar o grupo correto | Magnitudes e aparências livres | Desenhar sem mover, mover outro grupo |
| A5 `entrega` | D + H de obstáculo entrando | Densidades diferentes executáveis | Nenhum obstáculo chega à pista |
| A6 `visivel-guardado` | I existente | Explorar com diferentes quantidades | Sair da tela não prova remoção da coleção |
| A6 `faxina` | E de remover quem saiu; B+ quando coleção observável | Manter placar diagnóstico autoral se não atrapalha o jogo; não proibir por estética | Grupo cresce ilimitadamente; apagar só desenho |
| A6 `revisao`, `entrega` | Q + D | Ferramenta de diagnóstico própria | Regra “sem-medidor” não deve substituir prova da limpeza |
| A7 `condicao` | I existente | Explorar inicio/jogando | Não confundir tela de menu e lógica |
| A7 `estado-inicio` | E de estado inicial | Menu/texto/cor próprios | Começar jogando quando intenção é esperar |
| A7 `embrulhar` | E de ações protegidas por jogando, fundo fora quando pertinente | Ordens equivalentes sem alterar consequência | Ação duplicada fora da guarda; sombra de condição que nunca governa o jogo |
| A7 `relogio` | E da criação protegida dentro do relógio | Intervalo livre | Criar cactos no menu |
| A7 `entrega` | D; rever17checks por intenções, mantendo regressões em QA | Configurações equivalentes | Reduzir a “tem Se” permitiria bypass |
| A8 `menu` | E de mensagem/tela por estado, sem texto literal | Frases/cores/tipos livres | Menu sempre desenhado durante partida e ocultando jogo |
| A8 `convite` | I existente | Tecla/toque conforme experiência | Não impor só Enter |
| A8 `entrada-ampla` | E de entrada ensinada ligada ao início; B+ validar múltiplas entradas | Texto livre, teclas previstas e toque | Evento só Enter quando tarefa ensina tecla ou toque; entrada só muda imagem |
| A8 `entrega` | D + H | Várias entradas equivalentes | Nenhuma entrada inicia |
| A9 `contato`, `trocar-nao-limpa` | I existentes | Observar diferentes batidas | Não confundir reinício com troca de cena |
| A9 `batida-acaba-partida` | E de colisão e fim ligados | Aparência livre | Fim por tempo sem colisão ou em sprite errado |
| A9 `mapa-do-jogo` | E de tela de fim condicionada | Mensagens próprias | Tela não corresponde ao estado |
| A9 `batida-sentida` | E de efeitos no contato + H áudio/visual | Efeito/volume/cor livres conforme tarefa revisada | Efeitos a todo momento, sem relação com batida |
| A9 `caminho-de-volta` | E de reiniciar, B+ ciclo real | Entrada ampla conforme ensinado | Grupos/estado antigo sobrevivem ao “recomeço” |
| A9 `revisao`, `entrega` | Q + D + H de fim/recomeço | Duração de partida livre | Aprovar só pela presença de restart fora do evento |
| A10 `caixa-decide` | I existente | Comparar áreas | Não tornar70–85 uma verdade universal |
| A10 `ligar-raio-x` | E de visualização da área; H | Cor/tamanho do personagem livres | Contorno de outro sprite |
| A10 `ajustar-area` | E de ajuste no personagem + H/B+ de área realmente diferente sem encolher desenho | Escala pertinente ao desenho escolhido, fora de faixa arbitrária se válida | Encolher só o sprite; ajuste sem efeito; área inválida para motor |
| A10 `retirar-contorno` | E de retirar diagnóstico ensinado; H de preservação do ajuste | Outro visual; decisão futura se diagnóstico opcional pode permanecer | Retirar também ajuste, regressão de contato |
| A10 `entrega` | D + H | Outra escala funcional justificada | Presença do bloco não prova faixa/efeito |
| A11 `guardar-mudar-mostrar`, `quando-o-placar-cresce` | I existentes | Ritmo livre | Confundir variável com texto fixo |
| A11 `caixinha-dos-pontos` | E de inicializar pontos em zero | Nome/estrutura preservados pela cadeia ou equivalência qualificada | Pontos já altos no começo |
| A11 `numero-na-tela` | E de mostrar variável | Texto, fonte, cor e posição livres | Placar fixo independente de pontos |
| A11 `relogio-dos-pontos` | E de incremento durante partida; B de crescer após tempo confiável | Velocidade visual livre; intervalo exato somente se “um por segundo” continuar intenção explícita | Pontos crescem no menu/fim, duplicar incremento |
| A11 `frase-da-tela-de-fim` | E de valor na mensagem; texto livre | Mensagem autoral com pontos reais | Número fixo que ignora partida |
| A11 `revisao`, `entrega` | Q + D | Mensagens/visual próprios | Aprovar por variável não utilizada |
| A12 `sorteio-tira-na-hora` | I existente | Resultados e ritmos diferentes | Não exigir que duas amostras sejam diferentes: acaso pode repetir |
| A12 `lugar-diferente` | E de sorteio na criação por obstáculo | Faixa coerente com local de nascimento; sem500/560 obrigatório por hábito | Sortear uma vez no início se intenção é variar cada nascimento; posição fixa |
| A12 `velocidade-propria` | E de sorteio por nascimento com direção coerente | Magnitudes/faixas próprias executáveis | Sorteio que pode gerar direção contrária/zero incompatível com obstáculo entrando |
| A12 `entrega` | D + H, QA com amostras controladas somente no teste | Repetição legítima de sorteio | Regra exigir variedade em exatamente duas amostras |
| A13 `regua-negativos`, `o-que-o-freio-segura` | I existentes | Comparar magnitudes/base/variação | Confundir mais negativo com mais devagar |
| A13 `numero-que-manda` | E de base usada na criação, separada da variação | Base/magnitude inicial livre com direção coerente | Criar base sem usá-la; alterar só cacto anterior |
| A13 `relogio-da-dificuldade` | E de relógio condicionado à partida | Intervalo próprio que torna evolução perceptível | Dificuldade muda no menu ou todo quadro sem intenção |
| A13 `acelerador-e-freio` | E da condição de limite e alteração causal; B+ de saturação | Limite/base/intervalo livres e coerentes | Sem limite, condição invertida, acelerar para direção oposta |
| A13 `descricao-completa` | E + H de descrição com controles reais | Texto autoral acessível | Texto vazio ou controles que não funcionam |
| A13 `revisao`, `entrega` | Q + D + H do ciclo, acessibilidade e limite | Outra dificuldade/visual | Exigir longa sobrevivência determinista para avançar |

As regras negativas de quantidade (“um único criador”, “um único som”) devem ser limitadas à consequência ensinada. Um recurso autoral adicional legítimo não deve reprovar só porque aumenta a contagem global; a regra precisa identificar duplicação indevida do mesmo efeito. Não remover guardas de duplicação antes de escrever as variantes que distinguem esses casos.

### 5.5 O Jogo do Meu Jeito — autoria, Pinta e integração

As 34 partes externas continuam externas. Não adicionar `projectChecks` a um workspace que não existe. A entrega comprova que uma criação chegou à equipe; não comprova automaticamente qualidade artística, escolha de cor, uso de espelho ou funcionamento completo do jogo.

| Aula e partes | Evidência e decisão | Alternativas que devem passar | Contraexemplos e retorno |
| --- | --- | --- | --- |
| A1 `jogo-pronto`, `aparencia-e-regras`, `copias` | I existentes; `caderno` consulta | Diferentes temas | Confundir arte com regra |
| A1 `exportar`, `importar`, `entrega` | H de cópia própria + D Studio | Nome próprio e visual livre | Entregar projeto errado; ajudar a identificar cartão sem fingir inspeção automática |
| A2 `bordas`, `espelho`, `luz` | I existentes | Espelho/iluminação explorados livremente | Não exigir simetria estética universal |
| A2 `nova-nave`, `contorno`, `cores`, `volume`, `entrega` | H de pixel art legível e folha compatível + D Pinta | Nave ou espécie autoral, cores/luz próprias que cumpram intenção | Arte vazia, cortada ou tamanho incompatível com recorte; não reprovar paleta diferente |
| A3 `quadros`, `fantasma` | I existentes | Ritmos diferentes | Copiar quadro sem perceber mudança |
| A3 `primeiro-fogo`, `segundo-fogo`, `voando`, `entrega` | H da mudança entre quadros + D; `revisao` Q | Chama/efeito próprio, fps diferente se objetivo for pulsar; dois quadros se conceito é esse | Quadros idênticos quando intenção é pulsar, deslocar corpo sem intenção, animação inexistente |
| A4 `preenchimento-contorno` | I existente | Formas livres | Não cobrar desenho idêntico |
| A4 `novo-asteroide`, `forma-pedra`, `curvas`, `crateras`, `entrega` | H de vetor, forma e detalhes autorais + D | Outra pedra/obstáculo, contorno/cores próprios | Forma não executável/exportável, vazio; avaliar processo não beleza |
| A5 `camadas`, `mudanca-pequena` | I existentes | Ordenações exploradas | Não impor cor da chama |
| A5 `chama`, `miolo-fogo`, `quadro-pedra`, `girando`, `entrega` | H de camadas/animação + D de duas artes; `revisao` Q | Efeito/cores/ritmo próprios | Entregar só uma arte, animação ausente, detalhe oculto por camada indevida |
| A6 `nomes`, `recorte` | I existentes | Vários recortes testados | Confundir resolução da folha com tamanho do sprite |
| A6 `trazer-artes`, `trocar-nave`, `folha-nave`, `animar-nave`, `entrega` | H de importação, recorte e integração + D Studio | Arte própria, tamanho no jogo livre, arquivo/identidade coerentes | Recorte quebra frames, material ausente, arte de outra pessoa sem origem permitida |
| A7 `dois-relogios` | I existente | Intervalos/magnitudes diferentes | Confundir nascimento com animação |
| A7 `folha-pedra`, `trocar-pedra`, `animar-pedra`, `entrega` | H de animar cada instância depois de criar + D; `revisao` Q | Artes próprias, velocidade/fps livres coerentes | Só primeira pedra anima, folha errada, perder colisões ao trocar criador |
| A8 `copia-publicada` | I de snapshot existente | Explorar e observar versão | Não confundir edição com atualização de publicação |
| A8 `teste-completo`, `entrega` | H de início/partida/finais/recomeço + D; `revisao` Q | Partidas diferentes, dificuldade própria | Recomeço mantém dados anteriores, controles perdidos |
| A8 `compartilhar` | O de Mural | Publicar ou continuar sem publicar | Não exigir publicação para concluir |

Resolução de folha/recorte é uma relação técnica: se a criança criar uma folha de resolução diferente e ajustar o recorte corretamente, isso pode ser válido. A exigência de32×32 ou64×64 precisa ser mantida só quando a proposta ensina explicitamente aquela grade ou há dependência técnica não adaptada; não converter automaticamente em liberdade sem conferir a cadeia de assets.

## 6. Gabaritos e suíte de alternativas

Para cada intenção obrigatória, registrar uma matriz com:

| Categoria | Prova necessária |
| --- | --- |
| Entrada da aula | Projeto inicial original e projeto salvo legado; não apagar escolhas |
| Entrada da parte | Checkpoint anterior daquela parte; deve faltar a intenção nova |
| Solução principal | Passa sem ambiente externo não declarado |
| Alternativas | Cor e espécie diferentes; magnitude mais lenta/rápida coerente; outra mensagem/posição/fontes; implementação equivalente quando modo permitir |
| Mutação causal | Remover, desativar, mover para evento/ramo/área errada, trocar sprite/grupo, duplicar consequência |
| Mutação semântica | Direção oposta, movimento zero, condição invertida, estado constante, contador falso, retorno sem reinicialização |
| Relação entre partes | Parte anterior continua praticável; solução transitória não conflita com final; revisão/progresso preservados |
| Falha de infraestrutura | Ocupado, indisponível, timeout e observação incompleta não viram erro pedagógico nem aprovação |

Não criar produto capaz de editar a solução do aluno durante a conferência para fabricar uma situação de teste sem contrato explícito. Fixtures controladas pertencem à QA e ao Testar com outro projeto. Não injetar alvo perto do tiro e chamar isso de prova de um jogo completo.

Para movimentos, uma alternativa lenta e outra rápida devem passar com o mesmo significado. A janela de observação é derivada do efeito e da API; se o teste precisa de uma magnitude mínima artificial, ele está restringindo uma solução livre. Se não há como observar com precisão dentro do limite, manter evidência E/H e registrar B+ até corrigir a capacidade. Não alongar os limites de40s para esconder teste mal desenhado.

Para sorteio, o teste deve conferir que a regra sorteia no momento certo ou usar uma fonte determinista explicitamente oferecida pelo motor de testes; exigir duas saídas diferentes não é correto. Nenhuma fonte determinista nova foi implementada aqui.

Para som, usar estrutura do evento e prova humana de áudio até existir observação de evento sonoro qualificada. Screenshot final não é áudio. A criança que usa leitor não deve depender de cor ou som isolado para entender por que passou/faltou.

### 6.1 Dicas, desafios extras e retorno

Objetivos obrigatórios precisam cobrir o que foi ensinado, com rótulo de ação e resultado compreensível. A lista não é um catálogo das peças do gabarito. Uma dica aponta o vínculo que vale conferir (“Veja se a mudança de pontos está no encontro do tiro com a pedra”), sem anunciar que um número ou uma cor livre está errado.

Desafios extras entram quando acrescentam raciocínio possível com os recursos já acessíveis, sem introduzir obrigação escondida. Exemplos a avaliar: no Cadê, criar uma mensagem final própria é convite de autoria e não precisa virar XP; na Nave, uma regra nova de pontuação pode ser extra somente depois de ensinar a variável e seu evento; no Dino, uma variação visual pode continuar livre sem desafio técnico. Não transformar “mudar qualquer coisa” em prêmio automático nem cobrar um conceito futuro sem orientação. A regra de extra vigente não tranca e paga5XP uma vez; não criar uma segunda contabilidade no curso.

Na falha, distinguir o que não foi cumprido de teste que não pôde observar. Criança e equipe precisam saber se falta corrigir o programa, tentar novamente depois ou pedir ajuda. A entrega permite comentário humano sobre intenção, legibilidade, acessibilidade e descoberta, sem recolocar uma nota global no projeto.

## 7. Sincronização editorial e técnica

| Fonte atual | Papel | Mudança futura |
| --- | --- | --- |
| `qa/gerar-cade-todo-mundo.ts` e `cade-todo-mundo-projeto.ts` | Manifestos, projetos e conteúdo Cadê | Regras e gabaritos do piloto, mantendo trio e IDs |
| `qa/gerar-desafio-farol.ts`, `desafio-farol-criterios.ts`, `desafio-farol-projeto.ts` | Critérios/projeto/geração Farol | Simplificar preservação e ordem arbitrária, qualificar movimento/memória/condição |
| `qa/corre-dino.conteudo.json`, `gerar-corre-dino.ts`, `corre-dino-etapas.ts`, `corre-dino-projetos-qa.ts` | Conteúdo e checkpoints Dino | Retirar cópia estética/números arbitrários, gabaritos transitórios e negativos |
| `qa/nave-contra-asteroides.conteudo.json`, `gerar-nave-contra-asteroides.ts`, `nave-contra-asteroides-etapas.ts`, `nave-contra-asteroides-projetos-qa.ts` | Conteúdo e checkpoints Nave | Mesma revisão com atenção ao teto20 e às colisões aleatórias |
| `qa/meu-jeito.conteudo.json`, `gerar-meu-jeito.ts`, `meu-jeito-etapas.ts`, `meu-jeito-projetos-qa.ts` | Autoria externa e integração | Rúbricas humanas e instruções coerentes; galeria continua critério |
| `recursos/*/gerar-caderno.ts` e fontes de materiais | Mapa da Aventura | Mesmos gestos, exemplos livres, sinais e saída reais; renderizar PDF |
| `modulos-*.md`, propostas e roteiros de cada aula | Intenção, produção e fala | Distinguir novo, preservação e escolha; marcar complemento de gravação se necessário |
| `DIRETRIZES-PEDAGOGICAS.md`, `ESPEC-MANIFESTO.md`, `ESPEC-ROTEIRO.md` | Contrato de autoria | Registrar liberdade coerente, solução transitória e limitações verificadas uma só vez |

O gerador permanece fonte dos arquivos que gera; não editar somente os JSON. Critério técnico deve morar em um único lugar por curso, consumido pelos testes e gerador sem duplicar tabela de respostas. A intenção, fala e rúbrica podem referenciar o mesmo ID, mas não precisam derivar uma boa fala mecanicamente da regra.

Regeneração precisa ser idempotente, preservar chaves/IDs/ordem/aposentadorias existentes e não sobrescrever anexos remotos. Fazer prévia de importação no modo preservar; conferir o que aconteceria ao `solutionProject` criado no Admin, mídia, certificado e rascunhos. Versão local, versão importada, gravação, edição e publicação são estados separados.

## 8. Lotes e checkpoints de review

| Lote | Entrega concreta | Review/critério de saída |
| --- | --- | --- |
| P0 — desenho e contrato de autoria | Rever este mapa; decidir inicial/preservação e gabarito transitório | Cadê A2 não é recusado por preservar a reação; Dino A10 não exige contorno presente e ausente na mesma solução; sem metadados ignorados |
| P1 — piloto Cadê | Dois gabaritos e matriz de reação/contagem; dicas; roteiro/manifesto/gerador/caderno alinhados | Starter falta intenção nova; duas variantes de arte/cor passam; eventos/contador errados falham; revisão/certificado preservados |
| P2 — capacidades mínimas, se necessárias | Observação temporal/direcional e solução por parte, cada qual em contrato pequeno separado | Mesmas definições Core/Admin/Members/runtime; provas causais; sem script secreto no modo Blocos; sem ampliar tempo |
| P3 — Farol | Movimento, contenção, coleta, memória e condição; escolhas e posição livres | Alternativas lentas/rápidas, quatro pares de farol e chave reposicionada; sem rota cronometrada rígida |
| P4 — Nave | Nove aulas, reduzir cópia de parâmetros e rever lista20 | Tiro sobe/asteroide desce com magnitudes livres; três vidas quando pedido; aleatoriedade não causa bloqueio espúrio |
| P5 — Dino | Treze aulas, som/evento, limpeza, estados, colisão, pontos, sorteio e limite | Som por salto, proteção da partida, área vs desenho, dificuldade limitada; variantes não dependem de faixa inventada |
| P6 — Meu Jeito | Oito rúbricas, instruções e entregas da autoria externa | Galerias reais, duas artes quando pedido, assets/recortes/animação e partida preservados; sem API de entrada inventada |
| P7 — review completo e integração | Sincronização dos37trios/geradores/Mapas e plano de atualização staging | Validações, execução, importação e ensaio distinguidos; progresso e mídia preservados; nenhum bloqueio por estética |

Cada lote passa por leitura pedagógica e review técnico antes do próximo. A frente de conteúdo pode avançar em desenhos/fixtures sem disputar navegador/Docker/DB com a qualificação Python. A implementação de regras/runtime só entra em janela combinada com o responsável pela integração.

## 9. Verificação exigida para a implementação posterior

1. Testes unitários das regras compartilhadas e dos geradores; mutações que provam a intenção, não snapshots do próprio código.
2. Gerar uma vez e novamente; a segunda execução não produz diff. Rodar validadores de manifesto, roteiro, Como Fazer e testes dos cursos alterados.
3. Testar inicial, checkpoint anterior, soluções transitórias/final, variantes válidas e negativas com o mesmo avaliador usado pelo servidor.
4. No navegador real, testar como aluno: montar, verificar, ler dica, corrigir, verificar novamente, editar depois de aprovado, sair/voltar, enviar uma vez no fim, editar/reenvio, concluir e reabrir. Testar também indisponibilidade sem apagar trabalho.
5. No Admin, Testar agora e Testar com outro projeto devem explicar starter já completo, preservação e execução inconclusiva corretamente. Publicar não pode ser anunciado como teste de execução aprovado.
6. Renderizar e ler os PDFs; conferir rótulos, contraste, cortes, cores reais dos blocos, liberdade nas falas e correspondência com o projeto.
7. Fazer prévia da importação staging, conciliando IDs/mídias/gabaritos. Nenhuma importação, publicação ou deploy foi feita por este documento.
8. Ensaio humano com aluno que já fez a jornada e iniciante; observar onde precisa de ajuda. Não declarar compreensão validada só por testes técnicos.

## 10. Limites da entrega e decisões que precisam de revisão

- A centralização técnica já existe no código; a melhoria pedagógica dos cursos ainda não foi implementada.
- O inventário prova o estado local dos37manifestos, não o estado do Admin/staging/produção.
- O mapa preserva os218IDs e cobre as92partes com workspace e34externas; comportamentos B/B+ são candidatos, não testes aprovados.
- É preciso decidir o suporte a gabaritos transitórios por parte e à distinção de preservação antes de promover todos os gabaritos como prova geral. Um único final não satisfaz tarefas provisórias contraditórias.
- Não existe promessa de correção automática da arte do Pinta, do jogo externo do Meu Jeito, de 3D clássico offline, de compreensão infantil ou de comportamento Python qualificado.
- A nova liberdade do usuário exige atualizar diretivas antigas de cópia de velocidades, cores, fonte, posição e tamanhos quando forem exemplos. Dependências reais de assets, identidade e funcionamento continuam sendo verificadas.

Próxima implementação recomendada: P0 e P1, com review do desenho, pequeno ajuste do relatório de autoria e piloto Cadê. As lacunas de observação que aparecerem devem virar contratos específicos, antes de alterar os cursos longos.
