const express = require('express')
const app = express()
const path = require('path');
const fs = require('fs');

console.log('static at', path.join(__dirname, '../client'));

app.use('/', express.static(path.join(__dirname, '../client')));
app.use(express.json());

app.get('/data.json', (req, res) => {
    fs.readFile(path.join(__dirname, '../data.json'), (err, data) => {
        res.json(JSON.parse(data));
    });
});

app.post('/save', (req, res) => {
    fs.readFile(path.join(__dirname, '../data.json'), (err, json) => {
        const data = JSON.parse(json);

        const name = req.body.title;
        const id = req.body.id;
        const description = req.body.description;
        const edges = req.body.edges;

        data.nodes.forEach((node) => {
            if (node.name === name) {
                res.status(403).send("Duplicate Title");
                return;
            }
            if (node.id === id) {
                res.status(403).send("Duplicate Entry");
                return;
            }
        });

        edges.forEach((edge) => {
            data.edges.push(edge);
        });

        data.descriptions[id] = description;
        data.nodes.push({id, name});

        fs.writeFile(path.join(__dirname, '../data.json'), JSON.stringify(data, null, 2), (err) => {
            if (err) {
                console.log(err);
                res.status(500).send("System Error");
            } else {
                res.status(200).send("Saved");
            }
        });
    });
});
app.listen(3000, () => console.log('Example app listening on port 3000!'))