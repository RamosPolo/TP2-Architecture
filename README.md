# TP2 
Coulmeau Paul - Dupraz-Roget Léo

## Logistic
Dans le dossier ```Logistic``` exécutez la commande ``node server.js``
Port : 8000

## Plant
Port: 8081
Routes :
    - GET "/production" - return : Json object : retourne l'état de la production (ex: { status: "En attente", quantity: 0 }).
    - POST "/negociation" - require : CDC (Cahier des charge : Json), accept (boolean), commentaire (string).

## Supplier
Port: 8085
