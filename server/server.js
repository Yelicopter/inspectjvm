const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = 5265;
const upload = multer({ dest: 'uploads/' });

// Serve static files from 'client' directory
app.use(express.static(path.join(__dirname, '../client')));

const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });

app.post('/upload', upload.single('file'), (req, res) => {
    const filePath = req.file.path;
    res.json({ filePath });
});

wss.on('connection', (ws) => {
    let ijvmProcess;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.command === 'upload' && data.payload.fileData) {
            // Handle file upload and processing here
        } else if (ijvmProcess) {
            ijvmProcess.stdin.write(`${data.command}\n`);
        }
    });

    ws.on('close', () => {
        if (ijvmProcess) {
            ijvmProcess.kill();
        }
    });
});

function setupProcessListeners(process, ws) {
    process.stdout.on('data', (data) => {
        ws.send(data.toString());
    });
    process.stderr.on('data', (data) => {
        ws.send(data.toString());
    });
}
