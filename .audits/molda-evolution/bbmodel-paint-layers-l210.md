# Lote 210 — camadas bbmodel editáveis

Estado: implementação integrada, verificada e revisada. Não é aceite
das nove fases nem ativação pública do domínio v2. Referência e intervalos em
bbmodel-layer-research.md; nenhuma implementação GPL copiada ou executada.

## Contrato implementado

- Leitura de todos os metadados conhecidos das camadas ativas antes da seleção;
  cabeçalhos e texto agregado root+camadas antes de números. Inativas continuam
  opacas, conforme o contrato anterior. PNGs não são inferidos de tamanhos anotados.
- Escolha images.layers reject por padrão / molda-layers explícita. O subconjunto
  preserva ordem inferior→superior, nomes, visibilidade, opacidade e bytes de todas
  as camadas, inclusive ocultas/zero; PNG do tamanho inteiro, offset zero, escala
  unitária e mistura default. Até 32 camadas por imagem. Sem flatten/crop/padding.
- image_data/in_limbo de sessão recusados sem ler conteúdos. Campos não mapeados
  usam a decisão de remainder e registram cada caminho, nunca valores executáveis.
- Fonte raiz continua sujeita à seleção explícita embedded/arquivo e às regras de
  caminhos. Dimensões/layout vêm dela, mas a pintura editável não usa seus pixels.
- Recursos raiz+camadas compartilham limites de contagem/bytes. O núcleo raster foi
  separado em planejamento e execução, mantendo decodeRasterBatch como composição
  dos dois. Todos os cabeçalhos e o orçamento decodificado conjunto (32 MiB) são
  verificados antes da descompressão. Cópias autorais por alias também são somadas
  antes da descompressão (32 MiB), independentemente da deduplicação dos PNGs.
- Raiz e URI de camada iguais ainda podem ter cópias transitórias separadas. Os
  limites não representam RSS/pico total. Não há alegação de ganho de desempenho.
- Conversão usa cópias próprias RGBA bottom-up; 16→8 bits exige escolha existente.
  Nomes e tamanhos anotados divergentes são preservados no relatório. Composição
  nativa explicitamente adaptada, não promessa de identidade com Canvas.
- Novo estágio paint-layers fechado no worker: políticas, IDs/ordem, nomes, opacidade,
  visibilidade, dimensões, precisão e cobertura cruzados com o documento validado.
  Sem relatório, só é aceita a imagem plana produzida pelo contrato anterior.
  Origem/revisão/pedido, relatório agregado, revisão e adoção transacional mantidos.
- UI expõe a nova escolha na pintura, avisa sobre mistura nativa e permite conferir
  imagens paginadas (5), todas as camadas (até 32), nomes, força e visibilidade.
  Alterar opção revoga prévia/aceite. Um único undo para adoção, sem nova fonte de
  verdade, armazenamento ou renderer. Controle de opções continua exaustivo.

## Revisão e evidências parciais

- Tipos detectaram união estrutural que escondia o tipo paint e o catálogo exaustivo
  de variantes ainda incompleto (5b6550/6ec8c6). Variável dedicada para decoded de
  camadas e catálogo ampliado; sem casts ou afrouxamento de cobertura.
- Comparação de pixels no teste adaptada a valores após incompatibilidade de
  generic ArrayBuffer no matcher (41b744/72d6d4); mesmas amostras verificadas.
- Tipos passaram 611e02/72a7d3, antes da última revisão de UI/testes.
- Primeiro focal cfac5d: 188 passes, uma falha no teste antigo de leitura do material
  da prévia. Reprodução sem alterar produção: b61f48, 14 passes/1 falha em 15
  repetições, corrida entre estado parsed/ready e entrega do documento ao renderer
  por efeito. O teste aguardava apenas status textual e acessava documents vazio.
  Corrigida a espera pela entrega real, preservando todas as asserções de material,
  sem sleeps, extensão de timeout ou mudança de renderer para satisfazer teste.
- Browser indisponível confirmado no lote 209;
  não repetir tentativas sem mudança externa nem substituir por ferramenta proibida.

## Skills e limites

Execução sequencial, correção de causa raiz, testes de comportamento/ownership e
verificação antes de declarar conclusão. UI segue componentes nativos acessíveis,
paleta/tipografia existentes, controles de 44 px e divulgação progressiva; nova
seção não introduz um segundo sistema visual. Sem agents adicionais ou deploy.

Persistem: misturas especiais/offset/scale/imagens parciais e sessões não importados;
PBR/clipes avançados, integração pública/Studio, hardware/GPU/toque e usabilidade
infantil não homologados. Fases não estão concluídas.

## Verificação final

- Espera real da prévia: 30 repetições, 30 passes/zero falhas, 1.232 asserts,
  20,13 s (813c8e/131f63). Não fecha a investigação de act do lote 203.
- Focal completo: 207 passes/zero falhas, 69.362 asserts, 14 arquivos, 10,05 s
  (2ea5c4/e96a58). Inclui 32 camadas, oito cópias RGBA 1024² no teto de 32 MiB,
  união de limites raiz/camada antes de inflate, misturas recusadas, versões
  4.9/4.10/5.0, GLB validado e PNG decodificado por libvips, worker e UI.
- Tipos finais fa9364/503ef0 exit 0; Biome 1.086 arquivos f8d67f exit 0.
- Integral: 2.642 passes/zero falhas, 8.346.341 asserts, 347 arquivos, 161,72 s
  (e01595/56eab3). Houve seis logs WebGLRenderer no ambiente sem contexto gráfico,
  durante MoldaApp.test.tsx; não suprimidos nem tratados como prova de GPU.
- Vite 1,30 s exit 0 (efd2e7): bbmodel worker 214,41 kB (antes 206,72), painel
  78,83 kB (antes 73,02); glTF 183,09/OBJ 157,62 kB após separar planejamento
  raster compartilhado. Index 360,81 kB; CSS 53,99 kB; Three 579,29 kB com aviso.
  São tamanhos de artefatos, não benchmark de interação ou ganho de desempenho.
- Kids aa5d1f/06d5a2 exit 0: compile 6,7 s, tipos 10,2 s, 59 páginas em 538 ms.
- Diff 3dbab6 exit 0, apenas os três avisos CRLF já existentes.

Próximo incremento: retomar a pendência de escopo de CSS da fase 2, com baseline,
preservação de utilitárias de produção e verificação dos dois consumidores.
