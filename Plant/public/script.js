const LOGISTICPATH = '/localhost:8000'

// Récupérer l’état actuel de la production
fetch("/production")
    .then(res => res.json())
    .then(data => {
        document.getElementById("status").innerText = `Statut: ${data.status}`;
        document.getElementById("quantity").innerText = `Quantité: ${data.quantity}`;
    });

function envoieProp(CDC, accept, commentaire){
    // envoie de la nouvelle proposition au logistique
    fetch(LOGISTICPATH + "/negosPlant", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({CDC, accept, commentaire})
    }).then(r => {
        console.log("Proposition envoyé à la logistique");
    })
}

// quand on reçois une propostion de la part de la logistique
function recoiProp(){
    // on demande si c'est ok pour le Plant ?
    // si ok
    // sinon ...
}

// Mettre à jour la production
function updateProduction(status, quantity) {
    fetch("/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, quantity })
    })
        .then(() => location.reload()); // Recharger la page pour afficher la mise à jour
}
