FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/main.py backend/incident_feed.py backend/missions.json ./
COPY data/incidents.json ./incident_seed.json
RUN useradd --create-home quest
USER quest
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
