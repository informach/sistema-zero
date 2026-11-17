import {
  type CamadaDeCenario,
  type ComandoDeCenario,
  type DocumentoDeCenario,
  indiceDaOrganizacao,
} from '@sistemazero/molda-cenarios-core/v2'
import { Eye, EyeOff, Lock, LockOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { type JSX, useMemo, useState } from 'react'
import { novoIdAleatorio } from '../acoes'
import { DialogoDeApagar, DialogoDeNome } from '../pecas'

export function Camadas({
  documento,
  selecao,
  executar,
}: {
  documento: DocumentoDeCenario
  selecao: readonly string[]
  executar(comandos: ComandoDeCenario[]): boolean
}): JSX.Element {
  const [janela, setJanela] = useState<
    { tipo: 'criar' } | { tipo: 'nome' | 'apagar'; id: string } | null
  >(null)
  const camada =
    janela && 'id' in janela ? documento.camadas?.find((c) => c.id === janela.id) : undefined
  const camadas = documento.camadas ?? []
  const indice = useMemo(() => indiceDaOrganizacao(documento), [documento])
  const usadas = new Set(selecao.map((id) => indice.entidades.get(id)?.camada ?? ''))
  const trancado = !selecao.length || selecao.some((id) => indice.flags.get(id)?.bloqueado)
  const unica = usadas.size === 1 ? [...usadas][0]! : '*'
  const exigir = (comandos: ComandoDeCenario[]) => {
    if (!executar(comandos))
      throw Error('Não consegui alterar a camada. Confira a mensagem da oficina.')
  }
  const atualizar = (c: CamadaDeCenario, a: Partial<CamadaDeCenario>) =>
    executar([{ tipo: 'camada.definir', camada: { ...c, ...a } }])
  return (
    <section className="mcn-painel-corpo" aria-label="Camadas do cenário">
      <button
        type="button"
        className="sz-tool-pill sz-tool-pill--outline"
        disabled={camadas.length >= 128}
        onClick={() => setJanela({ tipo: 'criar' })}
      >
        <Plus aria-hidden="true" />
        Criar camada
      </button>
      <label className="mcn-campo">
        Camada dos escolhidos
        <select
          className="sz-tool-select"
          aria-label="Camada dos escolhidos"
          value={unica}
          disabled={trancado}
          onChange={(e) =>
            executar([
              {
                tipo: 'elementos.organizar',
                ids: [...selecao],
                destino: { camada: e.target.value || null },
              },
            ])
          }
        >
          <option value="*" disabled>
            {selecao.length ? 'Várias camadas' : 'Escolha objetos'}
          </option>
          <option value="">Sem camada</option>
          {camadas.map((c) => (
            <option key={c.id} value={c.id} disabled={c.bloqueado}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-mld-muted">
        Ocultar ou trancar uma camada também afeta os objetos das pastas que estão nela.
      </p>
      {!camadas.length ? (
        <p className="text-sm text-mld-muted">Crie uma camada para organizar partes do cenário.</p>
      ) : null}
      <ul className="mcn-camadas" aria-label="Lista de camadas">
        {camadas.map((c) => (
          <li key={c.id}>
            <span className="min-w-0 flex-1 truncate font-semibold" title={c.nome}>
              {c.nome}
            </span>
            <button
              type="button"
              className="mld-tree-action"
              disabled={c.bloqueado}
              aria-label={`Ocultar camada ${c.nome}`}
              aria-pressed={c.oculto}
              title={c.oculto ? `Mostrar ${c.nome}` : `Ocultar ${c.nome}`}
              onClick={() => atualizar(c, { oculto: !c.oculto })}
            >
              {c.oculto ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
            <button
              type="button"
              className="mld-tree-action"
              aria-label={`Trancar camada ${c.nome}`}
              aria-pressed={c.bloqueado}
              onClick={() => atualizar(c, { bloqueado: !c.bloqueado })}
            >
              {c.bloqueado ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
            </button>
            <button
              type="button"
              className="mld-tree-action"
              aria-label={`Renomear camada ${c.nome}`}
              disabled={c.bloqueado}
              onClick={() => setJanela({ tipo: 'nome', id: c.id })}
            >
              <Pencil aria-hidden="true" />
            </button>
            <button
              type="button"
              className="mld-tree-action"
              aria-label={`Apagar camada ${c.nome}`}
              disabled={c.bloqueado}
              onClick={() => setJanela({ tipo: 'apagar', id: c.id })}
            >
              <Trash2 aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {janela?.tipo === 'criar' ? (
        <DialogoDeNome
          titulo="Criar camada"
          inicial="Nova camada"
          acao="Criar camada"
          aoFechar={() => setJanela(null)}
          aoConfirmar={(nome) =>
            exigir([
              {
                tipo: 'camada.definir',
                camada: { id: novoIdAleatorio(), nome, oculto: false, bloqueado: false },
              },
            ])
          }
        />
      ) : null}
      {janela?.tipo === 'nome' && camada ? (
        <DialogoDeNome
          titulo="Renomear camada"
          inicial={camada.nome}
          acao="Guardar nome"
          aoFechar={() => setJanela(null)}
          aoConfirmar={(nome) => exigir([{ tipo: 'camada.definir', camada: { ...camada, nome } }])}
        />
      ) : null}
      {janela?.tipo === 'apagar' && camada ? (
        <DialogoDeApagar
          titulo={`Apagar ${camada.nome}?`}
          texto="Os objetos ficam no cenário, fora desta camada."
          aoFechar={() => setJanela(null)}
          aoConfirmar={() =>
            exigir([{ tipo: 'camada.remover', id: camada.id, transferirPara: null }])
          }
        />
      ) : null}
    </section>
  )
}
