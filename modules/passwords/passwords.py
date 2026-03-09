# Copyright (c) 2026 SudoSilva. Licensed under Custom (Personal/Non-Commercial).
import os
import json
import secrets
import shutil
import csv
from shared.config import PASSWORDS_FILE, MASTER_HASH_FILE, VAULT_DIR
from shared.crypto import derive_key, calculate_hash, decrypt_chunk, encrypt_chunk
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305

class PasswordVault:
    @staticmethod
    def set_master_password(password: str):
        salt = os.urandom(32)
        key = derive_key(password, salt)
        master_hash = calculate_hash(key)
        with open(MASTER_HASH_FILE, "wb") as f:
            f.write(salt)
            f.write(master_hash)

    @staticmethod
    def verify_master_password(password: str):
        if not os.path.exists(MASTER_HASH_FILE):
            return False
        with open(MASTER_HASH_FILE, "rb") as f:
            salt = f.read(32)
            stored_hash = f.read(32)
        key = derive_key(password, salt)
        return calculate_hash(key) == stored_hash

    @staticmethod
    def get_entries(password: str):
        if not os.path.exists(PASSWORDS_FILE):
            return []
        if not PasswordVault.verify_master_password(password):
            raise Exception("Invalid master password")

        with open(PASSWORDS_FILE, "rb") as f:
            salt = f.read(32)
            nonce = f.read(12)
            ciphertext = f.read()

        key = derive_key(password, salt)
        cipher = ChaCha20Poly1305(key)
        data = cipher.decrypt(nonce, ciphertext, None)
        return json.loads(data.decode())

    @staticmethod
    def save_entries(entries: list, password: str):
        if not PasswordVault.verify_master_password(password):
            raise Exception("Invalid master password")

        salt = os.urandom(32)
        key = derive_key(password, salt)
        nonce = os.urandom(12)
        data = json.dumps(entries).encode()

        cipher = ChaCha20Poly1305(key)
        ciphertext = cipher.encrypt(nonce, data, None)

        temp_file = PASSWORDS_FILE + ".tmp"
        with open(temp_file, "wb") as f:
            f.write(salt)
            f.write(nonce)
            f.write(ciphertext)

        if os.path.exists(PASSWORDS_FILE):
            os.replace(temp_file, PASSWORDS_FILE)
        else:
            os.rename(temp_file, PASSWORDS_FILE)

    @staticmethod
    def import_csv(file_path: str, password: str):
        if not os.path.exists(file_path):
            raise Exception("File not found")

        new_entries = []
        with open(file_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                new_entries.append({
                    "id": secrets.token_hex(8),
                    "name": row.get('name', row.get('url', 'Imported')),
                    "username": row.get('username', row.get('login', '')),
                    "password": row.get('password', ''),
                    "category": "Imported"
                })

        existing = PasswordVault.get_entries(password)
        existing.extend(new_entries)
        PasswordVault.save_entries(existing, password)
        return len(new_entries)
