import json
from pathlib import Path
from faster_whisper import WhisperModel

root=Path(__file__).resolve().parent
model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=6)
for name in ['fernando','jeffrey']:
    segments, info=model.transcribe(str(root/f'{name}.wav'),language='pt',beam_size=5,vad_filter=True,condition_on_previous_text=False)
    result=[]
    for s in segments:
        item={'start':round(s.start,2),'end':round(s.end,2),'text':s.text.strip()}
        result.append(item)
        print(name, json.dumps(item,ensure_ascii=False),flush=True)
    (root/f'{name}-transcricao.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    (root/f'{name}-transcricao.txt').write_text('\n'.join(f"[{s['start']:.2f}–{s['end']:.2f}] {s['text']}" for s in result),encoding='utf-8')
