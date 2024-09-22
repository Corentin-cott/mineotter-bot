const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { mineotterColor, token_api } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enregistrement')
        .setDescription('Afin d\'enregistrer votre pseudo Minecraft.')
        .addStringOption(option =>
            option.setName('pseudonyme')
                .setDescription('Votre pseudo Minecraft')
                .setRequired(true)
            ),
    async execute(interaction) {    
        async function postMinecraftUsername(discordUserID, minecraftUsername) {
            // Requête à l'API pour enregistrer le pseudo Minecraft
            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_token: token_api, idDiscord: discordUserID, pseudoMinecraft: minecraftUsername }) // Envoi du token d'authentification
            };
            try {
                const reponse = await fetch(`https://api.antredesloutres.fr/enregistrement/minecraft/add`, requestOptions)
                const data = await reponse.json();
                return data;
            } catch (error) {
                console.error(`[ERROR] Une erreur est survenue lors de la requête à l'API : ${error}`);
                return { status: null, message: error };
            }
        }

        const discordUserID = interaction.user.id;
        const minecraftUsername = interaction.options.getString('pseudonyme');

        if (interaction.user.id == null) {
            console.error(`[ERROR] Une erreur est survenue lors de la récupération de l'identifiant Discord.`);
            await interaction.reply({content: `Une erreur est survenue lors de la récupération de votre identifiant Discord : ${interaction.user.id}`, ephemeral: true});
        } else if (minecraftUsername == null) {
            console.error(`[ERROR] Une erreur est survenue lors de la récupération du pseudo Minecraft.`);
            await interaction.reply({content: `Une erreur est survenue lors de la récupération de votre pseudo Minecraft : ${minecraftUsername}`, ephemeral: true});
        }

        const apiResponse = await postMinecraftUsername(discordUserID, minecraftUsername);
        if (apiResponse.status === true) {
            const embed = new EmbedBuilder()
            .setColor(mineotterColor)
            .setTitle('Enregistrement réussi 🦦')
            .setDescription(`Votre pseudo Minecraft a bien été enregistré, ${minecraftUsername} !`)
            .setTimestamp()
            .setFooter({ text: 'Mineotter' })
            .setThumbnail('https://mc-heads.net/avatar/' + minecraftUsername + '/50');

            await interaction.reply({embeds: [embed]});
        } else if (apiResponse.status === false) {
            await interaction.reply({content: `Une erreur d'argument est survenue lors de l'enregistrement de votre pseudo Minecraft.\n\`\`\`${apiResponse.message}\`\`\``, ephemeral: true});
        } else if (apiResponse.status === null) {
            await interaction.reply({content: `Une erreur inconnue est survenue lors de l'enregistrement de votre pseudo Minecraft.\n\`\`\`${apiResponse.error}\`\`\``, ephemeral: true});
        } else {
            await interaction.reply({content: `Une erreur GRANDEMENT inconnue est survenue lors de l'enregistrement de votre pseudo Minecraft.`, ephemeral: true});
        }
    }
};
