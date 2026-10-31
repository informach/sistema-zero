# Migração do Rive para ediSVG

## Objetivo e autorização

Em 31/10/2026 a dona autorizou ajustar o ediSVG, exportar todos os projetos editáveis enviados,
testar e substituir o Rive no Sistema Zero. Pediu implementação profissional e desempenho como
requisito. A proposta de exportação Player web e de motor compartilhado foi aceita nessa autorização.

O levantamento inicial está em `.audits/2026-10-31-rive-para-edisvg.md` no worktree principal.
Ele observava eb9095b7; a atualização confirmada do ediSVG é 50c117fb, projeto v25 e blueprint v14.
Não reutilizar como atual a medição do runtime v13. Medir a versão final novamente.

## Árvores e limites

- Sistema Zero: worktree `C:/Users/tocha/projects/sistema-zero-course-layout`, branch
  `feat/edisvg-system-zero`, base 9e43c6afa.
- ediSVG: worktree `C:/Users/tocha/projects/informach-apps-edisvg-export`, branch
  `feat/edisvg-player-web-export`, base 50c117fb. Seguir AGENTS.md da raiz e apps.
- Originais: `C:/Users/tocha/Downloads/ASSETS-20261031T181750Z-1-001/ASSETS`. Leitura somente.
  Existem 12 arquivos e 11 conteúdos únicos. Registrar SHA-256 e verificar preservação no fim.
- Não alterar `.env`, workflows, Blender ou GLB. Testes de banco apenas em base local descartável.
  A migração operacional futura de mídia só acontece após validar as correspondências reais.
- Preservar as alterações de outras sessões e `.claude/settings.local.json` do outro repositório.

## Arquitetura escolhida

Exportação declarativa `.edi-animation.json`, com identificador e versão, documento compilado,
viewBox, entrada inicial, metadados acessíveis e contrato de controles. Nenhum JSX/HTML/script de
upload é executado. Reutilizar o compilador e o interpretador do edi-motion, sem um segundo motor.

Um módulo de player compartilhado no Sistema Zero usa o motor DOM versionado do ediSVG e um
adapter React compatível com o React instalado. Os artefatos de runtime e de validação pura são
gerados juntos, pinados por origem e SHA, com licenças. Não importar outro monorepo por caminho
absoluto no produto nem duplicar runtime por desenho. O pacote não depende de Electron ou licença.

Dados de mídia e player separam identidade imutável da arte da sessão mutável. Cache compartilha
downloads e dados validados; cada montagem tem seu próprio relógio, entradas e descarte. Fora da
tela, aba oculta, pausa e menos movimento interrompem quadros. Manter reserva estática e dimensões
antes da carga. Não usar estado React por quadro.

## Lotes e verificações

### 1. Projetos e baseline

- [x] Abrir todos com parseProject e compilar as pranchetas no motor atual, sem modificar originais.
- [x] Identificar prancheta e animação corretas de cada projeto, incluindo nomes repetidos e cópia.
- [x] Renderizar pranchetas reais em navegador e guardar contatos, medidas e hashes de referência.
- [x] Inventariar referências Rive persistidas, por curso/módulo, somente leitura.
- [x] Conferir a arte da fala. Não substituir sincronia de boca por uma animação arbitrária de aceno.

Observação real: várias pranchetas `artboard-main` estão vazias, e o desenho está em outra
prancheta chamada `0`. O baú já possui a máquina `Baú`, a entrada booleana `aberto` e os estados
Fechado/Abrindo/Aberto. Preservar essa máquina, sem inventar um segundo controlador. Os demais
projetos não declaram entradas ou máquinas. A seleção e os controles precisam ser explícitos e
testados; não exportar a prancheta vazia por um padrão acidental. Não foi enviado projeto de fala:
produzir uma variante editável com boca controlada e provar tocar/pausar/terminar antes de usá-la.

O escopo cobre Admin, Comunidade Kids e Comunidade adulta. Inclui os usos estáticos do Zappy e
as reservas do baú fechado e aberto. A exportação produz a imagem de reserva correspondente à
arte; manter imagens estáticas onde hoje são usadas por desempenho. Um único player compartilhado
atende as três interfaces. A aparência e os temas de cada interface continuam próprios.

A exportação para outros aplicativos é genérica, sem dependência do Sistema Zero. A opção
`Baixar player para outro aplicativo` entrega módulos, tipos, exemplos e licenças em um ZIP.
O fluxo cotidiano no Sistema Zero é exportar um arquivo, enviar no Admin, conferir e salvar.
O Admin extrai e valida arte e reserva, envia ao R2 e persiste referências imutáveis por revisão.

### 2. Exportador ediSVG

