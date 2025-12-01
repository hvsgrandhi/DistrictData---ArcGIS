import pandas as pd
import sys

def filter_excel(input_file, output_file):
    try:
        # Load Excel
        df = pd.read_excel(input_file, dtype=str)

        # Normalize column names (remove spaces, lowercase)
        df.columns = df.columns.str.strip().str.lower()

        # Expected columns
        col_type = "type"
        col_total = "total"

        # Check columns exist
        missing = [c for c in [col_type, col_total] if c not in df.columns]
        if missing:
            print(f"❌ Missing columns: {missing}")
            print("Available columns:", list(df.columns))
            return

        # Clean values (case-insensitive matching)
        df[col_type] = df[col_type].astype(str).str.strip().str.upper()
        df[col_total] = df[col_total].astype(str).str.strip().str.upper()

        # Apply filters
        filtered = df[(df[col_type] == "DISTRICT") & (df[col_total] == "TOTAL")]

        if filtered.empty:
            print("⚠️ No matching rows found.")
        else:
            print(f"✅ Filtered rows: {len(filtered)}")

        # Save output
        filtered.to_excel(output_file, index=False)
        print(f"📁 Output saved to: {output_file}")

    except Exception as e:
        print(f"❌ Error: {e}")


# Command-line usage
if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python main.py input.xlsx output.xlsx")
    else:
        filter_excel(sys.argv[1], sys.argv[2])
