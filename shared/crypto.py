# Copyright (c) 2026 SudoSilva. Licensed under Custom (Personal/Non-Commercial).
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
from argon2.low_level import hash_secret_raw, Type
from .config import ARGON_TIME, ARGON_MEM, ARGON_PAR, KEY_LEN

def derive_key(password: str, salt: bytes):

    return hash_secret_raw(
        secret=password.encode(),
        salt=salt,
        time_cost=ARGON_TIME,
        memory_cost=ARGON_MEM,
        parallelism=ARGON_PAR,
        hash_len=KEY_LEN,
        type=Type.ID
    )

def calculate_hash(data: bytes):

    return hashlib.sha256(data).digest()

def encrypt_chunk(chunk_data: bytes, key: bytes, chunk_index: int):

    cipher = ChaCha20Poly1305(key)
    nonce = chunk_index.to_bytes(12, 'big')
    return cipher.encrypt(nonce, chunk_data, None)

def decrypt_chunk(nonce: bytes, ciphertext: bytes, key: bytes, chunk_index: int):

    cipher = ChaCha20Poly1305(key)
    return cipher.decrypt(nonce, ciphertext, None)
