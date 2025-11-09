const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const WebSocket = require('ws');

const app = express();

app.use(cors());
app.use(express.json());

const server = createServer(app);
const PORT = 3001;

const foods = [
    { id: 1, name: 'สปาเก็ตตี้คาโบนาร่า', price: 120 },
    { id: 2, name: 'ผัดผักรวมมิตร', price: 80 },
    { id: 3, name: 'ข้าวผัดกุ้ง', price: 90 },
    { id: 4, name: 'ต้มยำกุ้ง', price: 110 },
    { id: 5, name: 'สเต็กไก่', price: 150 }
];

let orders = [];
let nextOrderId = 1;

// HTTP Endpoints
app.get('/foods', (req, res) => {
    res.json(foods);
});

app.get('/orders', (req, res) => {
    res.json(orders);
});

app.post('/orders', (req, res) => {
    try {
        const { FoodId, tableNo, qty } = req.body;

        if (!FoodId || !tableNo || !qty) {
            return res.status(500).json({ error: 'FoodId, tableNo, qty required' })
        }

        const food = foods.find((f) => f.id === Number(FoodId))

        if (!food) return res.status(404).json({ error: 'Food not found' });

        const order = {
            id: nextOrderId++,
            FoodId: food.id,
            name: food.name,
            price: food.price,
            tableNo,
            qty: Number(qty),
            createdAt: new Date().toISOString()
        };

        orders.push(order);

        broadcast({ type: 'new_order', order });

        return res.status(201).json(order);
    } catch (err) {
        console.err(err);
        return res.status(500).json({ error: 'Server error' })
    }
})

app.post('/orders/bulk', (req, res) => {
    const { tableNo, items } = req.body;

    if (!Array.isArray(items)) return res.status(400).json({ error: 'invalid items ' });

    items.forEach((item) => {
        const newOrder = {
            id: Date.now() + Math.random(),
            FoodId: item.FoodId,
            name: item.name,
            price: item.price,
            qty: item.qty,
            tableNo,
            createdAt: new Date()
        };
        orders.push(newOrder);
        wss.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(JSON.stringify({ type: 'new_order', order: newOrder }));
            }
        })
    })

    res.json({ ok: true, count: items.length });
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
    console.log('Client conncted via WS');

    ws.send(JSON.stringify({ type: 'init', orders }));
    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg.toString());
            console.log('WS received: ', data);
        } catch (e) {
            console.log('WS non-json message: ', msg.toString());
        }
    })
    ws.on('close', () => console.log('Client disconnected'));
})

server.listen(PORT, () => {
    console.log(`Server Runing on http://localhost:${PORT}`);
    console.log(`WebSocket ready at ws://localhost:${PORT}`);
})


