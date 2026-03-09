# Copyright (c) 2026 Silva. Licensed under MIT.
import os
import time
import tarfile
import threading
import hashlib
import secrets
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from shared.config import (
    SALT_LEN, NONCE_LEN, KEY_LEN, TAG_LEN, HASH_LEN, 
    VERSION, CHUNK_SIZE, MAX_WORKERS, LOCKER_DIR, TEMP_TAR, MAX_ATTEMPTS
)
from shared.crypto import derive_key, calculate_hash, encrypt_chunk, decrypt_chunk
from shared.utils import format_size, format_time, UI_QUEUE, AttemptsTracker
from .shredder import secure_delete

class LockerError(Exception):
    pass

def parse_vault_header(vault_path: Path):

    if not vault_path.exists():
        raise LockerError(f"Vault file '{vault_path}' not found")

    with open(vault_path, "rb") as f:
        version = f.read(1)
        item_type_byte = f.read(1)
        max_attempts_byte = f.read(1)
        salt = f.read(SALT_LEN)

        if version == VERSION:
            data_hash = f.read(HASH_LEN)
            num_chunks = int.from_bytes(f.read(8), 'big')
            is_folder = (item_type_byte == b'\x01')
            max_attempts = int.from_bytes(max_attempts_byte, 'big')
            header_offset = 1 + 1 + 1 + SALT_LEN + HASH_LEN + 8
            return {
                "version": version,
                "is_folder": is_folder,
                "max_attempts": max_attempts,
                "salt": salt,
                "hash": data_hash,
                "num_chunks": num_chunks,
                "offset": header_offset
            }

    raise LockerError("Unsupported or corrupted vault format")

def detect_file(path: str) -> dict:

    try:
        if not path:
            return {"status": "error", "message": "No path provided"}
        p = Path(path)
        if not p.exists():
            return {"status": "error", "message": f"File not found: {path}"}

        if p.suffix.lower() == ".vlt":
            try:
                meta = parse_vault_header(p)
                tracker = AttemptsTracker()
                current_attempts = tracker.get_attempts(path)

                return {
                    "status": "vault", 
                    "name": p.name, 
                    "path": str(p.absolute()),
                    "is_dir": meta["is_folder"],
                    "attempts": current_attempts,
                    "max_attempts": meta["max_attempts"]
                }
            except:
                pass
            return {"status": "error", "message": "Invalid or corrupted vault file"}
        else:
            return {
                "status": "file",
                "name": p.name,
                "path": str(p.absolute()),
                "is_dir": p.is_dir(),
                "size": format_size(p.stat().st_size) if p.is_file() else "Folder"
            }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def self_destruct_vault(vault_path: str, tracker: AttemptsTracker):

    try:
        secure_delete(vault_path, passes=7)
        tracker.remove_vault(vault_path)
    except Exception as e:

        pass

def create_vault(input_path: str, output_path: str, password: str, compression_level: int = 6, max_attempts: int = MAX_ATTEMPTS):

    input_p = Path(input_path)
    output_p = Path(output_path)

    try:
        with tarfile.open(TEMP_TAR, "w:gz", compresslevel=compression_level) as tar:
            tar.add(input_path, arcname=input_p.name)

        with open(TEMP_TAR, "rb") as f:
            data = f.read()

        data_hash = calculate_hash(data)
        salt = secrets.token_bytes(SALT_LEN)
        key = derive_key(password, salt)

        chunks = [data[i:i + CHUNK_SIZE] for i in range(0, len(data), CHUNK_SIZE)]
        num_chunks = len(chunks)

        encrypted_chunks = [None] * num_chunks
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {executor.submit(encrypt_chunk, chunk, key, i): i for i, chunk in enumerate(chunks)}
            for future in as_completed(futures):
                idx = futures[future]
                encrypted_chunks[idx] = future.result()

        with open(output_p, "wb") as fout:
            fout.write(VERSION)
            fout.write(b'\x01' if input_p.is_dir() else b'\x02')
            fout.write(max_attempts.to_bytes(1, 'big'))
            fout.write(salt)
            fout.write(data_hash)
            fout.write(num_chunks.to_bytes(8, 'big'))

            for idx, ciphertext in enumerate(encrypted_chunks):
                nonce = idx.to_bytes(12, 'big')
                fout.write(nonce)
                fout.write(len(ciphertext).to_bytes(8, 'big'))
                fout.write(ciphertext)

        secure_delete(TEMP_TAR)
        secure_delete(input_path)
        AttemptsTracker().reset_attempts(str(output_p))
    except Exception as e:
        if os.path.exists(TEMP_TAR): os.remove(TEMP_TAR)
        raise LockerError(f"Vault creation failed: {e}")

def unlock_vault(vault_path: str, output_dir: str, password: str):

    p = Path(vault_path)
    meta = parse_vault_header(p)
    salt = meta["salt"]
    key = derive_key(password, salt)

    with open(vault_path, "rb") as f:
        f.seek(meta["offset"])
        num_chunks = meta["num_chunks"]

        results = [None] * num_chunks
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {}
            for i in range(num_chunks):
                nonce = f.read(12)
                size_bytes = f.read(8)
                if not size_bytes: break
                size = int.from_bytes(size_bytes, 'big')
                ciphertext = f.read(size)
                futures[executor.submit(decrypt_chunk, nonce, ciphertext, key, i)] = i

            for future in as_completed(futures):
                idx = futures[future]
                results[idx] = future.result()

        full_data = b"".join(results)
        if calculate_hash(full_data) != meta["hash"]:
            raise LockerError("Integrity check failed: Incorrect password or corrupted data")

        temp_tar = ".unlock_temp.tar"
        with open(temp_tar, "wb") as f_tar:
            f_tar.write(full_data)

        with tarfile.open(temp_tar, "r:gz") as tar:
            tar.extractall(path=output_dir)

        os.remove(temp_tar)

        time.sleep(0.5)
        try:
            secure_delete(vault_path)
            AttemptsTracker().reset_attempts(vault_path)
        except Exception as e:

            try:
                os.remove(vault_path)
                AttemptsTracker().reset_attempts(vault_path)
            except:
                pass
