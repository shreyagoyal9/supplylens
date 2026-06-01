# ── Stage 1: Builder ──────────────────────────────────────────────────────────
# Installs Python deps + trains ML models before the app starts.
# We bake the trained models INTO the image so Railway doesn't re-train on every restart.

FROM python:3.11-slim AS builder

WORKDIR /app

# Install build deps (needed for numpy/tensorflow compilation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Train models (runs train.py, outputs to saved_models/)
RUN python train.py


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────

FROM python:3.11-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source + trained models from builder stage
COPY --from=builder /app /app

EXPOSE 5000

# Gunicorn: 2 workers, bind to Railway-assigned PORT
CMD gunicorn -w 2 -b 0.0.0.0:${PORT:-5000} --timeout 120 app:app
