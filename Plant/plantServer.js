const express = require('express');
const app = express();
const PORT = process.env.PORT || 8081;
const cors = require("cors");
const axios = require("axios");

// Middleware
app.use(cors()); // Autoriser les requêtes CORS
app.use(express.json()); // Lire les JSON dans les requêtes
app.use(express.static("public")); // Servir le HTML/CSS/JS

// Simuler un état de production
let productionState = { status: "En attente", quantity: 0 };
let negociationState = { CDC : {commande : "la commande passé"}, accept : false, commentaire : "..."};

// Route pour obtenir l’état de production
app.get("/production", (req, res) => {
    res.json(productionState);
});

// Route pour mettre à jour la production
app.post("/negociation", (req, res) => {
    const { CDC, accept, commentaire } = req.body;
    negociationState = { CDC, accept, commentaire };

    if (accept !== true){
        console.log("Proposition non accépté par la logistique");
        console.log("Demande de changer le cahier des charges");
    }

    // Informer le serveur Logistic
    axios.post("http://localhost:3002/update-plant", productionState)
        .then(() => res.json({ message: "Mise à jour envoyée" }))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Plant Server démarré sur http://localhost:${PORT}`);
});

