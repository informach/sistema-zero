# Full review: Aula 7, identidade infantil e comércio na plataforma

Revisão original: **5 achados, 1 P1 e 4 P2**. A rodada de correções está registrada em [verificação das correções](qa/correcoes-verificacao.md); os ajustes de código estão versionados e a publicação aguarda a CI completa. As suítes existentes passaram; quatro testes adicionais reproduzem falhas que elas não cobriam.

| ID | Prioridade | Achado |
| --- | --- | --- |
| [R01](qa/issues/BUG-001.md) | P1 | Versão publicada não está nos commits usados pelo deploy |
| [R02](qa/issues/BUG-002.md) | P2 | Mural classifica perfil-padrão legado como conta |
| [R03](qa/issues/BUG-003.md) | P2 | Certificado legado ignora confirmação e usa apelido |
| [R04](qa/issues/BUG-004.md) | P2 | Oficinas ainda usam nome antigo e cortam apelidos compostos |
| [R05](qa/issues/BUG-005.md) | P2 | Checkout exibe periodicidade mensal para plano trimestral |

## Resultado das verificações

- **4.973 testes aprovados**, zero falhas nas suítes existentes e **429 casos ignorados** por seus contratos de infraestrutura.
- PostgreSQL real: 20 casos de identidade/admissão e um cenário de comércio, concorrência e pool de uma conexão; incluídos na contagem acima.
- Biome: 163 arquivos conferidos, sem alterações automáticas.
- Types: Auth, Hub e Members da versão isolada de release aprovados.
- Roteiros: sete aulas, 23 clipes, zero erros. TXT e edição sincronizados com os roteiros.
- Railway: 22 últimas implantações em `SUCCESS`; inspeção somente leitura não equivale a reproduzir todas as jornadas em produção.
- Reprodução adicional: quatro falhas confirmadas, em `qa/repros.test.ts`. R01 foi confirmado pelo estado do Git, pela configuração de fonte no Railway e pelos workflows de deploy.

## Limites e observações

- Os perfis com UUID igual ao da conta são um tipo legado suportado, mas não há registros dessa coorte nos dois bancos consultados. R02/R03 não constituem evidência de vazamento atual de dados reais.
- Oficinas: uma inscrição Kids com nome desatualizado em staging; zero inscrições em produção. R04 também cobre a perda de partes do apelido composto.
- Todas as migrations canônicas de Members constam dos journals remotos. Há uma entrada histórica extra em staging e divergência de hash na migration antiga 0059 nos dois ambientes. As novas migrations não apareceram como ausentes ou divergentes nessa conferência; o desvio antigo não foi atribuído a esta entrega.
- O agente-browser não está instalado. Navegação manual não foi repetida nesta rodada; houve revisão de código, HTTP no harness existente, renderização real de componente, testes com PostgreSQL e leituras dos ambientes reais. A publicação integral da Aula 7 continua dependente das gravações planejadas.
- Há Playwright e CI de Kids no projeto, mas o fluxo integrado do novo comércio/identidade precisa de cobertura canônica durável. O script de componente em `packages/member-shell/qa` usa respostas simuladas; os roteiros completos da rodada anterior estão no cache local e não substituem regressão executada pelo CI.
- Esta rodada produziu achados e provas; não alterou código de aplicação, não publicou novos deploys e não efetuou cobranças.

[Verificação e comandos](qa/verification-report.md).