- [x] Contrato versionado e validação pura no edi-motion, com limites de bytes e custo expandido.
- [x] Exportador que usa compileInteractiveArtboard, a prancheta/entrada escolhida e o mesmo renderer.
- [x] Opção real na interface e payload nativo, sem confundir com JSON do projeto editável.
- [x] Controles públicos com referências verificadas e erros claros para ambiguidades.
- [x] Recursos e imagem de reserva produzidos pelo pipeline existente, sem descarte silencioso.
- [x] README gerado usa versão vigente; artefatos do motor e licenças têm origem verificável.
- [x] Testes de contrato, exportação determinística, rejeições e fluxo real de exportar pelo app.

### 3. Player e artes no Sistema Zero

- [x] Player e validador compartilhados, com React do consumidor, sem elevar versão por suposição.
- [x] Tipos, entrada/saída, callbacks, lifecycle e cancelamento cobertos por testes causais.
- [x] Exportar cada projeto pelo exportador real, guardar a correspondência original/exportação.
- [x] Preparar controles do baú como lógica de arte usando o mesmo modelo/compilador.
- [x] Preparar e provar a fala do Zappy e todas as expressões, com alternativa estática.
- [x] Testar desktop, celular emulado, movimento reduzido, várias instâncias, troca e descarte.

### 4. Cadastro e persistência

- [x] Referência de animação neutra no core/Members, DTOs, repositórios e views.
- [x] Migração de schema pelo fluxo Drizzle, preservando referências até sua substituição real.
- [x] Uploader e prévia Admin usam o formato novo e o mesmo player, com validação no servidor.
- [ ] R2/CORS/cache/revisão e mensagens no tema atual. Sem uploads executáveis.
- [ ] Mapear e migrar cada referência real com backup e comparação antes/depois, sem perder arte.

### 5. Consumidores e retirada do Rive

- [x] Zappy: expressão, voz tocar/pausar/terminar/falhar, boca fechada ao parar, menos movimento.
- [x] Módulos: animação correta, laço, encaixe, primeiro quadro, pré-carga, pausa e falha.
- [x] Baú: servidor autoriza antes, abrir uma vez, estado final, revisita, nenhum prêmio pelo evento gráfico.
- [ ] Remover componentes, rotas, tipos, variáveis, dependências e WASM Rive após migrar os usos reais.
- [ ] Atualizar testes para a implementação real, mantendo as garantias comportamentais existentes.

### 6. Medição, revisão e entrega

- [ ] Comparar bytes frios/quentes e tempos com as mesmas artes e janelas.
- [ ] Medir tempo de quadro, CPU, memória e atividade parado/oculto, sem promessa de ganho por formato.
- [ ] Testes e typechecks proporcionais dos pacotes, builds reais, lint e diff integral nos dois repositórios.
- [ ] Review de regressões de acesso, resgate, navegação, acessibilidade, áudio e cache.
- [ ] Commits revisados e integração preservando os avanços de staging, com novo freeze para a entrega.
- [ ] Implantação somente da versão final qualificada, conferindo configuração, schema e artefatos.

## Evidências iniciais

Cache no worktree principal: `.cache/deploy-local-20261031-1507/edisvg-assets-inventory.json`.
Os 12 projetos foram carregados e suas pranchetas compilaram com blueprint v14. A qualificação
`apps/edisvg/.cache/edisvg-qualification/assets-r2` no worktree do exportador gerou 15 exportações
reais com PNG incorporado, todas com mudança visual após avanço no player público, sem erros de
página ou console. Há capturas de desktop e largura 390; esta última ainda não é emulação de toque.
Originais tiveram hashes conferidos. A primeira tentativa recusou corretamente exportar apenas
um clipe do baú que perderia a máquina; o negativo está preservado em assets-r1.

O inventário remoto somente leitura encontrou seis referências Rive em staging e uma em produção.
A migração dessas referências exige novo inventário, correspondência exata e comparação antes/depois.
O schema deve ser expandido antes da troca do código e contraído após retirar o consumidor antigo;
não apagar a coluna antiga enquanto a versão ativa ainda a utiliza.

## Checkpoint atual da implementação

Esta seção substitui os checkpoints iniciais. A implantação desta migração ainda não ocorreu.

- ediSVG: exportador e player portátil commitados em 2fcead2b. Dois scripts de preparação das
  variantes editáveis continuam em revisão. Sem publicação de instalador ou tag.
- 12 originais preservados, 18 variantes exportadas e verificadas, com fontes/hash/reserva e
  proveniência. A fala e o baú aberto são derivados editáveis, sem redesenhar os originais.
- Sistema Zero: player compartilhado, sete artes embutidas e reservas WebP lossless com RGBA
  idêntico ao PNG. O runtime não repete a reserva PNG no JSON. Três apps sincronizam o mesmo manifest.
