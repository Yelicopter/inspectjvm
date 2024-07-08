document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const stepButton = document.getElementById('stepButton');
    const runButton = document.getElementById('runButton');
    const stepsButton = document.getElementById('stepsButton');
    const stepsInput = document.getElementById('stepsInput');
    const hexOutputElement = document.getElementById('hexOutput');
    const outputElement = document.getElementById('output');
    const pcElement = document.getElementById('programCounter');
    const ws = new WebSocket('ws://localhost:5500');
    let uploadedFilePath;

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;

        // Check if the file is an ijvm file
        if (!file.name.endsWith('.ijvm')) {
            hexOutputElement.innerHTML = 'Please select a valid IJVM file.\n';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        fetch('/upload', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                hexOutputElement.innerHTML = `Error: ${data.error}\n`;
                return;
            }
            uploadedFilePath = data.filePath;
            ws.send(JSON.stringify({ command: 'upload', payload: { filePath: data.filePath, hexData: data.hexData } }));
        })
        .catch(error => {
            console.error('Error uploading file:', error);
            hexOutputElement.innerHTML = 'Error uploading file.\n';
        });
    });

    stepButton.addEventListener('click', () => {
        ws.send(JSON.stringify({ command: 'step' }));
    });

    runButton.addEventListener('click', () => {
        ws.send(JSON.stringify({ command: 'run' }));
    });

    stepsButton.addEventListener('click', () => {
        const numSteps = parseInt(stepsInput.value, 10);
        if (!isNaN(numSteps)) {
            ws.send(JSON.stringify({ command: `steps ${numSteps}` }));
        } else {
            outputElement.value = 'Invalid number of steps\n';
        }
    });

    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);

        if (data.command === 'displayHex') {
            hexOutputElement.innerHTML = formatHexData(data.payload.hexData);
        } else if (data.command === 'output') {
            outputElement.value += `${data.payload.data}\n`;
        } else if (data.command === 'updatePC') {
            pcElement.innerHTML = `Program Counter: ${data.payload.pc}`;
        }
    };

    ws.onopen = function(event) {
        console.log("Connected to WebSocket server");
    };
});

function formatHexData(hexData) {
    return hexData.map(byte => `<span class="hex-byte">${byte}</span>`).join('');
}
