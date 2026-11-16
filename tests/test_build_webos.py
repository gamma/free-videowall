"""Exercise the real IPK builder, including tag versions and archive contents."""
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
APP = 'de.gammaproduction.freevideowall'


def members(data):
    if data[:8] != b'!<arch>\n':
        raise ValueError('Not an ar archive')
    offset, result = 8, {}
    while offset < len(data):
        header = data[offset:offset + 60]
        if len(header) != 60 or header[58:] != b'`\n':
            raise ValueError('Invalid ar header')
        size = int(header[48:58])
        result[header[:16].decode().strip().rstrip('/')] = data[offset + 60:offset + 60 + size]
        offset += 60 + size + size % 2
    return result


class WebOSBuildTest(unittest.TestCase):
    def build(self, directory, *args):
        return subprocess.run([sys.executable, str(ROOT / 'scripts/build_webos.py'),
                               '--output-dir', directory, *args], capture_output=True, text=True)

    def test_tag_version_package_integrity_and_reproducibility(self):
        source_paths = [ROOT / 'platforms/webos/app/appinfo.json',
                        ROOT / 'platforms/webos/service/package.json',
                        ROOT / 'platforms/webos/app/js/version.js']
        before = [p.read_bytes() for p in source_paths]
        with tempfile.TemporaryDirectory() as directory:
            result = self.build(directory, '--version', '1.2.345')
            self.assertEqual(result.returncode, 0, result.stderr)
            artifact = Path(directory) / f'{APP}_1.2.345_all.ipk'
            first = artifact.read_bytes()
            archive = members(first)
            self.assertEqual(set(archive), {'debian-binary', 'control.tar.gz', 'data.tar.gz'})
            self.assertEqual(archive['debian-binary'], b'2.0\n')
            with tarfile.open(fileobj=io.BytesIO(archive['control.tar.gz'])) as control:
                self.assertIn(b'Version: 1.2.345\n', control.extractfile('./control').read())
            with tarfile.open(fileobj=io.BytesIO(archive['data.tar.gz'])) as payload:
                app = './usr/palm/applications/' + APP + '/'
                service = './usr/palm/services/' + APP + '.usb/'
                package = './usr/palm/packages/' + APP + '/packageinfo.json'
                for name in [app + 'appinfo.json', service + 'package.json', package]:
                    self.assertEqual(json.load(payload.extractfile(name))['version'], '1.2.345')
                self.assertIn(b'"1.2.345"', payload.extractfile(app + 'js/version.js').read())
                for name in ['LICENSE', 'NOTICE', 'icon.png', 'index.html', 'js/app.js']:
                    self.assertIsNotNone(payload.extractfile(app + name))
                for entry in payload.getmembers():
                    self.assertTrue(entry.isfile())
                    self.assertNotIn('..', Path(entry.name).parts)
                    self.assertFalse(entry.name.endswith(('.mp4', '.m3u', '.key', '.pem', '.p12')))
                    self.assertTrue(entry.name.startswith((app, service)) or entry.name == package)
            result = self.build(directory, '--version', '1.2.345')
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(first, artifact.read_bytes())
        self.assertEqual(before, [p.read_bytes() for p in source_paths])

    def test_default_version_and_reject_invalid_release_version(self):
        with tempfile.TemporaryDirectory() as directory:
            version = json.loads((ROOT / 'platforms/webos/app/appinfo.json').read_text())['version']
            self.assertEqual(self.build(directory).returncode, 0)
            self.assertTrue((Path(directory) / f'{APP}_{version}_all.ipk').is_file())
            for version in ['v1.2.3', '1.2.3-beta', '1.2', '../bad', '01.2.3']:
                self.assertNotEqual(self.build(directory, '--version', version).returncode, 0)


if __name__ == '__main__':
    unittest.main()
