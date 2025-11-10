#!/bin/bash

# Excalidraw Sync - Setup Script
# This script automates the initial setup

set -e

echo "🚀 Excalidraw Sync - Setup"
echo "=========================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi

echo "✅ npm $(npm -v) found"

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found"
    echo "   Install it: https://supabase.com/docs/guides/cli"
else
    echo "✅ Supabase CLI found"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "⚙️  Setting up environment..."

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file"
    echo "⚠️  IMPORTANT: Edit .env and add your Supabase credentials!"
    echo "   Get them from: https://app.supabase.com → Your Project → Settings → API"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎨 Generating icons..."
node scripts/generate-icons.js

echo ""
echo "📝 Next steps:"
echo ""
echo "1. Edit .env file with your Supabase credentials:"
echo "   nano .env"
echo ""
echo "2. Run database migrations:"
echo "   supabase db push"
echo ""
echo "3. Enable realtime in Supabase dashboard or run:"
echo "   ALTER PUBLICATION supabase_realtime ADD TABLE diagrams;"
echo ""
echo "4. Convert SVG icons to PNG (required):"
echo "   See SETUP_GUIDE.md for instructions"
echo ""
echo "5. Build the extension:"
echo "   npm run dev    # Development mode with hot reload"
echo "   npm run build  # Production build"
echo ""
echo "6. Load extension in Chrome:"
echo "   chrome://extensions/ → Enable Developer mode → Load unpacked → Select 'dist' folder"
echo ""
echo "For detailed instructions, see SETUP_GUIDE.md"
echo ""
echo "✨ Setup complete! Happy coding!"
