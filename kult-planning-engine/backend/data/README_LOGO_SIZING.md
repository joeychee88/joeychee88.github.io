# KULT Media Plan Template - Logo Sizing Instructions

## Problem
The KULT logo in the Excel template `KULT_MEDIAPLAN_TEMPLATE.xlsx` needs to be resized to exact specifications but cannot be programmatically modified by ExcelJS (the Node.js library used for Excel generation).

## Target Logo Dimensions
- **Width:** 2.0 inches (192 pixels @ 96 DPI)
- **Height:** 0.65 inches (62 pixels @ 96 DPI)
- **Orientation:** Landscape/Wide (aspect ratio ~3.08:1)
- **EMU Values:** 1,828,800 × 594,360 EMUs

## How to Fix the Logo Size

### Method 1: Using Microsoft Excel (Windows/Mac)
1. Open `backend/data/KULT_MEDIAPLAN_TEMPLATE.xlsx` in Excel
2. Click on the KULT logo image to select it
3. Right-click → **Format Picture** or **Size and Properties**
4. In the **Size** tab:
   - Set **Width:** 2.0 inches
   - Set **Height:** 0.65 inches
   - Uncheck **Lock aspect ratio** if needed
5. Save the file
6. Commit the updated template to git

### Method 2: Using LibreOffice Calc (Linux/Cross-platform)
1. Open `backend/data/KULT_MEDIAPLAN_TEMPLATE.xlsx` in LibreOffice Calc
2. Click on the KULT logo image
3. Right-click → **Position and Size**
4. In the **Position and Size** dialog:
   - Set **Width:** 2.0" (or 5.08 cm)
   - Set **Height:** 0.65" (or 1.65 cm)
   - Disable **Keep ratio** if needed
5. Click **OK**
6. Save the file (keep .xlsx format)
7. Commit the updated template

### Method 3: Using Python (openpyxl)

**⚠️ WARNING:** This method has compatibility issues with ExcelJS. Use only if testing shows it works.

```bash
cd backend/data
python3 << 'EOF'
from openpyxl import load_workbook
from openpyxl.drawing.image import Image as XLImage

# Load and process
wb = load_workbook('KULT_MEDIAPLAN_TEMPLATE.xlsx')
ws = wb['KULT MEDIA PLAN']

# Extract logo
if ws._images:
    img = ws._images[0]
    image_data = img._data()
    with open('kult_logo.png', 'wb') as f:
        f.write(image_data)
    
    # Remove old, add new with correct size
    ws._images = []
    new_img = XLImage('kult_logo.png')
    new_img.width = 192  # 2.0 inches @ 96 DPI
    new_img.height = 62   # 0.65 inches @ 96 DPI
    ws.add_image(new_img, 'E1')
    
    wb.save('KULT_MEDIAPLAN_TEMPLATE.xlsx')
    print("✅ Logo resized!")
EOF
```

## Verification

After resizing, verify the logo dimensions:

### In Excel/LibreOffice:
- Select logo → Right-click → **Size and Properties**
- Should show: Width 2.0", Height 0.65"

### Test Export:
```bash
cd /home/user/webapp
curl -X POST http://localhost:5001/api/export/kult-template \
  -H "Content-Type: application/json" \
  -d '{
    "campaignPlan": {
      "campaignName": "Logo Test",
      "totalBudget": 50000,
      "budgetChannels": [{"name": "Test", "budget": 50000}]
    }
  }' \
  --output test_export.xlsx

# Open test_export.xlsx and verify logo size
```

## Technical Background

- **ExcelJS Limitation:** The ExcelJS library (used in backend) can read/write Excel files but does NOT programmatically access or modify embedded images in templates. Images are preserved as-is from the template.
  
- **Image Anchoring:** Excel images use `TwoCellAnchor` or `OneCellAnchor` positioning with EMU (English Metric Units) for precise sizing:
  - 1 inch = 914,400 EMUs
  - 1 pixel @ 96 DPI = 9,525 EMUs

- **Why Manual Edit is Best:** Since ExcelJS copies the template as-is, the most reliable method is to manually edit the template file in Excel/LibreOffice before using it in the export system.

## Files Involved
- `backend/data/KULT_MEDIAPLAN_TEMPLATE.xlsx` - The Excel template (edit this!)
- `backend/routes/export.js` - Export logic (loads template, populates data, but CANNOT resize logo)

## Support
If you encounter issues, please provide:
1. Screenshot of the logo in the exported Excel
2. Logo dimensions shown in Excel's **Size and Properties** dialog
3. The template file version (git commit hash)
