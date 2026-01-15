#!/usr/bin/env python3
"""
Verify Logo Size in KULT_MEDIAPLAN_TEMPLATE.xlsx

This script checks if the logo has been manually resized to the correct dimensions.
Run this AFTER manually editing the template in Excel.

Target: 2.0" wide × 0.65" tall (192×62 pixels @ 96 DPI)
"""

from openpyxl import load_workbook
import sys

def verify_logo_size(template_path='KULT_MEDIAPLAN_TEMPLATE.xlsx'):
    print("🔍 Checking logo size in template...")
    print(f"   File: {template_path}\n")
    
    try:
        wb = load_workbook(template_path)
        ws = wb['KULT MEDIA PLAN']
        
        if not hasattr(ws, '_images') or not ws._images:
            print("❌ ERROR: No logo found in template!")
            return False
        
        logo = ws._images[0]
        width_px = logo.width
        height_px = logo.height
        
        # Calculate dimensions in inches @ 96 DPI
        width_inches = width_px / 96
        height_inches = height_px / 96
        
        # Target dimensions
        target_width_px = 192
        target_height_px = 62
        target_width_in = 2.0
        target_height_in = 0.65
        
        print(f"📐 Logo Dimensions:")
        print(f"   Current:  {width_px} × {height_px} pixels ({width_inches:.2f}\" × {height_inches:.2f}\")")
        print(f"   Target:   {target_width_px} × {target_height_px} pixels ({target_width_in}\" × {target_height_in}\")")
        print()
        
        # Check if dimensions match (with 5% tolerance)
        width_ok = abs(width_px - target_width_px) <= target_width_px * 0.05
        height_ok = abs(height_px - target_height_px) <= target_height_px * 0.05
        
        if width_ok and height_ok:
            print("✅ SUCCESS: Logo size is CORRECT!")
            print(f"   The logo is properly sized at 2.0\" × 0.65\"")
            return True
        else:
            print("❌ INCORRECT SIZE!")
            if not width_ok:
                print(f"   ❌ Width is off: {width_px} px (expected ~{target_width_px} px)")
            if not height_ok:
                print(f"   ❌ Height is off: {height_px} px (expected ~{target_height_px} px)")
            print()
            print("📝 Manual fix required:")
            print("   1. Open KULT_MEDIAPLAN_TEMPLATE.xlsx in Excel")
            print("   2. Click the logo")
            print("   3. Right-click → Format Picture → Size")
            print(f"   4. Set Width: {target_width_in}\" and Height: {target_height_in}\"")
            print("   5. Save and run this script again")
            return False
            
    except FileNotFoundError:
        print(f"❌ ERROR: File not found: {template_path}")
        return False
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

if __name__ == '__main__':
    success = verify_logo_size()
    sys.exit(0 if success else 1)
