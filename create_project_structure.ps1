# create_project_structure.ps1
# This script is designed to run directly in Windows PowerShell

# Define the base source directory
$BASE_DIR="src"

# 1. Create all necessary directories
Write-Host "Creating directories under $BASE_DIR/..."
# Use New-Item -ItemType Directory (or its alias 'mkdir')
mkdir -p "$BASE_DIR/app"
mkdir -p "$BASE_DIR/components/ui"
mkdir -p "$BASE_DIR/lib"

# 2. Create App Router files
Write-Host "Creating App Router files..."
# Use New-Item -ItemType File (or its alias 'ni')
ni -type file "$BASE_DIR/app/page.tsx" | Out-Null
ni -type file "$BASE_DIR/app/layout.tsx" | Out-Null
ni -type file "$BASE_DIR/app/globals.css" | Out-Null

# 3. Create main component files
Write-Host "Creating main components..."
ni -type file "$BASE_DIR/components/landing-page.tsx" | Out-Null
ni -type file "$BASE_DIR/components/dashboard.tsx" | Out-Null

# 4. Create UI component files
Write-Host "Creating UI components..."
ni -type file "$BASE_DIR/components/ui/button.tsx" | Out-Null
ni -type file "$BASE_DIR/components/ui/card.tsx" | Out-Null
ni -type file "$BASE_DIR/components/ui/dialog.tsx" | Out-Null
ni -type file "$BASE_DIR/components/ui/input.tsx" | Out-Null

# 5. Create library files
Write-Host "Creating library files..."
ni -type file "$BASE_DIR/lib/deriv-api.ts" | Out-Null
ni -type file "$BASE_DIR/lib/utils.ts" | Out-Null

Write-Host "`n✅ Project structure successfully created!"