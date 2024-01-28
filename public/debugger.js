document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const stepButton = document.getElementById('stepButton');
    const runButton = document.getElementById('runButton');
    const outputElement = document.getElementById('output');
    const ws = new WebSocket('ws://localhost:3002');
    const form = document.getElementById('uploadForm');
    const responseMessage = document.getElementById('responseMessage');

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const formData = new FormData(form);

        // AJAX: send form data to server
        fetch('/upload', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.text())
        .then(data => {
            // file uploaded, awaiting commands
            responseMessage.textContent = data;
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });

    uploadButton.addEventListener('click', () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            ws.send(JSON.stringify({ command: 'upload', payload: { fileData: e.target.result } }));
        };
        reader.readAsText(file);
    });

    stepButton.addEventListener('click', () => {
        ws.send(JSON.stringify({ command: 'step' }));
    });

    runButton.addEventListener('click', () => {
        ws.send(JSON.stringify({ command: 'run' }));
    });

    ws.onmessage = function(event) {
        outputElement.value += `${event.data}\n`;
    };

    ws.onopen = function(event) {
        console.log("Connected to WebSocket server");
    };
});
