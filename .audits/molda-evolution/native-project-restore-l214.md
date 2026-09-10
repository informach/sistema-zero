# Lote 214 — trazer cópia nativa de volta

Estado: implementado, revisado e verificado em 09/09/2026. Dentro das fases
aprovadas 2/3/8, sem ativação pública/cloud ou migração de produção.

## Intenção e desenho

A criança que baixou uma cópia .molda.json deve poder retomá-la pela tela inicial.
Uma ação secundária no grupo de criação abre escolha de arquivo, conferência e
confirmação. Nome e conteúdo do arquivo serão mostrados; guardar cria outra
identidade, sem substituir o projeto que originou a cópia. Catálogo/vazio continuam
o caminho principal. Reutilizar Dialog, Button, temas e prévia da oficina; sem novo
design system, tipografia, ilustração decorativa ou dependências.

## Contratos a implementar/revisar

- Somente documento nativo v2 já suportado pelo leitor interno. Não confundir com
  backup ZIP/galeria v1; futuro, inválido ou arquivo grande têm erro explícito e não
  passam por sanitização/descarte. Arquivo original nunca alterado.
- Preflight de bytes/profundidade/estrutura antes de JSON.parse e leitura nativa
  em worker cancelável. Reutilizar o leitor JSON limitado e coordenador de workers;
  verificar limites antes de copiar, sem memória compartilhada ou buffers destacados.
- Tarefa e revisão pertencem ao arquivo e namespace atuais. Escolher outro, cancelar
  ou desmontar invalida resultado. Prévia não é autorização para gravar.
- Confirmação gera ID novo, mantém conteúdo/nomes/vínculos internos e usa save CAS
  com expectativa nula. Erro mantém a revisão; commit já concluído não é removido
  quando a navegação é cancelada. Nunca usar ID do arquivo para sobrescrever disco.
- Testar codec completo com imagens/camadas/animação/skin, erros/limites, worker real,
  confirmação, cancelamento/races e persistência. Tipos/Biome/integral/builds no fim.

## Implementação/revisão parcial

- sceneProjectFile: UTF-8 estrito + preflight JSON compartilhado, 192 MiB de wire
  (mesmo orçamento do backup da galeria), profundidade 128 e 16 milhões de marcadores
  estruturais. Leitor nativo continua impondo referências, geometria, animação,
  skin, no máximo 20 mil camadas agregadas e 32 MiB de pixels. Documento decodificado
  também precisa caber no orçamento de galeria de 96 MiB. São tetos de entrada,
  não medição de pico de RAM. Arquivo grande/versão diferente/inválido têm erro tipado.
- Worker dedicado por tarefa com token próprio, cancelamento real, transporte fechado
  e validação da resposta; sem fallback síncrono de JSON. Cópia da entrada antes de
  postMessage preserva buffers do chamador. API de worker existente reutilizada.
- copySceneProject valida e produz conteúdo independente com ID/tempos novos e nome
  confirmado. Remove apenas miniatura derivada externa, com aviso na revisão. IDs
  internos/vínculos/UV/pinturas/clipes/skin permanecem; não substituir ID de disco.
- SceneProjectRestore lazy no Dialog da tela inicial, escolha de arquivo/nome,
  prévia/player existente, confirmação e erro com revisão preservada. Arquivo pode
  ser trocado durante a conferência; troca/cancelamento/unmount invalida leitura e
  worker. Durante commit, seleção/nome ficam desabilitados, mas sair é permitido.
  Commit autorizado que terminou continua na lista sem navegação tardia.
- SceneWorkshopHost compartilha saveNew entre vazio/template e restauração: mesmo
  CAS nulo e mesmas checagens de namespace/sinal antes de construir e após commit.
  Modal/rascunho não atravessam troca de perfil. UI/formatos públicos v1 intactos.

### Achados e testes

- 989c70: primeiro teste montou skin usando contrato de comando com id indevido e
  presumiu retorno status/document; fixture é contrato de bindSceneSkin. Corrigida
  montagem do teste usando binding real, sem mudar o domínio. 4ae883: 4/0, 66 asserts.
