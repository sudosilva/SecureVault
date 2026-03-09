# Copyright (c) 2026 Silva. Licensed under MIT.
import os
import random
import shutil
from pathlib import Path
from shared.config import WIPE_PASSES

def secure_delete(path: str, passes: int = None):

    if passes is None:
        passes = WIPE_PASSES

    p = Path(path)
    if not p.exists():
        return

    def wipe_file(file_path):
        size = os.path.getsize(file_path)
        with open(file_path, "ba+", buffering=0) as f:
            for i in range(passes):
                f.seek(0)

                if size > 10 * 1024 * 1024:
                    f.write(os.urandom(size))
                else:
                    f.write(bytearray(random.getrandbits(8) for _ in range(size)))

        temp_name = file_path
        for _ in range(3):
            new_name = os.path.join(os.path.dirname(temp_name), "".join(random.choices("abcdef0123456789", k=8)))
            try:
                os.rename(temp_name, new_name)
                temp_name = new_name
            except:
                break
        os.remove(temp_name)

    try:
        if p.is_file():
            wipe_file(str(p))
        elif p.is_dir():
            for root, dirs, files in os.walk(str(p), topdown=False):
                for name in files:
                    wipe_file(os.path.join(root, name))
                for name in dirs:
                    os.rmdir(os.path.join(root, name))
            os.rmdir(str(p))
    except Exception as e:
        print(f"[!] Secure delete failed for {path}: {e}")
