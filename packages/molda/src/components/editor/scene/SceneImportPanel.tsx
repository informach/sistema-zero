import { useState } from 'react'
import { COPY } from '../../../core/copy'
import { NATIVE_IMPORT_COPY as copy } from '../../../core/nativeImportCopy'
import { DeferredModule } from '../DeferredEditor'
import type { SceneImportPanelProps } from './sceneImportPanelTypes'
import { importChoice } from './sceneImportStyles'

const loaders = {
  gltf: () => import('./SceneGltfImportPanel').then((module) => module.SceneGltfImportPanel),
  obj: () => import('./SceneObjImportPanel').then((module) => module.SceneObjImportPanel),
  bbmodel: () =>
    import('./SceneBbmodelImportPanel').then((module) => module.SceneBbmodelImportPanel),
}
const formats = { gltf: copy.gltfFormat, obj: copy.objFormat, bbmodel: copy.bbmodelFormat }

/** Switching formats unmounts the old revision-owned task; no files/consent leak across formats. */
export function SceneImportPanel(props: SceneImportPanelProps) {
  const [format, setFormat] = useState<keyof typeof formats>('gltf')
  return (
    <div className="space-y-4">
      <fieldset className="rounded-xl border border-mld-border p-3">
        <legend className="px-1 font-bold">{copy.format}</legend>
        <p className="text-sm text-mld-muted">{copy.formatHint}</p>
        <div className="flex flex-wrap gap-2">
          {(['gltf', 'obj', 'bbmodel'] as const).map((value) => (
            <label key={value} className={importChoice}>
              <input
                type="radio"
                name="nativeImportFormat"
                className="mt-0.5 size-5 shrink-0 accent-mld-accent"
                checked={format === value}
                onChange={() => setFormat(value)}
              />
              {formats[value]}
            </label>
          ))}
        </div>
      </fieldset>
      <DeferredModule
        key={format}
        load={loaders[format]}
        props={props}
        onBack={props.onClose}
        backLabel={COPY.scene.glbExport.close}
      />
    </div>
  )
}
