import { OBJ_IMPORT_COPY as copy } from '../../../core/objImportCopy'
import type { ObjNativeOptions, readObjNativeOptions } from '../../../import/objNativeOptions'
import { SceneImportSelect as Select } from './SceneImportSelect'
import { importChoice as choice, importDisclosure as disclosure } from './sceneImportStyles'

type Options = ReturnType<typeof readObjNativeOptions>
type Props = { options: Options; change(options: ObjNativeOptions): void }
const repeated = [
  ['reject', copy.reject],
  ['first', copy.first],
  ['last', copy.last],
] as const
const spaces = [
  ['linear', copy.linear],
  ['srgb', copy.srgb],
] as const
function Conflicts({ options, change }: Props) {
  const materials = options.materials,
    appearance = options.appearance,
    base = appearance.base,
    textures = appearance.textures
  return (
    <fieldset className="space-y-3">
      <legend className="py-2 font-bold">{copy.conflicts}</legend>
      <Select
        label={copy.libraryMode}
        name="objLibraryMode"
        value={materials.libraryMode}
        choices={[
          ['single', copy.librarySingle],
          ['declaration', copy.libraryDeclaration],
          ['all', copy.libraryAll],
        ]}
        change={(libraryMode) => change({ ...options, materials: { ...materials, libraryMode } })}
      />
      <Select
        label={copy.duplicateMaterials}
        name="objDuplicateMaterials"
        value={materials.duplicateMaterials}
        choices={repeated}
        change={(duplicateMaterials) =>
          change({ ...options, materials: { ...materials, duplicateMaterials } })
        }
      />
      <Select
        label={copy.missingMaterials}
        name="objMissingMaterials"
        value={materials.missingMaterials}
        choices={[
          ['reject', copy.reject],
          ['default', copy.defaultMaterial],
        ]}
        change={(missingMaterials) =>
          change({ ...options, materials: { ...materials, missingMaterials } })
        }
      />
      <Select
        label={copy.repeatedProperties}
        name="objRepeatedProperties"
        value={base.repeatedProperties}
        choices={repeated}
        change={(repeatedProperties) =>
          change({
            ...options,
            appearance: { ...appearance, base: { ...base, repeatedProperties } },
          })
        }
      />
      <Select
        label={copy.repeatedOptions}
        name="objRepeatedOptions"
        value={textures.repeatedOptions}
        choices={repeated}
        change={(repeatedOptions) =>
          change({
            ...options,
            appearance: { ...appearance, textures: { ...textures, repeatedOptions } },
          })
        }
      />
      <Select
        label={copy.roleConflicts}
        name="objRoleConflicts"
        value={textures.roleConflicts}
        choices={repeated}
        change={(roleConflicts) =>
          change({
            ...options,
            appearance: { ...appearance, textures: { ...textures, roleConflicts } },
          })
        }
      />
      <Select
        label={copy.opacityConflict}
        name="objOpacityConflict"
        value={base.opacityConflict}
        choices={[
          ['reject', copy.reject],
          ['d', copy.opacityD],
          ['Tr', copy.opacityTr],
        ]}
        change={(opacityConflict) =>
          change({ ...options, appearance: { ...appearance, base: { ...base, opacityConflict } } })
        }
      />
    </fieldset>
  )
}
function Maps({ options, change }: Props) {
  const appearance = options.appearance,
    base = appearance.base,
    textures = appearance.textures
  return (
    <fieldset className="space-y-3">
      <legend className="py-2 font-bold">{copy.maps}</legend>
      <Select
        label={copy.unsupportedMaps}
        name="objUnsupportedMaps"
        value={textures.unsupportedMaps}
        choices={[
          ['reject', copy.reject],
          ['omit', copy.omitMaps],
        ]}
        change={(unsupportedMaps) =>
          change({
            ...options,
            appearance: { ...appearance, textures: { ...textures, unsupportedMaps } },
          })
        }
      />
      <Select
        label={copy.bump}
        name="objBump"
        value={textures.bump}
        choices={[
          ['reject', copy.reject],
          ['normal', copy.bumpNormal],
        ]}
        change={(bump) =>
          change({ ...options, appearance: { ...appearance, textures: { ...textures, bump } } })
        }
      />
      <Select
        label={copy.specularMap}
        name="objSpecularMap"
        value={textures.specularMap}
        choices={[
          ['reject', copy.reject],
          ['roughness', copy.roughnessMap],
        ]}
        change={(specularMap) =>
          change({
            ...options,
            appearance: { ...appearance, textures: { ...textures, specularMap } },
          })
        }
      />
      <Select
        label={copy.transparencyMap}
        name="objTransparencyMap"
        value={textures.transparencyMap}
        choices={[
          ['reject', copy.reject],
          ['opacity', copy.opacityMap],
          ['transparency', copy.invertedOpacityMap],
        ]}
        change={(transparencyMap) =>
          change({
            ...options,
            appearance: { ...appearance, textures: { ...textures, transparencyMap } },
          })
        }
      />
      <Select
        label={copy.phongRoughness}
        name="objPhongRoughness"
        value={base.phongRoughness}
        choices={[
          ['reject', copy.reject],
          ['blender', copy.blenderRoughness],
        ]}
        change={(phongRoughness) =>
          change({ ...options, appearance: { ...appearance, base: { ...base, phongRoughness } } })
        }
      />
      <Select
        label={copy.illumination}
        name="objIllumination"
        value={base.illumination}
        choices={[
          ['reject', copy.reject],
          ['pbr', copy.pbrIllumination],
        ]}
        change={(illumination) =>
          change({ ...options, appearance: { ...appearance, base: { ...base, illumination } } })
        }
      />
      <Select
        label={copy.opacitySampling}
        name="objOpacitySampling"
        value={options.images.opacitySampling}
        choices={[
          ['reject', copy.reject],
          ['nearest', copy.nearestOpacity],
        ]}
        change={(opacitySampling) =>
          change({ ...options, images: { ...options.images, opacitySampling } })
        }
      />
      <Select
        label={copy.emptyObjects}
        name="objEmptyObjects"
        value={options.hierarchy.emptyObjects}
        choices={[
          ['preserve', copy.preserveEmpty],
          ['omit', copy.omitEmpty],
        ]}
        change={(emptyObjects) => change({ ...options, hierarchy: { emptyObjects } })}
      />
    </fieldset>
  )
}
export function SceneObjImportOptions({ options, change }: Props) {
  const appearance = options.appearance,
    base = appearance.base,
    textures = appearance.textures
  return (
    <section
      aria-label={copy.appearance}
      className="space-y-3 rounded-xl border border-mld-border bg-mld-bg p-3"
    >
      <h3 className="font-bold">{copy.appearance}</h3>
      <p className="text-sm leading-relaxed text-mld-muted">{copy.appearanceHint}</p>
      <label className={choice}>
        <input
          type="checkbox"
          name="objDoubleSided"
          className="mt-0.5 size-5 shrink-0 accent-mld-accent"
          checked={options.images.doubleSided}
          onChange={(event) =>
            change({ ...options, images: { ...options.images, doubleSided: event.target.checked } })
          }
        />
        {copy.doubleSided}
      </label>
      <label className={choice}>
        <input
          type="checkbox"
          name="objColorAlpha"
          className="mt-0.5 size-5 shrink-0 accent-mld-accent"
          checked={options.images.colorAlpha === 'multiply'}
          onChange={(event) =>
            change({
              ...options,
              images: {
                ...options.images,
                colorAlpha: event.target.checked ? 'multiply' : 'ignore',
              },
            })
          }
        />
        {copy.colorAlpha}
      </label>
      <Select
        label={copy.normalY}
        name="objNormalY"
        value={options.images.normalY}
        choices={[
          ['positive', copy.normalPositive],
          ['negative', copy.normalNegative],
        ]}
        change={(normalY) => change({ ...options, images: { ...options.images, normalY } })}
      />
      <details>
        <summary className={disclosure}>{copy.colorSpaces}</summary>
        <div className="space-y-3 py-2">
          <Select
            label={copy.baseSpace}
            name="objBaseSpace"
            value={base.rgbSpace}
            choices={spaces}
            change={(rgbSpace) =>
              change({ ...options, appearance: { ...appearance, base: { ...base, rgbSpace } } })
            }
          />
          <Select
            label={copy.colorSpace}
            name="objColorSpace"
            value={textures.colorSpace}
            choices={spaces}
            change={(colorSpace) =>
              change({
                ...options,
                appearance: { ...appearance, textures: { ...textures, colorSpace } },
              })
            }
          />
          <Select
            label={copy.scalarSpace}
            name="objScalarSpace"
            value={textures.scalarSpace}
            choices={spaces}
            change={(scalarSpace) =>
              change({
                ...options,
                appearance: { ...appearance, textures: { ...textures, scalarSpace } },
              })
            }
          />
        </div>
      </details>
      <details>
        <summary className={disclosure}>{copy.options}</summary>
        <p className="py-2 text-sm text-mld-muted">{copy.optionsHint}</p>
        <Conflicts options={options} change={change} />
        <Maps options={options} change={change} />
      </details>
    </section>
  )
}
