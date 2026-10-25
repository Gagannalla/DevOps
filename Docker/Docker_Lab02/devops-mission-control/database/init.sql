CREATE TABLE IF NOT EXISTS incidents (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO incidents (title, severity) VALUES
  ('Example: API latency above threshold', 'HIGH'),
  ('Example: staging deployment verification', 'LOW');

INSERT INTO tasks (title, done) VALUES
  ('Inspect all six containers with docker compose ps', FALSE),
  ('Create an incident and confirm it persists after restart', FALSE),
  ('Read logs from the Node.js and Python services', FALSE);
