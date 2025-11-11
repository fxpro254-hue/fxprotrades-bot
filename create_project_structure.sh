#!/bin/bash

# Define the base source directory
BASE_DIR="src"

# 1. Create all necessary directories
echo "Creating directories under $BASE_DIR/..."
mkdir -p "$BASE_DIR/app"
mkdir -p "$BASE_DIR/components/ui"
mkdir -p "$BASE_DIR/lib"

# 2. Create App Router files
echo "Creating App Router files..."
touch "$BASE_DIR/app/page.tsx"
touch "$BASE_DIR/app/layout.tsx"
touch "$BASE_DIR/app/globals.css"

# 3. Create main component files
echo "Creating main components..."
touch "$BASE_DIR/components/landing-page.tsx"
touch "$BASE_DIR/components/dashboard.tsx"

# 4. Create UI component files
echo "Creating UI components..."
touch "$BASE_DIR/components/ui/button.tsx"
touch "$BASE_DIR/components/ui/card.tsx"
touch "$BASE_DIR/components/ui/dialog.tsx"
touch "$BASE_DIR/components/ui/input.tsx"

# 5. Create library files
echo "Creating library files..."
touch "$BASE_DIR/lib/deriv-api.ts"
touch "$BASE_DIR/lib/utils.ts"

echo ""
echo "✅ Project structure successfully created!"
echo "├── src/"
echo "│   ├── app/"
echo "│   ├── components/"
echo "│   └── lib/"