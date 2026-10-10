import json
from pathlib import Path
from faster_whisper import WhisperModel
root=Path(__file__).resolve().parent
model=WhisperModel('medium',device='cpu',compute_type='int8',cpu_threads=6)
for name in ['fernando','jeffrey']:
    segments,info=model.transcribe(str(root/f'{name}-trecho.wav'),language='pt',beam_size=5,word_timestamps=True,condition_on_previous_text=False)
    result=[{'start':s.start,'end':s.end,'text':s.text.strip(),'words':[{'start':w.start,'end':w.end,'text':w.word} for w in s.words]} for s in segments]
    (root/f'{name}-trecho-conferido.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(name,json.dumps(result,ensure_ascii=False),flush=True)
