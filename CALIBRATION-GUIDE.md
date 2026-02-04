# Historical Draw Width Calibration - Usage Guide

## 🚀 Quick Start

### Step 1: Run Calibration (On Your Machine)

```bash
npm run calibrate
```

This will:
- Download 3 seasons of historical match data from football-data.co.uk
- Calculate optimal draw width for each league
- Generate `js/draw-width-config.js` with optimal values
- Save detailed results to `calibration-results/`

**Requirements:**
- Internet connection (to fetch historical data)
- Node.js installed

### Step 2: Use Calibrated Values in Your App

The calibrated values are automatically used once generated. The system already supports league-specific draw widths.

## 📊 What the Calibration Does

### Current System (Before Calibration)
```javascript
// Fixed draw width for all leagues
const drawWidth = 90;
```

### After Calibration
```javascript
// League-specific draw widths based on historical data
{
  'premier-league': 87,  // 24% draws
  'serie-a': 95,         // 28% draws
  'la-liga': 89,         // 25% draws
  'bundesliga': 84,      // 23% draws
  'ligue-1': 92,         // 26% draws
  'global': 90           // fallback
}
```

## 🔧 How It Works

### Data Collection
- Fetches match results from football-data.co.uk
- Covers 3 full seasons (2021-22, 2022-23, 2023-24)
- ~1,140 matches per league = ~5,700 total

### ELO Reconstruction
- Starts all teams at 1500 rating
- Processes matches chronologically
- Updates ratings after each match
- Records ratings before each match for calibration

### Optimization
- Tests draw widths from 50 to 150 (step 5)
- Calculates **log loss** for each width
- Selects width with lowest log loss
- Also reports Brier score and accuracy

### Metrics

**Log Loss (Primary)**
```
logLoss = -log(P(actual_outcome))
```
- Lower is better
- Heavily penalizes confident wrong predictions
- Industry standard for probability calibration

**Brier Score**
```
brierScore = Σ(predicted_prob - actual_outcome)²
```
- Measures calibration quality
- 0 = perfect, higher = worse

**Accuracy**
```
accuracy = correct_predictions / total
```
- Simple % correct
- Less important than log loss for probabilistic betting

## 📈 Expected Output

```
================================================================================
CALIBRATION RESULTS: Premier League
================================================================================
Draw Width | Log Loss | Brier Score | Accuracy | Performance
--------------------------------------------------------------------------------
        50 | 1.1247 |     0.5832 |  48.23% |
        55 | 1.1189 |     0.5801 |  48.67% | █
        60 | 1.1134 |     0.5774 |  49.12% | ██
        65 | 1.1082 |     0.5749 |  49.56% | ███
        70 | 1.1034 |     0.5728 |  50.01% | ████
        75 | 1.0991 |     0.5710 |  50.45% | █████
        80 | 1.0952 |     0.5695 |  50.89% | ██████
        85 | 1.0918 |     0.5684 |  51.23% | ████████
        87 | 1.0908 |     0.5679 |  51.34% | ██████████ ← OPTIMAL
        90 | 1.0912 |     0.5681 |  51.28% | █████████
        95 | 1.0921 |     0.5689 |  51.01% | ███████
       100 | 1.0945 |     0.5703 |  50.67% | █████
       ...
================================================================================
OPTIMAL DRAW WIDTH: 87
BEST LOG LOSS: 1.0908
================================================================================

Outcomes: 46.8% H, 24.2% D, 29.0% A
ELO Stats: 20 teams, avg 1498.3, range 1342-1687
```

## 🎯 Integration Status

### ✅ Already Integrated
The app is already set up to use calibrated values:

**In `odds-calculator.js`:**
```javascript
import { getDrawWidth } from './draw-width-config.js';

export function calculateMatchProbabilities(homeRating, awayRating, leagueCode = null) {
    const drawWidth = getDrawWidth(leagueCode); // Uses calibrated value
    // ... rest of calculation
}
```

### ⚠️ Missing: League Code Passing

Currently, the UI doesn't pass league codes to the calculator. This means it uses the global default (90) for all leagues.

**To enable league-specific calibration**, you need to update `ui.js`:

```javascript
// BEFORE (current)
let calculatedOdds = calculateOddsFromRatings(homeRating, awayRating);

// AFTER (needed)
let calculatedOdds = calculateOddsFromRatings(homeRating, awayRating, leagueCode);
```

Where `leagueCode` should be one of:
- `'premier-league'`
- `'serie-a'`
- `'la-liga'`
- `'bundesliga'`
- `'ligue-1'`

## 📁 Files Overview

### Created Files
- **`scripts/calibrate-draw-width.js`** - Calibration script (run with Node.js)
- **`js/draw-width-config.js`** - Generated config (updated by calibration)
- **`package.json`** - NPM scripts
- **`calibration-results/*.json`** - Detailed results (timestamped)

### Modified Files
- **`js/odds-calculator.js`** - Now accepts optional `leagueCode` parameter

### Need to Modify
- **`js/ui.js`** - Pass league code to `calculateOddsFromRatings()`
- **`js/config.js`** (or wherever league codes are stored) - Map league names to codes

## 🔄 Recalibration

Run calibration periodically to keep parameters updated:

**Monthly/Quarterly:**
```bash
npm run calibrate
```

**Custom date range** (requires script modification):
```javascript
const CONFIG = {
  seasons: ['2324', '2223'],  // Adjust as needed
  // ...
};
```

## 🧪 Validation

To verify calibration quality, split data into train/test sets:

```javascript
// Modify script to use 70% for calibration, 30% for testing
const trainMatches = allMatches.slice(0, Math.floor(allMatches.length * 0.7));
const testMatches = allMatches.slice(Math.floor(allMatches.length * 0.7));

// Calibrate on train
const calibration = calibrateDrawWidth(trainMatches);

// Validate on test
const testLogLoss = calculateLogLoss(testMatches, calibration.optimalWidth);
console.log(`Test Log Loss: ${testLogLoss}`);
```

## 🎨 Benefits vs Market-Based Approach

| Aspect | Historical Outcomes ✅ | Market Odds ❌ |
|--------|----------------------|---------------|
| **Independence** | Complete | Lost |
| **EV Validity** | Preserved | Destroyed |
| **Circular Logic** | None | Yes |
| **Value Betting** | Enabled | Disabled |
| **Data Source** | Match results | Bookmaker prices |
| **Margin Issues** | None | Contaminated |

## 🐛 Troubleshooting

**No data fetched:**
- Check internet connection
- Verify football-data.co.uk is accessible
- Try different seasons if recent data unavailable

**All leagues show same width:**
- This is expected initially (default 90)
- Run calibration to generate league-specific values
- Check `js/draw-width-config.js` was updated

**Unexpected results:**
- Check sample size (need 200+ matches per league)
- Verify ELO ratings are reasonable (1300-1700 range)
- Review `calibration-results/*.json` for detailed analysis

## 📞 Next Steps

1. **Run on your local machine**: `npm run calibrate`
2. **Review generated values** in `js/draw-width-config.js`
3. **Update UI** to pass league codes (next commit)
4. **Test with real matches** to verify improvement
5. **Recalibrate seasonally** to keep parameters fresh

---

**For questions or issues, check the calibration results JSON files for detailed diagnostics.**
