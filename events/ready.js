const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        // Et ici la vérification de si l'API est bien en ligne
        try {
            const fetch = (await import('node-fetch')).default;
            const response = await fetch('https://api.antredesloutres.fr/');
            const data = await response.json();
            console.log(`[INFO] API bien en ligne 👍`);
        } catch (error) {
            console.error('[ERROR] Erreur avec l\'API : ', error);
        }

        // Ont termine par mettre le bot en ligne
        console.log(`[INFO] Connecté en tant que ${client.user.tag} !`);

        client.user.setActivity({
            type: ActivityType.Custom,
            name: 'customstatus',
            state: '🦦 Je gère les serveurs Minecraft !'
        });
    },
};