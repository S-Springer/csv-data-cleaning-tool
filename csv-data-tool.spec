# -*- mode: python ; coding: utf-8 -*-

import sys
from pathlib import Path

python_root = Path(sys.executable).resolve().parent
conda_library_bin = python_root / 'Library' / 'bin'
openssl_binaries = []
for dll_name in ('libssl-3-x64.dll', 'libcrypto-3-x64.dll'):
    dll_path = conda_library_bin / dll_name
    if dll_path.exists():
        openssl_binaries.append((str(dll_path), '.'))


a = Analysis(
    ['main_win.py'],
    pathex=[],
    binaries=openssl_binaries,
    datas=[('frontend\\build', 'frontend\\build'), ('backend\\app', 'app')],
    hiddenimports=['slowapi', 'slowapi.errors', 'slowapi.middleware', 'slowapi.util'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='csv-data-tool',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
