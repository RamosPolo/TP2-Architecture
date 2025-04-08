const express = require('express');
const mongoose = require('mongoose');
const WebSocket = require("ws");
const path = require('path');
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3001;
const wsPort = 3002;

// ERREURS CORS
const cors = require("cors");
app.use(cors({
    origin: "http://localhost:3003",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));

const PLANTPATH = "http://localhost:3003";
const TRANSPORTPATH = "http://localhost:3004";

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
        const data = JSON.parse(message);  // On parse le message une seule fois
        console.log("Message type reçu:", data);  // Affiche l'objet au lieu du message brut

        switch (data.type) {  // Utilise data.type au lieu de message.type
            case "order":
                console.log("📦 Commande reçue :", data.data);
                const exchange = new Exchange({
                    type: data.type,
                    data: data.data
                });

                exchange.save()
                    .then(() => console.log('Échange sauvegardé dans MongoDB'))
                    .catch((err) => console.log('Erreur lors de la sauvegarde:', err));
                break;

            // 🔴 Refus d'une proposition → supprimer la proposition
            case "refuse":
                try {
                    await Exchange.deleteOne({ "data.proposalId": data.data.proposalId });
                    console.log(`❌ Proposition refusée supprimée : ${data.data.proposalId}`);
                } catch (err) {
                    console.error("Erreur lors de la suppression de la proposition :", err);
                }
                break;

            // ✅ Acceptation → supprimer toutes les autres propositions du même orderId
            case "accept":
                try {
                    const { orderId, proposalId } = data.data;

                    // Supprimer toutes les autres propositions liées à cette commande
                    await Exchange.deleteMany({
                        "data.orderId": orderId,
                        "data.proposalId": { $ne: proposalId }
                    });

                    // Mettre à jour la proposition acceptée
                    await Exchange.updateOne(
                        { "data.proposalId": proposalId },
                        { $set: { "type": "valided" } }
                    );

                    // Notifier les clients de l'acceptation
                    notifyClients(clientsCon, [data.data], "valided");

                    console.log(`✅ Proposition acceptée. Autres propositions supprimées pour la commande ${orderId}`);
                } catch (err) {
                    console.error("Erreur lors de l'acceptation de l'offre :", err);
                }
                break;

            // 🔄 Négociation → mise à jour du prix (budget)
            case "negociate":
                try {
                    const { proposalId, newPrice } = data.data;

                    //lancer la négociation
                    let newBudget = await startNegotiation(newPrice);

                    console.log("proposalID : ", proposalId)
                    console.log("le ancien budget trouvé est : ", newPrice)

                    console.log("le new budget trouvé est : ", newBudget)

                    if (newBudget != newPrice) {

                        const result = await Exchange.updateOne(
                            { "data.proposalId": proposalId },
                            { $set: { "data.CDC.budget": newBudget } }
                        );

                        if (result.modifiedCount > 0) {
                            console.log(`🔄 Négociation réussie, nouveau prix : ${newBudget}`);
                        } else {
                            console.log("❌ Aucune proposition trouvée à mettre à jour.");
                        }

                        // Recupère la proposition mise à jour
                        const updatedExchange = await Exchange.findOne({ "data.proposalId": proposalId });

                        if (updatedExchange) {
                            notifyClients(clientsCon, [updatedExchange.data], "negociate");
                        } else {
                            console.warn("⚠️ Aucun échange mis à jour trouvé pour le proposalId :", proposalId);
                        }

                    } else {
                        // On supprime la proposition si la négociation échoue
                        await Exchange.deleteOne({ "data.proposalId": proposalId });
                        console.log("❌ Négociation échouée");
                    }


                    console.log(`🔄 Proposition mise à jour avec nouveau prix : ${newPrice}`);
                } catch (err) {
                    console.error("Erreur lors de la négociation :", err);
                }
                break;

            default:
                console.warn("🟡 Type de message WebSocket non reconnu :", data.type);
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
        // console.log("✅ Échanges récupérés :", exchanges);
        res.json(exchanges);
    } catch (err) {
        res.status(500).send('Erreur lors de la récupération des échanges');
    }
});
app.post("/start-negotiation", async (req, res) => {
    console.log("📤 Envoi de la première proposition...");

    try {
        await Exchange.deleteMany({ type: { $in: ["order", "proposal"] } });
        console.log("🗑️ Anciennes commandes et propositions supprimées avant l'envoi");

        const response = await axios.post(PLANTPATH + "/proposition", req.body);
        const propositions = response.data.propositions;

        console.log("✅ Propositions reçues :", propositions);

        const acceptedPropositions = propositions.filter(p => p.accept === true);

        for (const prop of acceptedPropositions) {
            const acceptedExchange = new Exchange({
                type: "proposal",
                data: prop
            });

            await acceptedExchange.save();
        }

        // 🔔 Notifier les clients WebSocket
        notifyClients(clientsCon, acceptedPropositions, "proposal");

        console.log(`💾 ${acceptedPropositions.length} propositions acceptées sauvegardées.`);

        res.json({
            message: "Proposition envoyée",
            accepted: acceptedPropositions
        });
    } catch (error) {
        console.error("❌ Erreur lors de l'envoi :", error.message);
        res.status(500).json({ error: error.message });
    }
});


