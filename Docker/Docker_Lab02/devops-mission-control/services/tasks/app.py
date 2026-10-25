import json, os, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
import psycopg
from psycopg.rows import dict_row

PORT = int(os.getenv("PORT", "3002"))
DATABASE_URL = os.environ["DATABASE_URL"]

def connect():
    for attempt in range(20):
        try:
            return psycopg.connect(DATABASE_URL, row_factory=dict_row)
        except Exception:
            if attempt == 19: raise
            time.sleep(1.5)

class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, value):
        data = json.dumps(value, default=str).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def body(self):
        length = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(length) or b"{}")

    def do_GET(self):
        path = urlparse(self.path).path
        try:
            if path == "/health":
                with connect() as db: db.execute("SELECT 1")
                return self.send_json(200, {"service":"tasks","database":True})
            if path == "/tasks":
                with connect() as db:
                    rows = db.execute("SELECT id,title,done,created_at FROM tasks ORDER BY id DESC LIMIT 100").fetchall()
                return self.send_json(200, rows)
            return self.send_json(404, {"error":"Not found"})
        except Exception as e:
            print("GET error:", repr(e), flush=True)
            return self.send_json(500, {"error":"Internal service error"})

    def do_POST(self):
        if urlparse(self.path).path != "/tasks": return self.send_json(404, {"error":"Not found"})
        try:
            body = self.body()
            title = str(body.get("title", "")).strip()
            if not title or len(title)>120: return self.send_json(400, {"error":"Title must be 1-120 characters."})
            with connect() as db:
                row = db.execute("INSERT INTO tasks(title) VALUES(%s) RETURNING id,title,done,created_at", (title,)).fetchone()
            return self.send_json(201, row)
        except Exception as e:
            print("POST error:", repr(e), flush=True)
            return self.send_json(500, {"error":"Internal service error"})

    def do_PATCH(self):
        parts = urlparse(self.path).path.strip("/").split("/")
        if len(parts)!=2 or parts[0]!="tasks" or not parts[1].isdigit(): return self.send_json(404, {"error":"Not found"})
        try:
            done = self.body().get("done")
            if not isinstance(done, bool): return self.send_json(400, {"error":"done must be true or false"})
            with connect() as db:
                row = db.execute("UPDATE tasks SET done=%s WHERE id=%s RETURNING id,title,done,created_at",(done,int(parts[1]))).fetchone()
            return self.send_json(200,row) if row else self.send_json(404,{"error":"Not found"})
        except Exception as e:
            print("PATCH error:", repr(e), flush=True)
            return self.send_json(500, {"error":"Internal service error"})

    def do_DELETE(self):
        parts = urlparse(self.path).path.strip("/").split("/")
        if len(parts)!=2 or parts[0]!="tasks" or not parts[1].isdigit(): return self.send_json(404, {"error":"Not found"})
        try:
            with connect() as db:
                result = db.execute("DELETE FROM tasks WHERE id=%s RETURNING id",(int(parts[1]),)).fetchone()
            return self.send_json(200,{"deleted":True}) if result else self.send_json(404,{"error":"Not found"})
        except Exception as e:
            print("DELETE error:", repr(e), flush=True)
            return self.send_json(500, {"error":"Internal service error"})

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)

if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Task service listening on {PORT}", flush=True)
    server.serve_forever()
