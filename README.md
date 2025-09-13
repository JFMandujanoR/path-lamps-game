# Path Lamps Game Simulator 🎮💡

A FastAPI web app simulating a puzzle game with lamps and individuals.

## Run locally

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Deploy to Render

1. Push this folder to a GitHub repo.
2. Create a new Web Service on Render.
3. Connect your GitHub repo.
4. Render will use `render.yaml` to build & start the app.
