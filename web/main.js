/* Copyright (c) 2026 SudoSilva. Licensed under Custom (Personal/Non-Commercial). */
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const actionPanel = document.getElementById('action-panel');
    const encryptSection = document.getElementById('encrypt-section');
    const decryptSection = document.getElementById('decrypt-section');
    const loadingOverlay = document.getElementById('loading-overlay');

    let currentFile = null;

    function showConfirm(title, message, onOk) {
        const modal = document.getElementById('modal-confirm');
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;

        modal.classList.remove('hidden');

        const btnOk = document.getElementById('btn-confirm-ok');
        const btnCancel = document.getElementById('btn-confirm-cancel');

        btnOk.onclick = () => {
            modal.classList.add('hidden');
            if (onOk) onOk();
        };

        btnCancel.onclick = () => {
            modal.classList.add('hidden');
        };
    }

    async function apiCall(endpoint, data = {}) {
        try {
            const response = await fetch(`/api/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (err) {
            console.error(`API Error (${endpoint}):`, err);
            return { status: "error", message: "Network error. Is the backend running?" };
        }
    }

    async function pollDrop() {
        try {
            const response = await fetch('/api/poll_drop');
            const result = await response.json();
            if (result.path) {
                console.log("[*] Native drop detected via poll:", result.path);
                showLoading("Processing dropped file...");
                const detectResult = await apiCall('detect', { path: result.path });
                hideLoading();
                if (detectResult.status !== "error") {
                    showToast("File detected via native bypass", "success");
                    setupActionPanel(detectResult);
                } else {
                    showToast(detectResult.message, "error");
                }
            }
        } catch (err) {

        }
    }
    setInterval(pollDrop, 250);

    function showPage(tabId) {
        const navItems = document.querySelectorAll('.nav-item');
        const tabPages = document.querySelectorAll('.tab-page');

        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav) {
            const currentTab = activeNav.getAttribute('data-tab');
            if (currentTab !== tabId) {
                if (currentTab === 'passwords') PasswordManager.lock();
                if (currentTab === 'notes') NotesManager.lock();
            }
        }

        navItems.forEach(nav => {
            if (nav.getAttribute('data-tab') === tabId) nav.classList.add('active');
            else nav.classList.remove('active');
        });

        tabPages.forEach(page => {
            if (page.id === `tab-${tabId}`) page.classList.add('active');
            else page.classList.remove('active');
        });

        if (tabId === 'passwords') PasswordManager.init();
        if (tabId === 'notes') NotesManager.init();
        if (tabId === 'shredder') Shredder.init();
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            showPage(item.getAttribute('data-tab'));
        });
    });

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-overlay');
            if (modal) modal.classList.add('hidden');
        });
    });

    document.getElementById('btn-select-file').addEventListener('click', async (e) => {
        e.stopPropagation();
        const result = await apiCall('select_path', { is_folder: false });
        handleResult(result);
    });

    document.getElementById('btn-select-folder').addEventListener('click', async (e) => {
        e.stopPropagation();
        const result = await apiCall('select_path', { is_folder: true });
        handleResult(result);
    });

    dropZone.addEventListener('click', async (e) => {
        if (e.target.closest('.btn-select')) return;
        const result = await apiCall('select_path', { is_folder: false });
        handleResult(result);
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('active'), false);
    });

    dropZone.addEventListener('drop', handleDrop, false);

    async function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            console.log("[*] Drop detected. Waiting for native bypass hook...");
            showLoading("Native bypass active. Processing drop...");

            setTimeout(() => {
                if (!loadingOverlay.classList.contains('hidden') && loadingOverlay.querySelector('p').textContent === "Native bypass active. Processing drop...") {
                    hideLoading();
                    showToast("Native bypass failed. Please click to select file.", "error");
                }
            }, 5000);
        }
    }

    function handleResult(result) {
        if (result.status === "cancelled") return;
        if (result.status === "error") {
            showToast(result.message, "error");
        } else {
            setupActionPanel(result);
        }
    }

    function setupActionPanel(fileInfo) {
        currentFile = fileInfo;
        dropZone.classList.add('hidden');
        actionPanel.classList.remove('hidden');

        document.getElementById('file-name').textContent = fileInfo.name;
        document.getElementById('file-path').textContent = fileInfo.path;

        const textEncrypt = document.getElementById('text-encrypt-action');
        const textDecrypt = document.getElementById('text-decrypt-action');
        const attemptsStatus = document.getElementById('attempts-status');
        const attemptsRemaining = document.getElementById('attempts-remaining');

        if (fileInfo.is_dir) {
            textEncrypt.textContent = 'Lock & Wipe Folder';
            textDecrypt.textContent = 'Unlock & Restore Folder';
        } else {
            textEncrypt.textContent = 'Lock & Wipe File';
            textDecrypt.textContent = 'Unlock & Restore File';
        }

        if (fileInfo.status === "vault") {
            decryptSection.classList.remove('hidden');
            encryptSection.classList.add('hidden');

            if (fileInfo.attempts !== undefined) {
                const remaining = fileInfo.max_attempts - fileInfo.attempts;
                attemptsRemaining.textContent = `${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before self-destruct`;
                attemptsStatus.classList.remove('hidden');
            } else {
                attemptsStatus.classList.add('hidden');
            }
        } else {
            encryptSection.classList.remove('hidden');
            decryptSection.classList.add('hidden');
            attemptsStatus.classList.add('hidden');
        }
    }

    const encLevelSlider = document.getElementById('enc-level-slider');
    const encLevelVal = document.getElementById('enc-level-val');
    const encLevelHidden = document.getElementById('enc-level');

    const updateSliderFill = (slider) => {
        const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
        slider.style.setProperty('--range-progress', `${percent}%`);
    };

    if (encLevelSlider) {
        updateSliderFill(encLevelSlider);
        encLevelSlider.oninput = () => {
            encLevelVal.textContent = encLevelSlider.value;
            encLevelHidden.value = encLevelSlider.value;
            updateSliderFill(encLevelSlider);
        };
    }

    const encAttemptsSlider = document.getElementById('enc-attempts-slider');
    const encAttemptsVal = document.getElementById('enc-attempts-val');
    const encAttemptsHidden = document.getElementById('enc-attempts');

    if (encAttemptsSlider) {
        updateSliderFill(encAttemptsSlider);
        encAttemptsSlider.oninput = () => {
            encAttemptsVal.textContent = encAttemptsSlider.value;
            encAttemptsHidden.value = encAttemptsSlider.value;
            updateSliderFill(encAttemptsSlider);
        };
    }

    document.getElementById('btn-back').addEventListener('click', resetUI);

    document.getElementById('btn-encrypt').addEventListener('click', async () => {
        const password = document.getElementById('enc-password').value;
        const confirm = document.getElementById('enc-confirm').value;
        const level = parseInt(document.getElementById('enc-level').value) || 6;
        const max_attempts = parseInt(document.getElementById('enc-attempts').value) || 5;

        if (!password) return showToast("Password is required", "error");
        if (password !== confirm) return showToast("Passwords do not match", "error");
        if (password.length < 4) return showToast("Password is too short", "error");

        showLoading("Encrypting & Wiping Original...");
        const result = await apiCall('encrypt', { path: currentFile.path, password, level, max_attempts });
        hideLoading();

        if (result.status === "success") {
            showToast(result.message, "success");
            resetUI();
        } else {
            showToast(result.message, "error");

            const detectResult = await apiCall('detect', { path: currentFile.path });
            if (detectResult.status !== "error") {
                setupActionPanel(detectResult);
            }
        }
    });

    document.getElementById('btn-decrypt').addEventListener('click', async () => {
        const password = document.getElementById('dec-password').value;

        if (!password) return showToast("Password is required", "error");

        showLoading("Decrypting & Restoring Files...");
        const result = await apiCall('decrypt', { path: currentFile.path, password });
        hideLoading();

        if (result.status === "success") {
            showToast(result.message, "success");
            resetUI();
        } else {
            showToast(result.message, "error");
        }
    });

    function showLoading(text) {
        document.getElementById('loader-message').textContent = text;
        loadingOverlay.classList.remove('hidden');
        updateProgress(0);
    }

    function hideLoading() {
        loadingOverlay.classList.add('hidden');
    }

    function updateProgress(percent) {
        const bar = document.getElementById('progress-fill');
        if (bar) bar.style.width = `${percent}%`;
    }

    function resetUI() {
        currentFile = null;
        actionPanel.classList.add('hidden');
        dropZone.classList.remove('hidden');
        encryptSection.classList.add('hidden');
        decryptSection.classList.add('hidden');

        const defLevel = localStorage.getItem('sv_pref_enc_level') || "6";
        const defAttempts = "5";

        document.getElementById('enc-level-val').textContent = defLevel;
        document.getElementById('enc-level-slider').value = defLevel;
        document.getElementById('enc-level').value = defLevel;
        updateSliderFill(document.getElementById('enc-level-slider'));

        document.getElementById('enc-attempts-val').textContent = defAttempts;
        document.getElementById('enc-attempts-slider').value = defAttempts;
        document.getElementById('enc-attempts').value = defAttempts;
        updateSliderFill(document.getElementById('enc-attempts-slider'));
    }

    function showToast(message, type = "info") {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'error' ?
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' :
            (type === 'success' ?
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><polyline points="20 6 9 17 4 12"></polyline></svg>' :
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>');

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <p>${message}</p>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    const Shredder = {
        currentFile: null,

        init() {
            if (this.initialized) return;
            this.setupListeners();
            this.initialized = true;
        },

        setupListeners() {
            document.getElementById('btn-shred-select-file').onclick = async () => {
                const result = await apiCall('select_path', { is_folder: false });
                if (result.status !== 'cancelled') this.setupActionPanel(result);
            };

            document.getElementById('btn-shred-select-folder').onclick = async () => {
                const result = await apiCall('select_path', { is_folder: true });
                if (result.status !== 'cancelled') this.setupActionPanel(result);
            };

            document.getElementById('btn-shred-back').onclick = () => this.resetUI();

            const shredPassesSlider = document.getElementById('shred-passes-slider');
            const shredPassesVal = document.getElementById('shred-passes-val');
            const shredPassesHidden = document.getElementById('shred-passes');

            if (shredPassesSlider) {
                shredPassesSlider.oninput = () => {
                    shredPassesVal.textContent = shredPassesSlider.value;
                    shredPassesHidden.value = shredPassesSlider.value;
                };
            }

            document.getElementById('btn-shred-now').onclick = async () => {
                if (!this.currentFile) return;
                const passes = parseInt(hiddenInput.value);

                showLoading(`Shredding ${this.currentFile.name}...`);
                const res = await apiCall('shred', { path: this.currentFile.path, passes });
                hideLoading();

                if (res.status === 'success') {
                    showToast(res.message, 'success');
                    this.resetUI();
                } else {
                    showToast(res.message, 'error');
                }
            };
        },

        setupActionPanel(fileInfo) {
            this.currentFile = fileInfo;
            document.getElementById('shredder-drop-zone').classList.add('hidden');
            document.getElementById('shredder-action-panel').classList.remove('hidden');
            document.getElementById('shred-file-name').textContent = fileInfo.name;
            document.getElementById('shred-file-path').textContent = fileInfo.path;
        },

        resetUI() {
            this.currentFile = null;
            document.getElementById('shredder-drop-zone').classList.remove('hidden');
            document.getElementById('shredder-action-panel').classList.add('hidden');

            const defPasses = localStorage.getItem('sv_pref_shred_passes') || "7";
            const slider = document.getElementById('shred-passes-slider');
            const hidden = document.getElementById('shred-passes');
            const display = document.getElementById('shred-passes-val');

            if (slider) {
                slider.value = defPasses;
                hidden.value = defPasses;
                display.textContent = defPasses;
                updateSliderFill(slider);

                slider.oninput = () => {
                    display.textContent = slider.value;
                    hidden.value = slider.value;
                    updateSliderFill(slider);
                };
            }
        }
    };

    Shredder.init();

    const NotesManager = {
        masterPassword: null,
        notes: [],
        currentNoteId: null,

        init() {
            this.setupListeners();
            if (!this.masterPassword) {
                this.showAuth();
            }
        },

        setupListeners() {
            if (this.listenersSet) return;
            const btnUnlock = document.getElementById('btn-notes-unlock');
            if (btnUnlock) btnUnlock.onclick = () => this.unlock();

            const passInput = document.getElementById('notes-master-pass');
            if (passInput) passInput.onkeypress = (e) => {
                if (e.key === 'Enter') this.unlock();
            };

            document.getElementById('btn-new-note').onclick = () => this.createNewNote();
            const btnClear = document.getElementById('btn-notes-clear-all');
            if (btnClear) btnClear.onclick = () => this.clearAll();

            document.getElementById('btn-save-note').onclick = () => this.saveCurrentNote();
            document.getElementById('btn-delete-note').onclick = () => this.deleteCurrentNote();

            const searchInput = document.getElementById('notes-search-input');
            const clearBtn = document.getElementById('btn-notes-search-clear');

            if (searchInput) {
                searchInput.oninput = (e) => {
                    const val = e.target.value;
                    if (val) clearBtn.classList.remove('hidden');
                    else clearBtn.classList.add('hidden');
                    this.renderNotesList(val);
                };
            }

            if (clearBtn) {
                clearBtn.onclick = () => {
                    searchInput.value = '';
                    clearBtn.classList.add('hidden');
                    this.renderNotesList('');
                };
            }

            document.getElementById('note-title-input').oninput = () => this.markUnsaved();
            document.getElementById('note-body-input').oninput = () => this.markUnsaved();

            this.listenersSet = true;
        },

        markUnsaved() {
            const status = document.getElementById('note-save-status');
            if (status) {
                status.textContent = 'Unsaved changes...';
                status.style.opacity = '1';
            }
            if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = setTimeout(() => this.saveCurrentNote(true), 2000);
        },

        async unlock() {
            const pass = document.getElementById('notes-master-pass').value;
            if (!pass) return;

            showLoading('Decrypting Notes...');
            const res = await apiCall('notes/entries', { password: pass });
            hideLoading();

            if (res.status === 'success') {
                this.masterPassword = pass;
                this.notes = res.entries;
                document.getElementById('notes-auth-container').classList.add('hidden');
                document.getElementById('notes-manager').classList.remove('hidden');
                this.renderNotesList();
            } else {
                showToast('Invalid Master Password', 'error');
            }
        },

        lock() {
            this.masterPassword = null;
            this.notes = [];
            this.currentNoteId = null;
            document.getElementById('notes-manager').classList.add('hidden');
            document.getElementById('notes-auth-container').classList.remove('hidden');
            document.getElementById('notes-master-pass').value = '';
            this.resetEditor();
        },

        showAuth() {
            document.getElementById('notes-manager').classList.add('hidden');
            document.getElementById('notes-auth-container').classList.remove('hidden');
        },

        renderNotesList(query = '') {
            const list = document.getElementById('notes-list');
            if (!list) return;
            list.innerHTML = '';

            let filtered = (this.notes || []).filter(n =>
                (n.title || '').toLowerCase().includes(query.toLowerCase()) ||
                (n.body || '').toLowerCase().includes(query.toLowerCase())
            );

            filtered.sort((a, b) => (b.modified || 0) - (a.modified || 0));

            if (filtered.length === 0 && query) {
                list.innerHTML = '<div class="pwd-empty-state">No matching notes found</div>';
                return;
            }

            filtered.forEach(n => {
                const item = document.createElement('div');
                item.className = `note-item ${this.currentNoteId === n.id ? 'active' : ''}`;

                let displayTitle = n.title || 'Untitled Note';
                let displayBody = (n.body || '').substring(0, 45) || 'No content';

                if (query) {
                    displayTitle = this.highlightText(displayTitle, query);
                    displayBody = this.highlightText(displayBody, query);
                }

                const dateStr = new Date(n.modified || Date.now()).toLocaleDateString([], {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });

                item.innerHTML = `
                    <h4>${displayTitle}</h4>
                    <p>${displayBody}</p>
                    <span class="note-date">${dateStr}</span>
                `;
                item.onclick = () => this.selectNote(n.id);
                list.appendChild(item);
            });
        },

        highlightText(text, query) {
            if (!query) return text;
            const regex = new RegExp(`(${query})`, 'gi');
            return text.replace(regex, '<span class="highlight">$1</span>');
        },

        selectNote(id) {
            this.currentNoteId = id;
            const note = this.notes.find(n => n.id === id);
            if (!note) return;

            document.getElementById('note-editor-placeholder').classList.add('hidden');
            document.getElementById('note-editor-content').classList.remove('hidden');
            document.getElementById('note-title-input').value = note.title;
            document.getElementById('note-body-input').value = note.body;

            this.renderNotesList(document.getElementById('notes-search-input').value);
        },

        createNewNote() {
            const newNote = {
                id: Date.now().toString(),
                title: '',
                body: '',
                modified: Date.now()
            };
            this.notes.unshift(newNote);
            this.selectNote(newNote.id);
            setTimeout(() => document.getElementById('note-title-input').focus(), 50);
        },

        async saveCurrentNote(isAuto = false) {
            if (!this.currentNoteId || !this.masterPassword) return;

            const note = this.notes.find(n => n.id === this.currentNoteId);
            const newTitle = document.getElementById('note-title-input').value;
            const newBody = document.getElementById('note-body-input').value;

            if (note.title === newTitle && note.body === newBody && isAuto) return;

            note.title = newTitle;
            note.body = newBody;
            note.modified = Date.now();

            const status = document.getElementById('note-save-status');
            if (status) status.textContent = isAuto ? 'Auto-saving...' : 'Saving...';

            const res = await apiCall('notes/save', {
                password: this.masterPassword,
                notes: this.notes
            });

            if (res.status === 'success') {
                if (status) {
                    status.textContent = 'All changes saved';
                    setTimeout(() => { if (status.textContent === 'All changes saved') status.style.opacity = '0.3'; }, 2000);
                }
                this.renderNotesList(document.getElementById('notes-search-input').value);
            } else {
                showToast('File error: Could not save', 'error');
                if (status) status.textContent = 'Save failed';
            }
        },

        async deleteCurrentNote() {
            if (!this.currentNoteId || !this.masterPassword) return;

            showConfirm(
                'Delete Note?',
                'This will permanently remove this note from your encrypted vault.',
                async () => {
                    this.notes = this.notes.filter(n => n.id !== this.currentNoteId);
                    this.currentNoteId = null;

                    showLoading('Deleting Note...');
                    const res = await apiCall('notes/save', {
                        password: this.masterPassword,
                        notes: this.notes
                    });
                    hideLoading();

                    if (res.status === 'success') {
                        showToast('Note deleted', 'success');
                        this.resetEditor();
                        this.renderNotesList();
                    }
                }
            );
        },

        resetEditor() {
            document.getElementById('note-editor-placeholder').classList.remove('hidden');
            document.getElementById('note-editor-content').classList.add('hidden');
            document.getElementById('note-title-input').value = '';
            document.getElementById('note-body-input').value = '';
        },

        clearAll() {
            if (!this.masterPassword) return;
            showConfirm(
                "Clear All Notes?",
                "This will permanently delete ALL your encrypted notes. This cannot be undone.",
                async () => {
                    this.notes = [];
                    this.currentNoteId = null;
                    showLoading('Clearing All Notes...');
                    const res = await apiCall('notes/save', {
                        password: this.masterPassword,
                        notes: []
                    });
                    hideLoading();
                    if (res.status === 'success') {
                        showToast('All notes cleared', 'success');
                        this.resetEditor();
                        this.renderNotesList();
                    } else {
                        showToast(res.message, 'error');
                    }
                }
            );
        }
    };

    const PasswordManager = {
        masterPassword: null,
        entries: [],
        currentCategory: 'All',

        async init() {
            const status = await fetch('/api/passwords/status').then(r => r.json());

            document.getElementById('pwd-setup-container').classList.add('hidden');
            document.getElementById('pwd-login-container').classList.add('hidden');
            document.getElementById('pwd-manager-main').classList.add('hidden');

            if (status.status === 'setup_required') {
                document.getElementById('pwd-setup-container').classList.remove('hidden');
            } else {
                if (this.masterPassword) {
                    this.showMainLayout();
                    this.refreshEntries();
                } else {
                    document.getElementById('pwd-login-container').classList.remove('hidden');
                }
            }
            this.setupListeners();
        },

        async setup() {
            const pass = document.getElementById('manager-setup-pass').value;
            const confirm = document.getElementById('manager-setup-confirm').value;
            if (!pass || pass !== confirm) return showToast("Passwords must match", "error");

            const res = await apiCall('passwords/setup', { password: pass });
            if (res.status === 'success') {
                this.masterPassword = pass;
                showToast("Vault initialized successfully", "success");
                this.showMainLayout();
            } else {
                showToast(res.message, "error");
            }
        },

        async login() {
            const pass = document.getElementById('manager-login-pass').value;
            const res = await apiCall('passwords/entries', { password: pass });

            if (res.status === 'success') {
                this.masterPassword = pass;
                this.entries = res.entries;
                showToast("Vault unlocked", "success");
                this.showMainLayout();
                this.renderEntries();
            } else {
                showToast("Invalid Master Password", "error");
            }
        },

        showMainLayout() {
            document.getElementById('pwd-setup-container').classList.add('hidden');
            document.getElementById('pwd-login-container').classList.add('hidden');
            document.getElementById('pwd-manager-main').classList.remove('hidden');
        },

        lock() {
            this.masterPassword = null;
            document.getElementById('pwd-manager-main').classList.add('hidden');
            document.getElementById('pwd-login-container').classList.remove('hidden');
            document.getElementById('manager-login-pass').value = '';
        },

        setupListeners() {
            if (this.listenersAttached) return;
            this.listenersAttached = true;

            document.querySelectorAll('.cat-btn').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.currentCategory = btn.getAttribute('data-cat');
                    this.renderEntries(document.getElementById('pwd-search')?.value || '');
                };
            });

            const searchInput = document.getElementById('pwd-search');
            const clearBtn = document.getElementById('btn-pwd-search-clear');
            if (searchInput) {
                searchInput.oninput = (e) => {
                    const val = e.target.value;
                    if (val) clearBtn?.classList.remove('hidden');
                    else clearBtn?.classList.add('hidden');
                    this.renderEntries(val);
                };
            }

            if (clearBtn) {
                clearBtn.onclick = () => {
                    if (searchInput) searchInput.value = '';
                    clearBtn.classList.add('hidden');
                    this.renderEntries('');
                };
            }

            document.getElementById('btn-pwd-add').onclick = () => {
                document.getElementById('pwd-modal').classList.remove('hidden');
            };

            document.getElementById('btn-pwd-setup').onclick = () => this.setup();
            document.getElementById('btn-pwd-login').onclick = () => this.login();

            document.getElementById('btn-pwd-import').onclick = async () => {
                const res = await apiCall('select_path', { is_folder: false });
                if (res.status !== 'cancelled') {
                    showLoading('Importing passwords...');
                    const importRes = await apiCall('passwords/import', { file_path: res.path, password: this.masterPassword });
                    hideLoading();
                    if (importRes.status === 'success') {
                        showToast(importRes.message, 'success');
                        this.refreshEntries();
                    } else {
                        showToast(importRes.message, 'error');
                    }
                }
            };

            const btnClear = document.getElementById('btn-pwd-clear-all');
            if (btnClear) {
                btnClear.onclick = () => this.clearAll();
            }
        },

        async refreshEntries() {
            if (!this.masterPassword) return;
            const res = await apiCall('passwords/entries', { password: this.masterPassword });
            if (res.status === 'success') {
                this.entries = res.entries;
                this.renderEntries(document.getElementById('pwd-search')?.value || '');
            }
        },

        getSortName(name) {
            if (!name) return 'zzz';
            let clean = name.toLowerCase().trim();
            clean = clean.replace(/^(https?:\/\/)?(www\.)?/, '');
            const mappings = [
                { pattern: /google|gmail|youtube|drive|photos|play\.google/, replacement: 'google' },
                { pattern: /microsoft|outlook|hotmail|live|office|msn|xbox/, replacement: 'microsoft' },
                { pattern: /apple|icloud|itunes|appstore/, replacement: 'apple' },
                { pattern: /amazon|primevideo|kindle/, replacement: 'amazon' },
                { pattern: /facebook|messenger|fb\.com/, replacement: 'facebook' },
                { pattern: /instagram|ig\.me/, replacement: 'instagram' },
                { pattern: /twitter|x\.com/, replacement: 'twitter' },
                { pattern: /steam|steampowered/, replacement: 'steam' },
                { pattern: /epicgames|epic/, replacement: 'epic games' },
                { pattern: /battlenet|blizzard/, replacement: 'battle.net' },
                { pattern: /gog|gog\.com/, replacement: 'gog' },
                { pattern: /nvidia|geforce/, replacement: 'nvidia' }
            ];
            for (const m of mappings) {
                if (m.pattern.test(clean)) return m.replacement;
            }
            clean = clean.replace(/^(accounts\.|login\.|mail\.|m\.|auth\.|portal\.|secure\.)/, '');
            clean = clean.replace(/\.[a-z]{2,}(\/.*)?$/, '');
            return clean;
        },

        renderEntries(searchQuery = '') {
            const list = document.getElementById('pwd-list');
            if (!list) return;
            list.innerHTML = '';

            let filtered = (this.entries || []).filter(e => {
                const intelligentName = this.getSortName(e.name);
                const matchesCat = this.currentCategory === 'All' ||
                    e.category === this.currentCategory ||
                    intelligentName === this.currentCategory.toLowerCase();

                const matchesSearch = !searchQuery ||
                    (e.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (e.username || '').toLowerCase().includes(searchQuery.toLowerCase());
                return matchesCat && matchesSearch;
            });

            filtered.sort((a, b) => {
                const nameA = this.getSortName(a.name);
                const nameB = this.getSortName(b.name);
                if (nameA !== nameB) return nameA.localeCompare(nameB);
                return (a.name || '').localeCompare(b.name || '');
            });

            if (filtered.length === 0) {
                list.innerHTML = '<div class="pwd-empty-state"><p>No passwords found.</p></div>';
                return;
            }

            filtered.forEach(e => {
                const card = document.createElement('div');
                card.className = 'pwd-card';
                card.innerHTML = `
                    <div class="pwd-card-header">
                        <div class="pwd-card-title">
                            <h3>${e.name || 'Unknown'}</h3>
                            <span class="pwd-card-tag cat-${e.category || 'Misc'}">${e.category || 'Misc'}</span>
                        </div>
                    </div>
                    <div class="pwd-details">
                        <div class="pwd-field">
                            <span>User</span>
                            <div class="pwd-value-group">
                                <span>${e.username || ''}</span>
                                <button class="pwd-copy-btn" title="Copy Username" onclick="navigator.clipboard.writeText('${e.username || ''}'); showToast('Username copied', 'success')">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                            </div>
                        </div>
                        <div class="pwd-field">
                            <span>Pass</span>
                            <div class="pwd-value-group">
                                <button class="pwd-copy-btn" title="Copy Password" onclick="navigator.clipboard.writeText('${e.password || ''}'); showToast('Password copied', 'success')">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                                <span class="pwd-value">••••••••</span>
                                <button class="pwd-toggle-btn field-toggle" title="Toggle Visibility">
                                    <svg class="eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                    <svg class="eye-on hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </button>
                                <button class="btn-card-del" title="Delete Entry" onclick="PasswordManager.delete('${e.id}')">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                const toggleBtn = card.querySelector('.pwd-toggle-btn');
                const pwdVal = card.querySelector('.pwd-value');
                const eyeOn = toggleBtn.querySelector('.eye-on');
                const eyeOff = toggleBtn.querySelector('.eye-off');

                toggleBtn.onclick = () => {
                    const isMasked = pwdVal.textContent === '••••••••';
                    if (isMasked) {
                        pwdVal.textContent = e.password;
                        eyeOn.classList.remove('hidden');
                        eyeOff.classList.add('hidden');
                    } else {
                        pwdVal.textContent = '••••••••';
                        eyeOn.classList.add('hidden');
                        eyeOff.classList.remove('hidden');
                    }
                };
                list.appendChild(card);
            });
        },

        delete(id) {
            showConfirm(
                "Delete Password?",
                "This will permanently remove this entry from your vault.",
                async () => {
                    this.entries = this.entries.filter(e => e.id !== id);
                    const res = await apiCall('passwords/save', {
                        password: this.masterPassword,
                        entries: this.entries
                    });
                    if (res.status === 'success') {
                        showToast("Entry deleted", "success");
                        this.renderEntries(document.getElementById('pwd-search')?.value || '');
                    } else {
                        showToast(res.message, "error");
                    }
                }
            );
        },

        clearAll() {
            if (!this.masterPassword) return;
            showConfirm(
                "Clear All Passwords?",
                "This will permanently delete EVERY password in your vault. This cannot be undone.",
                async () => {
                    this.entries = [];
                    showLoading('Clearing All Passwords...');
                    const res = await apiCall('passwords/save', {
                        password: this.masterPassword,
                        entries: []
                    });
                    hideLoading();
                    if (res.status === 'success') {
                        showToast("All passwords cleared", "success");
                        this.renderEntries();
                    } else {
                        showToast(res.message, "error");
                    }
                }
            );
        }
    };

    const SettingsManager = {
        init() {
            const btnClean = document.getElementById('btn-clean-all');
            const btnUninstall = document.getElementById('btn-uninstall');

            const encSlider = document.getElementById('pref-enc-slider');
            const encVal = document.getElementById('pref-enc-val');
            const shredSlider = document.getElementById('pref-shred-slider');
            const shredVal = document.getElementById('pref-shred-val');

            const savedEnc = localStorage.getItem('sv_pref_enc_level') || "6";
            const savedShred = localStorage.getItem('sv_pref_shred_passes') || "7";

            if (encSlider) {
                encSlider.value = savedEnc;
                encVal.textContent = savedEnc;
                updateSliderFill(encSlider);
                encSlider.oninput = () => {
                    encVal.textContent = encSlider.value;
                    localStorage.setItem('sv_pref_enc_level', encSlider.value);
                    updateSliderFill(encSlider);
                };
            }

            if (shredSlider) {
                shredSlider.value = savedShred;
                shredVal.textContent = savedShred;
                updateSliderFill(shredSlider);
                shredSlider.oninput = () => {
                    shredVal.textContent = shredSlider.value;
                    localStorage.setItem('sv_pref_shred_passes', shredSlider.value);
                    updateSliderFill(shredSlider);
                };
            }

            if (btnClean) {
                btnClean.onclick = () => {
                    showConfirm(
                        "Clean All Data?",
                        "This will permanently delete ALL passwords, notes, and vault keys. Your encrypted files (.vlt) will remain untouched.",
                        async () => {
                            showLoading("Cleaning vaults...");
                            const res = await apiCall('settings/clean_all');
                            hideLoading();
                            if (res.status === 'success') {
                                showToast(res.message, "success");
                                setTimeout(() => window.location.reload(), 2000);
                            } else {
                                showToast(res.message, "error");
                            }
                        }
                    );
                };
            }

            if (btnUninstall) {
                btnUninstall.onclick = () => {
                    showConfirm(
                        "Fully Uninstall?",
                        "This will wipe all application data and reset the system. This cannot be undone.",
                        async () => {
                            showLoading("Uninstalling...");
                            const res = await apiCall('settings/uninstall');
                            hideLoading();
                            if (res.status === 'success') {
                                showToast(res.message, "success");
                                document.body.innerHTML = `
                                    <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#0a0a0c; color:white; text-align:center; padding:20px;">
                                        <h1 style="color:var(--accent-orange); margin-bottom:16px;">System Reset Complete</h1>
                                        <p style="color:var(--text-gray);">All personal data has been securely removed. You can now close this window.</p>
                                    </div>
                                `;
                            } else {
                                showToast(res.message, "error");
                            }
                        }
                    );
                };
            }
        }
    };

    const GuideManager = {
        checkFirstRun() {
            const hasSeenGuide = localStorage.getItem('sv_has_seen_guide');
            if (!hasSeenGuide) {
                setTimeout(() => {
                    document.getElementById('modal-guide')?.classList.remove('hidden');
                    localStorage.setItem('sv_has_seen_guide', 'true');
                }, 1000);
            }
        }
    };

    SettingsManager.init();
    GuideManager.checkFirstRun();
});
