const socket = new WebSocket("ws://localhost:3002");
const form = document.getElementById("orderForm");
const proposalsList = document.getElementById("proposals");
const acceptedOffer = document.getElementById("acceptedOffer");

form.addEventListener("submit", event => {
    event.preventDefault();
    const order = {
        product: document.getElementById("product").value,
        quantity: document.getElementById("quantity").value,
        budget: document.getElementById("budget").value
    };
    socket.send(JSON.stringify({ type: "order", data: order }));

    // Réinitialiser le formulaire après l'envoi
    form.reset();

    // Afficher une popup de confirmation
    alert("Commande envoyée avec succès !");

});

socket.onmessage = event => {
    const message = JSON.parse(event.data);
    console.log("Message reçu:", message);

    if (message.type === "proposal") {
        const li = document.createElement("li");
        li.textContent = `Entreprise : ${message.data.entreprise}, Prix : ${message.data.CDC.budget}€`;
        li.setAttribute('data-order-id', message.data.orderId); // Ajout d'un attribut pour identifier la commande
        li.setAttribute('data-proposal-id', message.data.proposalId); // ID de la proposition


        const acceptBtn = document.createElement("button");
        const refuseBtn = document.createElement("button");
        const negociationBtn = document.createElement("button");

        const div = document.createElement("div");

        acceptBtn.textContent = "Accepter";
        acceptBtn.onclick = () => {
            console.log("Proposition acceptée :", message.data);

            // Supprimer les li de la meme commande
            const orderId = message.data.orderId;
            const orderLi = [...proposalsList.children].filter(item => item.getAttribute('data-order-id') === orderId);
            orderLi.forEach(item => {
                item.remove();
            });

            // Envoi de la confirmation d'acceptation au serveur
            socket.send(JSON.stringify({
                type: "accept",
                data: {
                    orderId: message.data.orderId,
                    proposalId: message.data.proposalId,
                    CDC: message.data.CDC,
                    entreprise: message.data.entreprise,
                    commentaire: message.data.commentaire,
                }
            }));
        };

        refuseBtn.textContent = "Refuser";
        refuseBtn.onclick = () => {
            // Supprimer uniquement la proposition spécifique
            li.remove();

            // Envoi du refus au serveur
            socket.send(JSON.stringify({
                type: "refuse",
                data: {
                    proposalId: message.data.proposalId
                }
            }));
        };

        negociationBtn.textContent = "Négocier";
        negociationBtn.onclick = () => {
            const newPrice = prompt("Proposez un nouveau prix :");
            if (newPrice) {
                socket.send(JSON.stringify({
                    type: "negociate",
                    data: {
                        proposalId: message.data.proposalId,
                        newPrice: newPrice
                    }
                }));
            }
        };

        div.appendChild(negociationBtn);
        div.appendChild(refuseBtn);
        div.appendChild(acceptBtn);
        li.appendChild(div);


        proposalsList.appendChild(li);
    } else if (message.type === "valided") {
        const li = document.createElement("li");
        li.textContent = `Commande ${message.data.entreprise} acceptée au prix de ${message.data.CDC.budget}€`;
        acceptedOffer.appendChild(li);
    } else if (message.type === "negociate") {
        // rechercher la proposition correspondante
        const li = [...proposalsList.children].find(item => item.getAttribute('data-proposal-id') === message.data.proposalId);


        if (li) {
            li.textContent = `Entreprise : ${message.data.entreprise}, Nouveau Prix : ${message.data.CDC.budget}€`;
        

            const acceptBtn = document.createElement("button");
            const refuseBtn = document.createElement("button");
            const negociationBtn = document.createElement("button");

            const div = document.createElement("div");

            acceptBtn.textContent = "Accepter";
            acceptBtn.onclick = () => {
                console.log("Proposition acceptée :", message.data);

                 // Supprimer les li de la meme commande
                const orderId = message.data.orderId;
                const orderLi = [...proposalsList.children].filter(item => item.getAttribute('data-order-id') === orderId);
                orderLi.forEach(item => {
                    item.remove();
                });

                // Envoi de la confirmation d'acceptation au serveur
                socket.send(JSON.stringify({
                    type: "accept",
                    data: {
                        orderId: message.data.orderId,
                        proposalId: message.data.proposalId,
                        CDC: message.data.CDC,
                        entreprise: message.data.entreprise,
                        commentaire: message.data.commentaire,
                    }
                }));
            };

            refuseBtn.textContent = "Refuser";
            refuseBtn.onclick = () => {
                // Supprimer uniquement la proposition spécifique
                li.remove();

                // Envoi du refus au serveur
                socket.send(JSON.stringify({
                    type: "refuse",
                    data: {
                        proposalId: message.data.proposalId
                    }
                }));
            };

            negociationBtn.textContent = "Négocier";
            negociationBtn.onclick = () => {
                const newPrice = prompt("Proposez un nouveau prix :");
                if (newPrice) {
                    socket.send(JSON.stringify({
                        type: "negociate",
                        data: {
                            proposalId: message.data.proposalId,
                            newPrice: newPrice
                        }
                    }));
                }
            };

            div.appendChild(negociationBtn);
            div.appendChild(refuseBtn);
            div.appendChild(acceptBtn);
            li.appendChild(div);


            proposalsList.appendChild(li);
        } else {
            console.error("Proposition non trouvée pour la négociation");
        }

        // Mettre une couleur sur les propositions négociées
        // li.style.backgroundColor = "yellow";

    }
};
