"""Publish tested static files only to the existing oldtown Pages branch."""
import os,json,subprocess,tempfile,shutil,pathlib,urllib.request,urllib.error,time,hashlib,datetime
REPO='kokoom94-ai/jeju-oldtown-3d';BRANCH='jeju-precision-site';BASE='https://kokoom94-ai.github.io/jeju-oldtown-3d/';EXPECTED='999b4955f7eb239974c3d1280140c700a2aa521a'
assert os.environ['GITHUB_REPOSITORY']==REPO and os.environ['GITHUB_REF_NAME']=='release/visitor-3-8'
def git(*args,cwd=None):return subprocess.check_output(['git',*args],cwd=cwd,text=True).strip()
assert git('remote','get-url','origin').removesuffix('.git')=='https://github.com/'+REPO
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a,**k):return None
opener=urllib.request.build_opener(NoRedirect)
def api(path,method='GET'):
 req=urllib.request.Request('https://api.github.com/repos/'+REPO+path,method=method,headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','User-Agent':'JEJU-BEFORE-release'})
 with opener.open(req,timeout=20) as r:return r.status,json.loads(r.read())
_,pages=api('/pages');assert pages.get('source')=={'branch':BRANCH,'path':'/'} and pages.get('build_type')=='legacy' and not pages.get('cname'),'Pages settings changed; leave unchanged'
root=pathlib.Path('_precision_site').resolve();meta=json.loads((root/'site.json').read_text());assert meta['repository']==REPO and meta['version']=='3.8.0-visitor-navigation'
r=json.loads(pathlib.Path('precision-qa/visitor-candidate.json').read_text());assert not r['failure'] and r['passed']==r['total'] and r['total']>50,'Mouse browser tests must pass before publication'
old_before=git('ls-remote','--heads','https://github.com/kokoom94-ai/jeju-now-981.git');main_before=git('ls-remote','origin','refs/heads/main');remote=git('ls-remote','origin','refs/heads/'+BRANCH).split()[0]
assert remote==EXPECTED,'Concurrent static-branch change; review before replacing'
temp=tempfile.mkdtemp();added=False;report={'repository':REPO,'sourceBranch':os.environ['GITHUB_REF_NAME'],'sourceCommit':git('rev-parse','HEAD'),'siteBefore':remote,'actualKeyUsed':False,'oldRepositoryWriteOperations':0,'pagesSettingsChanged':False,'publisherKeyConfigured':False}
try:
 git('fetch','--no-tags','origin','refs/heads/'+BRANCH);assert git('rev-parse','FETCH_HEAD')==EXPECTED
 git('worktree','add','--detach',temp,'FETCH_HEAD');added=True
 assert json.loads(pathlib.Path(temp,'site.json').read_text())['repository']==REPO
 # Keep the existing recovery workflow. Only update the built public bundle.
 shutil.copytree(root,temp,dirs_exist_ok=True);git('add','--all',cwd=temp)
 assert not any(n.startswith('.github/') for n in git('diff','--cached','--name-only',cwd=temp).splitlines())
 git('-c','user.name=JEJU Oldtown build','-c','user.email=oldtown-build@users.noreply.github.com','commit','-m','Publish mouse-tested 360 navigation and bounded street mode 3.8',cwd=temp)
 report['siteCommit']=git('rev-parse','HEAD',cwd=temp);git('push','origin','HEAD:refs/heads/'+BRANCH,cwd=temp)
finally:
 if added:git('worktree','remove','--force',temp)
 shutil.rmtree(temp,ignore_errors=True)
report['buildRequestCode']=api('/pages/builds','POST')[0]
paths=['','index.html','explore.mjs','bridge.mjs','navigation.mjs','walk.mjs','public-connection.json','session.mjs','sdk-frame.html','legacy/preview-flight.html','legacy/realism/flight-entry.js']
for attempt in range(20):
 checks=[]
 for name in paths:
  p=root/(name or 'index.html')
  try:
   req=urllib.request.Request(BASE+name,headers={'Cache-Control':'no-cache','User-Agent':'JEJU-verify'})
   with opener.open(req,timeout=15) as r:
    body=r.read(3000000);checks.append({'path':name or '/','status':r.status,'matches':hashlib.sha256(body).digest()==hashlib.sha256(p.read_bytes()).digest()})
  except Exception:checks.append({'path':name or '/','status':0,'matches':False})
 if all(c['matches'] for c in checks):break
 time.sleep(6)
report.update(publicChecks=checks,publicSiteVerified=all(c['matches'] for c in checks),oldRefsUnchanged=old_before==git('ls-remote','--heads','https://github.com/kokoom94-ai/jeju-now-981.git'),mainUnchanged=main_before==git('ls-remote','origin','refs/heads/main'),checkedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
pathlib.Path('precision-qa/visitor-deployment.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2));assert report['publicSiteVerified'] and report['oldRefsUnchanged'] and report['mainUnchanged']
