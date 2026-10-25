#!/usr/bin/python3
"""Run after deliberately editing this kit; never part of the installer."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]
sums={}
for p in sorted(root.rglob('*')):
 if not p.is_file() or any(x in p.parts for x in ['.git','__pycache__']):continue
 if p.name=='checksums.json' or p.suffix in ['.pyc','.log']:continue
 sums[str(p.relative_to(root))]=hashlib.sha256(p.read_bytes()).hexdigest()
(root/'checksums.json').write_text(json.dumps(sums,indent=2)+'\n')
print('Updated checksums for',len(sums),'files.')
