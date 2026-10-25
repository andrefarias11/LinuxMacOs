#!/usr/bin/python3
"""Offline validation. Does not restore desktop settings."""
import importlib.util,json,tempfile,tarfile,unittest,io
from pathlib import Path
spec=importlib.util.spec_from_file_location('restore_installer',Path(__file__).with_name('install.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Verify(unittest.TestCase):
 def test_integrity(self):m.integrity()
 def test_no_secret_files(self):
  forbidden={'cookies.sqlite','logins.json','logins.db','key4.db','places.sqlite','.zsh_history','login.keyring','id_rsa','id_ed25519'}
  for p in (m.R/'payload').rglob('*'):
   self.assertNotIn(p.name,forbidden)
   self.assertNotIn('keyrings',p.parts)
   self.assertNotIn('models',p.parts)
   if '.mozilla' in p.parts:self.assertNotEqual(p.name,'prefs.js')
 def test_templates_portable(self):
  for p in (m.R/'payload').rglob('*'):
   if not p.is_file():continue
   try:s=p.read_text()
   except UnicodeDecodeError:continue
   self.assertNotIn('/home/andrefarias',s,str(p))
   self.assertNotIn('@@HOME@@',m.render(s,Path('/home/testuser')))
 def test_reject_traversal(self):
  with tempfile.TemporaryDirectory() as td:
   p=Path(td)/'bad.tar.xz'
   with tarfile.open(p,'w:xz') as t:
    i=tarfile.TarInfo('../escape');i.size=1;t.addfile(i,io.BytesIO(b'x'))
   with self.assertRaises(ValueError):m.validate_archive(p)
 def test_overwrite_preserves_previous_file(self):
  with tempfile.TemporaryDirectory() as td:
   home=Path(td)/'home';home.mkdir();stage=Path(td)/'stage';stage.mkdir()
   (home/'config.txt').write_text('before')
   (stage/'config.txt').write_text('@@HOME@@/after')
   backup=m.install_files(home,stage)
   self.assertEqual((backup/'config.txt').read_text(),'before')
   self.assertEqual((home/'config.txt').read_text(),str(home)+'/after')
 def test_destination_symlink_escape_rejected(self):
  with tempfile.TemporaryDirectory() as td:
   home=Path(td)/'home';home.mkdir();stage=Path(td)/'stage';stage.mkdir()
   outside=Path(td)/'outside';outside.mkdir()
   (home/'config').symlink_to(outside,target_is_directory=True)
   (stage/'config').mkdir();(stage/'config/file.txt').write_text('no')
   with self.assertRaises(ValueError):m.install_files(home,stage)
   self.assertFalse((outside/'file.txt').exists())
 def test_selected_settings_parse(self):
  from gi.repository import Gio,GLib
  source=Gio.SettingsSchemaSource.get_default()
  for d in (m.R/'payload/home/.local/share/gnome-shell/extensions').glob('*/schemas'):
   if (d/'gschemas.compiled').exists():source=Gio.SettingsSchemaSource.new_from_directory(str(d),source,False)
  for item in json.loads((m.R/'settings.json').read_text()):
   schema=source.lookup(item['schema'],True)
   if not schema:continue
   key=schema.get_key(item['key']);v=GLib.Variant.parse(key.get_value_type(),m.render(item['value'],Path('/home/testuser')),None,None)
   self.assertTrue(key.range_check(v),item)
if __name__=='__main__':unittest.main()
