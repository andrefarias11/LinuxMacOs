#!/usr/bin/python3
"""Restore the curated desktop snapshot, never a user's secrets or authentication."""
import argparse,datetime,hashlib,json,os,re,shutil,subprocess,tarfile,tempfile
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def run(argv):
 print('+',' '.join(map(str,argv)),flush=True);subprocess.run(list(map(str,argv)),check=True)
def validate_archive(p):
 with tarfile.open(p) as t:
  total=0
  for m in t:
   parts=Path(m.name).parts
   if m.name.startswith('/') or '..' in parts or not parts or parts[0] not in ['.themes','.local'] or m.issym() or m.islnk() or not(m.isfile() or m.isdir()):raise ValueError('Unsafe archive member: '+m.name)
   if parts[0]=='.local' and (len(parts)<3 or parts[1]!='share' or parts[2] not in ['icons','fonts']):raise ValueError('Unexpected archive path: '+m.name)
   total+=m.size
   if total>1024**3:raise ValueError('Archive exceeds size limit')
def integrity():
 sums=json.loads((R/'checksums.json').read_text())
 for name,digest in sums.items():
  p=R/name
  if Path(name).is_absolute() or '..' in Path(name).parts:raise ValueError('Unsafe checksum path')
  if hashlib.sha256(p.read_bytes()).hexdigest()!=digest:raise ValueError('Checksum mismatch: '+name)
 for p in (R/'assets').glob('*.tar.xz'):validate_archive(p)
def compatible():
 data=Path('/etc/os-release').read_text()
 shell=subprocess.check_output(['gnome-shell','--version'],text=True).strip()
 if not ('ID=zorin' in data and 'noble' in data and re.search(r'\b46\.',shell)):
  raise SystemExit('Este kit exige Zorin 18.x (noble) com GNOME 46. Não aplicado: '+shell)
def render(text,home):
 # Themes contain absolute paths from the source computer; replace them too.
 old='/home/'+'andrefarias'
 out=old+'/Documents/Codex/2026-10-24/cons/outputs'
 return text.replace(out+'/Inicio-Firefox.html',str(home/'.local/share/macos-desktop/Inicio-Firefox.html')).replace(out+'/Wallpaper-Grafite-Minimalista.png',str(home/'.local/share/backgrounds/Wallpaper-Grafite-Minimalista.png')).replace(old,str(home)).replace('@@HOME@@',str(home))
def install_files(home,stage):
 stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
 backup=home/'.local/state/zorin-macos-restore'/stamp
 backup.mkdir(parents=True)
 files=[]
 for src in sorted(stage.rglob('*')):
  if not src.is_file():continue
  rel=src.relative_to(stage);dst=home/rel
  if not dst.resolve().is_relative_to(home):raise ValueError('Destination escapes home: '+str(dst))
  if dst.exists() or dst.is_symlink():
   saved=backup/rel;saved.parent.mkdir(parents=True,exist_ok=True)
   if dst.is_symlink():saved.symlink_to(os.readlink(dst));dst.unlink()
   elif dst.is_file():shutil.copy2(dst,saved)
   else:raise RuntimeError('Expected file: '+str(dst))
  dst.parent.mkdir(parents=True,exist_ok=True)
  blob=src.read_bytes()
  try:blob=render(blob.decode('utf-8'),home).encode()
  except UnicodeDecodeError:pass
  dst.write_bytes(blob);dst.chmod(src.stat().st_mode&0o777);files.append(str(rel))
 (backup/'installed-files.json').write_text(json.dumps(files,indent=2))
 print('Arquivos anteriores preservados em',backup)
 return backup
