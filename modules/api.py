# Copyright (c) 2026 Silva. Licensed under MIT.
import os
import shutil
import secrets
import logging
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)
from shared.config import (
    VAULT_DIR, PASSWORDS_FILE, NOTES_FILE, MASTER_HASH_FILE, WIPE_PASSES, MAX_ATTEMPTS
)
from shared.utils import format_size, reveal_in_explorer
from .locker import create_vault, unlock_vault, detect_file
from .passwords.passwords import PasswordVault
from .notes.notes import NotesVault
from .shredder import secure_delete
from .gui import select_path
import sys

def get_resource_path(relative_path):

    try:

        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

    return os.path.join(base_path, relative_path)

app = Flask(__name__, static_folder=get_resource_path('web'), static_url_path='')
latest_drop_path = None

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/select_path', methods=['POST'])
def api_select_path():
    data = request.json or {}
    is_folder = data.get('is_folder', False)
    result = select_path(is_folder)
    return jsonify(result)

@app.route('/api/detect', methods=['POST'])
def api_detect():
    data = request.json or {}
    path = data.get('path')
    if not path:
        return jsonify({"status": "error", "message": "No path provided"})
    return jsonify(detect_file(path))

@app.route('/api/shred', methods=['POST'])
def api_shred():
    data = request.json or {}
    path = data.get('path')
    passes = data.get('passes', WIPE_PASSES)
    if not path:
        return jsonify({"status": "error", "message": "No path provided"})
    try:
        secure_delete(path, passes)
        return jsonify({"status": "success", "message": f"Successfully shredded {Path(path).name}."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/api/encrypt', methods=['POST'])
def api_encrypt():
    data = request.json or {}
    path = data.get('path')
    password = data.get('password')
    level = data.get('level', 6)
    max_attempts = data.get('max_attempts', MAX_ATTEMPTS)
    if not path or not password:
        return jsonify({"status": "error", "message": "Missing path or password"})
    try:
        p = Path(path)
        output_path = str(p.with_suffix(".vlt"))
        create_vault(path, output_path, password, level, max_attempts)
        reveal_in_explorer(output_path)
        return jsonify({"status": "success", "message": "Successfully locked."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/api/decrypt', methods=['POST'])
def api_decrypt():
    data = request.json or {}
    path = data.get('path')
    password = data.get('password')
    if not path or not password:
        return jsonify({"status": "error", "message": "Missing path or password"})
    try:
        p = Path(path)
        output_dir = str(p.parent)
        unlock_vault(path, output_dir, password)
        reveal_in_explorer(output_dir)
        return jsonify({"status": "success", "message": "Successfully unlocked."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/api/poll_drop', methods=['GET'])
def api_poll_drop():
    global latest_drop_path
    path = latest_drop_path
    latest_drop_path = None
    return jsonify({"path": path})

@app.route('/api/passwords/status', methods=['GET'])
def api_passwords_status():
    return jsonify({"status": "ready" if os.path.exists(MASTER_HASH_FILE) else "setup_required"})

@app.route('/api/passwords/setup', methods=['POST'])
def api_passwords_setup():
    data = request.json or {}
    password = data.get('password')
    if not password: return jsonify({"status": "error", "message": "Password required"})
    try:
        PasswordVault.set_master_password(password)
        NotesVault.save_notes([], password)
        return jsonify({"status": "success"})
    except Exception as e: return jsonify({"status": "error", "message": str(e)})

@app.route('/api/passwords/entries', methods=['POST'])
def api_passwords_entries():
    data = request.json or {}
    password = data.get('password')
    try:
        entries = PasswordVault.get_entries(password)
        return jsonify({"status": "success", "entries": entries})
    except Exception as e: return jsonify({"status": "error", "message": str(e)})

@app.route('/api/passwords/add', methods=['POST'])
def api_passwords_add():
    data = request.json or {}
    password = data.get('password')
    entry = data.get('entry')
    try:
        entries = PasswordVault.get_entries(password)
        entry['id'] = secrets.token_hex(8)
        entries.append(entry)
        PasswordVault.save_entries(entries, password)
        return jsonify({"status": "success"})
    except Exception as e: return jsonify({"status": "error", "message": str(e)})

@app.route('/api/passwords/save', methods=['POST'])
def api_passwords_save():
    data = request.json or {}
    password = data.get('password')
    entries = data.get('entries')
    try:
        PasswordVault.save_entries(entries, password)
        return jsonify({"status": "success"})
    except Exception as e: return jsonify({"status": "error", "message": str(e)})

@app.route('/api/passwords/import', methods=['POST'])
def api_passwords_import():
    data = request.json or {}
    password = data.get('password')
    file_path = data.get('file_path')
    try:
        count = PasswordVault.import_csv(file_path, password)
        return jsonify({"status": "success", "message": f"Successfully imported {count} entries."})
    except Exception as e: return jsonify({"status": "error", "message": str(e)})

@app.route('/api/notes/entries', methods=['POST'])
def api_notes_entries():
    data = request.json or {}
    password = data.get('password')
    try:
        entries = NotesVault.get_notes(password)
        return jsonify({"status": "success", "entries": entries})
    except Exception as e: return jsonify({"status": "error", "message": str(e)})

@app.route('/api/notes/save', methods=['POST'])
def api_notes_save():
    data = request.json or {}
    password = data.get('password')
    notes = data.get('notes')
    try:
        NotesVault.save_notes(notes, password)
        return jsonify({"status": "success"})
    except Exception as e: return jsonify({"status": "error", "message": str(e)})

@app.route('/api/settings/clean_all', methods=['POST'])
def api_clean_all():
    try:
        if os.path.exists(VAULT_DIR):
            for filename in os.listdir(VAULT_DIR):
                path = os.path.join(VAULT_DIR, filename)
                if os.path.isfile(path): os.unlink(path)
                elif os.path.isdir(path): shutil.rmtree(path)
        return jsonify({"status": "success", "message": "Vault data cleared."})
    except Exception as e: return jsonify({"status": "error", "message": str(e)})

@app.route('/api/settings/uninstall', methods=['POST'])
def api_uninstall():
    try:
        if os.path.exists(VAULT_DIR): shutil.rmtree(VAULT_DIR)
        if os.path.exists(".vault_attempts.json"): os.remove(".vault_attempts.json")
        return jsonify({"status": "success", "message": "Uninstalled."})
    except Exception as e: return jsonify({"status": "error", "message": str(e)})

def set_latest_drop(path):
    global latest_drop_path
    latest_drop_path = path

def run_api():
    import flask.cli
    flask.cli.show_server_banner = lambda *x: None
    app.run(port=5000, debug=False, use_reloader=False)
