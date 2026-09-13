"""Publish only validated JEJU oldtown static files; preserve account settings and workflows."""
import os,json,subprocess,tempfile,shutil,pathlib,urllib.request,urllib.error,time,hashlib,datetime
REPO='kokoom94-ai/jeju-oldtown-3d'; BRANCH='jeju-precision-site'
BASE='https://kokoom94-ai.github.io/jeju-oldtown-3d/'
EXPECTED='51f153beb5988b0daa5da7d9fc8be1ae0a3f8de5'
assert os.environ['GITHUB_REPOSITORY']==REPO
assert os.environ['GITHUB_REF_NAME']=='fix/sdk-bootstrap-3-7-1'
def git(*args,cwd=None):return subprocess.check_output(['git',*args],cwd=cwd,text=True).strip()
assert git('remote','get-url','origin').removesuffix('.git')=='https://github.com/'+REPO
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None
opener=urllib.request.build_opener(NoRedirect)
def api(suffix,method='GET'):
    assert suffix.startswith('/') and '..' not in suffix
    req=urllib.request.Request('https://api.github.com/repos/'+REPO+suffix,method=method,headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'JEJU-SDK-Fix'})
    try:
        with opener.open(req,timeout=20) as r:return r.status,json.loads(r.read())
    except urllib.error.HTTPError as e:return e.code,{}
code,pages=api('/pages')
assert code==200 and pages.get('source')=={'branch':BRANCH,'path':'/'} and pages.get('build_type')=='legacy' and not pages.get('cname'), 'Pages source changed; no settings are modified'
code,validation=api('/actions/runs/34729061779')
assert code==200 and validation.get('conclusion')=='success','Reviewed validation run has not succeeded'
root=pathlib.Path('_precision_site').resolve();meta=json.loads((root/'site.json').read_text())
assert meta['repository']==REPO and meta['version']=='3.7.1-sdk-diagnostics'
assert (root/'sdk-frame.html').is_file() and not (root/'.github').exists()
old_before=git('ls-remote','--heads','https://github.com/kokoom94-ai/jeju-now-981.git')
main_before=git('ls-remote','origin','refs/heads/main')
remote=git('ls-remote','origin','refs/heads/'+BRANCH).split()[0]
assert remote==EXPECTED,'Static branch changed concurrently; review before publishing'
regression=json.loads(pathlib.Path('precision-qa/sdk-regression.json').read_text())
assert not regression['failures'] and regression['passed']==regression['total'] and regression['total']>0
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'runId':os.environ['GITHUB_RUN_ID'],'sourceCommit':git('rev-parse','HEAD'),'sourceBranch':os.environ['GITHUB_REF_NAME'],'siteBefore':remote,'pagesSettingChanged':False,'actualKeyUsed':False,'sdkLiveTested':False,'geometryVerified':False,'productionReady':False,'oldRepositoryWriteOperations':0}
temp=tempfile.mkdtemp(prefix='jeju-sdk-site-');added=False
try:
    git('fetch','--no-tags','origin','refs/heads/'+BRANCH)
    assert git('rev-parse','FETCH_HEAD')==EXPECTED
    git('worktree','add','--detach',temp,'FETCH_HEAD');added=True
    assert json.loads(pathlib.Path(temp,'site.json').read_text())['repository']==REPO
    shutil.copytree(root,temp,dirs_exist_ok=True)
    # Keep .github recovery workflows. Never change another branch or settings.
    git('add','--all',cwd=temp)
    assert not any(p.startswith('.github/') for p in git('diff','--cached','--name-only',cwd=temp).splitlines())
    git('-c','user.name=JEJU Oldtown build','-c','user.email=oldtown-build@users.noreply.github.com','commit','-m','Publish SDK bootstrap fixes 3.7.1; live provider still unverified',cwd=temp)
    report['siteCommit']=git('rev-parse','HEAD',cwd=temp)
    git('push','origin','HEAD:refs/heads/'+BRANCH,cwd=temp)
finally:
    if added:git('worktree','remove','--force',temp)
    shutil.rmtree(temp,ignore_errors=True)
code,_=api('/pages/builds','POST');report['buildRequestCode']=code
checks=[]
for attempt in range(18):
    checks=[]
    for name in ['', 'index.html','connect.html','explore.mjs','bridge.mjs','sdk-frame.html','sdk-frame.mjs','sdk-frame-host.mjs','sdk-guard.mjs','sdk-diagnostics.mjs','session.mjs','site.json']:
        local=root/(name or 'index.html');expected=hashlib.sha256(local.read_bytes()).hexdigest()
        try:
            req=urllib.request.Request(BASE+name,headers={'User-Agent':'JEJU-public-integrity','Cache-Control':'no-cache'})
            with opener.open(req,timeout=15) as r:
                body=r.read(1000000);mime=r.headers.get('Content-Type','').split(';')[0]
                allowed=['text/html'] if local.suffix=='.html' else ['application/json'] if local.suffix=='.json' else ['text/javascript','application/javascript']
                ok=r.status==200 and hashlib.sha256(body).hexdigest()==expected and mime in allowed
                checks.append({'path':name or '/','status':r.status,'matches':ok})
        except urllib.error.HTTPError as e:checks.append({'path':name or '/','status':e.code,'matches':False})
        except Exception:checks.append({'path':name or '/','status':0,'matches':False})
    if all(c['matches'] for c in checks):break
    time.sleep(6)
report['publicChecks']=checks;report['publicSiteVerified']=all(c['matches'] for c in checks)
report['oldRefsUnchanged']=old_before==git('ls-remote','--heads','https://github.com/kokoom94-ai/jeju-now-981.git')
report['mainUnchanged']=main_before==git('ls-remote','origin','refs/heads/main')
pathlib.Path('precision-qa/sdk-deploy.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
assert report['publicSiteVerified'] and report['oldRefsUnchanged'] and report['mainUnchanged'],'Public bytes or protected refs are not verified'
