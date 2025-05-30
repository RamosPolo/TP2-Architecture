const PLANTPATH = 'http://localhost:3003';

document.addEventListener("DOMContentLoaded", () => {
    const negotiationContainer = document.getElementById("negotiation-container");
    const form = document.getElementById("negotiation-form");
    const commentInput = document.getElementById("comment");
    const acceptButton = document.getElementById("accept");
    const refuseButton = document.getElementById("refuse");

    // Charger l’état de la négociation
    // Charger toutes les propositions
    async function loadNegotiationState() {
        try {
            const response = await fetch(PLANTPATH + "/propositions");
            const data = await response.json();

            console.log(data);

            if (data.propositions && data.propositions.length > 0) {
                const lastProposition = data.propositions[data.propositions.length - 1];

                negotiationContainer.innerHTML = `
                    <h2>Nouvelle Proposition</h2>
                    <p><strong>Cahier des charges :</strong> ${JSON.stringify(lastProposition.CDC)}</p>
                    <p><strong>Status :</strong> ${lastProposition.status}</p>
                `;

                // Vérifie si le status de la dernière proposition est "En attente"
                if (lastProposition.status === "En attente") {
                    form.style.display = "block"; // Afficher le formulaire si la négociation est en attente
                } else {
                    form.style.display = "none"; // Masquer le formulaire si la négociation est terminée
                }
            } else {
                negotiationContainer.innerHTML = `<p>Aucune proposition en attente.</p>`;
                form.style.display = "none";
            }
        } catch (error) {
            console.error("Erreur lors du chargement des données :", error);
            negotiationContainer.innerHTML = `<p>Impossible de récupérer l'état de la négociation.</p>`;
        }
    }


    // Envoyer une réponse à la négociation
    async function sendResponse(accept) {
        const commentaire = commentInput.value.trim();
        if (!commentaire) {
            alert("Veuillez entrer un commentaire.");
            return;
        }

        const negotiationState = {
            accept,
            commentaire,
            status: accept ? "Accepté" : "Refusé" // Mettre à jour le statut
        };

        try {
            const response = await fetch(PLANTPATH + "/negociation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(negotiationState) // Envoi de l'objet avec accept, commentaire et status
            });

            const result = await response.json();
            alert(result.message);
            loadNegotiationState(); // Mettre à jour l'affichage
        } catch (error) {
            console.error("Erreur lors de l'envoi de la négociation :", error);
            alert("Erreur lors de l'envoi de la négociation.");
        }
    }

    // Gérer les boutons de réponse
    acceptButton.addEventListener("click", () => sendResponse(true));
    refuseButton.addEventListener("click", () => sendResponse(false));

    // Charger l'état au chargement de la page
    loadNegotiationState();
});
