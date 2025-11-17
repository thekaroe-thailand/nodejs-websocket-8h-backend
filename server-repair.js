const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const WebSocket = require('ws');

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const PORT = 3001;

let tickets = [];
let nextTicketId = 1;

app.get('/tickets', (req, res) => res.json(tickets));

app.post('/tickets', (req, res) => {
    const { machine, detail, reporter } = req.body;

    if (!machine || !detail || !reporter) {
        return res.status(400).json({ error: 'machine, detail, reporter required' });
    }

    const ticket = {
        id: nextTicketId++,
        machine,
        detail,
        reporter,
        status: 'รับเรื่องแล้ว',
        createdAt: new Date().toISOString()
    }

    tickets.push(ticket);

    broadcast({ type: 'new_ticket', ticket });

    return res.status(201).json(ticket);
})

app.put('/tickets/:id/status', (req, res) => {
    const ticket = tickets.find((t) => t.id == req.params.id);

    if (!ticket) return res.status(404).json({ error: 'ticket not found' });

    const { status } = req.body;
    ticket.status = status || ticket.status;

    broadcast({ type: 'update_status', ticket });
    res.json(ticket);
})

const wss = new WebSocket.Server({ server });

function broadcast(payload) {
    const text = JSON.stringify(payload);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(text);
        }
    })
}

wss.on('connection', (ws) => {
    console.log('Client connected via WS');

    ws.send(JSON.stringify({ type: 'init', tickets }));

    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg.toString());
            console.log('WS received: ', data);
        } catch (e) {
            console.log('WS non-json message', msg.toString());
        }
    })

    ws.on('close', () => console.log('Client disconnected'));
});

server.listen(PORT, () => {
    console.log('Server running on http://localhost:' + PORT);
    console.log('WebSocket ready at ws://localhost:' + PORT);
})