const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const WebSocket = require('ws');
//const http = require('http');

const app = express();
const port = 3002;
const upload = multer({ dest: 'uploads/' });
const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});


// Global value for the file path of the uploaded file so it can change between uploads/run()'s
let filePath;

// websocket server attach
const wss = new WebSocket.Server({ server });

// our public directory used (static)
app.use(express.static('public'));

// at file upload
app.post('/upload', upload.single('file'), (req, res) => {
    console.log('File received:', req.file.originalname);
    // save filepath
    filePath = req.file.path;
    res.send('File uploaded and awaiting commands.');
});

wss.on('connection', (ws) => {
    let ijvmProcess;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.command === 'run' || data.command === 'step') {
            // is there an ijvm process running? / is it the same file? / is it killed?
            if (!ijvmProcess || ijvmProcess.spawnargs[1] == filePath || ijvmProcess.spawnargs[1] == filePath || ijvmProcess.killed) {
                ijvmProcess = spawn('./main', [filePath]);
                setupProcessListeners(ijvmProcess, ws);
            }
            // Send the command to the IJVM process
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
        // output from IJVM 
        ws.send(data.toString());
    });
    process.stderr.on('data', (data) => {
        // err output from IJVM 
        ws.send(data.toString());
    });

    // for when process exits
    process.on('close', (code) => {
        console.log(`IJVM machine process exited with code ${code}`);
    });
}