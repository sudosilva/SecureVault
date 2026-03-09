# Copyright (c) 2026 SudoSilva. Licensed under Custom (Personal/Non-Commercial).
import os
import sys
import subprocess
import shutil

def build():
    print("[*] Starting SecureVault Build Process...")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(base_dir)

    icon_path = "vault_icon.ico"

    if not os.path.exists(icon_path):
        print(f"[!] Warning: {icon_path} not found. Build will continue without custom icon.")
        icon_path = None

    use_console = "--console" in sys.argv

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--onefile",
        "--console" if use_console else "--windowed",
        "--name=SecureVault",
        f"--add-data=web;web", 
        "--clean",
    ]

    if icon_path:
        cmd.append(f"--icon={icon_path}")

    cmd.append("main.py")

    print(f"[*] Command: {' '.join(cmd)}")

    try:
        subprocess.check_call(cmd)
        print("[OK] Build successful! Check the 'dist' folder.")
    except subprocess.CalledProcessError as e:
        print(f"[!] Build failed: {e}")
    except FileNotFoundError:
        print("[!] Error: PyInstaller not found. Please run 'pip install pyinstaller'.")

if __name__ == "__main__":
    build()
