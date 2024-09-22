const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`[ERROR] Aucune commande correspondant à ${interaction.commandName} n'a été trouvée.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`[ERROR] Une erreur est survenue lors de l'exécution de la commande ${interaction.commandName} : `, error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'Une erreur est survenue lors de l\'exécution de cette commande ! Mince alors ! 🥸\n```' + error + '```', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Il y a eu une erreur lors de l\'exécution de cette commande ! Mince alors ! 🥸\n```' + error + '```', ephemeral: true });
                }
            }
        } else if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`[ERROR] Aucune commande correspondant à ${interaction.commandName} n'a été trouvée.`);
                return;
            }

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error(`[ERROR] Une erreur est survenue lors de l'exécution de l'autocomplétion de la commande ${interaction.commandName} : `, error);
                try {
                    await interaction.respond([{ name: 'Error', value: 'Une erreur est survenue lors de l\'exécution de cette commande ! Mince alors ! 🥸' }]);
                } catch (respondError) {
                    console.error('[ERROR] Erreur lors de la réponse à l\'interaction : ', respondError);
                }
            }
        }
    },
};