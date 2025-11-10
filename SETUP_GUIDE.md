# Quick Setup Guide

Follow these steps to get Excalidraw Sync running on your machine.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment

Create `.env` file with your Supabase credentials:

```bash
# Copy the example file
cp .env.example .env

# Edit and add your credentials
# Get these from: https://app.supabase.com → Your Project → Settings → API
```

Your `.env` should look like:
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 3: Set Up Database

You have Supabase CLI installed! Run:

```bash
# Option 1: Push all migrations
supabase db push

# Option 2: Run migrations individually
supabase db push --file supabase/migrations/001_create_diagrams_table.sql
supabase db push --file supabase/migrations/002_create_sync_metadata_table.sql
```

## Step 4: Enable Realtime

In Supabase Dashboard:
1. Go to Database → Replication
2. Enable replication for `diagrams` table

Or run in SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE diagrams;
```

## Step 5: Create Icons (PNG format required)

The project includes SVG icons, but Chrome requires PNG. Convert them:

### Option A: Using ImageMagick (if installed)
```bash
cd public/assets/icons
for size in 16 32 48 128; do
  convert "icon-${size}.svg" "icon-${size}.png"
done
```

### Option B: Using Online Converter
1. Go to https://svgtopng.com/
2. Upload each SVG file from `public/assets/icons/`
3. Download and save as PNG with same name

### Option C: Use placeholder (temporary)
```bash
# Copy SVG as PNG (they won't display properly but extension will load)
cd public/assets/icons
for size in 16 32 48 128; do
  cp "icon-${size}.svg" "icon-${size}.png"
done
```

## Step 6: Build Extension

```bash
# Development build with hot reload
npm run dev

# Or production build
npm run build
```

## Step 7: Load in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the `dist` folder
6. Extension installed! 🎉

## Step 8: First Use

1. Click the extension icon
2. Click "Sign In"
3. Create an account with email/password
4. Visit https://excalidraw.com
5. Start drawing!
6. Changes sync automatically after 3 seconds

## Verification Checklist

- [ ] `.env` file created with Supabase credentials
- [ ] Database migrations ran successfully
- [ ] Realtime enabled for diagrams table
- [ ] PNG icons created
- [ ] Extension built (`dist` folder exists)
- [ ] Extension loaded in Chrome
- [ ] Can sign up/sign in
- [ ] Can create diagrams on Excalidraw
- [ ] Diagrams appear in extension popup

## Common Issues

### "Missing Supabase environment variables"
- Check `.env` file exists
- Verify credentials are correct
- Restart dev server after adding `.env`

### "Extension failed to load"
- Make sure you selected the `dist` folder, not `src`
- Check console for build errors
- Try rebuilding: `npm run build`

### "Diagrams not syncing"
- Check you're signed in (extension popup)
- Verify internet connection
- Check browser console on Excalidraw page for errors
- Verify Supabase migrations ran

### "Icons not displaying"
- Convert SVG to PNG (see Step 5)
- Rebuild extension after adding PNGs

## Need Help?

Check the full [README.md](./README.md) for detailed documentation.

---

Happy syncing! 🚀