- Review detectou pixels SharedArrayBuffer aceitos pelo leitor nativo genérico;
  isso não é uma resposta estável para o novo worker. 19298f reproduziu a falha.
  Nova borda de transporte confere TODAS as camadas antes de clonar: Uint8Array de
  ArrayBuffer próprio inteiro, sem view parcial/backing oculto, custos conjuntos.
  Sem alterar leitor global nem introduzir casts/supressões. d22644: 5/0, 68 asserts.
- 23ad84: UI/host 8/0, 114 asserts. d5472f: focal 20/0 mas com aviso act novo no
  teste de cancelamento após commit. Diagnóstico aec631, com spy encaminhando log
  original e exigindo lista vazia, reproduziu 10 falhas/10. O teste aguardava só
  commit e lia IDB enquanto BroadcastChannel ainda atualizava a lista React.
  Corrigida espera pelo resultado visual real fora de act (e pelo carregamento do
  novo namespace), sem timers/flags/supressões. c68ca2/976128: 30/0, 480 asserts,
  23,91 s. Não é a pendência antiga de TextureEditor do lote 203.
- Focal final 4ab80d: **20/0, 553 asserts, seis arquivos, 5,18 s**. Imagens/camadas
  ocultas/RGB sob alpha zero/flipbook/animação/skin, fonte imutável, erro/limites,
  worker real e namespace/arquivo/cancelamento, foco e confirmar→nova criação→
  editar→desfazer→retomar sem alterar fonte cobertos. Prévia usa porta contratual
  sem GPU nos testes. Tipos 0d2742/2954f3 e Biome 249328 (1.116 arquivos) passaram.
- Integral cf17d5 em execução; builds e fechamento pendentes. Não afirmar lote
  concluído, homologação visual/toque/GPU ou conclusão de qualquer das nove fases.

O worker tira parse/conferência inicial da UI, mas a borda receptora ainda valida
  e copia o DTO e o CAS valida ao persistir. Seleção usa File.arrayBuffer limitada,
não stream. Não afirmar zero custo na UI, redução de RAM medida ou capacidade de
hardware a partir destes testes; perfis grandes continuam parte da fase 2.

## Fechamento

- Tipos 0d2742/2954f3; Biome 249328, 1.116 arquivos, sem erros.
- Integral cf17d5/e87d17: **2.685 passes, zero falhas, 8.346.867 asserts,
  360 arquivos, 162,70 s**. Sete logs de WebGL indisponível no teste de MoldaApp.
  Também houve cinco avisos act em ModelEditor.test (LoadedEditor, EditorTopBar
  duas vezes, FacePaintDialog e ModelEditor). Focal sem mudanças cebe67/c4acab:
  39/0, 260 asserts, 13,03 s, não repetiu avisos. Origem da interação de suíte
  ainda não demonstrada; não afirmar correção, causa preexistente ou supressão.
  Pendência distinta do aviso reproduzido/corrigido no teste novo deste lote.
- Vite 53cdea: exit 0, 1,48 s. Novo worker nativo 31,09 kB; painel de restauração
  lazy 5,45 kB. ScenePlayground 200,28→197,73 kB, mas surgiram chunks compartilhados
  (prévia 3,20 kB, sceneProjectFile 4,84 kB): não confundir redução de um chunk com
  redução total de download. Index 362,94→363,82 kB; CSS 53,64 kB inalterado.
  Workers bbmodel/glTF/OBJ inalterados e Three ainda avisa 579,29 kB >500 kB.
- Kids 7c7370/b9ab05: exit 0, compilação 18,0 s, tipos 12,5 s, 59 páginas/520 ms.
- Diff 694262: exit 0, mesmos três avisos CRLF anteriores.

Revisão final: nenhuma gravação por seleção/prévia; uma confirmação cria nova
identidade e preserva fonte. Lifecycle/namespace, erro/retry, foco, buffers, versões
e limites cobertos. Sem novas dependências, componentes de prévia/tema reutilizados,
botões em grupo com espaçamento e alvos existentes. Sem ativação pública ou cloud,
sem promessa de homologação visual/GPU/crianças. Recuperação de registros opacos ou
corrompidos do banco, blobs por hash e integração pública continuam pendentes.