def gsettings_restore(home,backup):
 from gi.repository import Gio,GLib
 source=Gio.SettingsSchemaSource.get_default()
 for d in (home/'.local/share/gnome-shell/extensions').glob('*/schemas'):
  if (d/'gschemas.compiled').exists():source=Gio.SettingsSchemaSource.new_from_directory(str(d),source,False)
 previous=[];warnings=[]
 for name,keys in [('org.gnome.shell',['favorite-apps','enabled-extensions','disabled-extensions','disable-user-extensions']),('org.gnome.desktop.background',['picture-uri','picture-uri-dark']),('org.gnome.desktop.screensaver',['picture-uri']),('org.gnome.settings-daemon.plugins.media-keys',['custom-keybindings'])]:
  obj=Gio.Settings.new(name)
  for key in keys:previous.append({'schema':name,'key':key,'value':obj.get_value(key).print_(True)})
 for item in json.loads((R/'settings.json').read_text()):
  schema=source.lookup(item['schema'],True)
  if not schema or not schema.has_key(item['key']):warnings.append(item['schema']+'/'+item['key']);continue
  obj=Gio.Settings.new_full(schema,None,None);key=item['key']
  previous.append({'schema':item['schema'],'key':key,'value':obj.get_value(key).print_(True)})
  value=GLib.Variant.parse(schema.get_key(key).get_value_type(),render(item['value'],home),None,None)
  if not schema.get_key(key).range_check(value):raise ValueError('Setting outside allowed range: '+key)
  if not obj.set_value(key,value):raise ValueError('Setting not writable: '+key)
 # Restore the target default terminal profile without transporting UUIDs.
 profile_id=Gio.Settings.new('org.gnome.Terminal.ProfilesList').get_string('default')
 profile_path=f'/org/gnome/terminal/legacy/profiles:/:{profile_id}/'
 terminal=Gio.Settings.new_with_path('org.gnome.Terminal.Legacy.Profile',profile_path)
 for key,raw in json.loads((R/'terminal.json').read_text()).items():
  schema=terminal.props.settings_schema
  if schema.has_key(key):
   previous.append({'schema':schema.get_id(),'path':profile_path,'key':key,'value':terminal.get_value(key).print_(True)})
   terminal.set_value(key,GLib.Variant.parse(schema.get_key(key).get_value_type(),raw,None,None))
 # Preserve unrelated custom shortcuts, replacing only our own names on repeat installs.
 media=Gio.Settings.new('org.gnome.settings-daemon.plugins.media-keys');paths=media.get_strv('custom-keybindings')
 for i,b in enumerate(json.loads((R/'shortcuts.json').read_text())):
  path=f'/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/macos-restore-{i}/'
  obj=Gio.Settings.new_with_path('org.gnome.settings-daemon.plugins.media-keys.custom-keybinding',path)
  for k,v in b.items():obj.set_string(k,render(v,home))
  if path not in paths:paths.append(path)
 media.set_strv('custom-keybindings',paths)
 shell=Gio.Settings.new('org.gnome.shell');favs=[]
 def app_exists(app):
  return Gio.DesktopAppInfo.new(app) is not None or any((base/app).is_file() for base in [home/'.local/share/flatpak/exports/share/applications',Path('/var/lib/flatpak/exports/share/applications')])
 aliases={'com.microsoft.VSCode.desktop':'com.visualstudio.code.desktop','dbeaver-ce.desktop':'io.dbeaver.DBeaverCommunity.desktop','google-chrome.desktop':'com.google.Chrome.desktop'}
 for app in json.loads((R/'favorites.json').read_text()):
  chosen=app if app_exists(app) else aliases.get(app,app)
  if app_exists(chosen):favs.append(chosen)
  else:warnings.append('Aplicativo ausente na dock: '+app)
 shell.set_strv('favorite-apps',favs)
 enabled=shell.get_strv('enabled-extensions');disabled=shell.get_strv('disabled-extensions')
 for name in json.loads((R/'extensions.json').read_text()):
  exists=any((p/name/'metadata.json').exists() for p in [home/'.local/share/gnome-shell/extensions',Path('/usr/share/gnome-shell/extensions')])
  if not exists:warnings.append('Extensão ausente: '+name);continue
  if name not in enabled:enabled.append(name)
  if name in disabled:disabled.remove(name)
 shell.set_strv('disabled-extensions',disabled);shell.set_strv('enabled-extensions',enabled);shell.set_boolean('disable-user-extensions',False)
 bg=Gio.Settings.new('org.gnome.desktop.background');uri=(home/'.local/share/backgrounds/Wallpaper-Grafite-Minimalista.png').as_uri()
 for k in ['picture-uri','picture-uri-dark']:bg.set_string(k,uri)
 Gio.Settings.new('org.gnome.desktop.screensaver').set_string('picture-uri',uri)
 Gio.Settings.sync();(backup/'settings-before.json').write_text(json.dumps(previous,indent=2))
 for warning in warnings:print('AVISO:',warning)
