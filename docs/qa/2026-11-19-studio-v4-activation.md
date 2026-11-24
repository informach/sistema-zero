# Ativação v4 — laboratório separado

## Estado

Branch local `estudio-deep-storage-boundary-20261118`, publicação anterior `estudio-missao-storage-v4-20261119` em `f9ddd5e16`. A ativação descrita aqui está em qualificação e não foi integrada à PR 273. A branch principal continua v3. Não houve merge em staging/main, deploy ou intervenção autoral em Pinta/Molda.

## Contrato implementado

O namespace atual passa a v4 somente no laboratório. Lista, documento, shell, metadados, blocos, materiais e resumos usam a mesma preparação transacional de bases/journals v3 e journals v4. Leitura pontual prepara o ID solicitado; lista isola itens incompatíveis, mostra pendência e conserva os bytes. Fontes antigas futuras não autorizam promover uma cópia portátil v1/v2 mais velha. Metadados e partições com identidade/layout incompatíveis são recusados sem fallback silencioso. Projeto atual parcialmente gravado não é substituído por uma geração antiga.

A descoberta de journals usa a identidade completa validada do payload, inclusive quando IDs e escritores contêm dois-pontos. Uma fonte sem proprietário legível é exibida como recuperação preservada, sem autoridade de consumo. A enumeração síncrona lê o cabeçalho antes do corpo para isolar formatos futuros por projeto. Chaves capturadas já consumidas são ignoradas somente quando a chave realmente não existe; valores inválidos presentes não são tratados como ausência.

A vinculação captura a base antes de migrar/recuperar. Restaurar um snapshot não herda direito de sobrescrever um documento recém-migrado. A preparação da primeira gravação fica dentro da fila existente, antes de permitir que outra mutação do mesmo projeto avance. A saída continua síncrona, sem import/await adicional. O lote de resumos mantém duas consultas; a sondagem do destino e dos formatos antigos ocorre em uma única transação.

Metadados futuros preservam presença de campos `undefined`, objetos aninhados e zero negativo. Os campos opcionais conhecidos continuam normalizados e o marcador de partição não vaza para o documento portátil. Journals com chave estrangeira não podem anunciar um projeto recuperável com a identidade alegada. A biblioteca pessoal pula projetos em migração e não reconhece a revisão de desenhos enquanto houver uma atualização canônica impedida.

## Regressões e evidências locais

- Primeira suíte após ativação: 616 passaram / 26 falharam no nível superior. Além dos defeitos corrigidos, havia testes que criavam supostos dados v3 pela fábrica da versão atual. As simulações históricas agora constroem contratos v3 explícitos; os testes atuais usam v4. Nenhum prazo, cota ou assertiva de integridade foi reduzido.
- Precedência da fonte futura, ID legado com dois-pontos, chave nativa já consumida e anúncio de recuperação com chave estrangeira foram reproduzidos e corrigidos. Na última regressão, a lista anunciava indevidamente `other-project`; após validar chave e payload integrais, preserva a fonte sem anunciar esse projeto.
- O teste de ordenação falhou com a preparação fora da fila (duas preparações concorrentes), passou com a preparação dentro dela e preserva o documento de origem.
- Gate amplo final: **657 testes / 3.735 asserções / 90 arquivos / 67,61 s**, zero falhas. Inclui estado, persistência, migrações, cenas, Raylib, sincronização pessoal e Blockly.
- Sincronização pessoal isolada: **88 testes / 417 asserções**, incluindo revisões pendentes v4 e v3 que são aplicadas depois sem alterar o marcador da biblioteca. Uma revisão final revelou que a lista leve omitia fontes legadas bloqueadas: ela agora conserva essas linhas com pendência. O teste com fonte v3 completa falha sem a correção (zero desenhos atualizados após recuperação) e passa com ela; os bytes bloqueados não são modificados.
- Chromium: saída/recargas/duas abas e arquivo de ancestral profundo passaram em 9,05 s. WebKit: mesmos contratos em 15,84 s. Os dois navegadores com aborto nativo injetado passaram em 25,41 s.
- Cada documento novo de navegador prova primeiro que uma escrita v4 sem transporte preparado é recusada. Depois vincula um projeto novo, grava journal nativo completo com **40.000 níveis**, recupera e confere presença de `undefined`, zero negativo e reconhecimento das duas fontes. Antes dessa prova, nenhuma leitura v4 havia aquecido o transporte no documento. A prova nativa passa antes do fechamento do navegador.
- Ensaio profundo final com a ativação: Chromium e WebKit passaram em **50,76 s** no mesmo driver, sem elevar seu prazo. A fixture de **10.000 registros / 9.920 IDs / profundidade 2.503** preservou estrutura e campos, as migrações v1/v2/v3, a cópia por zero negativo e os dados de jogo. O controle de clone nativo reprovou no Chromium com RangeError; o transporte plano passou nos dois engines. Também foram conferidos arquivo de ancestral profundo, recargas e conflito de duas abas. Não se trata de montagem SVG.
- A barreira pública de eventos Blockly substitui sleeps de 10 ms no teste de undo/redo que reprovou no Windows do run f9. Mantém conexões, sombras e histórico; não altera o runtime Blockly.

## Gates pendentes

Typecheck completo final aprovado depois da regressão da lista leve e das correções de fixtures somente de leitura. Nenhum erro de tipagem permanece nesse gate local. A primeira medição inicial reprovou em 120.657 bytes gzip. A leitura completa e a preparação histórica foram separadas da lista leve e protegidas no gate do grafo; nenhuma validação saiu da abertura ou da recuperação. Resultado final: **367.442 bytes brutos / 119.954 gzip / dois arquivos / 47 asserções**, teto de 120.000 mantido. A suíte ampla foi repetida depois dessa separação e passou conforme os números acima; Biome de 28 arquivos passou sem alterações pendentes. Depois: commit coeso e CI da revisão exata, sem importar uma ativação não qualificada na branch principal. A revisão do diff e o Biome final dos arquivos alterados foram feitos; a qualificação remota da ativação continua bloqueante. O novo remoto `973bebd82` é posterior à base deste laboratório e ainda precisa ser integrado depois da qualificação.

## Limites da evidência

Os testes usam IndexedDB real nos navegadores de laboratório e fake-indexeddb nos contratos transacionais. Não comprovam hardware físico de 8 GB, FPS universal, sessões prolongadas ou 10.000 blocos simultaneamente renderizados em SVG. O ensaio de 40.000 níveis comprova integridade/transporte, não responsividade visual de um programa em blocos dessa dimensão. A missão global continua aberta, inclusive isolamento JS efetivo, escala visual, ferramentas profissionais e homologação integral dos cursos e jogos grandes.
