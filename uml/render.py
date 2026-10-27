import os,subprocess,sys
sys.path.insert(0,'.')
from model import *
os.makedirs('puml',exist_ok=True)
files={'00_class.puml':CLASS,'01_usecase.puml':USECASE}
for u in UCS:
    n=u['id'].replace('-','_')
    files[f'uc{n}_robustness.puml']=u['robust']; files[f'uc{n}_sequence.puml']=u['seq']
for f,t in files.items(): open('puml/'+f,'w').write(t)
r=subprocess.run(['java','-jar','plantuml.jar','-tsvg','-charset','UTF-8','-o','../svg','puml/*.puml'],capture_output=True,text=True)
print(r.stdout[-2000:], '\n'.join(l for l in r.stderr.splitlines() if 'JAVA_TOOL' not in l)[-3000:])
