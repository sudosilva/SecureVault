# Copyright (c) 2026 SudoSilva. Licensed under Custom (Personal/Non-Commercial).
import os
import sys
import json
import win32gui
import queue
import time
from .config import CONFIG_FILE, ATTEMPTS_FILE

UI_QUEUE = queue.Queue()

def format_size(size_bytes: int):

    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024

def format_time(seconds: float):

    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes = seconds / 60
    if minutes < 60:
        return f"{minutes:.1f}m"
    hours = minutes / 60
    return f"{hours:.1f}h"

def get_password(prompt="Enter password: ", confirm=False):

    import getpass
    p = getpass.getpass(prompt)
    if confirm:
        p2 = getpass.getpass("Confirm password: ")
        if p != p2:
            raise Exception("Passwords do not match")
    return p

def reveal_in_explorer(path: str):

    if os.path.exists(path):
        os.system(f'explorer /select,"{os.path.abspath(path)}"')

class Config:

    def __init__(self, config_file: str = CONFIG_FILE):
        self.config_file = config_file
        self.data = self._load()

    def _load(self):
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, "r") as f:
                    return json.load(f)
            except:
                return {}
        return {}

    def _save(self):
        with open(self.config_file, "w") as f:
            json.dump(self.data, f, indent=4)

    def get(self, key, default=None):
        return self.data.get(key, default)

    def set(self, key, value):
        self.data[key] = value
        self._save()

class AttemptsTracker:

    def __init__(self, attempts_file: str = ATTEMPTS_FILE):
        self.attempts_file = attempts_file
        self.data = self._load()

    def _load(self):
        if os.path.exists(self.attempts_file):
            try:
                with open(self.attempts_file, "r") as f:
                    return json.load(f)
            except:
                return {}
        return {}

    def _save(self):
        with open(self.attempts_file, "w") as f:
            json.dump(self.data, f, indent=4)

    def get_attempts(self, vault_path: str):
        return self.data.get(vault_path, 0)

    def increment_attempts(self, vault_path: str):
        self.data[vault_path] = self.get_attempts(vault_path) + 1
        self._save()
        return self.data[vault_path]

    def reset_attempts(self, vault_path: str):
        if vault_path in self.data:
            del self.data[vault_path]
            self._save()

    def remove_vault(self, vault_path: str):
        if vault_path in self.data:
            del self.data[vault_path]
            self._save()
