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
        });

        socket.onmessage = event => {
            const message = JSON.parse(event.data);
            console.log("Message reçu:", message);
            if (message.type === "proposal") {
                const li = document.createElement("li");
                li.textContent = `Entreprise : ${message.data.company}, Prix : ${message.data.price}€`;
                const acceptBtn = document.createElement("button");
                acceptBtn.textContent = "Accepter";
                acceptBtn.onclick = () => {
                    socket.send(JSON.stringify({ type: "accept", data: message.data }));
                    acceptedOffer.textContent = `Devis accepté : ${message.data.company} pour ${message.data.price}€`;
                    const propositions = document.getElementById("proposals");
                    // Supprimer l'élément correspondant
                    propositions.forEach((li) => {
                        li.remove();
                    });
                };
                li.appendChild(acceptBtn);
                proposalsList.appendChild(li);
            }
        };