- Admin: formulário ligado, upload e prévia autenticada implementados, validação dos bytes,
  armazenamento em par e rollback de novas chaves. Testes HTTP locais cobrem os boundaries reais.
- Members: referência completa em HTTP, repositórios, clones e views. Migration 0143 gerada,
  ainda não aplicada. O código novo não depende da coluna Rive antiga.
- Retirados os componentes, as rotas e as dependências Rive atuais e os cinco arquivos .riv
  públicos. SQL/snapshots históricos permanecem. Imagens estáticas antigas podem atender páginas
  já cacheadas até vencerem; nenhum consumidor atual as usa como pose do produto.
- Ensaios com React StrictMode e Chrome: r9 tem 11 cenários, mais RED/GREEN separado de cookie
  same-origin da prévia autenticada. Devem ser repetidos no freeze final.
- CSS real: `.cache/edisvg-themed/run-r3.log`, 19/19 cenários, com trilha em 320, 390, 430, 768
  e 1440 px, quiz em duas densidades e boca por pixels. A tentativa r2 detectou altura extra
  na caixa 9/8 e erro do oráculo contando o fundo do tema. Ambos corrigidos, negativos preservados.
- Members: seleção de conteúdo/acesso/arte com 59 testes e 212 asserções passou após a retirada
  do campo legado. Kids baú/trilha/reserva: 22 testes/85 asserções; porta: 6/30.

Pendente: full checks/builds, medição final, ensaio de DDL em banco descartável, migração real
R2+referências com CAS, review integral, integração e implantação. O diálogo nativo de Salvar do
Windows ainda não está qualificado; os fluxos web e IPC são provas distintas.

## Integração e implantação autorizadas

Pedido de 31/10: Sistema Zero deve ser integrado ao staging local. ediSVG deve ser integrado ao
main local de informach-apps. No freeze de implantação incluir **todos os commits do staging
local**, não somente os commits desta frente. Conferir novos commits e preservar WIP não
commitado de outras sessões. Não publicar instalador ediSVG automaticamente.

Ordem operacional para não quebrar a versão ainda ativa:

1. Congelar e revisar a composição final de staging. Conferir infra, mídia e migrações pendentes.
2. Expandir com 0143: adiciona animation, mantém rive_url. Fazer backup das linhas de mídia.
3. Upload de cada exportação correta no R2 do ambiente; validar hashes e CORS; preencher animation
   apenas onde o id, rive_url e animation anteriores ainda correspondem ao inventário aprovado.
4. Implantar o backend novo, que não seleciona rive_url, e os frontends da mesma versão. Conferir
   versão/saúde, módulo real, prévia, voz, baú e estáticos em staging e produção.
5. Só depois de todas as réplicas antigas saírem, gerar a próxima migration DROP a partir do
   snapshot 0143 e aplicar. Não enviar um DROP junto com o add antes de retirar o backend antigo.
6. Retirar a variável NEXT_PUBLIC_KIDS_CHEST_RIVE_URL dos dois ambientes e do preserve de IaC
   na onda de contração. Até lá o preserve existente evita uma exclusão de configuração antes
   de retirar os consumidores ativos. O código novo já não a lê.
   Guardar recibos de antes/depois. Não chamar esta preparação de implantação concluída.


## Revisão e gates finais locais

Revisão em docs/qa/2026-10-31-edisvg/review.md. Três builds Next, tipagens dos consumidores,
Members/player e testes principais passaram; detalhes e limites estão nos recibos. O staging
local foi incorporado até ff4394aa9, incluindo L7e, L7f e L7g. Esses commits posteriores só
alteraram desafios/documentação/testes, sem mudar os fontes de produção dos aplicativos buildados.
Na implantação, conferir novamente o corte para incluir todos os commits do staging local.

O ediSVG foi integrado ao main local em 52aff371 e o ensaio nativo em 2f506b63. O player do build
final manteve o SHA registrado no vendor. A biblioteca ZIP exportada está no acervo versionado.
Nenhum instalador foi publicado por esta frente.

A conferência remota somente leitura foi repetida: seis módulos em staging, um em produção,
nenhum bloco de aula contendo referência .riv. Os dois serviços estão na migration 0142,
com histórico SQL byte-equivalente ao prefixo local. Preparados planos de expansão e mídia,
com backup das sete linhas, hashes e correspondência explícita. Ainda sem escrita remota.
A expansão usa o migrador Drizzle real e o journal próprio; não marcar migração manualmente
nem alterar uma migration histórica. Um pacote temporário pinado permite aplicar a 0143 antes
da troca dos consumidores, sem executar SQL pendente não revisado.
