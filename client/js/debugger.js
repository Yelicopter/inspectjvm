document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const stepButton = document.getElementById('stepButton');
    const runButton = document.getElementById('runButton');
    const outputElement = document.getElementById('output');
    const ws = new WebSocket('ws://localhost:5265');
    let uploadedFilePath;

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;

        // Check if the file is an ijvm file
        if (!file.name.endsWith('.ijvm')) {
            outputElement.value = 'Please select a valid IJVM file.\n';
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
                outputElement.value = `Error: ${data.error}\n`;
                return;
            }
            uploadedFilePath = data.filePath;
            ws.send(JSON.stringify({ command: 'upload', payload: { filePath: data.filePath, hexData: data.hexData } }));
        })
        .catch(error => {
            console.error('Error uploading file:', error);
            outputElement.value = 'Error uploading file.\n';
        });
    });

    stepButton.addEventListener('click', () => {
        ws.send(JSON.stringify({ command: 'step' }));
    });

    runButton.addEventListener('click', () => {
        ws.send(JSON.stringify({ command: 'run' }));
    });

    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);

        if (data.command === 'displayHex') {
            outputElement.value = `HEX Data:\n${data.payload.hexData}\n\n`;
        } else if (data.command === 'output') {
            outputElement.value += `${data.payload.data}\n`;
        }
    };

    ws.onopen = function(event) {
        console.log("Connected to WebSocket server");
    };
});
