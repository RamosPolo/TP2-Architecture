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
                const refuseBtn = document.createElement("button");
                const negociationBtn = document.createElement("button");

                const div = document.createElement("div");

                acceptBtn.textContent = "Accepter";
                acceptBtn.onclick = () => {
                    socket.send(JSON.stringify({ type: "accept", data: message.data }));                    
                };

                refuseBtn.textContent = "refuser";
                refuseBtn.onclick = () => {
                    socket.send(JSON.stringify({ type: "refuse", data: message.data }));                    
                };

                negociationBtn.textContent = "Négocier";
                negociationBtn.onclick = () => {
                    const newPrice = prompt("Proposez un nouveau prix :");
                    if (newPrice) {
                        socket.send(JSON.stringify({ type: "negociate", data: { ...message.data, price: newPrice } }));
                    }
                };
                
                div.appendChild(negociationBtn);
                div.appendChild(refuseBtn);
                div.appendChild(acceptBtn);
                li.appendChild(div);
                proposalsList.appendChild(li);
            } else if (message.type === "confirmation") {
                const li = document.createElement("li");
                li.textContent = `Commande ${message.data.company} acceptée au prix de ${message.data.price}€`;
                acceptedOffer.appendChild(li);
            }
        };