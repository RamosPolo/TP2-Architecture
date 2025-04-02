const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/propositions', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log("Connexion MongoDB réussie. Suppression des données...");

        await mongoose.connection.db.dropDatabase();
        console.log("Base de données supprimée avec succès.");

        mongoose.connection.close();
    })
    .catch(err => console.error("Erreur de connexion MongoDB:", err));
