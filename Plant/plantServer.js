const express = require('express');
const app = express();
const PORT = process.env.PORT || 3003;
const PORT_LOGISTIC = 3001;
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/propositions', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connecté à MongoDB"))
    .catch((err) => console.error("Erreur de connexion à MongoDB:", err));

// Modèle de proposition
const propositionSchema = new mongoose.Schema({
    CDC: { type: mongoose.Schema.Types.Mixed, required: true },
    accept: { type: Boolean, default: null },
    commentaire: { type: String, default: "" },
    status: { type: String, default: "En attente" }
});


const Proposition = mongoose.model("Proposition", propositionSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// États de production et négociation
let productionState = { status: "En attente", quantity: 0 };

// Route pour obtenir l’état de production
app.get("/production", (req, res) => {
    res.json(productionState);
});

// Route pour recevoir une nouvelle proposition de l'API externe et la sauvegarder
app.post("/proposition", async (req, res) => {
    const { CDC, accept, commentaire, status } = req.body;

    if (!CDC) {
        return res.status(400).json({ error: "Cahier des charges requis" });
    }

    const proposition = new Proposition({ CDC, accept: null, commentaire: "", status: "En attente" });

    try {
        await proposition.save();
        console.log("Nouvelle proposition reçue :", proposition);
        res.json({ message: "Proposition reçue", proposition });
    } catch (err) {
        console.error("Erreur lors de la sauvegarde de la proposition :", err.message);
        res.status(500).json({ error: "Impossible de sauvegarder la proposition" });
    }
});

// Route pour répondre à une négociation
app.post("/negociation", async (req, res) => {
    const { accept, commentaire } = req.body;

    if (accept === undefined || commentaire === undefined) {
        return res.status(400).json({ error: "Acceptation et commentaire requis" });
    }

    try {
        // Récupérer la dernière proposition
        let negotiationState = await Proposition.findOne({ status: "En attente" });

        if (!negotiationState) {
            return res.status(404).json({ error: "Aucune proposition en attente" });
        }

        negotiationState.accept = accept;
        negotiationState.commentaire = commentaire;
        negotiationState.status = accept ? "Accepté" : "Refusé";

        await negotiationState.save();
        console.log(`Négociation ${accept ? "acceptée" : "refusée"} :`, negotiationState);

        // Informer l'API externe (ex: service logistique)
        await axios.post(`http://localhost:${PORT_LOGISTIC}/update-plant`, { negotiationState });
        res.json({ message: "Réponse envoyée à la logistique", negotiationState });
    } catch (err) {
        console.error("Erreur lors de la mise à jour de la négociation:", err.message);
        res.status(500).json({ error: "Impossible de mettre à jour la négociation" });
    }
});

// Route pour récupérer toutes les propositions
app.get("/propositions", async (req, res) => {
    try {
        const propositions = await Proposition.find();
        res.json({ propositions });
    } catch (err) {
        console.error("Erreur lors de la récupération des propositions :", err.message);
        res.status(500).json({ error: "Impossible de récupérer les propositions" });
    }
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost${PORT}`);});
