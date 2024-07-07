const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 5265;
const upload = multer({ dest: 'uploads/' });

// Serve static files from 'client' directory
app.use(express.static(path.join(__dirname, '../client')));

let ijvmProcess = null;

const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });

app.post('/upload', upload.single('file'), (req, res) => {
    const filePath = req.file.path;

    // Validate if the file is an ijvm file
    if (!req.file.originalname.endsWith('.ijvm')) {
        fs.unlink(filePath, (err) => {
            if (err) console.error(`Error deleting invalid file: ${err.message}`);
        });
        return res.status(400).json({ error: 'Invalid file type. Please upload an IJVM file.' });
    }

    // Read file and convert to HEX
    fs.readFile(filePath, (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read file' });
        }
        const hexData = data.toString('hex').match(/.{1,2}/g).join(' ');

        res.json({ filePath, hexData });
    });
});

wss.on('connection', (ws) => {
    let filePath;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.command === 'upload') {
            filePath = data.payload.filePath;
            ws.send(JSON.stringify({ command: 'displayHex', payload: { hexData: data.payload.hexData } }));
             // Initialize the ijvm 
            if (ijvmProcess) {
                ijvmProcess.kill();
            }
            ijvmProcess = spawn(path.resolve(__dirname, 'ijvm'), [filePath]);
            setupProcessListeners(ijvmProcess, ws);
        } else if (ijvmProcess) {
            ijvmProcess.stdin.write(`${data.command}\n`);
        }
    });

    ws.on('close', () => {
        if (ijvmProcess) {
            ijvmProcess.kill();
        }

        fs.readdir('uploads', (err, files) => {
            if (err) {
                console.error(`Error reading uploads directory: ${err.message}`);
                return;
            }

            for (const file of files) {
                fs.unlink(path.join('uploads', file), (err) => {
                    if (err) {
                        console.error(`Error deleting file ${file}: ${err.message}`);
                    }
                });
            }
        });
    });
});

function setupProcessListeners(process, ws) {
    process.stdout.on('data', (data) => {
        ws.send(JSON.stringify({ command: 'output', payload: { data: data.toString() } }));
    });
    process.stderr.on('data', (data) => {
        ws.send(JSON.stringify({ command: 'output', payload: { data: data.toString() } }));
    });
}
