#!/usr/bin/env python3
"""
Fix Giftomat for VibeCode deployment and UI issues.
Run this in GitHub Codespaces root directory.
"""

import json
import sys
from pathlib import Path

def fix_package_json():
    """Fix start script to build before starting production server."""
    package_path = Path("package.json")
    
    if not package_path.exists():
        print("❌ Error: package.json not found!")
        return False
    
    with open(package_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    scripts = data.get("scripts", {})
    current_start = scripts.get("start", "")
    
    if "npm run build" in current_start:
        print("✅ package.json already fixed")
        return True
    
    scripts["start"] = "npm run build && next start"
    data["scripts"] = scripts
    
    with open(package_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    
    print("✅ Fixed package.json - added build step to start script")
    return True

def fix_globals_css():
    """Fix black selection highlight on tool buttons."""
    css_path = Path("app/globals.css")
    
    if not css_path.exists():
        print("❌ Error: app/globals.css not found!")
        return False
    
    with open(css_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    changes_made = False
    
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
        changes_made = True
        print("✅ Fixed base .tool-button - added user-select and tap-highlight")
    
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
        changes_made = True
        print("✅ Fixed .tool-sidebar .tool-button - added user-select and tap-highlight")
    
    if changes_made:
        with open(css_path, "w", encoding="utf-8") as f:
            f.write(content)
    else:
        print("ℹ️  CSS already fixed or patterns not found")
    
    return True

def main():
    print("🔧 Fixing Giftomat for VibeCode deployment...\n")
    
    success = True
    success = fix_package_json() and success
    success = fix_globals_css() and success
    
    print("\n" + "="*50)
    if success:
        print("✅ All fixes applied successfully!")
        print("\n📋 Next steps:")
        print("   1. git add package.json app/globals.css")
        print("   2. git commit -m 'fix: VibeCode deploy + remove button selection highlight'")
        print("   3. git push")
        print("   4. Deploy again on VibeCode platform")
    else:
        print("❌ Some fixes failed. Check errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()