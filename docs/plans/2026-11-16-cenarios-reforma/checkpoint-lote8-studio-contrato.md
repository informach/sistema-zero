# Lote 8.4 — Contrato de cenário e dependências do Estúdio

19/11/2026. Continuação da `staging`, inicialmente `b2d77d8d3`, com a integração paralela do Pinta preservada em `88ede2b8d`. Este documento registra somente o recorte de contrato/armazenamento. **8.4 permanece aberto.**

## Implementação

O núcleo de cenários agora expõe `CenaParaStudioSchema`/`lerCenaParaStudio`, pela entrada restrita `@sistemazero/molda-cenarios-core/studio`: envelope JSON estrito, versão 1, MIME `application/vnd.sistemazero.cena3d+json`, limitado a 1 MiB UTF-8. Ele conserva a cena compilada e associa cada arquivo a um ID estável de asset. O inventário precisa estar completo, sem caminhos duplicados ou externos. IDs são opacos, sem normalização de nomes. Um ID compartilhado só pode representar conteúdo/tipo/dimensões compatíveis.

O pipeline existente de assets aceita `scene3d` e `scene3d-data`. Modelos continuam `model3d`, imagens continuam imagens. Os dados internos têm somente os papéis `alturas` (Float32 little endian finito) e `buracos` (máscara 0/1), com teto de 5 MiB por campo. Não foi criado armazenamento paralelo nem upload genérico de binários. Os tetos de quantidade/caracteres do projeto foram mantidos.

Leitura de projetos Classic/Pro, em JavaScript/Python, confere os vínculos por ID. A preparação assíncrona do documento usa o preflight canônico do compilador para conferir hashes, bytes, dimensões, GLBs, correspondência PNG16/Float32 e domínio físico. Uma falha recusa o documento; não produz uma cena parcial. O leitor síncrono conserva seu contrato e confere grafo/tipos; a conferência de conteúdo ocorre na preparação assíncrona e materialização.

Pro e Python materializam os mesmos bytes e registram papel, identidade e procedência. A exceção de caminho `.json`/`.bin` é exclusiva dos tipos de cenário. As políticas de imagem, áudio e caminhos de execução não foram ampliadas. O arquivo editável `.szproject.json` conserva o envelope e seus assets; a execução/exportação de site Classic ainda depende da ponte/runtime do próximo recorte.

A exclusão normal e pelo workspace Pro recusa remover uma dependência utilizada e informa os cenários envolvidos. Atualizar seus bytes exige nova revisão do cenário. As reconciliações em lote do Pro e a importação de mapas do Pinta verificam a mesma preservação. Renomear conserva IDs/vínculos; no Raylib conserva também os caminhos físicos e o programa da pessoa. Remover a cena libera essas dependências para exclusão individual, sem apagar materiais automaticamente.

A revisão identificou uma interação com a sincronização pessoal: uma arte compartilhada poderia receber bytes novos por fora do fluxo de cena. O teste reproduziu a tentativa de atualização no projeto aberto e no fechado. Recursos fixados por uma revisão compilada agora ficam fora dessa atualização; artes comuns continuam usando a sincronização existente. Tipos internos não viram cópias pessoais de imagens/modelos.

## Verificação local

- Contrato: seis casos novos; inventário completo, IDs/procedência preservados, compartilhamento compatível, papéis binários, versão/campos desconhecidos, JSON hostil e limite UTF-8.
- Assets/documentos: treze casos novos; reabertura nas quatro variantes, campos finitos/máscaras/dimensões/hash, MIME/extensão/UTF-8/limite, materialização exata, cancelamento, exclusão e rename, inclusive Raylib, reconciliação do workspace Pro e importação do Pinta.
- Sincronização pessoal: um caso novo de preservação da revisão 3D nos projetos aberto/fechado. Vermelho antes da guarda; verde depois. Suíte isolada inteira: **86 casos, zero falhas, 407 verificações**.
- Regressão de assets/documentos/workspace e sincronização de arquivos Pro: **92 testes, zero falhas, 469 verificações**, onze arquivos.
- Núcleo e motor de cenários: **604 testes, zero falhas, 15.826 verificações**, 122 arquivos.
- Tipagem do núcleo e tipagem integral do Estúdio: aprovadas. Biome: **23 arquivos conferidos, zero problemas**. `git diff --check` aprovado.
- Build real do playground pelo teste de orçamento: **um teste, zero falhas, 29 verificações**. Os limites existentes da lista inicial, rota do editor e modos foram mantidos; os catálogos pesados não passaram à carga inicial. Build em memória, sem implantação.

Não houve ensaio visual de importação nem alteração do mundo. Estes testes não aprovam direção de arte, desempenho em dispositivos físicos ou execução dos quatro motores. A primeira tipagem integral atravessou uma atualização paralela da `staging` pelo trabalho do Pinta; a conferência final usa a árvore integrada, sem modificar seus contratos para ocultar divergências temporárias.

Revisão posterior do preparo: o export pelo índice geral do compilador havia levado 1.117 caracteres de contrato exclusivo do Estúdio ao runtime Three independente. A entrada `/studio` elimina essa dependência de domínio. A conferência reproduzível voltou aos **1.106.050 caracteres, três dependências e SHA-256 `7d66f2567a028af248087cb96c3789f68cc2e10f86e76fbf291559dc498143a6`**, sem editar ou regenerar o artefato portátil.

## Revisão e próximo trabalho

Revisados limites antes da decodificação, preservação dos bytes, referências por ID, captura antes de awaits, fronteiras entre pacotes, ausência de rede/GPU na leitura, exclusão/rename, sincronização pessoal e ausência de mudança nos limites dos assets anteriores. A validação de conteúdo importa o motor sob demanda; projetos sem cena não carregam esse preflight.

**Recorte de contrato/assets implementado, testado e revisado localmente.** Próximo recorte exclusivo: preparação/importação atômica pela biblioteca existente, com deduplicação por conteúdo, 48 malhas reais, 5 MiB por modelo, 24 MiB por projeto existente, cancelamento e preservação de fontes Python. Depois vêm o carregador comum, os quatro motores e o fluxo Python no produto. **Não marcar 8.4 ou o lote 8 como concluídos com este contrato.** Publicação, lotes 9–10, composição final da Faísca, full review, CI e implantação/validação de staging permanecem no encerramento global.
