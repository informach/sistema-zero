import { expect, test } from 'bun:test'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'

test('plataforma falsa distingue molde inválido, suporte e editor não disponível sem mudar o avatar', async () => {
  for (const somenteLeitura of [false, true]) {
    const p = criarPlataformaFalsa({ persistir: false, somenteLeitura })
    const avatar = await p.lerAvatar()
    const save = structuredClone(p.guardado())
    const resultado = await p.abrirFerramenta({
      ferramenta: 'avatar',
      proposito: 'vestir',
      molde: { versao: 1, festa: 'carnaval' },
    })
    expect(resultado).toEqual({
      situacao: 'indisponivel',
      motivo: somenteLeitura ? 'acesso-necessario' : 'playground',
    })
    expect(await p.lerAvatar()).toEqual(avatar)
    expect(p.guardado()).toEqual(save)
    if (!somenteLeitura) {
      expect(
        await p.abrirFerramenta({
          ferramenta: 'avatar',
          proposito: 'comprar',
          molde: { versao: 1, festa: 'carnaval' },
        }),
      ).toEqual({ situacao: 'indisponivel', motivo: 'pedido-invalido' })
      expect(
        await p.abrirFerramenta({
          ferramenta: 'avatar',
          proposito: 'vestir',
          molde: { versao: 1, festa: 'carnaval', preco: 1 },
        }),
      ).toEqual({ situacao: 'indisponivel', motivo: 'pedido-invalido' })
    }
  }
})
