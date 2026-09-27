# Revisão do documento bbmodel animado — lote 209

Núcleo, worker, oficina e review concluídos em 09/09/2026. Evidências finais abaixo.

## Integração e escolhas

O importador completo agora conecta a conversão privada dos lotes 198–207 e os
envelopes conservadores do lote 208 ao mesmo candidato nativo. Usa o mapa de IDs
da hierarquia real, não uma segunda atribuição de identidades. Conversão, limites
e inclusão do relatório precedem seleção/decodificação dos recursos de imagem.
Falhas não devolvem um candidato parcial. A leitura nativa estrita continua final.

`remainder.animations`: reject (padrão), omit (cópia estática opaca) ou convert.
`remainder.controllers` é uma escolha separada reject/omit. Seu padrão é omit
somente quando a escolha antiga animations=omit foi usada, preservando esse
comportamento; convert não implica omitir controladores. Nenhum controlador é
interpretado/executado. A cobertura de remainder delega os clipes ao pipeline
completo quando convert é escolhido; não é uma aprovação isolada dos conteúdos.

`clips` recebe as nove opções estritas do lote 207, verificadas antes do arquivo
mesmo no caminho estático/vazio. Adaptação matemática continua explícita; não
habilitar implicitamente descarte de metadados, campos ou movimentos inteiros.
Erros de opções do pipeline ganham o prefixo options.clips.

## Relatório e worker

O relatório tem uma seção própria `animations`: null no caminho estático ou
fonte/conversões/políticas/contagens/bounds. Conserva motivos tipados de omissão,
bindings e constantes problemáticas, migrações, pre/post, escala zero, underflow,
duração/peso/repetição e primeiros caminhos dos campos descartados. Estes caminhos
são exemplos iniciais; as contagens não constituem uma lista completa de caminhos.
Textos entram no mesmo orçamento de 4 Mi caracteres UTF-16 das outras etapas.

O leitor do worker recebe objetos desconhecidos, valida variantes fechadas e
devolve objetos próprios. Catálogos de códigos são exaustivos contra os tipos
produtores. Conferências incluem opções do pedido, custos recalculados, contagens
de origem/trilhas/chaves, UUIDs únicos/ordem, identidades de clipes e grupos,
duração/FPS/loop, canais, tamanhos das agendas, políticas de descarte, pre/post,
migração e limites locais F32. Faz preflight conjunto de cabeçalhos das trilhas
antes de descer aos detalhes. Não percorre subárvores arbitrárias da origem.

Bounds são recalculados sobre o candidato nativo validado e comparados ao relatório,
sem reler arquivos ou avaliar curvas de origem na thread receptora. É conferência
de transporte, escolhas e consistência nativa, não prova criptográfica da origem
ou equivalência visual ao Blockbench. Os três tokens, cancelamento, revisão,
prévia e adoção transacional anteriores não foram afrouxados.

## Review e evidências parciais

- Primeira integração estática encontrou regressão (5612d8): animations ausente
  virou lista vazia. Corrigido no produtor com inclusão condicional do campo;
  preservado o teste anterior, não adaptado ao comportamento errado.
- Tipos iniciais encontraram parâmetro numérico inferido como literal 4096 e
  animações opcionais no domínio nativo. Anotação numérica e normalização única
  da lista opcional no leitor, sem casts/supressões.
- Três versões reais passam por arquivo -> documento -> protocolo -> player ->
  GLB verificado pelo validador Khronos. Fonte/bytes não mudam; mutações posteriores
  no resultado original não alteram a cópia recebida.
- Controladores separados, omissão estática opaca, fonte vazia, escolhas inválidas,
  omissão atômica mantendo o índice do próximo clipe e overflow mundial antes de
  recurso ausente. O teste inicial de recurso não alcançava bounds por não definir
  lados da textura; fixture passou a declarar lados explicitamente, sem relaxar gate.
- Adulterações de estruturas/contagens/IDs/políticas/chaves/bounds, opções estáticas
  recebendo movimento, cabeçalhos excessivos antes dos detalhes e texto excessivo.
  Pre/post, metadados, campos não mapeados e escala zero chegam com relatório próprio.
- Onze motivos reais de omissão de clipe cobertos. Esse teste expôs caminhos de
  metadados em colchetes recusados (3c724c). Leitor passou a aceitar os dois caminhos
  produzidos, mantendo vínculo ao índice do clipe. Verde: 12/0 (baaf25).
- Orçamento agregado: produtor e receptor aceitam seção animada + 63 caminhos de
  65.536 caracteres, e recusam a inclusão seguinte; não há orçamento separado que
  permita dobrar o limite. Limite exato estático preexistente continua testado.
- Focal final **251 passes, zero falhas, 9.640 asserts, 16 arquivos, 9,24 s**
  (06aca0). Tipos finais exit 0 (400bd2/f9afe4), Biome **1.071 arquivos**, exit 0
  (f835cc). Primeira integral **2.618 passes, uma falha**, 342 arquivos, 164,17 s
  (bd7448): a UI exige representação de todas as opções normalizadas. As nove
  opções de clipe e controllers ainda não estavam representadas. Corrigir a UI
  no mesmo lote, sem excluir novas opções do teste ou fechar uma entrega parcial.

## Limitações e próxima entrega

