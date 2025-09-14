
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const lampOrderInput = document.getElementById('lampOrder');
const indOrderInput = document.getElementById('indOrder');
const resultPre = document.getElementById('result');
const summaryGraph = document.getElementById('summaryGraph');
const successIndicator = document.getElementById('successIndicator');

// Load example.json into textarea
let exampleData = null;
fetch('/static/example.json')
    .then(r => r.json())
    .then(data => {
        exampleData = data;
        renderSummary(data);
    });
function renderSummary(data) {
    let html = '';
    html += `<strong>Individuals:</strong> ${data.individuals.length}<br>`;
    html += '<ul>';
    data.individuals.forEach((ind, i) => {
        html += `<li><b>[${i}]</b> Individual ${i+1}: Speed = <b>${ind.speed}</b>, Start Delay = ${ind.start_delay !== undefined ? ind.start_delay : 0}</li>`;
    });
    html += '</ul>';
    html += `<strong>Lamps:</strong> ${data.lamps.length}<br>`;
    html += '<ul>';
    data.lamps.forEach((lamp, i) => {
        html += `<li><b>[${i}]</b> Lamp ${i+1}: Bright = <b>${lamp.bright}s</b>, Dark = <b>${lamp.dark}s</b></li>`;
    });
    html += '</ul>';
    html += `<small>Use the indices <b>[0]</b>, <b>[1]</b>, ... above to enter your desired order for lamps and individuals.</small>`;
    summaryGraph.innerHTML = html;
}

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
    if (!exampleData) return;
    // Get lamp order
    let lampOrder = lampOrderInput.value.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
    if (lampOrder.length !== exampleData.lamps.length) {
        statusDiv.textContent = 'Lamp order must have ' + exampleData.lamps.length + ' indices.';
        return;
    }
    // Get individual order
    let indOrder = indOrderInput.value.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
    if (indOrder.length !== exampleData.individuals.length) {
        statusDiv.textContent = 'Individual order must have ' + exampleData.individuals.length + ' indices.';
        return;
    }
    // Build individuals array with auto start_delay
    let indivs = indOrder.map((idx, i) => {
        let ind = {...exampleData.individuals[idx]};
        // Start delay: each starts after previous finishes (simple: path_length / speed)
        ind.start_delay = i === 0 ? 0 : exampleData.path_length / exampleData.individuals[indOrder[i-1]].speed;
        return ind;
    });
    // Build simData
    let simData = {
        path_length: exampleData.path_length,
        lamps: exampleData.lamps,
        lamp_assignment: lampOrder,
        individuals: indivs
    };
    renderSummary(simData);
    // Send to backend for simulation result
    const resp = await fetch('/simulate', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(simData)
    });
    const result = await resp.json();
    resultPre.textContent = '';
    if (result.success) {
        successIndicator.textContent = 'Arrangement is SUCCESSFUL!';
        successIndicator.className = 'success-indicator success';
    } else {
        successIndicator.textContent = 'Arrangement is NOT successful.';
        successIndicator.className = 'success-indicator fail';
    }
    runSimulation(simData);
};

