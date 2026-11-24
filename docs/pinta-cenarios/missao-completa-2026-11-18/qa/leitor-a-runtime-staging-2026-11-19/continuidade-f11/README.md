# Leitor A atualizado para o perfil f11

Esta é a continuação vigente em staging, em 19/11/2026. A implantação anterior
`7232eba7`/perfil `8151d121` permanece como evidência histórica da primeira
onda; não é o baseline atual de rollback.

| Identidade | Valor verificado |
|---|---|
| CI da imagem Linux | `44618103153`, sucesso, fonte `5595364428c339faff2e37efca39ad373a8d24ad` |
| Fonte do Worker | `87261f8802255db373a748358c06e234764b0f6a` |
| Worker ativo, 100% | `35e8935d-ef19-4782-85f0-d9a01bcc7e5f` |
| Módulo publicado SHA-256 | `7941046fb9bef33bc36fd7ea18af6064340cb29bfaf835ce0f92543614a93529` |
| Perfil | `f11aa057992edd156158a56a51b1b0f76969ab90cc8099b828315b26d9b64eb1` |
| Imagem qualificada | `sha256:3beb9699ff10a93d3ce81df5cd6f05f90b130d761f114a71ca0894664cb7a52b` |
| Contêiner Pro | aplicativo `a038c8f3-1b1c-40ca-8935-bfcc799202ef`, versão 32 |
| Contêiner 3D | aplicativo `a03599fe-80d3-4b3d-ba17-fdf5131aeb18`, versão 8 |

O CI construiu a imagem e executou os smokes de empacotamento, validação,
Python hermético, missão Python e objetivos 3D. O bundle publicado foi lido
independentemente. Os detalhes dos dois aplicativos confirmaram a nova imagem
e instâncias saudáveis. A primeira leitura durante a propagação ainda mostrava
as versões 31/7 e foi recusada; o recibo final usa a segunda leitura.

Foi conferida ausência de diferenças entre as duas revisões nos caminhos
`packages/studio-runtime/{Dockerfile,runtime,src}`,
`packages/core/src/studio` e `packages/studio/src/official-extensions`.
Isso não afirma igualdade do monorepo inteiro: comércio, autoria de aulas e
o componente de preview tiveram alterações independentes nesse intervalo.

Uma chamada real ao sandbox de staging confirmou o objetivo JavaScript
`dobro(2) === 4`, HTTP 200, em 8.039 ms. Isso comprova boot e inspeção do
contêiner; não comprova publicação de mapas ou o fluxo de jogo 3D completo.
O token ficou somente em memória. Nenhuma implantação foi dirigida à produção.

O seletor Python permanece
`f69814b9412125e9bb8f8f33aea2b682cf1e7dfdeb59f593c2067466ce140553`.
A distribuição `132db1b…` e o gravador B ainda não foram ativados. Os hosts
do leitor A e o ciclo autenticado/offline continuam pendentes. Uma reversão
futura precisa conservar leitores e releases exigidos por projetos novos;
não deve restaurar automaticamente o perfil antigo nem retirar a distribuição
de um projeto que já a utilize.

Os quatro recibos JSON são cópias locais dos resultados, com somente a
terminação de linha normalizada pelo formatter. O recibo da imagem registra
`workerDeployed: false` porque precede a publicação; a confirmação posterior
é `leitura-independente.json`.
