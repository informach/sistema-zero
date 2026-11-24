import { afterEach, describe, expect, it } from 'bun:test'
import { render, screen, waitFor, within } from '@testing-library/react'
import * as Blockly from 'blockly/core'
import type { ProjectAsset } from '#core'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { gameThreeDBlocks } from '../../../official-extensions/game-3d/blocks'
import { trocarDesenhoDasMiniaturasParaTestes } from '../../../three/modelThumbnails'
import { Models3DTab } from './Models3DTab'

/**
 * A miniatura dos modelos 3D (pedido de 23/11/2026): a aba "Modelos 3D" e a grade do seletor do
 * bloco trocam o 📦 pela imagem do modelo assim que ela fica pronta. Quem desenha aqui é um
 * registro (o desenho de verdade, com WebGL, é conferido no navegador).
 */
const MINIATURA = 'data:image/png;base64,iVBORw0KGgo='
const modelo = (id: string, name: string): ProjectAsset =>
  ({
    id,
    name,
    kind: 'model3d',
    dataUrl: `data:model/gltf-binary;base64,${btoa(`glb-${id}`)}`,
    originalFileName: `${name}.glb`,
    source: 'upload',
  }) as ProjectAsset
const ceu = {
  id: 'ceu',
  name: 'por-do-sol',
  kind: 'environment3d',
  dataUrl: 'data:image/vnd.radiance;base64,AA==',
  originalFileName: 'ceu.hdr',
  source: 'upload',
} as ProjectAsset

afterEach(() => trocarDesenhoDasMiniaturasParaTestes(null))

function aba(models3d: ProjectAsset[]) {
  return render(
    <Models3DTab
      models3d={models3d}
      allowUpload
      busy={false}
      has3DExtension
      onUpload={() => {}}
      onOpenMolda={null}
      editTargetOf={() => null}
      onOpenInOrigin={() => {}}
      onRename={() => {}}
      onDelete={() => {}}
    />,
  )
}

describe('a aba "Modelos 3D"', () => {
  it('troca o 📦 pela miniatura do modelo; o céu continua no 🌅', async () => {
    const desenhados: string[] = []
    trocarDesenhoDasMiniaturasParaTestes(async (dataUrl) => {
      desenhados.push(dataUrl)
      return MINIATURA
    })
    const { container } = aba([modelo('nave', 'nave'), ceu])
    expect(screen.getByText('📦')).not.toBeNull()
    await waitFor(() => expect(container.querySelector(`img[src="${MINIATURA}"]`)).not.toBeNull())
    expect(screen.queryByText('📦')).toBeNull()
    expect(screen.getByText('🌅')).not.toBeNull()
    expect(desenhados).toHaveLength(1)
  })

  it('sem desenho (sem WebGL, arquivo que não abre), fica o 📦', async () => {
    let chamadas = 0
    trocarDesenhoDasMiniaturasParaTestes(async () => {
      chamadas++
      return null
    })
    const { container } = aba([modelo('quebrado', 'quebrado')])
    await waitFor(() => expect(chamadas).toBe(1))
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.getByText('📦')).not.toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })

  it('a segunda tela usa a miniatura já desenhada, sem desenhar de novo', async () => {
    let chamadas = 0
    trocarDesenhoDasMiniaturasParaTestes(async () => {
      chamadas++
      return MINIATURA
    })
    const primeira = aba([modelo('nave', 'nave')])
    await waitFor(() =>
      expect(primeira.container.querySelector(`img[src="${MINIATURA}"]`)).not.toBeNull(),
    )
    primeira.unmount()
    const segunda = aba([modelo('nave', 'nave')])
    // Já na primeira pintura: nenhum 📦 piscando.
    expect(segunda.container.querySelector(`img[src="${MINIATURA}"]`)).not.toBeNull()
    expect(chamadas).toBe(1)
  })
})

describe('o seletor de modelo do bloco', () => {
  function abrirGrade(assets: ProjectAsset[]) {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameThreeDBlocks)
    const ws = new Blockly.Workspace()
    Object.assign(ws, { __szAssets: () => assets })
    const bloco = ws.newBlock('sz_g3d_create_model_file')
    const campo = bloco.getField('MODEL') as unknown as { showEditor_(): void }
    const conteudo = document.createElement('div')
    document.body.appendChild(conteudo)
    const originais = {
      getContentDiv: Blockly.DropDownDiv.getContentDiv,
      showPositionedByField: Blockly.DropDownDiv.showPositionedByField,
    }
    // O workspace sem tela não desenha o pop-up: a grade vai para um div nosso.
    Object.assign(Blockly.DropDownDiv, {
      getContentDiv: () => conteudo,
      showPositionedByField: () => true,
    })
    try {
      campo.showEditor_()
    } finally {
      Object.assign(Blockly.DropDownDiv, originais)
    }
    return {
      grade: within(conteudo),
      conteudo,
      fechar: () => {
        conteudo.remove()
        ws.dispose()
      },
    }
  }

  it('mostra o 📦 e troca pela miniatura quando ela fica pronta', async () => {
    trocarDesenhoDasMiniaturasParaTestes(async () => MINIATURA)
    const { grade, conteudo, fechar } = abrirGrade([modelo('heroi', 'heroi')])
    try {
      const botao = grade.getByRole('button', { name: 'heroi' })
      expect(within(botao).getByText('📦')).not.toBeNull()
      await waitFor(() => expect(botao.querySelector(`img[src="${MINIATURA}"]`)).not.toBeNull())
      expect(within(botao).queryByText('📦')).toBeNull()
      expect(conteudo.querySelectorAll('img')).toHaveLength(1)
    } finally {
      fechar()
    }
  })

  it('reaberto, a grade já nasce com a miniatura', async () => {
    let chamadas = 0
    trocarDesenhoDasMiniaturasParaTestes(async () => {
      chamadas++
      return MINIATURA
    })
    const primeira = abrirGrade([modelo('heroi', 'heroi')])
    await waitFor(() =>
      expect(primeira.conteudo.querySelector(`img[src="${MINIATURA}"]`)).not.toBeNull(),
    )
    primeira.fechar()
    const segunda = abrirGrade([modelo('heroi', 'heroi')])
    try {
      const botao = segunda.grade.getByRole('button', { name: 'heroi' })
      expect(botao.querySelector(`img[src="${MINIATURA}"]`)).not.toBeNull()
      expect(chamadas).toBe(1)
    } finally {
      segunda.fechar()
    }
  })
})
