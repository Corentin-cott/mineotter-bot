const { Events } = require('discord.js');
const { token_api } = require('../config-api.json');
const { ServIPPrimaire, ServIPSecondaire, ServPortPrimaire, ServPortSecondaire, ServRconPortPrimaire, RconPassword, channelMcMyAdminPrimaryID, channelMcMyAdminSecondaryID, rconPrimaireActif, rconSecondaireActif } = require('../config-rcon.json');
const { Rcon } = require('rcon-client');

let rconPrimaire;
let rconSecondaire;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Options de connexion RCON
        const rconPrimaireOptions = {
            host: ServIPPrimaire,
            port: ServRconPortPrimaire,
            password: RconPassword,
        };
        const rconSecondaireOptions = {
            host: ServIPSecondaire,
            port: ServRconPortSecondaire,
            password: RconPassword,
        };

        // Réquete vers l'API de l'Antre des Loutres pour récupérer les informations des serveurs primaires et secondaires
        let servPrimaireConfigs;
        let servSecondaireConfigs;
        try {
            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_token: token_api }) // Envoi du token d'authentification
            };
            let apiData = await fetch('https://api.antredesloutres.fr/serveurs/primaire', requestOptions);
            servPrimaireConfigs = await apiData.json();
        } catch (error) {
            console.error('[ERROR] Erreur lors de la récupération des informations du serveur primaire : ', error.message);
            return;
        }
        try {
            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_token: token_api }) // Envoi du token d'authentification
            };
            let apiData = await fetch('https://api.antredesloutres.fr/serveurs/secondaire', requestOptions);
            servSecondaireConfigs = await apiData.json();
        } catch (error) {
            console.error('[ERROR] Erreur lors de la récupération des informations du serveur secondaire : ', error.message);
            return;
        }

        if (message.author.bot || !message.content) {
            return; // Ignorer les messages de bot ou vides
        }

        if (message.channel.id !== channelMcDiscordID) {
            return; // Ignorer les messages qui ne proviennent pas du canal spécifié
        }

        // Vérification de la connexion RCON au serveur Primaire
        if (rconPrimaireActif) {
            if (!rconPrimaire || rconPrimaire.ended) {
                // Si la connexion RCON n'existe pas ou a été interrompue, ont essaye de se reconnecter
                try {
                    rconPrimaire = await Rcon.connect(rconPrimaireOptions);
                    console.info('[INFO] Connexion RCON au serveur primaire réussite.');
                } catch (error) {
                    console.error('[ERROR] Erreur lors de la connexion au RCON du serveur primaire : ', error.message);
                    return;
                }
            }
        } else {
            console.warn('[WARN] Connexion RCON au serveur primaire désactivée.');
        }

        // Vérification de la connexion RCON au serveur Secondaire
        if (rconSecondaireActif) {
            if (!rconSecondaire || rconSecondaire.ended) {
                // Si la connexion RCON n'existe pas ou a été interrompue, ont essaye de se reconnecter
                try {
                    rconSecondaire = await Rcon.connect(rconSecondaireOptions);
                    console.info('[INFO] Connexion RCON au serveur secondaire réussite.');
                } catch (error) {
                    console.error('[ERROR] Erreur lors de la connexion au RCON du serveur secondaire : ', error.message);
                    return;
                }
            }
        } else {
            console.warn('[WARN] Connexion RCON au serveur secondaire désactivée.');
        }

        // Ajout de cette attente pour s'assurer que la connexion RCON est prête
        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde

        try {
            // Vérification de la connexion RCON au serveur Primaire
            if (rconPrimaireActif) {
                if (!rconPrimaire || rconPrimaire.ended) {
                    console.error('[ERROR] Connexion RCON au serveur primaire interrompue.');
                } else {
                    await rconPrimaire.send(`tellraw @a ["",{"text":"<${message.author.username}>","color":"#5865F2","hoverEvent":{"action":"show_text","contents":"Message envoyé depuis le discord de l'Antre des Loutres."}},{"text":" ${message.content}"}]`);
                }
            } else {
                // console.warn('[WARN] Connexion RCON au serveur primaire désactivée.');
            }
            if (rconSecondaireActif) {
                if (!rconSecondaireActif || !rconSecondaire || rconSecondaire.ended) {
                    console.error('[ERROR] Connexion RCON au serveur secondaire interrompue.');
                } else {
                    await rconSecondaire.send(`tellraw @a ["",{"text":"<${message.author.username}>","color":"#5865F2","hoverEvent":{"action":"show_text","contents":"Message envoyé depuis le discord de l'Antre des Loutres."}},{"text":" ${message.content}"}]`);
                }
            } else {
                // console.warn('[WARN] Connexion RCON au serveur secondaire désactivée.');
            }
        } catch (error) {
            console.error('[ERROR] Erreur lors de l\'envoi du message RCON à un ou plusieurs des serveurs :', error.message);
            
            rconPrimaire = null;
            rconSecondaire = null;
        }
    },
};