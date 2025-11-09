const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: 3001 });

wss.on('connection', (ws) => {
    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg.toString())

            wss.clients.forEach((client) => {
                if (client.readyState === ws.OPEN) {
                    client.send(JSON.stringify(data))
                }
            })
        } catch {
            console.log('invalid json')
        }
    })
})

console.log('WebSocket server running on ws://localhost:3001')