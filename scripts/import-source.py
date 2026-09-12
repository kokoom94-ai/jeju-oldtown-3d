"""One-time, pinned import. Never writes to the original repository."""
import io, json, os, re, shutil, sys, urllib.request, zipfile, hashlib
from pathlib import Path, PurePosixPath
REPO = 'kokoom94-ai/jeju-oldtown-3d'
SOURCE = 'kokoom94-ai/jeju-now-981'
COMMIT = '8ea4d1bd79c0ccb0632258e6899ffe345a2fa3eb'
ROOT = Path.cwd()
if os.environ.get('GITHUB_REPOSITORY', REPO) != REPO or os.environ.get('GITHUB_REF_NAME', 'jeju-before-web') != 'jeju-before-web':
    raise SystemExit('Unexpected repository or branch')
if (ROOT/'SOURCE.json').exists():
    if json.loads((ROOT/'SOURCE.json').read_text())['targetRepository'] != REPO:
        raise SystemExit('Unexpected source marker')
    print('Already imported; keeping current development files.'); sys.exit(0)
excluded = {'precision/README.md', 'precision/CONNECT_3_2.md', 'precision/prepare.mjs', 'precision/publish.mjs', 'precision/readiness.mjs', 'precision/publication.json', 'precision/readiness.json', 'precision/browser-result.json', 'precision/proxy-browser-result.json', 'realism/publication.json', 'realism/browser-result.json', 'realism/verify.cjs'}
def allowed(name):
    p = PurePosixPath(name)
    if p.is_absolute() or '..' in p.parts or name in excluded: return False
    if p.name.startswith('.') and p.name not in {'.gitignore', '.env.example'}: return False
    return name in {'index.html', 'real.html'} or p.parts[0] in {'precision', 'realism'}
files = {}
if len(sys.argv) == 2:
    source = Path(sys.argv[1])
    files = {p.relative_to(source).as_posix(): p.read_bytes() for p in source.rglob('*') if p.is_file() and allowed(p.relative_to(source).as_posix())}
else:
    url = f'https://codeload.github.com/{SOURCE}/zip/{COMMIT}'
    req = urllib.request.Request(url, headers={'User-Agent': 'JejuOldtownPinnedMigration/3.3'})
    with urllib.request.urlopen(req, timeout=60) as r: data = r.read(40*1024*1024+1)
    if len(data)>40*1024*1024: raise SystemExit('Archive size exceeded')
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for entry in z.infolist():
            name='/'.join(PurePosixPath(entry.filename).parts[1:])
            if entry.is_dir() or not name or not allowed(name): continue
            if (entry.external_attr>>16)&0o170000 == 0o120000: raise SystemExit('Symlink rejected')
            if entry.file_size > 16*1024*1024: raise SystemExit('File too large')
            files[name]=z.read(entry)
if not {'index.html','real.html','precision/app.mjs','realism/world-v2.json'}.issubset(files):
    raise SystemExit('Required source files missing')
manifest=[]
for name, data in sorted(files.items()):
    p=ROOT/name; p.parent.mkdir(parents=True,exist_ok=True)
    # Keep legacy application bytes intact. Only precision configuration is rebased.
    if name.startswith('precision/') or name == 'realism/acquire.mjs':
        text=data.decode('utf-8').replace(SOURCE,REPO).replace('https://kokoom94-ai.github.io/jeju-now-981/','https://kokoom94-ai.github.io/jeju-oldtown-3d/').replace('3.2.0-proxy-bootstrap','3.3.0-oldtown-isolated').replace('jeju-precision-proxy.onrender.com','jeju-oldtown-3d-proxy.onrender.com').replace('name: jeju-precision-proxy','name: jeju-oldtown-3d-proxy')
        data2=text.encode()
    else: data2=data
    p.write_bytes(data2)
    manifest.append({'path':name,'sourceSha256':hashlib.sha256(data).hexdigest()})
# Allow exactly the new Pages app path; do not inherit another project's hosting trust.
p=ROOT/'precision/session.mjs';s=p.read_text()
s=s.replace("const owned=['https://kokoom94-ai.github.io','https://jeju-before-walk.netlify.app'].includes(u.origin);", "const owned=u.origin==='https://kokoom94-ai.github.io' && (u.pathname==='/jeju-oldtown-3d/' || u.pathname==='/jeju-oldtown-3d/index.html');")
p.write_text(s)
p=ROOT/'precision/session.test.mjs';s=p.read_text().replace("test('dedicated Netlify origin allowed',()=>assert.equal(hostPolicy('https://jeju-before-walk.netlify.app').canConnect,true));", "test('old Netlify host is not trusted by the new app',()=>assert.equal(hostPolicy('https://jeju-before-walk.netlify.app').canConnect,false));")
s += "\ntest('another Pages project cannot enter a key',()=>{for(const url of ['https://kokoom94-ai.github.io/jeju-now-981/','https://kokoom94-ai.github.io/jeju-oldtown-3d-evil/','https://kokoom94-ai.github.io/'])assert.equal(hostPolicy(url).canConnect,false);});\n"
p.write_text(s)
p=ROOT/'precision/index.html';s=p.read_text().replace('PRECISION 3.2','PRECISION 3.3').replace('CONNECT_3_2.md','CONNECT.md')
s=re.sub(r'https://rawcdn\.githack\.com/[^\"]+/real\.html','legacy/real.html',s)
s=s.replace('기존 도보 베타 ↗','추정형 도보 베타 ↗')
s=s.replace('발급받은 키의 서비스 URL과 WebGL 3D 권한을 확인하세요.', '저장소가 분리됐습니다. 브이월드 인증키 관리에서 서비스 URL을 위 새 주소와 일치시키고 WebGL 3D 권한을 확인하세요.')
p.write_text(s)
# Retained provider bridge: no real SDK request is made by this import.
(ROOT/'.gitignore').write_text('node_modules/\n_precision_site/\nprecision-qa/\n.env\n.env.*\n!.env.example\n*.log\n')
(ROOT/'package.json').write_text(json.dumps({'name':'jeju-oldtown-3d','version':'3.3.0','private':True,'type':'module','engines':{'node':'>=22'},'scripts':{'build':'node precision/prepare.mjs','test':'node --test precision/*.test.mjs','serve':'node scripts/serve.mjs','proxy':'node precision/proxy-server.mjs'}},indent=2)+'\n')
(ROOT/'SOURCE.json').write_text(json.dumps({'sourceRepository':SOURCE,'sourceCommit':COMMIT,'targetRepository':REPO,'version':'3.3.0-oldtown-isolated','importedFiles':manifest,'oldRepositoryWriteOperations':0,'oldDeploymentWorkflowsImported':False,'credentialsImported':False,'providerLiveValidated':False},ensure_ascii=False,indent=2)+'\n')
print('Imported',len(files),'files from pinned source; no original repository writes.')
