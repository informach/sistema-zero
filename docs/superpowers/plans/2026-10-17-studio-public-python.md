# Mural e página pública — JavaScript e Python

O usuário reafirmou que publicar Python precisa resultar num jogo jogável no Mural e em `/jogar`, inclusive sem login. A publicação é uma revisão explícita; editar o rascunho local não muda o jogo publicado. O acesso do visitante não depende do produto/nível atual do autor. Exclusão/moderação, desativação da publicação e revogação de runtime devem impedir novas execuções.

## Situação e decisões

`member-shell/routes/studio.ts` usa os leitores JavaScript para receber/servir snapshots e trata todo Pro como compilação web. `PublicPlayer` faz cast para Project JS e exige headers de compilação em qualquer Pro. `StudioProjectPlayer` só renderiza JS. Há histórico/CAS, reativação, desativação, fonte e limpeza durável já existentes em studio-runtime/publications.ts. Preservar essas funções e seus testes; Python não deve ser enviado ao compilador JavaScript nem aparecer como se tivesse passado sua validação.

Estender o modelo de publicação com discriminante explícito de artefato/linguagem. Revisões JS legadas continuam legíveis com sua prova de compilação atual. Revisão Python armazena fonte/material autossuficiente, receita Python/lock, identidade exata da distribuição aprovada e hash do pacote. Aprovação do ambiente Python não é prova de que o programa terminou com sucesso. Não fabricar `validated` de compilação JS para o Python. Reusar o histórico/CAS/idempotência/tombstone/limpeza existentes com a distinção de artefato aplicada na promoção e no resolve. A origem/URL não pode vir do projeto.

Para evitar dois regimes de atualização do Python, Clássico e Pro Python usam o mesmo registro durável de publicação e revisões. JS Clássico conserva sua leitura legada; JS Pro conserva seus artefatos compilados. Uma publicação não muda de linguagem, kind, projeto ou ambiente implicitamente; atualização exige identidade compatível ou nova publicação. Source sanitizado remove briefing, histórico do Zappy, vínculos privados e IDs pessoais de biblioteca em todas as quatro variantes, preservando bytes dos materiais e caminhos portáveis.

## Autorização pública

Resolver Hub-visible e revisão ativa/disabled pelo servidor em cada abertura/reinício. Buscar a fonte privada daquela revisão e validar o documento v3 com leitor sem perda. Gerar no servidor o sujeito compacto. BFF chama uma rota Members específica de runtime público, restrita ao caller interno autenticado, para aplicar catálogo/release/extensões/lock. A chamada interna não aceita aluno/Pro entitlement como substituto de visibilidade. O browser só identifica playId e revisão esperada; fonte, capabilities, catálogo e URLs enviados pelo browser não autorizam nada.

Members reutiliza StudioRuntimePolicy para o sujeito obtido pelo BFF. Público recebe execução/pausa autorizadas para a revisão, sem edição, instalação, exportação privada, REPL ou serviço nativo de linguagem. O contrato de decisão/contexto distingue leitor público de um ator autenticado; não inventar UUID de aluno para representar anônimo. Capacidade deve continuar vinculada ao digest do snapshot real e ao runtime exato. Limite e no-store no BFF; a distribuição executável imutável continua no CDN com cache, não é recompilada ou baixada inteira a cada autorização.

## Player e compartilhar

Dispatcher em StudioProjectPlayer por linguagem antes de entrar no player JS. Player Python monta somente executor/worker/iframe de jogo (sem Monaco, Blockly, LSP, WebContainer ou JS compiler), captura snapshot imutável e autoriza sua revisão antes do start/restart. Manter ref/foco do iframe, aspect ratio, fullscreen, gamepad/teclas, som, eventos de ready/error e cancelamento ao trocar playId/revisão. Mensagens vindas do runtime seguem as mesmas verificações de origin/source/session; perda de acesso destrói a execução e deixa uma mensagem útil. Turtle é 2D e usa Pinta; não carregar Molda/Raylib.

ShareDialog deriva captura e histórico por capacidade/linguagem. Python usa captura real do executor atual ou imagem escolhida pela criança, como permitido aos projetos Clássicos; não promete a capa verificada pelo compilador JS. Adapters de aula/sala/livre preservam suas elegibilidades e conteúdo autoritativo (aula/submissão e sala/revisão), incluindo Pro. Publicação Python não concede Pro livre. Metadados de remix informam linguagem, runtime e extensões sem confundir IDs JS/Python.

## Ordem e validação

1. Contratos discriminados e publicação durável: artefato Python, hashes/manifest, CAS/histórico/restore/disable/limpeza; regressão JS existente. Revisão independente.
2. Leitores BFF/sanitização/eligibilidade/authoritative snapshot/promoção e atualização; rotas internas de autorização pública e seus limites. Negativas de fonte/revisão/runtime/visibilidade/caller, idempotência e corrida moderação/promoção. Revisão independente.
3. Dispatcher/player Python e adapters/share/history. Prova anonimizada das quatro variantes: publicar, abrir em outra sessão sem login, jogar por teclado, editar draft sem alterar público, atualizar explicitamente, restaurar/desativar, ocultar/apagar e impedir restart. Chrome/Edge com runtime real e Pinta.
4. Medir bundle do player e inicialização/cache separadamente, com os gates originais; testes funcionais não encerram desempenho. Fazer full review do conjunto junto das demais integrações antes commit/merge local.

## Remix — complemento de execução

Conservar o comportamento JS e separar a cobertura Python por kind e identidade completa de runtime. Metadados do card são apresentação. Ao clicar, ler o snapshot público, validar Python sem descartar fonte e conferir discovery atual de criação livre (active, produto/paleta/Pro), seguida de autorização fresh de análise do sujeito compacto e digest real. Não usar o direito de continuar Pro existente como direito de criar um remix: a discovery de criação é obrigatória. Copiar não executa e não concede uma autorização reutilizável.

Importar com namespace explícito do perfil e guarda de geração antes/depois da validação e persistência; troca de perfil A→B→A, sessão encerrada ou unmount cancela requisições, toasts e navegação tardios. Copiar/duplicar/promover remove o vínculo privado de publicação, que é conservado apenas ao restaurar o mesmo projeto da conta. Testar Python Clássico/Pro, extensões homônimas JS/Python sem tradução, release retirado/revogado, mudança de direitos após carregar o Mural e sessão durante download. Revisão independente depois dos testes, antes da prova pública no navegador.
