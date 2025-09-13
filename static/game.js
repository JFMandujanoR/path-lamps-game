
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const exampleInput = document.getElementById('exampleInput');
const resultPre = document.getElementById('result');

// Load example.json into textarea
fetch('static/example.json')
  .then(r => r.json())
  .then(data => {
    exampleInput.value = JSON.stringify(data, null, 2);
  });

let nodes = 5;
let lamps = [0,1,2,3,4];
let individuals = [];
let pathLength = 800;
let nodeSpacing = pathLength / (nodes - 1);
let lampStates = Array(nodes).fill(false);
let simulationRunning = false;
let positions = [];
let indivColors = ['#ff6f61','#6b5b95','#88b04b','#f7cac9','#92a8d1','#955251'];

function drawPath() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw path
    ctx.strokeStyle = '#3a7bd5';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(50, 150);
    ctx.lineTo(850, 150);
    ctx.stroke();
    // Draw nodes
    for (let i = 0; i < nodes; i++) {
        ctx.beginPath();
        ctx.arc(50 + i * nodeSpacing, 150, 12, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#3a7bd5';
        ctx.stroke();
    }
    // Draw lamps
    lamps.forEach(idx => {
        ctx.beginPath();
        ctx.arc(50 + idx * nodeSpacing, 150, 18, 0, 2 * Math.PI);
        ctx.fillStyle = lampStates[idx] ? '#ffe066' : '#bdbdbd';
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.stroke();
    });
    // Draw individuals
    individuals.forEach((ind, i) => {
        ctx.beginPath();
        ctx.arc(50 + positions[i], 150, 10, 0, 2 * Math.PI);
        ctx.fillStyle = indivColors[i % indivColors.length];
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.stroke();
    });
}

function runSimulation(simData) {
    // Prepare for animation
    nodes = simData.path_length;
    lamps = simData.lamp_assignment;
    individuals = simData.individuals;
    pathLength = 800;
    nodeSpacing = pathLength / (nodes - 1);
    lampStates = Array(nodes).fill(false);
    positions = Array(individuals.length).fill(0);
    simulationRunning = true;
    statusDiv.textContent = 'Simulation running...';
    drawPath();
    // Animate movement
    function animateStep() {
        lampStates = Array(nodes).fill(false);
        individuals.forEach((ind, i) => {
            let nodeIdx = Math.round(positions[i] / nodeSpacing);
            if (lamps.includes(nodeIdx)) lampStates[nodeIdx] = true;
        });
        let allDone = true;
        individuals.forEach((ind, i) => {
            if (positions[i] < pathLength) {
                positions[i] += ind.speed * 2;
                allDone = false;
            }
        });
        drawPath();
        if (allDone) {
            simulationRunning = false;
            statusDiv.textContent = 'Simulation complete!';
        } else {
            setTimeout(animateStep, 60);
        }
    }
    animateStep();
}

startBtn.onclick = async function() {
    if (simulationRunning) return;
    let simData;
    try {
        simData = JSON.parse(exampleInput.value);
    } catch (e) {
        statusDiv.textContent = 'Invalid JSON!';
        return;
    }
    // Send to backend for simulation result
    const resp = await fetch('/simulate', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(simData)
    });
    const result = await resp.json();
    resultPre.textContent = JSON.stringify(result, null, 2);
    runSimulation(simData);
};

