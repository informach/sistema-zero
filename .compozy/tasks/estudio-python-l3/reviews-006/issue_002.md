---
status: resolved
file: packages/studio/e2e-runtime/python-network.spec.ts
line: 52
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Mínimo fixo de bytes rejeita a distribuição baseline

## Review Comment

A prova genérica de cache frio exige bytes > 15.000.000, um limite que só serve ao ZIP ampliado. A distribuição baseline inteira tem 14.882.529 bytes; seus artefatos necessários para execução, sem licenças/SOURCES, somam 14.851.800. Portanto um carregamento correto e completo do runtime oficial, com cada arquivo transferido uma vez, falha nesse assert. Isso impede usar o mesmo gate para comparar o custo de rede da versão original e da otimização sem alterar manualmente a prova.

Os totais foram calculados diretamente do distribution.json da baseline f4ea4fa7ab4a2be08783da13f0b3ea775a14124a4681548837c584a072e5ad8f. O cenário não requer navegador para mostrar a incompatibilidade: até a soma de todos os onze arquivos fica abaixo do mínimo fixo.

Derivar a verificação de bytes do manifesto da distribuição que a amostra efetivamente utiliza, idealmente relacionando-a aos artefatos requeridos ou às respostas observadas. Preservar uma verificação que detecte cache acidental e manter a identificação do hash da distribuição em cada amostra. O perfil de 20 Mbps agregado/80 ms pode permanecer como diagnóstico do servidor, sem alegar emulação da interface de rede.

## Triage

- Decision: `VALID`
- Notes: Trata-se de falso negativo da prova para a baseline; nenhum resultado de rede foi inventado ou navegador iniciado pela revisão.

- Resolution: O mínimo agora soma os sete artefatos de boot no manifesto efetivamente carregado. Avaliação independente da expressão atual calculou 14.732.723 bytes para a baseline e 19.299.585 bytes para a otimizada, eliminando o falso negativo causado pelo mínimo fixo. Nenhum navegador foi iniciado nesta revalidação.
- Verification: Código corrigido lido integralmente; reproduções independentes passaram. Fontes não foram modificadas pela revisão.
