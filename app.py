from fastapi import FastAPI
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import os

app = FastAPI(title="Path Lamps Game Simulator")
app.mount("/static", StaticFiles(directory="static"), name="static")

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
        for node in range(N):
            t_node = start_delay + node * dt_edge
            lamp_idx = node_to_lamp[node]
            lamp = lamps[lamp_idx]
            lit = is_lamp_bright_at(t_node, lamp["bright"], lamp["dark"], eps)
            if not lit:
                indiv_success = False
                break
        results.append({
            "id": pid + 1,   # 1-based for display
            "speed": speed,
            "success": indiv_success
        })
        if not indiv_success:
            overall_success = False

    # Build clean summary (no raw timelines)
    summary = {
        "success": overall_success,
        "individuals": results,
        "lamps": [
            {"id": i + 1, "bright": l["bright"], "dark": l["dark"]}
            for i, l in enumerate(lamps)
        ]
    }
    return summary

@app.get("/")
async def index():
    return FileResponse(os.path.join("static", "index.html"))

@app.post("/simulate")
async def simulate(payload: SimInput):
    lamps = [{"bright": l.bright, "dark": l.dark} for l in payload.lamps]
    individuals = [{"speed": i.speed, "start_delay": i.start_delay} for i in payload.individuals]
    try:
        result = simulate_game(payload.path_length, lamps, payload.lamp_assignment, individuals, payload.epsilon_check)
        return JSONResponse(content=result)
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
