#!/usr/bin/env python3
"""Build and deploy to the local Roku. Installation launches the app."""
import argparse
import getpass
import os
from pathlib import Path
import subprocess
import urllib.request
import uuid

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--host', required=True, help='IP address of your Roku')
parser.add_argument('--include-local-frames', action='store_true', help='Bundle local frame images for this device only')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
build = ['python3', str(root / 'scripts/build.py')]
if args.include_local_frames:
    build.append('--include-local-frames')
subprocess.run(build, check=True)
password = os.environ.get('ROKU_PASSWORD') or getpass.getpass('Roku developer password: ')
url = 'http://' + args.host + '/plugin_install'
manager = urllib.request.HTTPPasswordMgrWithDefaultRealm()
manager.add_password('rokudev', url, 'rokudev', password)
opener = urllib.request.build_opener(urllib.request.HTTPDigestAuthHandler(manager))
boundary = uuid.uuid4().hex
body = ('--' + boundary + '\r\nContent-Disposition: form-data; name="mysubmit"\r\n\r\nInstall\r\n'
        '--' + boundary + '\r\nContent-Disposition: form-data; name="archive"; filename="free-videowall.zip"\r\n'
        'Content-Type: application/zip\r\n\r\n').encode()
body += (root / 'dist/free-videowall.zip').read_bytes()
body += ('\r\n--' + boundary + '--\r\n').encode()
request = urllib.request.Request(url, data=body, headers={'Content-Type': 'multipart/form-data; boundary=' + boundary})
response = opener.open(request, timeout=60).read().decode()
(root / 'dist/deploy-response.html').write_text(response)
# HTTP 200 alone does not mean the Roku accepted/compiled the package.
import re
match = re.search(r'var params = JSON.parse\(\'(.*?)\'\);', response)
if match:
    import json
    params = json.loads(match.group(1))
    print(json.dumps(params.get('messages'), ensure_ascii=False))
else:
    print('Response saved to dist/deploy-response.html; inspect installation status.')
