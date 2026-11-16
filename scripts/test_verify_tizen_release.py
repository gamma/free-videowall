#!/usr/bin/env python3
"""Regression checks for accidentally publishing a signed or stale Samsung WGT."""
from contextlib import redirect_stdout
import io
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from verify_tizen_release import verify


class PublicPackageTest(unittest.TestCase):
    def package(self, root, extra=None, stale=False):
        files = {'LICENSE': b'license', 'NOTICE': b'notice', 'icon.png': b'icon',
                 'config.xml': b'<widget version="0.1.1"/>', 'index.html': b'html',
                 'js/app.js': b'app', 'js/playlist.js': b'parser', 'js/transitions.js': b'fade'}
        for name, data in files.items():
            file = root / (name if name in {'LICENSE', 'NOTICE'} else
                           'images/branding/icon-hd.png' if name == 'icon.png' else 'platforms/tizen/' + name)
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(data)
        if extra:
            files[extra] = b'private'
        if stale:
            files['js/app.js'] = b'old app'
        (root / 'dist').mkdir(exist_ok=True)
        with ZipFile(root / 'dist/free-videowall-tizen-unsigned.wgt', 'w') as archive:
            for name, data in files.items():
                archive.writestr(name, data)

    def test_public_package(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.package(root)
            with redirect_stdout(io.StringIO()):
                verify(root)

    def test_rejects_device_signatures_private_files_and_stale_source(self):
        for extra in ('author-signature.xml', 'signature1.xml', 'private.p12', 'media.mp4'):
            with self.subTest(extra=extra), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                self.package(root, extra=extra)
                with self.assertRaises(ValueError):
                    verify(root)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.package(root, stale=True)
            with self.assertRaises(ValueError):
                verify(root)


if __name__ == '__main__':
    unittest.main()
