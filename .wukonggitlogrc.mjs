// Wukong GitLog Config
// Generated at 2026/1/1 22:59:26

export default {
  "git": {
    "noMerges": true,
    "limit": 5000
  },
  "period": {
    "groupBy": "month"
  },
  "worktime": {
    "country": "CN",
    "start": 9,
    "end": 18,
    "lunch": {
      "start": 12,
      "end": 14
    },
    "overnightCutoff": 6
  },
  "output": {
    "dir": "output-wukong",
    "formats": [
      "text"
    ],
    "perPeriod": {
      "enabled": true,
      "excelMode": "sheets"
    }
  }
};