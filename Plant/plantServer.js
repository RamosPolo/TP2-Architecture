const express = require('express');
const app = express();
const PORT = process.env.PORT || 3003;
const PORT_LOGISTIC = 3001;
const cors = require("cors");
const axios = require("axios");


// Middleware
app.use(cors());
app.use(express.json());


// États de production et négociation
let productionState = { status: "En attente", quantity: 0 };

// Route pour obtenir l’état de production
app.get("/production", (req, res) => {
    res.json(productionState);
});

// Route pour recevoir une nouvelle proposition de l'API externe et la sauvegarder
const { v4: uuidv4 } = require("uuid");

app.post("/proposition", (req, res) => {
  const { CDC } = req.body;

  if (!CDC) {
    return res.status(400).json({ error: "Cahier des charges requis" });
  }

  // Génère un ID de commande unique
  const orderId = uuidv4();

  const cloneCDC = (cdc) => JSON.parse(JSON.stringify(cdc));

  const generateProposition = (entreprise) => {
    const accept = Math.random() > 0.5;
    const proposalId = uuidv4(); // ID unique pour la proposition

    if (accept) {
      const originalBudget = parseFloat(CDC.budget);
      const randomFactor = 1 + (Math.random() * 0.4 - 0.2); // entre -20% et +20%
      const newBudget = (originalBudget * randomFactor).toFixed(2);

      return {
        orderId,
        proposalId,
        entreprise,
        CDC: {
          ...CDC,
          budget: newBudget
        },
        accept: true,
        commentaire: "Proposition acceptée avec ajustement du budget",
        status: "Accepté"
      };
    } else {
      return {
        orderId,
        proposalId,
        entreprise,
        CDC: cloneCDC(CDC),
        accept: false,
        commentaire: "Conditions non satisfaites",
        status: "Refusé"
      };
    }
  };

  const entreprises = [
    "Entreprise Alpha",
    "Entreprise Beta",
    "Entreprise Gamma",
    "Entreprise Delta",
    "Entreprise Epsilon",
    "Entreprise Zeta",
    "Entreprise Theta",
    "Entreprise Iota",
    "Entreprise Kappa",
    "Entreprise Lambda"
  ];

  const propositions = entreprises.map(generateProposition);

  console.log("📦 Propositions générées :", propositions);
  res.json({ message: "Propositions générées", orderId, propositions });
});

// Route pour négociater une proposition
app.post("/negociate", (req, res) => {
    let { newBudget } = req.body;

    if (!newBudget) {
        return res.status(400).json({ error: " budget requis" });
    }

    // Chance de succès de la négociation
    const successChance = Math.random();
    const success = successChance > 0.2; // 80% de chance de succès

    // Nouveau budget
    if(success){
        // entre -20% et +20%
        let randomFactor = 1 + (Math.random() * 0.4 - 0.2); 
        newBudget = (newBudget * randomFactor).toFixed(2);  // Maintenant la réassignation fonctionne
    }

    res.json({ res: newBudget });
});


// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost${PORT}`);});
