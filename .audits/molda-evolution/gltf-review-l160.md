# Revisão e adoção glTF na oficina, lote 160

## Escopo e arquitetura

Entrada lazy na oficina interna: escolher arquivos, escolher cena, preparar,
revisar e confirmar. A interface reutiliza os tokens mld, diálogo/foco existentes,
controles com nome e rótulo, alvos de 44 px e disclosures. As skills de interface
e componentes orientaram a separação entre resumo simples e detalhes técnicos,
prévia somente leitura e confirmação explícita. Isso não substitui usabilidade
com crianças nem a revisão visual em dispositivos.

`readGltfLocalBundle` valida todos os metadados novos antes de qualquer leitura:
paths literais relativos normalizados, duplicatas, 1.025 arquivos no conjunto,
32 MiB por arquivo e 64 MiB agregados. O orçamento agregado agora é compartilhado
com o protocolo do worker. `previous` recebe exclusivamente o conjunto próprio
já lido pela sessão; acrescentar acompanhantes reaproveita seus buffers read-only,
com novos objetos de metadados. O helper não é um leitor de arquivos anteriores
arbitrários. A leitura nativa pode terminar depois de abort; seus bytes são
descartados e nenhum arquivo seguinte é lido.

Pastas preservam `webkitRelativePath`; arquivos separados preservam nomes
literais, sem adivinhar subpastas, buscar URLs ou aproximar maiúsculas/basename.
Quando houver vários GLB/glTF, o principal é uma escolha explícita. Inspeção não
converte automaticamente nem escolhe a cena default — mesmo uma única cena pede
escolha. Os recursos faltantes aparecem juntos e podem ser acrescentados. Cada
conversão usa o worker já validado; não há fallback pesado na thread de UI.

## Sessão, revisão e histórico

`useSceneGltfImport` possui editor, revisão, ID, pedido e AbortController. Leitura,
progresso, resultado e aceite precisam continuar pertencendo à mesma sessão.
Troca de arquivo/cena/opções revoga resultado e aceite; cancelar, blur, aba oculta,
fechar, trocar editor ou mudar a revisão impede resultados atrasados. Miniatura
não conta como edição de conteúdo. Cancelamento retira o dono antes de abortar,
preservando uma sessão nova iniciada reentrantemente.

A confirmação lê a guarda viva de pose do host, confere ownership novamente após
esse callback e retira o dono antes de notificar assinantes via commit. Confirmação
capturada de um aceite anterior não pode adotar outro resultado. Abertura também
confere pose pendente antes e depois de cancelar outras ferramentas; importação
tem explicação própria, separada do aviso de exportação.

Até confirmar não há replace, commit, histórico ou escrita de persistência. A
adoção preserva ID/nome/data de criação do host, retira miniatura derivada e usa
um único commit no editor existente. Desfazer e refazer conservam geometria,
imagens e movimentos; a política existente mantém pelo menos o último passo,
mesmo se ele ultrapassar sozinho o orçamento nominal de histórico.

Relatório agrupa diagnósticos por código; detalhes técnicos mostram no máximo
50 ocorrências, com linhas iguais agrupadas. A descarga JSON contém o relatório
completo. Extensões opcionais, blocos adicionais e conteúdo fora da cena têm
avisos próprios. Original não é modificado nem arquivado no documento nativo;
créditos/licenças/metadados também não são arquivados. O aviso pede guardar o
conjunto e respeitar autoria. Download de original/relatório exige clique, sem
interpretar nomes ou avisos como HTML.

## Prévia e desempenho

`SceneImportPreview` tem renderer/player separados, sem editor nem ações de
transformação/pintura. Reusa viewport sob demanda, reprodução e recuperação de
contexto existentes. Tocar é manual; seek usa tempo exato, não altera chaves e
não arredonda ao FPS. Blur, ocultação, redução de movimento e perda de contexto
pausam. Troca de modelo remove a pose anterior; descarte remove assinaturas,
player e renderer. GPU indisponível tem aviso e não é confundida com conversão
inválida. O aceite menciona relatório/originais, não afirma que a prévia foi vista.

Não há nova dependência ou otimização de buffers alegada. File.arrayBuffer, o
snapshot do worker, structured clone e os leitores defensivos têm seus custos;
inspeção e conversão são pedidos separados e releem a fonte. Limites de entrada
e pixels não medem pico de memória. A lista de detalhes tem limite de DOM, não
uma promessa de taxa de quadros ou latência de dispositivo.

## Revisão e testes

13 testes novos exercitam leitura/paths/duplicatas/limites antes de IO; abort
antes de metadados, durante IO e antes de postagem; erro de tamanho; worker real,
consentimento revogável e miniatura; mudança de revisão/undo, arquivo, opções,
cena, editor com mesmo ID e encerramento; guarda de pose atualizada e reentrante.

Integração passa pelo diálogo lazy real da oficina: arquivo GLB com textura e
movimento, escolha, confirmação, foco de retorno, um undo/redo e descarte. Pasta
glTF com acompanhantes mostra faltantes e permite escolher cena vazia em vez da
default. Relatório de 60 avisos mantém 50 detalhes, texto literal e downloads
completos. Prévia usa o player real; apenas a porta GPU é substituída para testar
seek, ausência de edição/autoplay, pausa por blur/contexto, troca e StrictMode.

A primeira execução focal travou na asserção assíncrona: `expect(...).rejects`
era iniciado antes de liberar a promise controlada. Liberar a leitura antes de
aguardar a rejeição resolveu a sequência do teste; não houve mudança no produto.
A primeira integral terminou com 1.959 passes e uma falha: novos campos estavam
sem `name`, exigido pelo contrato existente. Foram corrigidos os controles, sem
relaxar o teste. Focal posterior: 62 passes, zero falhas, 547 asserts/5,63 s,
incluindo acessibilidade e pureza.

## Evidência final

Tipos passaram. Biome: 837 arquivos, sem correções pendentes. Integral:
1.961 passes, zero falhas, 273 arquivos, 8.228.777 asserts, 115,05 s. Vite:
1,09 s; produz `gltfImport.worker-ClKSRWBM.js` (180,05 kB) e painel lazy
`SceneGltfImportPanel-BAUNaX1k.js` (35,03 kB, gzip 11,21 kB). Agora a entrada
alcançável prova o bundle do worker de navegador, além da execução real no Bun.
O aviso de chunk Three acima de 500 kB permanece. Kids: compilação 6,7 s,
tipos 8,7 s, 59 páginas em 701 ms. Diff check passou, com os avisos CRLF já
existentes em outros CLAUDE.md. Nenhuma ativação pública ou dependência nova.

## Limitações e continuação

Formato público permanece 1, oficina v2 continua apenas no playground. Este lote
não completa a fase 8: OBJ/MTL, bbmodel, capacidades glTF sem representação nativa
e integração ampliada Studio continuam abertos. Browser não estava operacional
no ambiente já diagnosticado; não repetir tentativas por caminhos alternativos
nem afirmar homologação visual/GPU/toque/infantil a partir de happy-dom.
