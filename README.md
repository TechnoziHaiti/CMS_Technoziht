# CMS Technozi ⚙️

Panneau d'administration (CMS) pour la gestion de la plateforme Technozi Haïti.

## 🚀 Fonctionnalités Principales

- **Tableau de Bord :** Statistiques globales, filtres dynamiques (7 jours, 30 jours, Année, Historique complet) et graphiques de suivi des ventes.
- **Gestion des Commandes :** Validation des achats, vérification des reçus de paiement et suivi des expéditions.
- **Gestion des Produits :** Ajout, modification, suppression de produits, et gestion de l'inventaire avec système de remises.
- **Gestion des Techniciens & Services :** Assignation des techniciens, gestion des prestations de services.
- **Messagerie & Témoignages :** Traitement des messages clients et modération des avis.

## 📦 Gestion des Stocks et Commandes (Modèle FIFO & Réservation)

Pour éviter qu'un produit ne soit survendu (notamment s'il ne reste qu'un seul exemplaire en stock) et éviter le "vol" d'articles pendant le processus de paiement, le système utilise un mécanisme strict de **Réservation de Stock** fonctionnant sur le modèle **FIFO (First-In-First-Out)** :

1. **Réservation immédiate (Verrouillage) :**
   Lorsqu'un client passe une commande sur le site, le système vérifie la disponibilité (Stock total - Stock déjà réservé). Si le produit est disponible, la commande est créée avec le statut *En attente* et la quantité demandée est immédiatement ajoutée au `stock réservé`. 

2. **Protection Anti-Doublon :**
   Dès cet instant, le produit est verrouillépour ce client pendant un délai imparti (ex: 30 minutes). Si un deuxième client tente d'acheter le même produit simultanément, le système affichera "Rupture de stock" ou "Quantité insuffisante", évitant toute collision.

3. **Validation (Côté Admin) :**
   - **Validation de la commande :** Si l'admin valide la commande (reçu de paiement fiable), le système retire définitivement la quantité du stock total et du stock réservé. La vente est actée.
   - **Rejet ou Expiration :** Si l'admin refuse le reçu (Preuve non fiable) ou que le temps d'attente expire sans upload de reçu de la part du client, la commande est annulée. Le système soustrait alors la quantité du `stock réservé`, "libérant" ainsi le produit qui redevient immédiatement disponible à la vente pour les autres clients.

---
*Ce README a été mis à jour pour documenter la logique métier.*
