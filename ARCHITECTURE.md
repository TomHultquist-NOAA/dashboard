# Architecture Notes

The prototype intentionally keeps the UI separate from EVS-native file details.

```text
EVS CSV output
    ↓
Normalization / adapter layer
    ↓
Regional daily CSV contract
    ↓
DataService filtering + aggregation
    ↓
Home / Skill vs Lead / baseline-relative Scorecard / Time Series UI
```

For a first operational deployment, a scheduled server-side process can normalize recent EVS statistics into dashboard-ready files. The browser then reads the most recent 90 daily dates. A later API or database layer can replace the static CSV files without changing the presentation logic substantially.

Aggregation rules in the current front end:

- RMSE: root-mean-square pooling
- ACC: Fisher-z averaging
- Bias: arithmetic mean
- ETS: arithmetic mean

These rules are prototype assumptions and should be reviewed against the EVS/METplus statistic definitions and OMD's desired aggregation methodology before operational use.