A integração da interface passa a fazer parte deste lote: escolhas e resumo de
movimentos, reutilizando a prévia com player e o consentimento/undo. A escolha
antiga da UI juntava movimentos/controladores; o novo controle separará ambos,
sem assumir descarte de controladores quando opções já normalizadas mudam de modo.
Não houve ativação pública, mudança do formato público 1, benchmark, browser/GPU,
toque/hardware ou homologação infantil. Rejeição conservadora não é prova de
overflow real; adaptação por amostras não garante fidelidade entre chaves.
Camadas ativas, PBR completo e controladores continuam fora desta conversão.

## Integração da oficina e segundo review

- Intenção: criança de 9+ trazendo uma criação de outra ferramenta para montar,
  pintar e experimentar poses sem perder o trabalho aberto. Domínio: peças,
  grupos/pivôs, poses, quadros, cópia original, prévia e desfazer.
- Usar o sistema visual existente: céu suave, branco, tinta, azul de ação e navy
  no tema escuro, com cores semânticas já disponíveis. Superfícies/bordas mld,
  fonte herdada Nunito e títulos em negrito, grade de 4 px e controles >=44 px.
  Sem paleta/fonte novas, sombras extras ou animações decorativas.
- Três escolhas explícitas de movimento; controladores continuam separados.
  Ajustes de conversão ficam recolhidos e só aparecem no modo convert. A sugestão
  de adaptação por amostras é inativa até escolher “Trazer e adaptar”. Nenhuma
  omissão vem consentida por padrão. Todos os oito enums de clipe e FPS 1–120,
  além dos dois controles de remainder, possuem representação real.
- Reutilizar os controles da plataforma e o mecanismo de revisão/adoção. Extrair
  renderização dos descritores para um componente compartilhado, não duplicar os
  handlers. Sem novo efeito para sincronizar escolhas, source parser no render,
  biblioteca de formulário ou interface paralela.
- Resumo por movimentos, avisos de amostras/pre-post/zero/underflow/descarte,
  nomes próprios também para clipes omitidos e motivos em português. `sourceName`
  foi incorporado ao relatório tipado/produtor/worker, com validação e orçamento,
  para não identificar uma omissão só por UUID ou posição. Nome vazio/null conserva
  sua representação no relatório e recebe rótulo de fallback apenas na UI.
- Lista longa/JSON bruto como primeira leitura -> cinco movimentos por página,
  todos acessíveis por botões nativos anteriores/próximos e contador anunciado.
  Não esconder os itens depois de um limite fixo. A tentativa de região com rolagem
  e tabIndex esbarrou nas regras de acessibilidade; substituir por paginação sem
  rolagem aninhada, em vez de remover acesso por teclado ou suprimir as regras.
- A recusa do produtor agora usa os mesmos motivos legíveis da revisão. O relatório
  compartilhado aceita texto de estado vazio específico: não afirmar “nenhuma
  adaptação” quando apenas os movimentos foram adaptados. Outros formatos conservam
  o texto e comportamento padrão.
- Teste de FPS corrigido para efetivamente reenviar o valor controlado a cada evento:
  sem atualização do pai, escolher o valor original não emite mudança no React.
  Nenhuma mudança de produção para simular callback inexistente. Teste de undo
  confere todo o conteúdo e a data atualizada, não exige restauração de timestamp
  que o histórico intencionalmente renova.
- Fluxo de tela real com worker de teste: erro explicado sem candidato, escolha de
  omissão, resumo, playback/seek, download contendo seção animada, mudança de FPS
  que elimina prévia e aceite anterior, nova revisão, commit único, undo/redo e
  descarte dos renderers. Não é prova de rasterização GPU.
- Fonte com 26 clipes percorre todas as páginas sem mais de cinco itens montados;
  nome com tag script é texto, não markup. Fonte vazia, clipe sem trilhas e avisos
  produzidos por metadados/pre-post/zero/sub-F32 também testados.
- Tipos finais desta etapa exit 0 (01dae5/ef7e2a); Biome **1.076 arquivos**, exit 0
  (5ff90c). Focal integrado **240 passes, zero falhas, 7.365 asserts, 17 arquivos,
  12,81 s** (151cb6/a2a0ed).

## Verificação final

- Segunda integral **2.623 passes, zero falhas, 8.346.084 asserts, 343 arquivos,
  163,43 s**, exit 0 (e6808d). O contrato de cobertura integral das opções da UI
  está preservado e passou; não excluir opções para obter verde.
- Vite **1,18 s**, exit 0 (bcb317). Worker bbmodel 171,29 -> **206,72 kB**;
  painel lazy 46,47 -> **73,02 kB**, pois conversão/validação de clipes e novos
  controles agora estão no caminho usado. Workers glTF 182,98/OBJ 157,51 kB e
  index 360,81 kB mantidos. CSS 53,86 -> **53,96 kB**. Three 579,29 kB ainda com
  aviso de tamanho. Não confundir números de build com benchmark de desempenho.
- Kids exit 0 (a29e79): compilação **7,8 s**, tipos **10,0 s**, **59 páginas**
  em 782 ms. Diff final exit 0, somente os três avisos CRLF preexistentes.
- Ausência de avisos act nesta rodada não encerra a investigação do lote 203.

Sem revisão visual declarada: nova tentativa do Browser de conectar à oficina em
5198 retornou “No browser is available”. Troubleshooting oficial consultado, sem
reiniciar runtime nem substituir por Playwright/CDP externo. Registrar isso como
limitação de evidência visual, não falha funcional comprovada nem homologação.
