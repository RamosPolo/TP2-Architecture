const express = require('express');
const app = express();
const PORT = process.env.PORT || 3003;
const cors = require("cors");
const axios = require("axios");

const APIPATH = "http://localhost:3001";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// États de production et négociation
let productionState = { status: "En attente", quantity: 0 };
let negotiationState = {
    CDC: null,
    accept: null,
    commentaire: "",
    status: "En attente"
};

// Route pour obtenir l’état de production
app.get("/production", (req, res) => {
    res.json(productionState);
});

// Route pour recevoir une nouvelle proposition de l'API externe
app.post("/proposition", (req, res) => {
    const { CDC } = req.body;

    if (!CDC) {
        return res.status(400).json({ error: "Cahier des charges requis" });
    }

    negotiationState = { CDC, accept: null, commentaire: "", status: "En attente" };

    console.log("Nouvelle proposition reçue :", negotiationState);

    res.json({ message: "Proposition reçue", negotiationState });
});

// Route pour répondre à une négociation
app.post("/negociation", async (req, res) => {
    const { accept, commentaire } = req.body;

    if (accept === undefined || commentaire === undefined) {
        return res.status(400).json({ error: "Acceptation et commentaire requis" });
    }

    negotiationState.accept = accept;
    negotiationState.commentaire = commentaire;
    negotiationState.status = accept ? "Accepté" : "Refusé";

    console.log(`Négociation ${accept ? "acceptée" : "refusée"} :`, negotiationState);

    try {
        // Informer l'API externe (ex: service logistique)
        await axios.post(APIPATH+"/update-plant", { negotiationState });
        res.json({ message: "Réponse envoyée à la logistique", negotiationState });
    } catch (err) {
        console.error("Erreur en informant la logistique:", err.message);
        res.status(500).json({ error: "Impossible d'envoyer la réponse" });
    }
});

// Route pour récupérer l’état actuel de la négociation
app.get("/proposition", (req, res) => {
    res.json({ negotiationState });
});


// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
