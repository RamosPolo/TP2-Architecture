const express = require('express');
const mongoose = require('mongoose');
const WebSocket = require("ws");
const path = require('path');
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3001;
const wsPort = 3002;

const PLANTPATH = "http://localhost:3003";

let clientsCon = [];



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
    clientsCon.push(ws);

    ws.on("message", async (message) => {
        const data = JSON.parse(message);


        const exchange = new Exchange({
            type: data.type,
            data: data.data
        });

        exchange.save()
            .then(() => console.log('Échange sauvegardé dans MongoDB'))
            .catch((err) => console.log('Erreur lors de la sauvegarde:', err));

        if (data.type === "order") {
            console.log("Nouvelle commande reçue", data.data);

        } else if (data.type === "refuse") {
            console.log(`Commande refusé par le client pour ${data.data.company} au prix de ${data.data.price}€`);

        } else if (data.type === "accept") {
            console.log(`Commande acceptée pour ${data.data.company} au prix de ${data.data.price}€`);
            ws.send(JSON.stringify({ type: "confirmation", data: data.data }));

        } else if (data.type === "negociate") {
            console.log(`Négociation pour ${data.data.company} au prix de ${data.data.price}€`);
            console.log("Détails de la commande :", data.data);
            let negotiationState = {
                CDC: { product: data.data.product, quantity: data.data.quantity, delai: "5 jours", budget: data.data.budget }, // Détails de la commande
                accept: null, 
                commentaire: "", 
                status: "En attente"
            };

            try {
                // Envoi de la nouvelle proposition à l'application
                const response = await axios.post(PLANTPATH + "/proposition", negotiationState);
                console.log("✅ Proposition envoyée :", response.data);
                // Sauvegarde de la négociation dans MongoDB
                const negotiationExchange = new Exchange({
                    type: "negotiation",
                    data: negotiationState
                });
                await negotiationExchange.save();
                console.log("✅ Nouvelle proposition envoyée !");
            } catch (error) {
                console.error("❌ Erreur lors de l'envoi de la nouvelle proposition :", error.message);
            }
        }
    });

    ws.on("close", () => {
        console.log("Client déconnecté");
        // On réinitialise la variable pour éviter d'envoyer un message à un client non connecté
    });

    ws.on("error", (error) => {
        console.error("Erreur WebSocket:", error);
        // On réinitialise également en cas d'erreur
    });
});



// ############################ LOGISTIC - PLANT ########################## //

app.use(express.json());

app.get('/exchanges', async (req, res) => {
    try {
        const exchanges = await Exchange.find().sort({ timestamp: -1 }).limit(10);
        res.json(exchanges);
    } catch (err) {
        res.status(500).send('Erreur lors de la récupération des échanges');
    }
});

app.post("/start-negotiation", async (req, res) => {
    console.log("📤 Envoi de la première proposition...");

    try {
        // Supprimer les commandes et propositions précédentes
        await Exchange.deleteMany({ type: { $in: ["order", "proposal"] } });
        console.log("🗑️ Anciennes commandes et propositions supprimées avant l'envoi");

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



// Route pour recevoir les réponses de l'application
app.post("/update-plant", async (req, res) => {
    console.log("📩 Réponse reçue de l'application :", req.body);
    let negotiationState = req.body.negotiationState;

    try {
        // Sauvegarde de la négociation dans MongoDB
        const negotiationExchange = new Exchange({
            type: "negotiation",
            data: negotiationState
        });

        await negotiationExchange.save();
        console.log("✅ Négociation sauvegardée dans MongoDB");

        if (negotiationState.accept === false) {
            console.log("🔄 Refus détecté, modification de la proposition...");

            // Modifier le cahier des charges
            negotiationState.commentaire = "Nouvelle proposition après refus";

            // Suppression des commandes et étapes associées après refus
            await Exchange.deleteMany({ type: { $in: ["order", "proposal"] } });
            console.log("🗑️ Commandes et propositions supprimées après refus");

            // Envoi de la nouvelle proposition aux clients connectés
            clientsCon.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: "proposal",
                        data: {
                            company: "Logistics",
                            product: negotiationState.CDC.product,
                            price: negotiationState.CDC.budget,
                            quantity: negotiationState.CDC.quantite,
                            delai: negotiationState.CDC.delai,
                            commentaire: negotiationState.commentaire
                        }
                    }));
                } else {
                    console.error("❌ Client non connecté, impossible d'envoyer la proposition");
                }
              });
        } else {
            console.log("✅ Proposition acceptée, fin de la négociation.");

            clientsCon.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: "confirmation",
                        data: {
                            company: "Logistics",
                            price: negotiationState.CDC.budget,
                            quantity: negotiationState.CDC.quantite,
                            delai: negotiationState.CDC.delai,
                            commentaire: negotiationState.commentaire
                        }
                    }));
                } else {
                    console.error("❌ Client non connecté, impossible d'envoyer la proposition");
                }
              });

            // Suppression des commandes et étapes associées après acceptation
            await Exchange.deleteMany({ type: { $in: ["order", "proposal"] } });
            console.log("🗑️ Commandes et propositions supprimées après acceptation");
        }

        res.json({ message: "Réponse traitée et sauvegardée", state: negotiationState });
    } catch (error) {
        console.error("❌ Erreur lors du traitement de la négociation :", error.message);
        res.status(500).json({ error: "Impossible de traiter la négociation" });
    }
});
