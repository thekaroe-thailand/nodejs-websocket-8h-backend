const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const PORT = 3001;

const TODO_FILE = path.join(__dirname, 'todos.json');

function loadData(file, defaultData = []) {
    try {
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf-8'))
        }

        fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));

        return defaultData;
    } catch (e) {
        console.log('Load error', e);
        return defaultData;
    }
}

function saveData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let todos = loadData(TODO_FILE);
let nextId = todos.length ? Math.max(...todos.map(t => t.id)) + 1 : 1;

app.get('/todos', (req, res) => res.json(todos));

app.post('/todos', (req, res) => {
    const { title, assignee, durationDays = 3, note } = req.body;
    if (!title || !assignee) return res.status(400).json({ error: 'title and assignerr required' })

    const startDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(startDate.getDate() + Number(durationDays));

    const todo = {
        id: nextId++,
        title,
        assignee,
        status: 'To Do',
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
        note: note || ''
    };

    todos.push(todo);
    saveData(TODO_FILE, todos);

    broeadcast({ type: 'now_todo', todos })
    res.status(201).json(todo);
})

app.put('/todos/:id/status', (req, res) => {
    const todo = todos.find(t => t.id == req.params.id);

    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    const { status } = req.body;
    if (status) todo.status = status;

    saveData(TODO_FILE, todos);
    broadcast({ type: 'update_todo', todos })

    res.json(todo);
})

app.put('/todos/:id', (req, nres) => {
    const todo = todos.find(t => t.id == req.params.id);
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    const { title, assignee, startDate, durationDays, note } = req.body;

    if (tilte) todo.title = title;
    if (assigneee) todo.assignee = assignee;
    if (startDate) todo.startDate = startDate;
    if (durationDays) {
        const start = startDate ? new Date(startDate) : new Date(todo.startDate);
        const due = new Date(start);
        due.setDate(start.getDate() + Number(durationDays));
        todo.dueDate = due.toISOString();
    }
    if (note !== undefined) todo.note = note;

    saveData(TODO_FILE, todos);
    broadcast({ type: 'update_todo', todos })

    res.json(todo);
});

app.delete('/todos/:id', (req, res) => {
    const index = todos.findIndex(t => t.id == req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Todo not found' });

    const removed = todos.splice(index, 1)[0];
    saveData(TODO_FILE, todos);
    broadcast({ type: 'update_todo', todos });

    res.json(removed);
});

const wss = new WebSocket.Server({ server });

function broadcast(payload) {
    const text = JSON.stringify(payload);
    wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) c.send(text);
    })
}


wss.on('connection', ws => {
    console.log('Client connected via WS');
    ws.send(JSON.stringify({ type: 'init', todos }));
    ws.on('close', () => console.log('Client disconnected'));
})

server.listen(PORT, () => console.log('Server running at http://localhost' + PORT))












