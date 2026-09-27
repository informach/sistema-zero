# Compatibilidade do Molda após a retomada

Escopo conferido no código em 10/09/2026. Este contrato descreve o que os leitores e
exportadores implementam; não promete reproduzir todos os recursos de outros editores.
O projeto `.molda.json` é o formato para continuar editando sem as perdas de uma cópia.

## Arquivos que saem da oficina

| Destino | Conteúdo | Conversões e limites |
| --- | --- | --- |
| Projeto nativo | Cena, hierarquia, geometria, materiais, camadas, clipes, vínculos e pesos | Leitor versionado; versões futuras são preservadas para recuperação |
| GLB | Binário autocontido com hierarquia, imagens, clipes e skins portáteis | Peças ocultas e dados sem equivalente exigem aceite do relatório; pose transitória não substitui repouso |
| glTF | O mesmo conteúdo do GLB, com buffer embutido em data URI | As mesmas perdas e limites do GLB; não depende de arquivos externos |
| OBJ | ZIP com OBJ, MTL e imagens PNG | Transformações e skin assadas em repouso; hierarquia, movimento e detalhes de material não representáveis são relatados antes de baixar |
| PNG do modelo | Foto limpa de 1024 × 1024 | Pose salva; sem grade, seleção ou imagem de apoio; indisponível durante isolamento ou pose transitória |
| Apresentação | HTML autocontido com 24 vistas de 384 × 384 | Fotos giratórias, sem reprodução de clipes; funciona offline, sem CDN ou autoplay |
| PNG de textura / HDR de céu | Exportadores próprios dos dois editores existentes | Não são conversões de uma malha 3D |
| Backup completo | ZIP incluindo projetos nativos das duas gerações e arquivos exportados | Leitura/compressão progressiva, cancelamento, checagem de integridade; restauração cria cópias com novos IDs |

A opção de pintura animada no GLB/glTF utiliza `KHR_texture_transform`, declarada em
`extensionsUsed` e `extensionsRequired`, e metadados de sequência do Estúdio. UV fora
da célula exige consentimento para uma cópia estática. O kit Jogo 3D Avançado valida
inteiros, tamanho da sequência, FPS e repetição antes de reproduzir. Leitores genéricos
não recebem uma promessa de reprodução desses metadados.

## Arquivos que entram

| Origem | Suporte implementado | Incompatibilidades tratadas explicitamente |
| --- | --- | --- |
| GLB / glTF 2 | Geometria, hierarquia, imagens, materiais, clipes TRS e skins dentro dos limites do leitor | Extensões obrigatórias ainda não decodificadas são recusadas. Extensões opcionais e outros dados sem equivalente constam do relatório |
| OBJ / MTL | Malhas, grupos, UV, materiais e recursos selecionados pelo usuário | Caminhos e orçamentos validados; instruções executáveis e formas não suportadas são recusadas |
| bbmodel 4.9 / 4.10 / 5.0 | Formato `free`, elementos/grupos, recursos, UV, camadas e conversão de clipes locais | Adaptação de iluminação, lados, efeitos, repetição e grupos PBR exige escolhas específicas; PBR completo não é reconstruído a partir da opção de usar só a textura |
| JSON / ZIP do Molda | Projetos legados e novos, inclusive ZIP misto | JSON avulso v2 é encaminhado ao leitor de cena; CRC, limites e todos os projetos são validados antes da primeira gravação |

O leitor glTF atual recusa também um GLB de pintura animada do próprio Molda quando
ele exige `KHR_texture_transform`. Para retomar essa criação com todas as camadas e
quadros, use o projeto nativo. Essa restrição não é uma importação silenciosa parcial.
Scripts, plugins e Molang não são executados. Formatos específicos de Minecraft
permanecem fora do plano aprovado.

## Ponte com o Estúdio

A importação pertence ao perfil e ao projeto escolhidos no início da operação. Uma
resposta atrasada não adiciona conteúdo ao projeto aberto depois, nem a um diálogo
já fechado. O vínculo `personal:<id>` acompanha a cópia e permite atualizá-la depois.

Perdas exigem aceite para aquela revisão, tanto ao trazer no Estúdio quanto ao atualizar
pela oficina. Sair com “Guardar e voltar” aguarda essa revisão; manter a cópia anterior
preserva o original nativo. Criações nunca trazidas para o Estúdio não são exportadas
automaticamente nem apresentam esse aviso ao fechar.

## Evidência

- `sceneFile.test.ts`: Khronos validator e leitores independentes GLTF/OBJ/MTL do Three;
  PNG decodificado por Sharp, coordenadas de mundo, reflexões, repouso e bytes das imagens.
- Testes `bbmodel*` exercitam separadamente as três versões, recursos, grupos, clipes,
  camadas, orçamentos e recusa de dados sem interpretação segura.
- `scene-workshop.spec.ts`: download dos quatro novos destinos, apresentação offline,
  backup restaurado e reaberto, pintura/animação/ossos, conflitos em duas abas.
- `studioLibrary.test.ts`, `useStudioResync.test.tsx`, `SceneStudioExit.test.tsx` e
  `MoldaImportDialog.test.tsx`: revisão, cancelamento, perfil, projeto e saída.

Resultados frescos e limites de homologação ficam em
[`2026-09-10-molda-retomada.md`](2026-09-10-molda-retomada.md).
