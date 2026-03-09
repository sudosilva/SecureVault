# Copyright (c) 2026 SudoSilva. Licensed under Custom (Personal/Non-Commercial).
import os
import sys
import time
import threading
import webbrowser
import tkinter as tk
from tkinter import filedialog
import pygetwindow as gw
import win32gui
import windnd
from shared.utils import UI_QUEUE
from .locker import detect_file

def _select_path_internal(is_folder: bool = False) -> dict:

    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)

    try:
        if is_folder:
            path = filedialog.askdirectory(title="Select Folder to Process")
        else:
            path = filedialog.askopenfilename(
                title="Select File to Process",
                filetypes=[
                    ("All supported", "*.vlt;*.*"),
                    ("Vaults", "*.vlt"),
                    ("All Files", "*.*")
                ]
            )

        if not path:
            return {"status": "cancelled"}

        return detect_file(path)
    finally:
        root.destroy()

def select_path(is_folder: bool = False) -> dict:

    import queue
    resp_queue = queue.Queue()
    UI_QUEUE.put(("select_path", (is_folder,), resp_queue))
    return resp_queue.get()

def hook_native_drop(callback):

    start_time = time.time()
    while time.time() - start_time < 30:
        all_windows = gw.getAllWindows()
        target_win = None
        for w in all_windows:
            if w and w.title == "Secure Vault":
                target_win = w
                break

        if target_win:
            hwnd = getattr(target_win, '_hWnd', getattr(target_win, '_mainWindowHandle', None))
            if hwnd:
                def on_drop(files):
                    if files:
                        try:
                            path = files[0]
                            if isinstance(path, bytes):
                                path = path.decode(sys.getfilesystemencoding(), errors='ignore')
                            callback(path)
                        except Exception as e:

                            pass

                try:

                    target_win.maximize()
                    win32gui.DragAcceptFiles(hwnd, True)
                    windnd.hook_dropfiles(hwnd, on_drop)

                    def hook_child(child_hwnd, _):
                        win32gui.DragAcceptFiles(child_hwnd, True)
                        windnd.hook_dropfiles(child_hwnd, on_drop)
                        return True

                    win32gui.EnumChildWindows(hwnd, hook_child, None)

                    return 
                except Exception as e:

                    pass
        time.sleep(1.0)

def start_app_mode(url: str):

    try:
        if os.system(f'start msedge --app="{url}" --start-maximized') == 0:
            return
    except:
        pass

    try:
        if os.system(f'start chrome --app="{url}" --start-maximized') == 0:
            return
    except:
        pass

    try:
        webbrowser.open(url)
    except Exception as e:

        with open("browser_error.txt", "a") as f:
            f.write(f"Failed to open {url}: {e}\n")
