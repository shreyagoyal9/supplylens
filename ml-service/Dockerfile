FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Train models at build time so they're baked into the image
RUN python train.py

EXPOSE 5001

CMD gunicorn -w 2 -b 0.0.0.0:${PORT:-5001} --timeout 120 app:app
