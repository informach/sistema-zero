# Fontes do DANFSe: operação e licenciamento

## Escopo

O Fiscal gera DANFSe em PDF no servidor. A NT 008 v1.02 exige Arial nos rótulos e na marca d'água e Microsoft Sans Serif no conteúdo. O serviço precisa destes arquivos:

| Uso | Família e peso | Arquivo esperado |
| --- | --- | --- |
| Marca d'água | Arial Regular | `arial.ttf` |
| Rótulos e títulos em destaque | Arial Bold | `arialbd.ttf` |
| Conteúdo | Microsoft Sans Serif Regular | `micross.ttf` |

## Inventário temporário de produção

As cópias abaixo vieram de `C:\Windows\Fonts` em 25/08/2026. Após o responsável pelo projeto informar a obtenção de autorização temporária, elas foram incluídas em `packages/fiscal/assets/fonts/` como ativos privados de implantação enquanto o licenciamento definitivo está em andamento. O serviço verifica os hashes no carregamento e incorpora somente o subconjunto de glifos usado em cada PDF.

| Arquivo | Bytes | SHA-256 |
| --- | ---: | --- |
| `arial.ttf` | 1.045.720 | `B3658EADAE55E682B5F69EB64C439C1ECC8F196C0BB8D4756D145D13BC86476A` |
| `arialbd.ttf` | 989.780 | `E8F4E3BAF6CC35FED6FCCE3A540E8B39E8F6CDA1D22A28F2EC8F526FEF7A43F5` |
| `micross.ttf` | 857.472 | `89B42A12EA0379133FB2F4A1D1BD53058FB61E2343C1D509452D5761ACC85B7A` |

Não disponibilize os TTFs por rota pública, artefato aberto ou repositório público. O uso em servidor depende da autorização temporária e, depois, da licença definitiva; a licença comum do Windows, isoladamente, não autoriza copiar as fontes para outro computador ou servidor. Consulte o [FAQ oficial da Microsoft](https://learn.microsoft.com/en-us/typography/fonts/font-faq).

## Registro da autorização temporária

O registro técnico comprova apenas que a autorização foi declarada ao projeto em 25/08/2026. Antes de uma auditoria ou renovação, anexe a prova escrita e complete os campos abaixo sem presumir informações:

| Dado | Registro |
| --- | --- |
| Status | Autorização temporária informada pelo responsável do projeto em 25/08/2026 |
| Concedente e contato | PREENCHER a partir do documento recebido |
| Empresa/CNPJ autorizado | PREENCHER |
| Data de início | PREENCHER |
| Data de expiração ou condição de término | PREENCHER |
| Ambientes e quantidade de servidores cobertos | PREENCHER |
| Direito de gerar e distribuir PDFs com subset incorporado | CONFIRMAR por escrito |
| Restrições territoriais ou de volume | PREENCHER |
| Local seguro da prova escrita | PREENCHER (não guardar dados comerciais sensíveis neste repositório) |
| Responsável pela renovação | PREENCHER |

Até esses dados serem preenchidos, trate o uso como temporário e acompanhe o processo definitivo. Se a autorização expirar, revogar o deploy que contém os ativos é uma ação operacional obrigatória; não existe fallback tipográfico silencioso no Fiscal.

## Registro de implantação

| Data | Ambiente | Serviço | Deployment | Resultado |
| --- | --- | --- | --- | --- |
| 25/08/2026 18:12 UTC | Railway `production` | `fiscal` | `7a70ae52-53b4-4932-a811-dd7daa3473cd` | Sucesso; migrations concluídas, healthcheck aprovado e aplicação iniciada às 18:14 UTC |

O deploy acima contém exatamente os três hashes deste inventário. Como foi enviado pelo Railway CLI a partir do workspace validado, a mesma alteração deve seguir o fluxo normal de commit/merge antes do próximo deploy baseado na branch `main`; caso contrário, um redeploy do commit anterior pode retirar as fontes.

## Caso de uso para a proposta comercial

Forneça estes dados à Microsoft, MyFonts ou Monotype:

- empresa contratante: razão social e CNPJ do Sistema Zero;
- país: Brasil;
- fontes: Arial Regular, Arial Bold e Microsoft Sans Serif Regular;
- aplicação: geração automatizada de documentos fiscais DANFSe em PDF;
- serviço: `@sistemazero/fiscal` em container Linux no Railway;
- ambientes: uma produção e uma staging;
- execução: o Railway pode manter instâncias efêmeras sobrepostas durante deploys e substituições;
- armazenamento temporário: ativos no pacote privado do serviço, sem rota de download dos TTFs;
- saída: PDFs transacionais enviados aos clientes, destinados a visualização e impressão;
- incorporação: somente o subconjunto de glifos usado em cada PDF;
- território de distribuição: Brasil, salvo expansão futura;
- volume: informar a estimativa anual de DANFSe e o pico de instâncias simultâneas;
- continuidade: incluir staging, backup, recuperação de desastre e réplicas efêmeras.

Use o [formulário oficial de licenciamento de fontes Microsoft](https://www.myfonts.com/a/font/form/microsoft-typography-licensing) com esta mensagem:

```text
We need to license the following font files:

- Arial Regular (arial.ttf)
- Arial Bold (arialbd.ttf)
- Microsoft Sans Serif Regular (micross.ttf)

Use case:
Server-side generation of Brazilian DANFSe tax documents in PDF format.

Deployment:
- Linux Docker container hosted on Railway
- One production environment and one staging environment
- Railway may temporarily run replacement or overlapping container instances during deployments
- Font files will be stored in a private volume and will not be downloadable by end users
- PDFs will embed only the glyph subsets required by each document
- PDFs are transactional tax documents distributed to customers and are not intended to be editable

Please quote the licenses required for:
1. Cloud/server installation
2. Server-side automated PDF generation
3. Distribution of the generated PDFs as commercial/transactional electronic documents
4. Staging, backup, disaster recovery and ephemeral deployment instances

Please confirm whether the license is perpetual or subscription-based and provide the licensed TTF files or written authorization identifying which files may be used.
```

## Conferência da proposta

Antes de contratar, confirme por escrito:

1. os três arquivos e pesos estão cobertos;
2. a licença permite instalação em servidor Linux na nuvem;
3. a licença permite geração automatizada e distribuição dos PDFs;
4. a licença permite subset embutido nos documentos;
5. staging, backups e instâncias sobrepostas estão incluídos;
6. o contrato define prazo, território, volume e renovação;
7. o fornecedor entrega os TTFs licenciados ou autoriza arquivos identificados por nome, versão e hash.

Guarde a autorização temporária, a proposta, o contrato ou EULA, o comprovante, a confirmação do caso de uso e os binários entregues. Registre qualquer troca de versão das fontes com novos hashes.

## Substituição após a licença definitiva

Substitua os três arquivos em `packages/fiscal/assets/fonts/` pelos TTFs fornecidos ou expressamente autorizados no contrato definitivo. Em seguida:

1. confirme família, peso, versão e direito de incorporação em PDF;
2. calcule o SHA-256 de cada arquivo;
3. atualize o inventário deste documento e `font-files.ts`;
4. execute testes, typecheck e validação visual dos PDFs normal, cancelado e substituído;
5. implante primeiro em staging e confirme nos PDFs as famílias incorporadas;
6. registre a data do deploy e arquive os binários anteriores conforme a política jurídica.

O Fiscal falha fechado se algum arquivo estiver ausente ou divergir do inventário, evitando que produção sirva um DANFSe com fonte substituta sem aviso.
