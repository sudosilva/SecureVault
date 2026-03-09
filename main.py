# Copyright (c) 2026 SudoSilva. Licensed under Custom (Personal/Non-Commercial).
import os
import sys
import time
import threading
from pathlib import Path

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from shared.config import (
    VAULT_DIR, VAULT_FILE, LOCKER_DIR, MAX_ATTEMPTS, WIPE_PASSES, VERSION
)
from shared.utils import (
    UI_QUEUE, Config, AttemptsTracker, format_size, format_time, get_password
)
from modules.locker import (
    create_vault, unlock_vault, parse_vault_header, self_destruct_vault, LockerError, detect_file
)
from modules.gui import start_app_mode, hook_native_drop, _select_path_internal
from modules.api import run_api, set_latest_drop

def process_ui_requests():

    while not UI_QUEUE.empty():
        try:
            cmd, args, resp_q = UI_QUEUE.get_nowait()
            if cmd == "select_path":
                result = _select_path_internal(*args)
                resp_q.put(result)
        except:
            pass

def start_gui():
    print("Secure Vault Started")
    print("[*] Starting API...")

    threading.Thread(target=hook_native_drop, args=(set_latest_drop,), daemon=True).start()

    threading.Thread(target=run_api, daemon=True).start()

    print("[*] Waiting for launch...")
    time.sleep(1.5)
    start_app_mode("http://127.0.0.1:5000")

    try:
        while True:
            process_ui_requests()
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("[*] Stopping...")

def print_usage():
    print(f"SecureVault v{VERSION.hex()}")
    print("\nCommands:")
    print("  gui               Launch graphical interface")
    print("  lock              Lock a folder/file into a vault")
    print("  unlock <file>     Unlock a vault file")
    print("  info <file>       Show vault information")
    print("  check <file>      Check failed attempts")
    print("  reset <file>      Reset attempts counter")

def lock_cmd():
    path = input("Enter path to file or folder to lock: ").strip('"').strip("'")
    if not os.path.exists(path):
        print(f"[-] Error: Path '{path}' not found")
        return

    password = get_password(confirm=True)
    out_path = str(Path(path).with_suffix(".vlt"))

    print(f"[*] Creating vault: {out_path}")
    try:
        create_vault(path, out_path, password)
        print(f"[OK] Vault created successfully.")
    except Exception as e:
        print(f"[-] Error: {e}")

def main():
    if len(sys.argv) < 2:

        start_gui()
        return

    cmd = sys.argv[1].lower()
    try:
        if cmd == "gui": start_gui()
        elif cmd == "lock": lock_cmd()
        elif cmd == "unlock" and len(sys.argv) > 2:
            password = get_password(confirm=False)
            unlock_vault(sys.argv[2], os.path.dirname(os.path.abspath(sys.argv[2])), password)
            print("[OK] Vault unlocked successfully.")
        elif cmd == "info" and len(sys.argv) > 2:
            path = sys.argv[2]
            meta = parse_vault_header(Path(path))
            print(f"\n=== Vault Info: {os.path.basename(path)} ===")
            print(f"Version: {meta['version'].hex()}")
            print(f"Type: {'Folder' if meta['is_folder'] else 'File'}")
            print(f"Chunks: {meta['num_chunks']}")
            print(f"Max Attempts: {meta['max_attempts']}")
        elif cmd == "check" and len(sys.argv) > 2:
            tracker = AttemptsTracker()
            attempts = tracker.get_attempts(sys.argv[2])
            print(f"[*] Failed attempts for {os.path.basename(sys.argv[2])}: {attempts}")
        elif cmd == "reset" and len(sys.argv) > 2:
            tracker = AttemptsTracker()
            tracker.reset_attempts(sys.argv[2])
            print(f"[OK] Attempts reset for {os.path.basename(sys.argv[2])}")
        else:
            print_usage()
    except Exception as e:
        print(f"[!] Error: {e}")

if __name__ == "__main__":
    main()
