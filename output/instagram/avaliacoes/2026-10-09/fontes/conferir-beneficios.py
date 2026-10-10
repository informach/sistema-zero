import json, subprocess
from pathlib import Path
from faster_whisper import WhisperModel

root=Path(__file__).resolve().parent
selections=[('daniel',0,39),('flavia',0,33)]
for name,start,duration in selections:
    subprocess.run(['ffmpeg','-y','-ss',str(start),'-i',str(root/f'{name}.wav'),'-t',str(duration),'-ar','16000','-ac','1',str(root/f'{name}-beneficios.wav')],check=True,capture_output=True)
model=WhisperModel('medium',device='cpu',compute_type='int8',cpu_threads=6)
for name,start,duration in selections:
    segments,info=model.transcribe(str(root/f'{name}-beneficios.wav'),language='pt',beam_size=5,word_timestamps=True,condition_on_previous_text=False)
    result=[{'start':s.start+start,'end':s.end+start,'text':s.text.strip(),'words':[{'start':w.start+start,'end':w.end+start,'text':w.word} for w in s.words]} for s in segments]
    (root/f'{name}-beneficios-conferidos.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(name,json.dumps([{'start':s['start'],'end':s['end'],'text':s['text']} for s in result],ensure_ascii=False),flush=True)
