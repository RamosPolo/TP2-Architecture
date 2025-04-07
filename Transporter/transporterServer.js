const express = require('express');
const app = express();
const PORT = 3004;
const cors = require("cors");
const axios = require("axios");

app.use(cors());
app.use(express.json());

const LOGISTIC_URL = "http://localhost:3001";
let currentPropositions = [];

// Réception d'une proposition
app.post("/proposition", (req, res) => {
    const { CDC } = req.body;

    if (!CDC) {
        return res.status(400).json({ error: "Cahier des charges manquant" });
    }

    const newProposal = {
        CDC,
        accept: null,
        commentaire: "",
        status: "En attente"
    };

    currentPropositions.push(newProposal);
    console.log("📥 Proposition reçue :", newProposal);

    // Simule une réflexion automatique (10s) puis envoie acceptation
    setTimeout(async () => {
        newProposal.accept = true;
        newProposal.commentaire = "Proposition acceptée automatiquement";
        newProposal.status = "Accepté";

        try {
            await axios.post(`${LOGISTIC_URL}/update-transporter`, {
                negotiationState: newProposal
            });
            console.log("✅ Proposition acceptée envoyée à Logistic :", newProposal);
        } catch (err) {
            console.error("❌ Erreur lors de l'envoi de la réponse :", err.message);
        }
    }, 5000);

    res.json({ message: "Proposition reçue", proposition: newProposal });
});

// Récupérer toutes les propositions
app.get("/propositions", (req, res) => {
    res.json({ propositions: currentPropositions });
});

app.listen(PORT, () => {
    console.log(`🚛 Serveur TRANSPORTER en ligne sur http://localhost:${PORT}`);
});
