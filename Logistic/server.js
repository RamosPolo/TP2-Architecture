const express = require('express');
const mongoose = require('mongoose');
const WebSocket = require("ws");
const path = require('path');
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3001;
const wsPort = 3002;

const PLANTPATH = "http://localhost:3003";

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
        } else if (data.type === "accept") {
            console.log(`Commande acceptée pour ${data.data.company} au prix de ${data.data.price}€`);
            ws.send(JSON.stringify({ type: "confirmation", data: data.data }));
        }
    });

    ws.on("close", () => console.log("Client déconnecté"));
});

function sendProposals(ws, order) {
    const companies = ["Entreprise A", "Entreprise B", "Entreprise C"];

    companies.forEach((company) => {
        setTimeout(() => {
            const price = (Math.random() * (order.budget - order.budget * 0.5) + order.budget * 0.5).toFixed(2);
            const quantity = order.quantity;
            const proposal = { company, price, quantity };
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

// ############################ LOGISTIC - PLANT ########################## //

app.use(express.json());

app.get('/exchanges', async (req, res) => {
    try {
        const exchanges = await Exchange.find().sort({ timestamp: -1 }).limit(10);
        console.log("🔍 Données récupérées depuis MongoDB :", exchanges);
        res.json(exchanges);
    } catch (err) {
        res.status(500).send('Erreur lors de la récupération des échanges');
    }
});



// Route pour simuler l’envoi d’une première proposition
app.post("/start-negotiation", async (req, res) => {
    console.log("📤 Envoi de la première proposition...");
    console.log(req.body); // Vérifier ce qui est envoyé

    try {
        const response = await axios.post(PLANTPATH + "/proposition", req.body); // Envoi de la proposition
        console.log("✅ Proposition envoyée :", response.data);

        // Sauvegarde de la négociation initiale dans MongoDB
        const proposalExchange = new Exchange({
            type: "proposal",
            data: req.body
        });

        await proposalExchange.save();
        console.log("💾 Proposition initiale sauvegardée dans MongoDB");

        res.json({ message: "Proposition initiale envoyée et enregistrée", state: req.body });
    } catch (error) {
        console.error("❌ Erreur lors de l'envoi :", error.message);
        res.status(500).json({ error: error.message });
    }
});




// Route pour recevoir les réponses de ton application
app.post("/update-plant", async (req, res) => {
    console.log("📩 Réponse reçue de l'application :", req.body);
    negotiationState = req.body.negotiationState;

    if (negotiationState.accept === false) {
        console.log("🔄 Refus détecté, modification de la proposition...");

        // Modifier le cahier des charges (ex: augmentation de la quantité)
        negotiationState.CDC.quantite += 20;
        negotiationState.CDC.delai = "15 jours";
        negotiationState.accept = null;
        negotiationState.commentaire = "Nouvelle proposition après refus";

        // Attendre quelques secondes avant d'envoyer la nouvelle proposition
        setTimeout(async () => {
            console.log("📤 Envoi d'une nouvelle proposition après refus...");
            try {
                await axios.post(PLANTPATH+"/proposition", negotiationState);
                console.log("✅ Nouvelle proposition envoyée !");
            } catch (error) {
                console.error("❌ Erreur lors de l'envoi de la nouvelle proposition :", error.message);
            }
        }, 3000); // Attente de 3 secondes
    } else {
        console.log("✅ Proposition acceptée, fin de la négociation.");
    }

    res.json({ message: "Réponse traitée", state: negotiationState });
});
