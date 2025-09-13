from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import math

app = FastAPI(title="Path Lamps Game Simulator")

class LampSpec(BaseModel):
    bright: float
    dark: float

class IndividualSpec(BaseModel):
    speed: float
    start_delay: float = 0.0

class SimInput(BaseModel):
    path_length: int
    lamps: List[LampSpec]
    lamp_assignment: Optional[List[int]] = None
    individuals: List[IndividualSpec]
    epsilon_check: float = 1e-9

def is_lamp_bright_at(t: float, bright: float, dark: float, eps: float = 1e-9) -> bool:
    if bright <= 0:
        return False
    period = bright + dark
    if period <= 0:
        return False
    return (t % period) + eps < bright

def simulate_game(path_length: int, lamps: List[dict], lamp_assignment: Optional[List[int]], individuals: List[dict], eps: float):
    N = path_length
    if len(lamps) != N:
        raise ValueError("Number of lamps must equal path_length.")
    if lamp_assignment is None:
        lamp_assignment = list(range(N))
    if len(lamp_assignment) != N:
        raise ValueError("lamp_assignment must match path_length.")
    node_to_lamp = list(lamp_assignment)

    results = []
    overall_success = True
    for pid, ind in enumerate(individuals):
        speed = ind["speed"]
        start_delay = ind["start_delay"]
        if speed <= 0:
            raise ValueError("Speed must be positive.")
        dt_edge = 1.0 / speed
        indiv_success = True
        timeline = []
        for node in range(N):
            t_node = start_delay + node * dt_edge
            lamp_idx = node_to_lamp[node]
            lamp = lamps[lamp_idx]
            lit = is_lamp_bright_at(t_node, lamp["bright"], lamp["dark"], eps)
            timeline.append({
                "node": node,
                "time": round(t_node, 6),
                "lamp_index": lamp_idx,
                "lamp_bright": lit
            })
            if not lit:
                indiv_success = False
        results.append({
            "individual_id": pid,
            "speed": speed,
            "start_delay": start_delay,
            "success": indiv_success,
            "timeline": timeline
        })
        if not indiv_success:
            overall_success = False
    return {"success": overall_success, "lamp_assignment": node_to_lamp, "results": results}

@app.post("/simulate")
async def simulate(payload: SimInput):
    lamps = [{"bright": l.bright, "dark": l.dark} for l in payload.lamps]
    individuals = [{"speed": i.speed, "start_delay": i.start_delay} for i in payload.individuals]
    try:
        result = simulate_game(payload.path_length, lamps, payload.lamp_assignment, individuals, payload.epsilon_check)
        return JSONResponse(content=result)
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

INDEX_HTML = """
<!doctype html>
<html>
<head><meta charset="utf-8"><title>Path Lamps Game</title></head>
<body>
<h2>Path Lamps Game Simulator</h2>
<textarea id="payload" rows=15 cols=70>
{
  "path_length": 5,
  "lamps": [
    {"bright": 1.0, "dark": 1.0},
    {"bright": 0.8, "dark": 1.2},
    {"bright": 1.5, "dark": 0.5},
    {"bright": 1.0, "dark": 1.0},
    {"bright": 0.7, "dark": 1.3}
  ],
  "lamp_assignment": [0,1,2,3,4],
  "individuals": [
    {"speed": 1.0, "start_delay": 0.0},
    {"speed": 0.8, "start_delay": 0.3}
  ]
}
</textarea>
<br><button onclick="runSim()">Run Simulation</button>
<pre id="out"></pre>
<script>
async function runSim(){
  const p = JSON.parse(document.getElementById("payload").value);
  const r = await fetch("/simulate", {method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify(p)});
  document.getElementById("out").innerText = JSON.stringify(await r.json(), null, 2);
}
</script>
</body>
</html>
"""

@app.get("/", response_class=HTMLResponse)
async def index():
    return INDEX_HTML
