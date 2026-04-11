# ML Experimentation Platform

A full-stack machine learning experimentation platform built as a portfolio-quality project demonstrating end-to-end software engineering across backend APIs, ML pipelines, and modern React UIs.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, Flask 3.0, SQLite |
| ML | scikit-learn 1.3, pandas 2.1, numpy 1.26 |
| Frontend | React 18, Recharts, Axios |
| Storage | Local filesystem (uploads), SQLite (metadata) |
| API Style | REST, JSON |

---

## Features

- **CSV Upload & Validation** — server-side schema profiling, missing value analysis, type inference
- **Preprocessing Pipeline** — train/val/test split, imputation, standard/min-max scaling, one-hot encoding
- **Multi-Model Training** — Linear Regression, Logistic Regression, Random Forest, Gradient Boosting
- **Metrics** — RMSE/MAE/R² for regression; Accuracy/Precision/Recall/F1 + confusion matrix for classification
- **Feature Importance** — tree-based importance scores and linear model coefficients
- **Run Stability Tracking** — compare metric consistency across multiple runs on the same dataset
- **Experiment History** — all runs saved to SQLite, browsable and reloadable
- **Leaderboard** — top experiments ranked by primary metric
- **JSON Export** — download any experiment as a structured report

---

## Project Structure

```
ml-platform/
├── backend/
│   ├── app.py                  # Flask application factory
│   ├── requirements.txt
│   ├── .env                    # Environment config
│   ├── routes/
│   │   ├── dataset_routes.py   # Upload, summary endpoints
│   │   └── experiment_routes.py # Run, list, leaderboard endpoints
│   ├── services/
│   │   ├── dataset_service.py  # CSV validation & profiling
│   │   └── experiment_service.py # Pipeline orchestration
│   ├── ml/
│   │   ├── preprocessor.py     # sklearn ColumnTransformer pipeline
│   │   ├── trainer.py          # Model instantiation & fitting
│   │   ├── evaluator.py        # Metric computation
│   │   └── explainer.py        # Feature importance extraction
│   └── models/
│       └── database.py         # SQLite schema & connection helpers
├── frontend/
│   ├── package.json
│   ├── public/index.html
│   └── src/
│       ├── App.js              # Root + navigation
│       ├── index.js
│       ├── styles/global.css   # Design system
│       ├── hooks/
│       │   └── useExperiment.js # Experiment workflow state
│       ├── utils/
│       │   └── api.js          # Axios API client
│       ├── components/
│       │   ├── UploadZone.jsx
│       │   ├── DatasetSummary.jsx
│       │   ├── ExperimentConfigForm.jsx
│       │   ├── MetricCards.jsx
│       │   ├── FeatureImportanceChart.jsx
│       │   ├── StabilityChart.jsx
│       │   └── ResultsDashboard.jsx
│       └── pages/
│           ├── NewExperimentPage.jsx
│           ├── ExperimentHistoryPage.jsx
│           ├── ExperimentDetailPage.jsx
│           └── LeaderboardPage.jsx
└── sample_loan_data.csv        # Demo dataset (300 rows, binary classification)
```

---

## Setup & Run

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start Flask server (port 5000)
python app.py
```

The API will be available at `http://localhost:5000/api`.
SQLite database (`experiments.db`) and uploads folder are auto-created on first run.

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start React dev server (port 3000)
npm start
```

Open `http://localhost:3000` in your browser.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/upload` | Upload CSV dataset |
| GET | `/api/dataset/:id/summary` | Dataset profile + preview |
| GET | `/api/datasets` | List all uploaded datasets |
| POST | `/api/experiments/run` | Run ML experiment |
| GET | `/api/experiments` | List all experiments |
| GET | `/api/experiments/:id` | Get experiment detail |
| GET | `/api/experiments/:id/export` | Export as JSON |
| GET | `/api/leaderboard` | Top 20 runs by score |

### Example: Run Experiment

```bash
curl -X POST http://localhost:5000/api/experiments/run \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": "<your-dataset-id>",
    "target_column": "loan_approved",
    "task_type": "classification",
    "models": ["random_forest", "gradient_boosting"],
    "preprocessing": {
      "test_size": 0.2,
      "val_size": 0.1,
      "handle_missing": "mean",
      "scaling": "standard",
      "encode_categoricals": true,
      "use_cross_validation": false,
      "drop_columns": []
    }
  }'
```

---

## Sample Dataset

`sample_loan_data.csv` — 300 rows of synthetic loan application data.

**Features:** `age`, `income`, `credit_score`, `employment_years`, `debt_to_income`, `loan_amount`, `num_accounts`, `missed_payments`

**Target:** `loan_approved` (0/1 binary classification)

**Recommended experiment:**
- Task type: Classification
- Target: `loan_approved`
- Models: Random Forest + Gradient Boosting
- Scaling: Standard

---

## Architecture Notes (for interviews)

**Why Flask?** Lightweight, explicit, and easy to structure. The application factory pattern (`create_app()`) is production-standard and makes testing trivial.

**Why SQLite?** Zero-config local persistence. The schema is simple enough that a full ORM adds no value here — raw SQL with parameterized queries is clearer and equally safe.

**Why sklearn Pipelines?** `ColumnTransformer` with `Pipeline` is the idiomatic way to handle mixed-type tabular data. It prevents data leakage (fit only on train), supports cross-validation correctly, and is easy to persist.

**Why custom hook (`useExperiment`)?** Separates state management from rendering. The page component becomes a thin view layer, the hook owns the async logic. Easy to test in isolation.

**Stability tracking:** Not production drift detection — intentionally lightweight. Tracks metric variance across repeated runs, which is meaningful for demonstrating model sensitivity to data shuffling.

---

## Potential Extensions

- User authentication (Flask-Login or JWT)
- Hyperparameter tuning (GridSearchCV)
- SHAP values for deeper explainability
- PostgreSQL backend for multi-user deployments
- Docker Compose for one-command startup
- Pytest test suite for backend services
