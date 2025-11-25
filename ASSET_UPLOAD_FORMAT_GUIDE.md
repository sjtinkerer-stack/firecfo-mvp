# Asset Upload Format Guide

This guide explains the expected file formats for uploading assets to FireCFO.

## Supported File Types

✅ **CSV** (.csv)
✅ **Excel** (.xlsx, .xls)
✅ **PDF** (text-based only, not scanned images)

## Required Columns

Your file **must** have at least these two columns:

### 1. Asset Name (Required)
Column header can be any of:
- `asset`
- `name`
- `asset name`
- `security`
- `instrument`
- `holding`
- `description`

### 2. Current Value (Required)
Column header can be any of:
- `value`
- `current value`
- `market value`
- `amount`
- `total`
- `current amount`

### 3. Optional Columns
- **Quantity**: `quantity`, `qty`, `units`, `shares`, `holdings`
- **Purchase Price**: `purchase price`, `cost`, `buy price`, `average price`, `avg price`
- **Purchase Date**: `purchase date`, `buy date`, `date`, `acquisition date`

## CSV Format Example

```csv
asset_name,current_value,quantity,purchase_price,purchase_date
HDFC Bank,150000,500,140000,2024-01-15
Reliance Industries,250000,1000,240000,2024-02-20
SBI Bluechip Fund,180000,,170000,2024-03-10
Nifty Index Fund,220000,,200000,2024-04-05
Fixed Deposit - HDFC,500000,,500000,2024-01-01
```

## Excel Format Guidelines

### Header Row
- First row (or any of the first 20 rows) should contain column headers
- Headers should include keywords like "name", "asset", "value", "amount", etc.

### Data Rows
- Each row after the header represents one asset
- At minimum: asset name and current value

### Example Structure
```
| Asset Name            | Current Value | Quantity | Purchase Price | Purchase Date |
|-----------------------|---------------|----------|----------------|---------------|
| HDFC Bank            | 150000        | 500      | 140000         | 2024-01-15   |
| Reliance Industries  | 250000        | 1000     | 240000         | 2024-02-20   |
| SBI Bluechip Fund    | 180000        |          | 170000         | 2024-03-10   |
```

### Tips for Excel Files
1. ✅ **Clear headers**: Use descriptive column names
2. ✅ **No empty rows at top**: Headers should be in first 20 rows
3. ✅ **No merged cells**: Keep cells unmerged for clean parsing
4. ✅ **Numeric values**: Values should be numbers (commas OK, currency symbols will be stripped)
5. ❌ **Avoid**: Empty sheets, hidden columns with actual data

## PDF Format Guidelines

### Text-Based PDFs (Supported)
- Financial statements with readable text
- Broker statements (Zerodha, Groww, etc.)
- Mutual fund statements
- Bank statements

### Image-Based PDFs (Not Supported Yet)
- ❌ Scanned documents
- ❌ Screenshots saved as PDF
- ❌ Image-only PDFs

**Workaround for scanned PDFs**:
1. Use OCR software to convert to text
2. Or manually create a CSV/Excel file from the document

## Number Formatting

The parser handles Indian number formats:
- ✅ `₹1,00,000` → 100000
- ✅ `1,50,000` → 150000
- ✅ `150000` → 150000
- ✅ `1.5L` or `1.5 Lakhs` → Not yet supported (use absolute numbers)

## Common Errors and Fixes

### Error: "Excel must have columns for asset name and current value"
**Cause**: No recognizable column headers
**Fix**:
1. Add a header row with "Asset Name" and "Value" (or similar)
2. Ensure header row is in first 20 rows
3. Or use headerless format with name in column A, value in column B

### Error: "PDF appears to be empty or image-based"
**Cause**: PDF is scanned/image-based, no text to extract
**Fix**:
1. Try exporting from the source app as text PDF
2. Or manually create a CSV file with the data

### Error: "No valid assets found"
**Cause**: Asset names or values are missing/invalid
**Fix**:
1. Ensure every row has both name and value
2. Values must be positive numbers
3. Remove summary rows, totals, and headers from data

## Test File

We've created a test CSV file at:
`/Users/sautrikjoardar/firecfo/firecfo/test-assets.csv`

Use this to test the upload flow!

## Need Help?

If your file still doesn't work:
1. Check browser console (F12) for detailed error messages
2. Check terminal logs where `npm run dev` is running
3. Try the test CSV file first to ensure the feature works
4. Create a simplified version of your file with just 2-3 rows
