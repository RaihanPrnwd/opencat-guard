import subprocess
import sys
import shutil
import os
from datetime import datetime

REMOTE_URL = "https://github.com/RaihanPrnwd/opencat-guard.git"
BRANCH = "main"

def get_git_executable():
    git_path = shutil.which("git")
    if git_path:
        return f'"{git_path}"'

    default_locations = [
        r"C:\Program Files\Git\cmd\git.exe",
        r"C:\Program Files\Git\bin\git.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Git\cmd\git.exe"),
    ]
    for loc in default_locations:
        if os.path.isfile(loc):
            return f'"{loc}"'

    print("[-] Git tidak ditemukan.", file=sys.stderr)
    sys.exit(1)

GIT_BIN = get_git_executable()

def run_cmd(cmd):
    full_cmd = f"{GIT_BIN} {cmd}"
    res = subprocess.run(full_cmd, shell=True, text=True, capture_output=True)
    if res.stdout.strip():
        print(res.stdout.strip())
    if res.returncode != 0:
        if res.stderr.strip():
            print(f"Error: {res.stderr.strip()}", file=sys.stderr)
        return False
    return True

def auto_push(commit_msg=None):
    if not commit_msg:
        commit_msg = f"update: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

    run_cmd("init")
    run_cmd(f"branch -M {BRANCH}")

    res = subprocess.run(f"{GIT_BIN} remote get-url origin", shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        run_cmd(f"remote add origin {REMOTE_URL}")
    else:
        run_cmd(f"remote set-url origin {REMOTE_URL}")

    # Pull remote jika sudah ada commit (misal README/LICENSE dibuat di GitHub web)
    print("[*] Syncing remote history...")
    run_cmd(f"pull origin {BRANCH} --rebase --allow-unrelated-histories")

    print("[*] Staging files...")
    run_cmd("add .")

    status = subprocess.run(f"{GIT_BIN} status --porcelain", shell=True, capture_output=True, text=True)
    if status.stdout.strip():
        print(f"[*] Committing: {commit_msg}")
        run_cmd(f'commit -m "{commit_msg}"')
    else:
        print("[!] Workspace clean / commit sudah dibuat.")

    print(f"[*] Pushing ke {BRANCH}...")
    success = run_cmd(f"push -u origin {BRANCH}")
    if success:
        print("[+] Berhasil push ke repository.")
    else:
        print("[-] Gagal push.")

if __name__ == "__main__":
    msg = sys.argv[1] if len(sys.argv) > 1 else None
    auto_push(msg)
