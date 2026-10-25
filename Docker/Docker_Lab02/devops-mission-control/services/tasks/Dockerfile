FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN pip install --no-cache-dir psycopg[binary]==3.2.3
COPY app.py ./
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 3002
CMD ["python", "app.py"]
