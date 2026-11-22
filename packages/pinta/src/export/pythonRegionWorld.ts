/** Private, engine-independent PNG-5 world admission. No pixel surfaces or public recipes. */
import {
  PINTA_REGION_IMAGE_MAX_INDEX_BYTES,
  PINTA_REGION_IMAGE_MAX_JSON_BYTES,
} from '@sistemazero/core/studio/pinta-region-image'
import { pythonJsonWire } from './pythonJsonWire'
import { pythonPngText } from './pythonPngText'
import { pythonSceneDocument } from './pythonSceneDocument'
import { PINTA_REGION_IMAGE_PNG_LIMITS } from './regionImageLimits'

const limits = PINTA_REGION_IMAGE_PNG_LIMITS
export const pythonRegionWorld = `${pythonPngText}
${pythonJsonWire}
${pythonSceneDocument}
from types import MappingProxyType

_PINTA_IMAGE_SCHEMA=_SCENE_TABLE['image']
_PINTA_WORLD_MAX_INDICES=${PINTA_REGION_IMAGE_MAX_INDEX_BYTES}
_PINTA_WORLD_MAX_TEXT=${PINTA_REGION_IMAGE_MAX_JSON_BYTES}
_PINTA_WORLD_MAX_PIXELS=${limits.totalImagePixels}

def _pinta_round_positive(value):
    # Avoid floor(value+0.5): addition can round a value just below 0.5 up to 1.
    lower=math.floor(value)
    return lower+1 if value-lower>=0.5 else lower

class _PlanoImagem:
    __slots__=('_data','_scene','_id','_name','_scale','_bytes','_world','_images')

    def __init__(self,data,scene):
        self._data,self._scene=data,scene
        self._id,self._name,self._scale,self._bytes=scene.id,data['name'],data['scale'],scene.index_bytes
        world=data.get('world')
        self._world=None if world is None else MappingProxyType({'rootId':world['rootId'],'maps':tuple(MappingProxyType(dict(item)) for item in world['maps'])})
        source=data['scene']
        self._images=tuple((t['image'],min(t['columns'],t['count'])*source['tileSize'],math.ceil(t['count']/t['columns'])*source['tileSize'],False) for t in source['tilesets'])+tuple((a['image'],a['width'],a['height'],True) for a in source.get('art',[]))

    @property
    def id(self):
        return self._id

    @property
    def name(self):
        return self._name

    @property
    def scale(self):
        return self._scale

    @property
    def index_bytes(self):
        return self._bytes

    @property
    def world(self):
        return self._world

    @property
    def image_refs(self):
        return self._images

    def decode(self):
        data,scene=self._data,self._scene
        self._data,self._scene=None,None
        if data is None:
            return None
        decoded=scene.decode()
        if decoded is None:
            return None
        data['scene']=decoded
        return data

def preparar_imagem(text,max_index_bytes=_PINTA_WORLD_MAX_INDICES):
    """Metadata/header plan only. Captured JSON stays private until one decode attempt."""
    try:
        if type(text) is not str or len(text)>_PINTA_WORLD_MAX_TEXT or len(text.encode('utf-8'))>_PINTA_WORLD_MAX_TEXT or not _region_integer(max_index_bytes) or max_index_bytes<0 or max_index_bytes>_PINTA_WORLD_MAX_INDICES:
            return None
        data=_pinta_parse_json(text)
        if not _scene_schema(data,_PINTA_IMAGE_SCHEMA,_PINTA_IMAGE_SCHEMA):
            return None
        source=data['scene']
        if type(source) is not dict or source.get('name')!=data['name'] or 'id' not in source or source.get('physics') not in ('legacy','precise') or not _scene_number(source.get('tileSize')) or 'world' in data and data['world']['rootId']!=source['id']:
            return None
        size=source['tileSize']*data['scale']
        if size<1 or size>_PINTA_PNG_MAX_SIDE or abs(size-_pinta_round_positive(size))>1e-9:
            return None
        # Core admits JSON.stringify(raw.scene), not Python's default JSON spelling.
        source,wire_bytes=_pinta_json_project(source,_SCENE_MAX_JSON)
        scene=_preparar_cena_valor(source,max_index_bytes)
        if scene is None:
            return None
        data['scene']=source
        data=_scene_native(data,_PINTA_IMAGE_SCHEMA,_PINTA_IMAGE_SCHEMA)
        return _PlanoImagem(data,scene)
    except (ValueError,TypeError,KeyError,OverflowError,RecursionError):
        return None

def ler_mundo_png(source):
    """Capture all PNGs/headers/resources before chunks; return the complete registry only."""
    root=ler_texto_png(source)
    metadata_bytes=len(root['text'].encode('utf-8'))
    root_plan=preparar_imagem(root['text'])
    if root_plan is None:
        _png_invalid()
    plans=[root_plan]
    covers={root_plan.id:{key:root[key] for key in ('png','width','height')}}
    image_pixels=root['width']*root['height']
    root=None
    index_bytes=root_plan.index_bytes
    for descriptor in (() if root_plan.world is None else root_plan.world['maps']):
        child_source=png_da_url(descriptor['png'])
        child=ler_texto_png(child_source['png'],_PINTA_WORLD_MAX_TEXT-metadata_bytes)
        metadata_bytes+=len(child['text'].encode('utf-8'))
        image_pixels+=child['width']*child['height']
        if metadata_bytes>_PINTA_WORLD_MAX_TEXT or image_pixels>_PINTA_WORLD_MAX_PIXELS:
            _png_limit()
        plan=preparar_imagem(child['text'],_PINTA_WORLD_MAX_INDICES-index_bytes)
        if plan is None or plan.world is not None or plan.id!=descriptor['id'] or plan.name!=descriptor['name'] or plan.scale!=root_plan.scale:
            _png_invalid()
        index_bytes+=plan.index_bytes
        plans.append(plan)
        covers[plan.id]={key:child[key] for key in ('png','width','height')}
        child=None
    images={}
    # Pixel/header admission precedes cell allocation too. No engine surfaces here.
    for plan in plans:
        for url,width,height,exact in plan.image_refs:
            image=images.get(url)
            if image is None:
                captured=png_da_url(url)
                scaled_width=_pinta_round_positive(captured['width']*plan.scale)
                scaled_height=_pinta_round_positive(captured['height']*plan.scale)
                if scaled_width<1 or scaled_height<1 or scaled_width>_PINTA_PNG_MAX_SIDE or scaled_height>_PINTA_PNG_MAX_SIDE or scaled_width*scaled_height>_PINTA_PNG_MAX_PIXELS:
                    _png_limit()
                image_pixels+=max(captured['width']*captured['height'],scaled_width*scaled_height)
                if image_pixels>_PINTA_WORLD_MAX_PIXELS:
                    _png_limit()
                image=dict(captured,scaledWidth=scaled_width,scaledHeight=scaled_height)
                images[url]=image
            if exact and (image['width']!=width or image['height']!=height) or not exact and (image['width']<width or image['height']<height):
                _png_invalid()
    maps={}
    for plan in plans:
        data=plan.decode()
        if data is None:
            _png_invalid()
        maps[plan.id]=dict(covers[plan.id],data=data)
    return {'rootId':root_plan.id,'maps':maps,'images':images,'imagePixels':image_pixels}
`
