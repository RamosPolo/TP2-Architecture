const express = require('express');
const mongoose = require('mongoose');
const WebSocket = require("ws");
const path = require('path');

const app = express();
const port = process.env.PORT || 8000;
const wsPort = 9000;

// Connexion à MongoDB
mongoose.connect('mongodb://localhost/logistics', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connexion MongoDB réussie'))
    .catch((err) => console.log('Erreur de connexion MongoDB:', err));

// Définition du modèle Mongoose pour stocker les échanges
const exchangeSchema = new mongoose.Schema({
    type: String,
    data: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
});

const Exchange = mongoose.model('Exchange', exchangeSchema);

// Serveur HTTP Express pour servir index.html
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server app listening at http://localhost:${port}`);
});

// Serveur WebSocket
const server = new WebSocket.Server({ port: wsPort });

console.log(`WebSocket server listening on ws://localhost:${wsPort}`);

server.on("connection", (ws) => {
    console.log("Client connecté");

    ws.on("message", (message) => {
        const data = JSON.parse(message);

        // Sauvegarde de l'échange dans MongoDB
        const exchange = new Exchange({
            type: data.type,
            data: data.data
        });

        exchange.save()
            .then(() => console.log('Échange sauvegardé dans MongoDB'))
            .catch((err) => console.log('Erreur lors de la sauvegarde:', err));

        if (data.type === "order") {
            console.log("Nouvelle commande reçue", data.data);
            sendProposals(ws, data.data);
        } else if (data.type === "accept") {
            console.log(`Commande acceptée pour ${data.data.company} au prix de ${data.data.price}€`);
            ws.send(JSON.stringify({ type: "confirmation", data: data.data }));
        }
    });

    ws.on("close", () => console.log("Client déconnecté"));
});

app.get('/exchanges', async (req, res) => {
    try {
        // Récupère les 10 derniers échanges, triés par timestamp (du plus récent au plus ancien)
        const exchanges = await Exchange.find().sort({ timestamp: -1 }).limit(10);
        res.json(exchanges);
    } catch (err) {
        res.status(500).send('Erreur lors de la récupération des échanges');
    }
});


function sendProposals(ws, order) {
    const companies = ["Entreprise A", "Entreprise B", "Entreprise C"];

    companies.forEach((company) => {
        setTimeout(() => {
            const price = (Math.random() * (order.budget - order.budget * 0.5) + order.budget * 0.5).toFixed(2);
            const proposal = { company, price };
            ws.send(JSON.stringify({ type: "proposal", data: proposal }));

            // Sauvegarde de la proposition dans MongoDB
            const proposalExchange = new Exchange({
                type: "proposal",
                data: proposal
            });

            proposalExchange.save()
                .then(() => console.log('Proposition sauvegardée dans MongoDB'))
                .catch((err) => console.log('Erreur lors de la sauvegarde:', err));
        }, Math.random() * 3000 + 1000);
    });
}