// Fonction pour lancer une négociation
async function startNegotiation(newBudget) {
    console.log("🔄 Lancement de la négociation...");
    try {
        const response = await axios.post(PLANTPATH + "/negociate", {
            newBudget: newBudget
        });
        console.log("✅ Négociation lancée :", response.data);
        return response.data.res;
    } catch (error) {
        console.error("❌ Erreur lors du lancement de la négociation :", error.message);
        throw error;
    }
}

// Fonction pour vider la base de données
async function clearDatabase() {
    try {
        await Exchange.deleteMany({});
        console.log("🗑️ Base de données vidée avec succès");
    } catch (error) {
        console.error("❌ Erreur lors de la suppression de la base de données :", error.message);
    }
}



// Fonction pour notifier les clients WebSocket
function notifyClients(clientsCon, propositions, type) {
    propositions.forEach(prop => {
        const message = {
            type: type,
            data: {
                orderId: prop.orderId,
                proposalId: prop.proposalId,
                entreprise: prop.entreprise,
                CDC: prop.CDC,
                commentaire: prop.commentaire,
            }
        };

        clientsCon.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            } else {
                console.error("❌ Client non connecté, impossible d'envoyer la proposition");
            }
        });
    });
}

// ########################### TRANSPORTER ####################### //

app.use(express.json());

// Mémoire locale
let logs = [];

// Envoie d'une proposition initiale
app.post("/start-negotiation-transporter", async (req, res) => {
    console.log("📤 Envoi de la proposition initiale à Transporter...");

    try {
        const response = await axios.post(`${TRANSPORTPATH}/proposition`, req.body);
        console.log("✅ Proposition envoyée :", response.data.proposition);

        logs.push({ type: "proposition", data: req.body });

        res.json({ message: "Proposition envoyée à Transporter", state: req.body });
    } catch (error) {
        console.error("❌ Erreur lors de l'envoi :", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Réception de la réponse de Transporter
app.post("/update-transporter", (req, res) => {
    const negotiationState = req.body.negotiationState;
    console.log("📩 Réponse reçue de Transporter :", negotiationState);

    logs.push({ type: "negotiation", data: negotiationState });

    if (negotiationState.accept === false) {
        console.log("🔄 Proposition refusée. Préparation d'une nouvelle proposition...");

        negotiationState.CDC.quantite += 20;
        negotiationState.CDC.delai = "15 jours";
        negotiationState.accept = null;
        negotiationState.commentaire = "Nouvelle proposition après refus";

        // Réenvoi d'une nouvelle proposition
        setTimeout(async () => {
            try {
                await axios.post(`${TRANSPORTPATH}/proposition`, negotiationState);
                console.log("📤 Nouvelle proposition envoyée après refus.");
            } catch (err) {
                console.error("❌ Erreur lors du renvoi :", err.message);
            }
        }, 1000);
    } else {
        console.log("✅ Proposition acceptée. Fin de la négociation.");
    }

    res.json({ message: "Réponse traitée", state: negotiationState });
});

