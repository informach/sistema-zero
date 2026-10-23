# L6A — arte, imagens e capturas (em implementação)

Estado: **aberto**. Não autoriza liberação, commit de conclusão ou avanço do checklist por presença de código. L0–L5 têm auditorias próprias; permanecem suas pendências de integração e liberação.

## Implementado

- Composição versionada com camadas de texto ligadas à copy, imagem e forma; Nunito incorporada, fontes do acervo por identidade, áreas protegidas, prévia e PNG pelo mesmo componente Remotion.
- Ajustes de montagem preservam toda a copy uma vez, rejeitam alegações literais novas, referências fora do contexto e alterações de camadas protegidas. Revisões e desfazer usam CAS. Edição de raster sem camadas conserva esse caráter; reconstrução é uma ação distinta.
- Seleção regional envia o recorte e recompõe pixels fora da seleção sem alteração. Originais imutáveis; imagens passam por estrutura de contêiner e decodificação completa, limites de tamanho e pixels.
- Biblioteca paginada por projeto com upload multipart web/desktop, retomada web por seleção do mesmo original e SHA-256 incremental, estados de conferência e vínculos de referência separados dos arquivos finais. A fila desktop aparece mesmo antes de o servidor receber o original.
- Captura usa API própria do Studio, geradores, runtimes e Blockly oficiais. Janela Electron isolada, sem preload/IPC/Node, permissões negadas, arquivos empacotados e rede externa bloqueada. Fontes canônicas incorporadas; imports Three locais. IA entrega ações declarativas limitadas, não código. Fonte/hash/plano são registrados; resultado entra na montagem pelo executor normal.
- Mídia incorporada excessivamente grande pode produzir um derivado WebP sem perda, com hashes e registro da transformação; o JSON original permanece intacto e os limites do Studio não são ampliados.
- Correções transversais: cancelamento imediato e fila durável para confirmação no servidor; recuperação de cache corrompido/ausente; compartilhamento de downloads concorrentes da mesma identidade.
- Quatro receitas nativas derivadas das montagens P01/P07/P34: abertura, demonstração, comparação e relato. Escolha explícita na bancada; paleta, espaçamento e Nunito incorporados, identificação protegida. Não equivalem a uma importação integral ou reprodução pixel a pixel do HTML legado.
- Contexto de execução inclui manifestos confirmados das referências (nome, tipo, dimensões, hash), com limite de 100 e isolamento por projeto. Contextos sem mídia conservam o hash v1. Pedidos antigos com mídia exigem nova preparação se sua base não incluía os manifestos.
- Mudança de copy/montagem recusa reaproveitamento silencioso do mesmo arquivo final. Copy nova retira o final antigo e, no raster legado, conserva-o como referência; desfazer restaura a edição exata. Importação rejeitada limpa somente a cópia temporária e preserva o original.

## Evidências locais

- `packages/marketing-desktop/.cache/art-proof/`: P01/P07 com Codex e P34 com Claude, propostas JSON e três PNGs reais, inspecionados; texto excessivo bloqueado por preflight. Prova ocorreu antes da extensão nullable de raster; repetir contrato final na revisão integrada.
- `.cache/studio-proof/evidence.json`: oito capturas de P07 antes/depois, P08 e P29, runtime e blocos; hashes de origem, metadados, planos, transformações e zero erros de console. Planos nativos Codex/P07 e Claude/P29. P08 agora chega à batalha real e captura o dragão vivo abaixo de metade da vida, operando teclado/mouse e diagnósticos de leitura do Studio, sem mudar regras ou variáveis do jogo. O executor verifica custo das ações, alvo e condição final.
- Studio: 240 testes, 1.568 asserções em runtime e preview; zero falhas após os diagnósticos adicionais. Os 29 testes de fontes/captura anteriores também estão registrados.
- `.cache/recipe-proof/evidence.json`: cinco receitas PNG 1080×1350, duas propostas novas pelas assinaturas (P01/Codex e P34/Claude), protegidos/copy conferidos e imagens inspecionadas. P07 usa capturas v3 existentes como referência; P08 usa a captura nova. P29 é explicitamente rascunho: fonte/copy/imagem familiar conservadas, mas a captura inicial não demonstra seguidores e não libera a peça.
- Workbench: 14 testes, 51 asserções; inclui multipart interrompido retomando somente parte faltante, identidade idempotente e restrição de destino.
- Desktop: três testes de imagem/mídia, 1.211 asserções; região pixel a pixel, original intacto, tipo falso/truncamento recusados e reencodificação sem alteração do programa/pixels.
- PostgreSQL descartável: suíte de execução ampliada para 21 testes/75 asserções, incluindo manifestos, invalidação de final e receitas autorizadas. As provas anteriores de workspace/mídia incluem biblioteca 53 arquivos/duas páginas, sem duplicação nem acesso entre projetos.
- Download/cache: resposta curta retoma, servidor sem Range reinicia, hash inválido é descartado e cache ausente/corrompido é recuperado; os dez testes combinados de limites, imagem, download e schema nativo passaram (1.255 asserções). Depois, a regressão de limpeza de importação passou em cinco testes/25 asserções.
- Novo schema de transporte de arte exige propriedades explícitas/nullable para o Codex e valida novamente o contrato canônico depois de converter. O teste detecta futuras propriedades opcionais incompatíveis; não altera revisões antigas. Prova real Codex e Claude passou após a correção.
- Build completo Electron/renderer/captura/Remotion passou. TypeScript desktop/workbench/backend passou; ajustes finais posteriores de render-worker/limpeza ainda entram na verificação consolidada. Avisos de tamanho de bundle e `use client` permanecem registrados, sem supressão.
- Electron → BFF → gateway → serviços: sessão restaurada, oito consultas paralelas, isolamento da interface remota, equipe canônica, amostra de 191 itens e abertura/carregamento da biblioteca pela bancada confirmados. O cenário não contém upload R2 nem importação completa.

## Saída ainda pendente

- Validar captura/upload pelo executor integrado, retomada de mídia e autoria com armazenamento real. O servidor descartável não tem R2 configurado; os testes de multipart usam porta de armazenamento em memória com PostgreSQL real, não comprovam R2/CORS em ambiente publicado.
- P07: a captura técnica inicial Mini Plataforma não reproduz a demonstração 3D da v4 atual; preservar v3/v4 como acervo e validar a nova captura no estado editorial correto. P29: continuar como rascunho, sem inventar seguidores ou atribuir o exemplo da equipe à criança. Recorte específico de blocos ainda não foi implementado.
- Consolidar identidade/procedência de render, áreas seguras/contraste e qualidade final. L8 carrega o acervo integral, inclusive HTML e arquivos originais; quatro receitas nativas não substituem essa importação.
- Exercitar cancelamento real de render depois dos ajustes de ciclo de vida e executar verificações finais consolidadas.
- L6B (vídeo), L6C (integração/exportação), L7, L8A/B, L9 e L10 permanecem pendentes. Full review, commit e merge local em staging somente após o escopo implementado e verificado, sem push/deploy.
