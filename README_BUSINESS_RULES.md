# Règles Métier et Architecture de Concurrence - Technozi

Ce document regroupe toutes les règles d'or, les mesures de sécurité et les logiques de concurrence implémentées dans le système e-commerce de Technozi. 
**Toute modification future du code (Backend, Frontend ou Base de données) DOIT respecter ces mesures pour garantir l'intégrité du système.**

## 1. La Règle du Verrouillage de Ligne (Row-Level Locking)
- **Où :** Base de données PostgreSQL (Supabase).
- **Mécanisme :** Utilisation systématique de `SELECT ... FOR UPDATE` pour toutes les transactions impliquant le stock (`products`) ou la création de commandes.
- **Objectif :** Empêcher deux clients d'acheter le même produit à la même milliseconde. La base de données met les requêtes en file d'attente (Queue) et rejette la deuxième requête si le stock est épuisé par la première.
- **Règle stricte :** Aucun calcul de stock ne doit être fait en dehors d'une transaction verrouillée (`BEGIN ... FOR UPDATE ... COMMIT`).

## 2. Le Système de Réservation (Timer de 15 minutes)
- **Le Concept :** Parce que les paiements (MonCash, Sogebank) sont hors-ligne (manuels), le système ne peut pas débiter immédiatement.
- **Action :** Lorsqu'un client clique sur "Confirmer la commande", le système déduit temporairement la quantité voulue de `quantite_reservee` (sans toucher à `quantite_stock`).
- **Expiration (Cron Job) :** Si aucun reçu n'est soumis après 15 minutes, un Cron Job backend annule la commande (statut `EXPIRED`) et libère la réservation (`quantite_reservee` diminue).
- **Prévention d'Overselling :** Le stock disponible pour le front-end est TOUJOURS calculé par : `quantite_stock - quantite_reservee`.

## 3. Le Processus de "Restauration" Admin (Late Payments)
- **Le Cas :** Un client envoie l'argent MonCash après les 15 minutes, alors que sa commande est expirée.
- **Action Admin :** L'administrateur clique sur "Restaurer et Valider".
- **Comportement (Stock Partiel) :** La fonction `restore_order` verrouille les lignes. Si le stock restant n'est pas suffisant pour couvrir la commande initiale, le système valide **partiellement** la commande (ex: 1 produit au lieu de 3), recalcule le prix total, et génère une facture PDF modifiée.
- **Remboursement :** Le système n'envoie PAS d'email de remboursement automatisé. Il informe simplement le client que la commande est partielle et que "l'équipe Technozi prendra contact avec vous". C'est à l'entreprise de gérer le remboursement manuellement.

## 4. La Règle de "Justice Absolue" (Strict FIFO)
- **Contexte :** Conflit entre un Admin qui clique sur "Restaurer" (pour un paiement en retard) et un Client B qui est en train de payer sur le site (pendant ses 15 minutes de réservation).
- **Mesure de Sécurité :** Pour garantir à 100% que le Client B ne paie jamais "dans le vide", **l'Admin n'a pas le droit de voler une réservation en cours**. 
- **Application :** La fonction de restauration calcule rigoureusement `v_prod.quantite_stock - v_prod.quantite_reservee`. Si le Client B a été plus rapide ne serait-ce que d'une milliseconde pour réserver l'article, le bouton "Restaurer" de l'Admin échouera. La sécurité du client actuel prime toujours sur la restauration d'une commande expirée.

## 5. Standardisation des Emails Transactionnels
- **Format :** Tous les emails générés par le système (Contact, Validation, Factures) doivent utiliser le même template HTML (`getHtmlTemplate` dans le backend).
- **Design :** Bannière bleue nuit, logo Technozi en 3D centré, fond blanc pour le corps du texte. 
- **Règle :** Ne jamais coder d'email en texte brut (`text: ...`) dans le backend. Toujours passer par le template HTML pour maintenir l'image de marque premium.

---
*Ce fichier garantit que l'architecture complexe que nous avons bâtie ne sera jamais détruite par erreur lors de futures mises à jour.*
