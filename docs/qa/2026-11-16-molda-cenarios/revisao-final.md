# Molda — Cenários 3D: revisão final

16/11/2026 · branch `staging` · execução contínua do plano aprovado. Implementação funcional até `37a6700e2`; evidências e guia acompanham o commit documental seguinte.

## Entrega funcional

Editor visual com identidade Molda, acervo pesquisável com miniaturas reais, objetos e conjuntos, transformações uniformes, apoios, colisões, sinalização existente, relevo, praças/trilhas, água e margens. Projetos compartilhados têm revisão, autoria, histórico, desfazer/refazer, importação/exportação e recuperação local. O host administrativo exige administrador ativo. CLI e MCP usam a mesma fila de comandos do editor, com revisão exata e proteção de gesto manual.

O runtime é independente do host e usa os sistemas nativos de avatar, física, câmera, toque e NPC. A edição, o ensaio e a aplicação são estados distintos. O `/macro` carrega a revisão explicitamente aplicada; o protótipo anterior está em `/macro?referencia=1`. Reconstruir a ponte no ensaio não altera campanha, Jornada ou Núcleos.

## Demonstração pela ferramenta

Criada uma cópia da Faísca e executados **41 comandos de autoria pela sessão real do editor**. A receita versionada está em `scripts/molda-cenarios-composicao.ts`. Foram ajustados o contorno da praça, poço, bancos, frente das construções, Quadro e agrupamentos de vegetação/jardineiras. Farol, lago, ponte, horta, lote da Morada e base geográfica foram preservados. A composição tem 554 instâncias e continua editável.

Documento: [faisca-estudo.molda.json](faisca-estudo.molda.json). Projeto local `bf66749c-efe7-4aaa-a8d9-81e30204a795`, revisão aplicada **7**. [Abrir no editor local](http://127.0.0.1:4531/?projeto=bf66749c-efe7-4aaa-a8d9-81e30204a795).

As três imagens de concept foram consultadas. Este estudo demonstra a ferramenta e uma organização inspirada nelas; **não reproduz o acabamento da pintura nem representa aprovação artística final da Faísca**. A oficina, os patamares do Farol, as transições da margem e o detalhamento ambiental ainda precisam de curadoria e composição artística pela equipe. A ferramenta permite continuar esse trabalho sem reescrever as coordenadas no código do jogo.

## Evidências visuais

| Evidência | Arquivo |
|---|---|
| Editor com o estudo | [estudo-editor.png](estudo-editor.png) |
| Praça, câmera comparável antes | [estudo-praca-antes.png](estudo-praca-antes.png) |
| Praça, mesma câmera depois | [estudo-praca-depois.png](estudo-praca-depois.png) |
| Visão noturna | [estudo-praca-noite.png](estudo-praca-noite.png) |
| Farol e entorno | [estudo-farol.png](estudo-farol.png) |
| Horta, lago e ponte | [estudo-horta-lago.png](estudo-horta-lago.png) |
| Revisão aplicada com avatar | [macro-aplicado.png](macro-aplicado.png) |
| Toque emulado | [macro-toque.png](macro-toque.png) |
| Edição de terreno por mouse | [pincel-visual.png](pincel-visual.png) |
| Caminhada, corrida, curva e salto | [movimento-no-macro.mp4](movimento-no-macro.mp4) |
| Pincel, desfazer e cancelamento | [pincel-e-cancelamento.mp4](pincel-e-cancelamento.mp4) |

Capturas do renderer foram solicitadas pelo protocolo da sessão, confirmando a revisão pronta. Vídeos foram registrados pelo navegador e recortados apenas para retirar carregamento e espera, sem alterar a velocidade da gravação. Servem para inspeção, não para aprovar automaticamente IK, animação ou direção de arte.

## Validação

- Suíte nativa registrada nesta execução: **2.144 aprovados, 1 pulado, zero falhas**; 254 arquivos. Depois dos ajustes de apoio/água: **10 testes direcionados aprovados**, cobrindo importação, recorte entre setores, relevo, apoio, redução de escala e rotação completa.
- Núcleo de documentos/comandos: **12 aprovados**, incluindo atomicidade, referências, ciclos, bloqueios, polígonos e orçamento de processamento.
- Controller de autoria: **4 aprovados**, cobrindo histórico, perda de rede, gesto e sincronização externa.
- Serviço: **7 testes unitários** e **3 de Postgres real aprovados**. Dois operadores, compare-and-swap, retries, histórico, aplicação, fila, dono da sessão, fechamento e limpeza de registros efêmeros.
- MCP real via stdio: **2 aprovados**; publicação das sete ferramentas, autenticação e rejeição de comandos inválidos antes do serviço.
- Gateway: **6 testes direcionados aprovados**, incluindo rotas administrativas. Admin: **2 testes direcionados aprovados**, incluindo lista de operações e validação de arte privada.
- Tipagem dos sete pacotes envolvidos e build do runtime aprovados. Biome e `git diff --check` sem problemas nos arquivos da tarefa.
- Chrome dedicado: criar cópia, editar X do poço, desfazer, avatar e retorno; zero erros de página.
- Integração real: composição por comandos, capturas, pedido vencido recusado, lago/ponte transformados e desfeitos, dois clientes sincronizados, dia/noite, movimento, reabertura e aplicação da revisão; zero erros de página.
- Três ciclos editar/testar/retornar: **249 geometrias e 47 texturas** nas três amostras, **60 FPS** no enquadramento medido. Não são medições em aparelhos físicos nem promessa de FPS em todo o acervo.
- Regressão final no `/macro`: revisão 7 lida pelo servidor, avatar, opção de reconstrução da ponte, referência anterior, pincel por mouse com três carimbos, desfazer e Esc sem gravar; toque emulado; zero erros de página.

## Correções da revisão própria

Corrigidos: liberação durante montagem pendente, morph targets das instâncias, dimensões de catálogos com formatos diferentes, hash de arte, apoio relativo da ponte à água, escala decrescente no manipulador, caixas de seleção, referências de água, ocultação herdada, apoio de modelos inclinados, retorno da câmera, sessão da aba, confirmação idempotente, limite de hierarquia/amostragem e retenção de capturas expiradas.

O ensaio pelo mouse reproduziu um erro no preparo assíncrono de shaders quando a prévia substituía materiais antes de a consulta de compilação terminar. No runtime de autoria, a preparação agora termina na mesma tarefa do primeiro render; a repetição passou. O preparo paralelo do jogo estático foi preservado. Não houve relaxamento de testes nem edição permanente dos GLBs.

## Dependências de ativação remota

O acervo local contém **3.218 modelos**, 18 origens, aproximadamente 885 MiB; zero dependências externas pendentes no preparo. A tentativa de publicação no R2 retornou **HTTP 403**. Nenhum sucesso de upload foi presumido. Arte e credenciais permanecem fora do Git.

Para outro computador usar a biblioteca, precisa preparar o acervo privado localmente ou ter o armazenamento privado publicado. A plataforma precisa das migrações do serviço, do manifesto de catálogo registrado e do runtime publicado com `CENARIOS_RUNTIME_URL`. Não foi realizado deploy remoto. Nenhum teste em celular ou Chromebook físico nem aceite artístico humano foi declarado.

[Guia de uso, instalação e agentes](../../molda-cenarios.md).
