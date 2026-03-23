# Tier 1 and Tier 2 Test Checklist

## Setup

- [ ] Start the backend with the project environment that already runs the app successfully.
- [ ] Open the frontend and confirm the app still loads without console or API startup errors.
- [ ] Use `tier1_tier2_test_dataset.csv` as the primary test fixture.

## Tier 1 Checks

- [ ] Upload `tier1_tier2_test_dataset.csv` and confirm the upload succeeds.
- [ ] Open `Visualizations` and confirm a `Correlation Heatmap` appears for numeric columns.
- [ ] Confirm the heatmap includes obvious relationships such as `monthly_revenue` with `monthly_cost` and `orders`.
- [ ] Open `Quality Score` and `Issues` and confirm missing values and duplicate rows are detected.
- [ ] Confirm the app still responds normally after repeated preview/analyze requests and does not surface unexpected rate-limit errors during normal use.

## Tier 2 Checks

- [ ] Open `Clean` and change several options, then use `Undo` and `Redo` to verify the configuration history updates correctly.
- [ ] In `Step 1`, deselect and reselect columns to verify history also tracks column selection changes.
- [ ] Run cleaning with a mix of options: remove duplicates, fill missing values, clean strings, and remove outliers.
- [ ] Confirm the cleaned result shows updated rows, quality score, and preview data.
- [ ] Open the `Stats` tab and verify advanced stats render for numeric columns, including percentiles and IQR.
- [ ] Download the cleaned dataset as `CSV`, `JSON`, and `XLSX`.

## Multi-format Loopback

- [ ] Re-upload the exported `JSON` file and confirm upload succeeds.
- [ ] Re-upload the exported `XLSX` file and confirm upload succeeds.
- [ ] Verify analysis, stats, and visualization views still work after re-uploading those exported formats.

## Edge Cases to Watch

- [ ] Duplicate row: customer `1005` should be removable.
- [ ] Missing numeric values: `refund_rate`, `satisfaction_score`, and `tenure_months` should exercise fill logic.
- [ ] String cleanup: `notes` contains extra leading, trailing, and repeated whitespace.
- [ ] Outlier handling: customer `1017` should materially affect stats and be removable with outlier cleaning.
