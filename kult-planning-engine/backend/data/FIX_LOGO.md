# URGENT: Logo Dimensions Need Manual Fix

## Current Issue
- Logo is currently: **1.50" × 3.02"** (too tall/narrow)
- Target should be: **2.0" × 0.65"** (wide landscape)

## Why Manual Fix Is Required
- Modifying Excel files with Python/openpyxl breaks ExcelJS
- ExcelJS cannot programmatically resize images
- ONLY solution: Edit with Excel/LibreOffice directly

## How To Fix (5 minutes)

### Step 1: Download Template
```bash
# From your local machine
scp user@sandbox:/home/user/webapp/backend/data/KULT_MEDIAPLAN_TEMPLATE.xlsx .
```

Or download from: `/home/user/webapp/backend/data/KULT_MEDIAPLAN_TEMPLATE.xlsx`

### Step 2: Open in Excel/LibreOffice Calc
- Open `KULT_MEDIAPLAN_TEMPLATE.xlsx`
- Go to sheet: "KULT MEDIA PLAN"

### Step 3: Resize Logo
1. Click the KULT logo image (top-right area)
2. Right-click → **Format Picture** → **Size and Properties**
3. **UNCHECK** "Lock aspect ratio" ⚠️ IMPORTANT!
4. Set dimensions:
   - **Width: 2.0 inches**
   - **Height: 0.65 inches**
5. Click OK

### Step 4: Verify
- Width should show: 2.0"
- Height should show: 0.65"
- Logo should look wide/horizontal (3:1 ratio)

### Step 5: Save
- Save the file (XLSX format)
- Close Excel/LibreOffice

### Step 6: Upload Back
```bash
# From your local machine
scp KULT_MEDIAPLAN_TEMPLATE.xlsx user@sandbox:/home/user/webapp/backend/data/
```

### Step 7: Commit
```bash
cd /home/user/webapp
git add backend/data/KULT_MEDIAPLAN_TEMPLATE.xlsx
git commit -m "fix: Manually resize logo to 2.0\" × 0.65\" (correct dimensions)"
git push
```

## Verification Script
Run this to check logo size:
```bash
cd /home/user/webapp/backend/data
python3 verify_logo_size.py
```

Should show:
```
✅ Logo dimensions verified:
   Width: 2.00 inches
   Height: 0.65 inches
```

## Reference Image
See `resized_logo.png` for the correct appearance (192×62 pixels).

---

**⏱️ Time Required:** ~5 minutes
**❌ Cannot be done programmatically** (breaks ExcelJS)
**✅ Must be done manually in Excel/LibreOffice**
