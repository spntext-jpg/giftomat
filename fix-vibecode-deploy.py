#!/usr/bin/env python3
"""
Fix Giftomat for VibeCode deployment + Bitrix24 iframe + UI selection.
Run in GitHub Codespaces root directory.
"""

import json
import subprocess
import sys
from pathlib import Path


def run(cmd, check=True):
    """Run shell command and return output."""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f"❌ Command failed: {cmd}")
        print(f"   Error: {result.stderr}")
        sys.exit(1)
    return result.stdout.strip()


def fix_package_json():
    """Fix start script: build + listen on all interfaces."""
    package_path = Path("package.json")
    if not package_path.exists():
        print("❌ package.json not found!")
        return False

    with open(package_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    scripts = data.get("scripts", {})
    current_start = scripts.get("start", "")

    # Already fixed?
    if "-H 0.0.0.0" in current_start and "npm run build" in current_start:
        print("✅ package.json already fixed")
        return True

    scripts["start"] = "npm run build && next start -H 0.0.0.0"
    data["scripts"] = scripts

    with open(package_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")

    print("✅ Fixed package.json: added build step + -H 0.0.0.0")
    return True


def fix_next_config():
    """Replace X-Frame-Options: DENY with CSP frame-ancestors for Bitrix24 iframe."""
    config_path = Path("next.config.ts")
    if not config_path.exists():
        print("❌ next.config.ts not found!")
        return False

    with open(config_path, "r", encoding="utf-8") as f:
        content = f.read()

    old_header = '{ key: "X-Frame-Options", value: "DENY" }'
    new_header = '{ key: "Content-Security-Policy", value: "frame-ancestors *;" }'

    if old_header not in content:
        if "frame-ancestors" in content:
            print("✅ next.config.ts already fixed")
            return True
        print("⚠️  X-Frame-Options header not found, manual check needed")
        return False

    content = content.replace(old_header, new_header)

    with open(config_path, "w", encoding="utf-8") as f:
        f.write(content)

    print("✅ Fixed next.config.ts: replaced X-Frame-Options: DENY with CSP frame-ancestors")
    return True


def fix_globals_css():
    """Remove black text selection highlight on tool buttons."""
    css_path = Path("app/globals.css")
    if not css_path.exists():
        print("❌ app/globals.css not found!")
        return False

    with open(css_path, "r", encoding="utf-8") as f:
        content = f.read()

    changes = 0

    # Fix 1: Base .tool-button
    old_base = """.tool-button {
  width: 100%; min-height: 56px; padding: 8px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid transparent; border-radius: 12px;
  background: transparent; cursor: pointer; text-align: center;
  transition: background .18s ease, transform .18s ease, border-color .18s ease;
}"""

    new_base = """.tool-button {
  width: 100%; min-height: 56px; padding: 8px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid transparent; border-radius: 12px;
  background: transparent; cursor: pointer; text-align: center;
  transition: background .18s ease, transform .18s ease, border-color .18s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}"""

    if old_base in content:
        content = content.replace(old_base, new_base)
        changes += 1
        print("✅ Fixed base .tool-button: added user-select + tap-highlight")

    # Fix 2: .tool-sidebar .tool-button
    old_sidebar = """.tool-sidebar .tool-button {
  display: grid !important;
  grid-template-columns: 36px minmax(0, 1fr) !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 58px !important;
  padding: 10px !important;
  gap: 11px !important;
  align-items: center !important;
  overflow: visible !important;
}"""

    new_sidebar = """.tool-sidebar .tool-button {
  display: grid !important;
  grid-template-columns: 36px minmax(0, 1fr) !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 58px !important;
  padding: 10px !important;
  gap: 11px !important;
  align-items: center !important;
  overflow: visible !important;
  user-select: none !important;
  -webkit-tap-highlight-color: transparent !important;
}"""

    if old_sidebar in content:
        content = content.replace(old_sidebar, new_sidebar)
        changes += 1
        print("✅ Fixed .tool-sidebar .tool-button: added user-select + tap-highlight")

    if changes > 0:
        with open(css_path, "w", encoding="utf-8") as f:
            f.write(content)
    else:
        print("ℹ️  CSS already fixed or patterns not found")

    return True


def git_commit_and_push():
    """Stage, commit and push all changes."""
    print("\n📦 Git operations...")

    # Check if there are changes
    status = run("git status --short", check=False)
    if not status:
        print("ℹ️  No changes to commit")
        return True

    print("Changes detected:")
    print(status)

    run("git add package.json next.config.ts app/globals.css")
    run('git commit -m "fix: VibeCode deploy + Bitrix24 iframe + UI selection highlight"')
    run("git push")

    print("✅ Changes pushed to GitHub!")
    return True


def main():
    print("🔧 Fixing Giftomat for VibeCode deployment...\n")

    success = True
    success = fix_package_json() and success
    success = fix_next_config() and success
    success = fix_globals_css() and success

    if not success:
        print("\n❌ Some fixes failed. Check errors above.")
        sys.exit(1)

    git_commit_and_push()

    print("\n" + "=" * 50)
    print("🎉 All done! Now deploy again on VibeCode platform.")
    print("   The app will work inside Bitrix24 without connection errors.")


if __name__ == "__main__":
    main()