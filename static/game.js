const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const lampOrderInput = document.getElementById('lampOrder');
const indOrderInput = document.getElementById('indOrder');
const summaryGraph = document.getElementById('summaryGraph');
const successIndicator = document.getElementById('successIndicator');
const resultMessage = document.getElementById('resultMessage'); // 🔹 new

// Load example.json into textarea
let exampleData = null;
fetch('/static/example.json')
    .then(r => r.json())
    .then(data => {
        exampleData = data;
        renderSummary(data);
    });

// Preview input before simulation (simpler, no start_delay)
function renderSummary(data) {
    let html = `<strong>Individuals:</strong> ${data.individuals.length}<ul>`;
    data.individuals.forEach((ind, i) => {
        html += `<li>Individual ${i + 1}: Speed = <b>${ind.speed}</b></li>`;
    });
    html += `</ul><strong>Lamps:</strong> ${data.lamps.length}<ul>`;
    data.lamps.forEach((lamp, i) => {
        html += `<li>Lamp ${i + 1}: Bright = <b>${lamp.bright}s</b>, Dark = <b>${lamp.dark}s</b></li>`;
    });
    html += `</ul><small>Use the indices <b>[0]</b>, <b>[1]</b>, ... to enter your desired order for lamps and individuals.</small>`;
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

// Render backend result in a user-friendly way
function renderBackendResult(result) {
    let html = "";

    // Individuals
    html += `<h3>👤 Individuals (${result.individuals.length})</h3><ul>`;
    result.individuals.forEach((ind, i) => {
        const status = ind.success ? "✅ success" : "❌ fail";
        html += `<li>Individual ${i + 1} → Speed: <b>${ind.speed}</b> (${status})</li>`;
    });
    html += "</ul>";

    // Lamps
    html += `<h3>💡 Lamps (${result.lamps.length})</h3><ul>`;
    result.lamps.forEach((lamp, i) => {
        html += `<li>Lamp ${i + 1} → Bright: <b>${lamp.bright}s</b>, Dark: <b>${lamp.dark}s</b></li>`;
    });
    html += "</ul>";

    // Final success/fail
    if (result.success) {
        successIndicator.textContent = "✅ SUCCESS";
        successIndicator.className = "success-indicator success";
        html += `<p style="color: green; font-weight: bold;">Arrangement is successful!</p>`;
    } else {
        successIndicator.textContent = "❌ FAIL";
        successIndicator.className = "success-indicator fail";
        html += `<p style="color: red; font-weight: bold;">Arrangement is NOT successful.</p>`;
    }

    resultMessage.innerHTML = html;
}

startBtn.onclick = async function() {
    if (simulationRunning) return;
    if (!exampleData) return;

    let lampOrder = lampOrderInput.value.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
    if (lampOrder.length !== exampleData.lamps.length) {
        statusDiv.textContent = 'Lamp order must have ' + exampleData.lamps.length + ' indices.';
        return;
    }

    let indOrder = indOrderInput.value.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
    if (indOrder.length !== exampleData.individuals.length) {
        statusDiv.textContent = 'Individual order must have ' + exampleData.individuals.length + ' indices.';
        return;
    }

    let indivs = indOrder.map((idx, i) => {
        let ind = {...exampleData.individuals[idx]};
        ind.start_delay = i === 0 ? 0 : exampleData.path_length / exampleData.individuals[indOrder[i-1]].speed;
        return ind;
    });

    let simData = {
        path_length: exampleData.path_length,
        lamps: exampleData.lamps,
        lamp_assignment: lampOrder,
        individuals: indivs
    };

    renderSummary(simData);

    const resp = await fetch('/simulate', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(simData)
    });
    const result = await resp.json();

    statusDiv.textContent = 'Simulation result received.';
    renderBackendResult(result);

    runSimulation(simData);
};
