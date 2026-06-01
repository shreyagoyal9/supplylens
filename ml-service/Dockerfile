# ─────────────────────────────────────────────────────────────────────────────
# SupplyLens ML Service — Dockerfile
#
# Build strategy:
#   1. Install Python deps (cached layer — only rebuilds when requirements change)
#   2. Copy source code
#   3. Train Isolation Forest model at build time (baked into image)
#      LSTM is skipped because TensorFlow is not in requirements.txt — the
#      rule-based fallback in app.py activates automatically on free tier.
#   4. Start Flask via Gunicorn, binding to $PORT (Render injects this).
#
# First build: ~3–5 min (pip install + model training).
# Subsequent builds: ~1 min (deps are cached).
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim

WORKDIR /app

# Install libgomp (required by scikit-learn's OpenMP backend)
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (Docker layer cache: only re-runs when
# requirements.txt changes, not when source code changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Train and save ML models inside the image.
# saved_models/ is committed to the image — no training happens at runtime.
RUN python train.py

# Render dynamically assigns $PORT; fall back to 5001 for local Docker runs.
# We use EXPOSE only as documentation — Render ignores it.
EXPOSE 5001

# -w 1  → single worker (free tier has 512 MB RAM; two workers can OOM)
# --timeout 120 → allow cold-start model loads up to 2 minutes
CMD gunicorn -w 1 -b 0.0.0.0:${PORT:-5001} --timeout 120 app:app
