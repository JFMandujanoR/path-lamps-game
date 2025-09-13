// Simple visualization logic for Path Lamps Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const startBtn = document.getElementById('startBtn');

// Example data (should be fetched from backend)
let nodes = 10;
let lamps = [2, 5, 8]; // Example lamp positions
let individuals = [
    {id: 1, speed: 1.5, color: '#ff6f61'},
    {id: 2, speed: 1.0, color: '#6b5b95'},
    {id: 3, speed: 2.0, color: '#88b04b'}
];
let pathLength = 800;
let nodeSpacing = pathLength / (nodes - 1);
let lampStates = Array(nodes).fill(false);
let simulationRunning = false;
let positions = Array(individuals.length).fill(0);

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
        ctx.fillStyle = ind.color;
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.stroke();
    });
}

function updateSimulation() {
    // Simple lamp logic: lamps turn on when individual is near
    lampStates = Array(nodes).fill(false);
    individuals.forEach((ind, i) => {
        let nodeIdx = Math.round(positions[i] / nodeSpacing);
        if (lamps.includes(nodeIdx)) lampStates[nodeIdx] = true;
    });
    // Move individuals
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
        setTimeout(updateSimulation, 60);
    }
}

startBtn.onclick = function() {
    if (!simulationRunning) {
        positions = Array(individuals.length).fill(0);
        simulationRunning = true;
        statusDiv.textContent = 'Simulation running...';
        updateSimulation();
    }
};

drawPath();