def apps_install():
 run(['sudo','apt-get','update'])
 run(['sudo','apt-get','install','-y','python3-gi','rofi','zsh','git','curl','flatpak','gnome-shell-extensions','gnome-terminal','gnome-sushi','gnome-text-editor','gnome-calendar','gnome-contacts','gnome-weather','evolution','eog','vlc','gnome-software','gnome-system-monitor','gnome-tweaks','gir1.2-dbusmenu-glib-0.4'])
 run(['flatpak','remote-add','--user','--if-not-exists','flathub','https://dl.flathub.org/repo/flathub.flatpakrepo'])
 run(['flatpak','install','--user','-y','flathub','io.github.nuttyartist.notes','com.visualstudio.code','io.dbeaver.DBeaverCommunity','com.google.Chrome','org.deskflow.deskflow'])
 if os.environ.get('XDG_SESSION_TYPE')=='x11':
  run(['flatpak','override','--user','--socket=x11','--nosocket=wayland','--env=QT_QPA_PLATFORM=xcb','org.deskflow.deskflow'])
 print('Apps de trabalho usam Flatpak. Não importam projetos, bancos ou contas.')
def firefox_install(home):
 import urllib.request
 dest=home/'.local/share/firefox'
 if (dest/'firefox').exists():print('Firefox existente preservado.');return
 with tempfile.TemporaryDirectory() as td:
  archive=Path(td)/'firefox.tar';url='https://download.mozilla.org/?product=firefox-latest-ssl&os=linux64&lang=pt-BR'
  print('Baixando Firefox da Mozilla…',flush=True);urllib.request.urlretrieve(url,archive)
  with tarfile.open(archive) as t:
   for m in t:
    if Path(m.name).is_absolute() or '..' in Path(m.name).parts or Path(m.name).parts[0]!='firefox':raise ValueError('Invalid Mozilla archive')
   t.extractall(td,filter='data')
  dest.parent.mkdir(parents=True,exist_ok=True);shutil.move(str(Path(td)/'firefox'),dest)
def localsend_install(home):
 import urllib.request
 dest=home/'.local/share/localsend-native'
 if not (dest/'localsend_app').exists():
  release=json.load(urllib.request.urlopen('https://api.github.com/repos/localsend/localsend/releases/latest',timeout=30))
  assets=[x for x in release['assets'] if re.fullmatch(r'LocalSend-[0-9.]+-linux-x86-64\.tar\.gz',x['name'])]
  if len(assets)!=1:raise RuntimeError('Não foi possível identificar o pacote oficial LocalSend.')
  with tempfile.TemporaryDirectory() as td:
   arc=Path(td)/'localsend.tar.gz';urllib.request.urlretrieve(assets[0]['browser_download_url'],arc)
   with tarfile.open(arc) as t:
    for member in t:
     if Path(member.name).is_absolute() or '..' in Path(member.name).parts:raise ValueError('Invalid LocalSend archive')
    unpack=Path(td)/'app';unpack.mkdir();t.extractall(unpack,filter='data')
   if not (unpack/'localsend_app').is_file():raise RuntimeError('Formato LocalSend mudou; revisar instalador.')
   dest.parent.mkdir(parents=True,exist_ok=True);shutil.copytree(unpack,dest)
 desktop=home/'.local/share/applications/org.localsend.localsend_app.desktop'
 desktop.parent.mkdir(parents=True,exist_ok=True)
 desktop.write_text('[Desktop Entry]\nType=Application\nName=LocalSend\nExec='+str(dest/'localsend_app')+'\nIcon=folder-remote\nTerminal=false\nCategories=Network;FileTransfer;\n')
