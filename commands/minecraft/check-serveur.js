const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { token_api } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check-serveur')
        .setDescription(`Permet d'avoir des informations sur les serveurs actifs.`)
        .addStringOption(option =>
            option.setName('serveur')
                .setDescription('Serveur à vérifier')
                .setRequired(true)
                .addChoices(
                    { name: 'Serveur principal', value: 'primaire' },
                    { name: 'Serveur secondaire', value: 'secondaire' },
                    { name: 'Les deux serveurs', value: 'both' }
                )
        ),
    async execute(interaction) {
        async function getServerInfos(serveur_type) {
            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_token: token_api }) // Envoi du token d'authentification
            };
            const reponse = await fetch(`https://api.antredesloutres.fr/serveurs/${serveur_type}`, requestOptions)
            const data = await reponse.json();

            let embedColor = data.embedColor || '#FFFFFF';
            let jeu = data.jeu || '🥸';
            let nom_serv = data.nom_serv || '🥸';
            let modpack = data.modpack || '🥸';
            let modpack_url = data.modpack_url || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            let version_serv = data.version_serv || '🥸';
            let administrateur = data.administrateur || '🥸';
            let online_status = data.online === true ? 'En ligne' : 'Hors ligne';
            let players;

            if (jeu !== 'Minecraft') {
                players = 'Impossible de récupérer les joueurs pour ce jeu.';
                online_status = 'Impossible de récupérer le statut pour ce jeu.';
            } else {
                players = data.players.length > 0 ? data.players.join(', ') : 'Aucun joueurs connectés';
            }

            return {
                embedColor: embedColor,
                jeu: jeu,
                nom_serv: nom_serv,
                modpack: modpack,
                modpack_url: modpack_url,
                version_serv: version_serv,
                administrateur: administrateur,
                online_status: online_status,
                players: players
            };
        }

        async function sendEmbed(serveur_type, embedColor, jeu, nom_serv, modpack, modpack_url, version_serv, administrateur, online_status, players, reply) {
            let thumbnail_url = '';
            if (modpack === 'Minecraft Vanilla') {
                thumbnail_url = 'https://cdn.discordapp.com/attachments/1255156784134492170/1281433183656742932/mc_primaire.png';
            } else if (modpack === 'Palworld') {
                thumbnail_url = 'https://cdn.discordapp.com/attachments/1255156784134492170/1281434243922399272/palworld.webp';
            } else {
                thumbnail_url = 'https://cdn.discordapp.com/attachments/1255156784134492170/1281433183916785767/mc_secondaire.png';
            }

            let extra_message = '';
            if (online_status === 'Hors ligne') {
                extra_message = '\n\n**Le serveur est actuellement hors ligne, mais tu peut le lancer avec \`/serveur lancer\` 🥸**';
            } else if (players === 'Aucun joueurs connectés') {
                extra_message = '\n\n**Allez, hop hop hop ! On rejoint le serveur ! 🥸**';
            } else {
                extra_message = '\n\n**🥸**'
            };

            let serveur_port = '';
            if (serveur_type === 'Secondaire') {
                serveur_port = ':25564';
            }

            const embed = new EmbedBuilder()
                .setTitle(`Informations du serveur ${serveur_type} : ${nom_serv}`)
                .setURL("https://antredesloutres.fr")
                .setDescription(`**Jeu :** ${jeu} **(${version_serv})**\n**Modpack :** [${modpack}](${modpack_url})\n**Administrateur(s) :** ${administrateur}\n**IP : ** \`antredesloutres.fr${serveur_port}\`\n\n**Serveur :** ${online_status}\n**Joueurs :** ${players}` + extra_message)
                .setThumbnail(thumbnail_url)
                .setColor(embedColor)
                .setFooter({
                    text: "Mineotter",
                    iconURL: interaction.client.user.displayAvatarURL(),
                })
                .setTimestamp();
            if (reply) {
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.channel.send({ embeds: [embed] });
            }
        }

        const action = interaction.options.getString('action');

        if (action === 'primaire') {
            const serverInfo = await getServerInfos('primaire');
            await sendEmbed('Primaire', ...Object.values(serverInfo), true);
        } else if (action === 'secondaire') {
            const serverInfo = await getServerInfos('secondaire');
            await sendEmbed('Secondaire', ...Object.values(serverInfo), true);
        } else {
            const serverInfoPrimary = await getServerInfos('primaire');
            const serverInfoSecondary = await getServerInfos('secondaire');

            await sendEmbed('Primaire', ...Object.values(serverInfoPrimary), false);
            await sendEmbed('Secondaire', ...Object.values(serverInfoSecondary), true);
        }
    }
};
