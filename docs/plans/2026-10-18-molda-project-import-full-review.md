# Revisão: projetos na galeria e modelos 3D na oficina

## Escopo e resultado

A galeria oferece **Importar projeto** no cartão inferior para arquivos nativos do Molda
e pacotes ZIP. A importação de modelos externos permanece em **Trazer 3D**, dentro da
oficina. Foram revisados os componentes removidos, as referências compartilhadas, os
textos, a restauração, as permissões, a persistência e os testes dos dois fluxos.

Não restaram referências executáveis ao diálogo de importação de modelos da galeria.
A restauração continua criando cópias independentes, sem alterar os projetos existentes,
e preserva geometria, pintura e movimentos. Os painéis de modelos conservam revisão,
confirmação e desfazer. Os tokens e o desenho compartilhado da plataforma permanecem.

## Achados corrigidos

1. **Mensagem de tamanho incorreta:** o erro de restauração informava 32 MB, embora o
   limite atual seja 192 MiB. A mensagem agora deriva de `MAX_BACKUP_FILE_BYTES`, o
   mesmo contrato usado pelo leitor, sem aumentar os limites de entrada.
2. **Interferência entre testes do admin recebida de staging:** o CI remoto
   [39163502111](https://github.com/informach/sistema-zero/actions/runs/39163502111)
   falhou nos quatro testes de autoria Python. O visualizador de entregas deixava um
   mock global de `StudioEmbed` no processo. A ordem visualizador → autoria reproduziu
   as quatro falhas localmente; isolando os três cenários do visualizador em um processo
   próprio, a mesma ordem passou. Nenhuma regra de autorização nem asserção dos cenários
   existentes foi removida. O padrão de processo próprio já é usado pelos testes do admin.

## Verificação da integração local

Staging remoto avançou de `a1e182943` para `ac85a7a32`, com a frente Python do Estúdio.
Foi integrado por fast-forward antes do merge desta alteração, sem conflitos.

| Comando | Resultado |
| --- | --- |
| `bun install --frozen-lockfile` na raiz | Aprovado |
| `bun run test` em `packages/molda` | 3.406 aprovados, zero falhas, 474 arquivos |
| `bun run typecheck` em `packages/molda` | Aprovado |
| `bun run check` em `packages/molda` | Aprovado, 1.470 arquivos |
| `bunx vite build --config playground/vite.config.ts --outDir ../.cache/project-import-build` | Aprovado |
| `bun test tests/copy-vocabulario.test.ts` em `packages/community-kids` | 16 aprovados |
| `PW_REUSE_SERVER=1 bunx playwright test e2e/gallery-project-import.spec.ts` | 12 aprovados, Chromium/Firefox/WebKit |
| Reprodução visualizador → autoria após isolamento | 5 cenários aprovados; visualizador executa seus 3 cenários no processo filho |
| `bun test` em `packages/admin` após isolamento | 649 aprovados, zero falhas; os 3 cenários do visualizador também aprovados no processo filho |
| Biome dos dois arquivos de teste do admin | Aprovado |
| `git diff --check` | Aprovado |

Os testes de navegador usam o seletor real de arquivos para JSON e ZIP, recarregam a
galeria, abrem o projeto restaurado e conferem **Trazer 3D** no editor. Também verificam
arquivo de modelo recusado como projeto, retorno do foco e largura de 390 px.
A captura `.cache/gallery-project-import-mobile.png` foi inspecionada sem cortes ou
sobreposição. Os logs estão em `packages/molda/.cache/project-import-*`.

O CI e o deploy remoto são acompanhados após o push. O deploy deve considerar também a
frente Python integrada, pois a execução anterior falhou antes de publicar seus serviços.
