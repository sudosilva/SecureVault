# Copyright (c) 2026 SudoSilva. Licensed under Custom (Personal/Non-Commercial).
import os
from pathlib import Path

VAULT_DIR = r"C:\SecureVault"
LOCKER_DIR = "locker"
VAULT_FILE = "locker.vlt"
TEMP_TAR = ".locker_temp.tar"
ATTEMPTS_FILE = os.path.join("util", ".vault_attempts.json")
CONFIG_FILE = os.path.join("util", ".locker_config.json")

SALT_LEN = 32
NONCE_LEN = 12
KEY_LEN = 32
TAG_LEN = 16
HASH_LEN = 32  

PASSWORDS_FILE = os.path.join(VAULT_DIR, "passwords.enc")
NOTES_FILE = os.path.join(VAULT_DIR, "notes.enc")
MASTER_HASH_FILE = os.path.join(VAULT_DIR, "master.hash")

MAX_WORKERS = os.cpu_count() or 4
CHUNK_SIZE = 256 * 1024 * 1024  
READ_BUFFER = 8 * 1024 * 1024  

ARGON_TIME = 2
ARGON_MEM = 64 * 1024
ARGON_PAR = 4

MAX_ATTEMPTS = 5
WIPE_PASSES = 7  

DEFAULT_LOCKER = "locker"
DEFAULT_VAULT = "locker.vlt"

VERSION = b'\x05'

def ensure_dirs():
    try:
        if not os.path.exists(VAULT_DIR):
            os.makedirs(VAULT_DIR, exist_ok=True)

        util_dir = os.path.dirname(ATTEMPTS_FILE)
        if util_dir and not os.path.exists(util_dir):
            os.makedirs(util_dir, exist_ok=True)
    except Exception as e:
        print(f"[!] Error creating directories: {e}")

ensure_dirs()
