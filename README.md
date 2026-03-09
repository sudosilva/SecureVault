# 🔒 SecureVault

[![Python](https://img.shields.io/badge/Python-3.8%2B-blue?logo=python&logoColor=white)](https://www.python.org)
[![License](https://img.shields.io/badge/License-CC0_1.0-orange)](https://creativecommons.org/publicdomain/zero/1.0/)
[![Discord](https://img.shields.io/badge/Discord-Join-7289DA?logo=discord&logoColor=white)](https://discord.gg/your-link-here)

**SecureVault** is a military-grade encryption suite designed for maximum privacy and ease of use. It combines high-performance ChaCha20-Poly1305 encryption with Argon2id key derivation to provide a virtually unbreakable locker for your sensitive files, passwords, and notes.

## ✨ Features

- **📂 File & Folder Locker**: Encrypt entire directories into secure `.vlt` containers.
- **🔑 Password Manager**: A secure, encrypted vault for all your credentials with intelligent sorting.
- **📝 Secure Notes**: A beautiful, glassmorphism-styled editor for your private thoughts.
- **🚜 Secure Shredder**: Military-grade file deletion (DoD 5220.22-M) to ensure data is unrecoverable.
- **🏗️ Architectural Excellence**: Multi-threaded parallel processing for lightning-fast encryption.
- **💥 Self-Destruct**: Vaults automatically wipe themselves after too many failed attempts.
- **⚡ Native Windows Integration**: Supports drag-and-drop and "App Mode" for a native desktop feel.

## 🚀 Getting Started

### Prerequisites
- Python 3.8 or higher
- Windows OS (for native features)

### Installation
1. Go to realses download the Latest exe build.
   If not on windows or want src, follow the steps below.

2. Clone the repository:
   ```bash
   git clone https://github.com/sudosilva/SecureVault.git
   cd SecureVault
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Usage
Launch the graphical interface:
```bash
python main.py gui
```

Or use the CLI:
```bash
python main.py lock
python main.py unlock locker.vlt
```

## 🛠️ Technology Stack
- **Backend**: Python, Flask, Argon2, Cryptography (ChaCha20-Poly1305)
- **Frontend**: HTML5, Vanilla CSS3 (Glassmorphism), JavaScript (ES6+)
- **Distribution**: PyInstaller

## 📜 License
This project is licensed under the **MIT** license. 

---
*Made with ❤️ by Silva*