def terminal_install(home):
 oh=home/'.oh-my-zsh'
 if not (oh/'oh-my-zsh.sh').exists():
  # Clone upstream without running its interactive installer or replacing .zshrc.
  with tempfile.TemporaryDirectory() as td:
   run(['git','clone','--depth','1','https://github.com/ohmyzsh/ohmyzsh.git',td+'/oh'])
   shutil.copytree(Path(td)/'oh',oh,dirs_exist_ok=True,ignore=shutil.ignore_patterns('.git'))
 z=home/'.zshrc';text=z.read_text() if z.exists() else ''
 marker='# BEGIN zorin-macos-restore'
 block='''# BEGIN zorin-macos-restore
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME=""
plugins=(git zsh-autosuggestions history-substring-search zsh-syntax-highlighting)
source "$ZSH/oh-my-zsh.sh"
source "$ZSH/custom/macos-dark.zsh"
export PATH="$HOME/.local/bin:$PATH"
# END zorin-macos-restore
'''
 if marker not in text:
  if z.exists():shutil.copy2(z,z.with_name('.zshrc.before-macos-restore'))
  z.write_text(text+'\n'+block)
 import pwd
 run(['sudo','chsh','-s','/usr/bin/zsh',pwd.getpwuid(os.getuid()).pw_name])
 print('Terminal configurado; Zsh será usado na próxima sessão.')
def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--check',action='store_true',help='Validar integridade e compatibilidade sem alterar o sistema')
 p.add_argument('--apps',action='store_true',help='Instalar aplicativos principais; requer internet e sudo')
 p.add_argument('--system-look',action='store_true',help='Instalar aparência GDM/Plymouth; requer sudo')
 p.add_argument('--extract-only',action='store_true',help='Teste: restaurar só arquivos em uma pasta de destino')
 p.add_argument('--target-home',type=Path,help='Permitido apenas com --extract-only')
 a=p.parse_args()
 if os.geteuid()==0:raise SystemExit('Execute como seu usuário, sem sudo. O script pedirá sudo quando necessário.')
 if a.target_home and not a.extract_only:p.error('--target-home exige --extract-only')
 integrity()
 if not a.extract_only:compatible()
 if a.check:print('OK: arquivos íntegros, arquivos compactados seguros e sistema compatível.');return
 home=(a.target_home or Path.home()).resolve()
 if not re.fullmatch(r'[A-Za-z0-9_./-]+',str(home)):raise SystemExit('Caminho de usuário não suportado por este kit.')
 if a.apps and not a.extract_only:apps_install()
 with tempfile.TemporaryDirectory() as td:
  stage=Path(td);shutil.copytree(R/'payload/home',stage,dirs_exist_ok=True)
  for arc in (R/'assets').glob('*.tar.xz'):
   with tarfile.open(arc) as t:t.extractall(stage,filter='data')
  backup=install_files(home,stage)
 if a.extract_only:print('Extração de teste concluída; GNOME, apps e arquivos do sistema não foram alterados.');return
 if a.apps:firefox_install(home);localsend_install(home);terminal_install(home)
 if (home/'.local/share/firefox/firefox').exists():
  for src,dst in [('local-newtab.cfg','local-newtab.cfg'),('local-newtab.js','defaults/pref/local-newtab.js')]:
   target=home/'.local/share/firefox'/dst;target.parent.mkdir(parents=True,exist_ok=True)
   if target.exists():
    saved=backup/target.relative_to(home);saved.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,saved)
   target.write_text(render((R/'firefox'/src).read_text(),home))
 notes=home/'Documents/Notas';notes.mkdir(parents=True,exist_ok=True)
 if not (notes/'Notas-rapidas.md').exists():(notes/'Notas-rapidas.md').write_text('# Notas rápidas\n\n')
 # Merge only visual VS Code preferences, preserving unrelated settings.
 for code_dir in [home/'.config/Code/User',home/'.var/app/com.visualstudio.code/config/Code/User']:
  target=code_dir/'settings.json';data={}
  if target.exists():
   try:data=json.loads(target.read_text())
   except json.JSONDecodeError:
    print('AVISO: VS Code usa JSON com comentários; preservei seu settings.json:',target);continue
   saved=backup/target.relative_to(home);saved.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,saved)
  data.update(json.loads((R/'vscode.json').read_text()));code_dir.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(data,indent=2)+'\n')
 run(['fc-cache','-f'])
 gsettings_restore(home,backup)
 if a.system_look:
  run(['sudo','sh',R/'system/login/aplicar-login.sh'])
  run(['sudo','sh',R/'system/boot/aplicar.sh'])
 print('\nRestauração concluída. Salve seu trabalho, saia da sessão e entre novamente.')
 print('Cadastre o rosto e configure contas/senhas separadamente. Veja README.md.')
if __name__=='__main__':main()
