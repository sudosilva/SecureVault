# Copyright (c) 2026 Silva. Licensed under MIT.
import os
import json
import shutil
from shared.config import NOTES_FILE
from shared.crypto import derive_key, encrypt_chunk, decrypt_chunk
from modules.passwords.passwords import PasswordVault
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305

class NotesVault:
    @staticmethod
    def get_notes(password: str):
        if not os.path.exists(NOTES_FILE):
            return []
        if not PasswordVault.verify_master_password(password):
            raise Exception("Invalid master password")

        with open(NOTES_FILE, "rb") as f:
            salt = f.read(32)
            nonce = f.read(12)
            ciphertext = f.read()

        key = derive_key(password, salt)
        cipher = ChaCha20Poly1305(key)
        data = cipher.decrypt(nonce, ciphertext, None)
        return json.loads(data.decode())

    @staticmethod
    def save_notes(notes: list, password: str):
        if not PasswordVault.verify_master_password(password):
            raise Exception("Invalid master password")

        salt = os.urandom(32)
        key = derive_key(password, salt)
        nonce = os.urandom(12)
        data = json.dumps(notes).encode()

        cipher = ChaCha20Poly1305(key)
        ciphertext = cipher.encrypt(nonce, data, None)

        if os.path.exists(NOTES_FILE):
            shutil.copy2(NOTES_FILE, NOTES_FILE + ".bak")

        temp_file = NOTES_FILE + ".tmp"
        with open(temp_file, "wb") as f:
            f.write(salt)
            f.write(nonce)
            f.write(ciphertext)

        if os.path.exists(NOTES_FILE):
            os.replace(temp_file, NOTES_FILE)
        else:
            os.rename(temp_file, NOTES_FILE)
