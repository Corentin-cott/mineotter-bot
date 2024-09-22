const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { token_api } = require('../../config.json');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serveur')
        .setDescription('Permet la gestion des serveurs de jeux Minecraft.')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Lancer ou arrêter le serveur.')
                .setRequired(true)
                .addChoices(
                    { name: 'Lancer', value: 'lancer' },
                    { name: 'Arrêter', value: 'arrêter' },
                    { name: 'Informations', value: 'infos'}
                )
            )
        .addStringOption(option =>
            option.setName('serveur')
                .setDescription('Le serveur principale (La Vanilla) ou un serveur secondaire.')
                .setRequired(true)
                .setAutocomplete(true)
            ),
            
    async autocomplete(interaction) {
        // Récupère les données de l'API pour l'autocomplétion des serveurs
        async function getServerList() {
            const api_url = 'https://api.antredesloutres.fr/serveurs/actifs/jeu/Minecraft/';
            const response = await fetch(api_url);
            const data = await response.json();

            // console.log('[INFO] Données récupérées pour l\'autocomplétion des serveurs : ', data);
            return data;
        }

        // On déclare "choices"
        let choices = [];
        
        try {
            const serverList = await getServerList();
            // console.log('[INFO] Liste des serveurs récupérée pour l\'autocomplétion : ', serverList);
            
            for (const server of serverList) {
                if (server.path_serv.match(/serveurs-globaux|serveurs-investisseurs/)) {
                    server.type_serv = 'global';
                } else {
                    server.type_serv = 'd\'investisseurs';
                }
                
                choices = choices.concat({
                    name: server.nom_serv + ' (Serveur ' + server.type_serv + ')',
                    value: server.id_serv,
                });
            }

            // console.log('[INFO] Choix des serveurs pour l\'autocomplétion : ', choices);
            await interaction.respond(choices);
        } catch (error) {
            console.error('[ERROR] Erreur lors de la récupération des données pour l\'autocomplétion : ', error);
            await interaction.respond([
                {
                    name: 'Error',
                    value: 'Une erreur est survenue !'
                }
            ]).catch(err => console.error('[ERROR] Erreur lors de la réponse à l\'interaction : ', err));
        }
    },
    async execute(interaction) {
        const id_serv = interaction.options.getString('serveur');
        const action = interaction.options.getString('action');

        async function getServerInfos(id_serv) {
            const api_url = `https://api.antredesloutres.fr/serveurs/infos/${id_serv}`;
            const response = await fetch(api_url);
            const data = await response.json();

            data.id_serv = data.id_serv || '🥸';
            data.jeu = data.jeu || '🥸'
            data.nom_serv = data.nom_serv || '🥸'
            data.modpack = data.modpack || '🥸'
            data.modpack_url = data.modpack_url || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            data.embedColor = data.embedColor || '#FFFFFF';
            data.nom_monde = data.nom_monde || '🥸';
            data.version_serv = data.version_serv || '🥸';
            data.path_serv = data.path_serv || '🥸';
            data.start_script = data.start_script || '🥸';
            data.administrateur = data.administrateur || '🥸';
            data.actif = data.actif || false;
            data.nb_joueurs = data.nb_joueurs || 0;
            data.online = data.online || false;
            data.players = data.players || [];

            // On regarde si path_serv inclu "serveurs-globaux" ou "serveurs-investisseurs" avec une regex
            if (data.path_serv.match(/serveurs-globaux|serveurs-investisseurs/)) { data.type_serv = 'globaux'; }
            else { data.type_serv = 'investisseurs'; }

            return data;
        }

        if (!id_serv) {
            // Une réponse aléatoire parmi celles proposées
            const responses = [
                'Vous devez choisir un serveur parmi La Vanilla ou les serveurs secondaires.',
                'Il faut choisir un serveur pour pouvoir effectuer une action.',
                'Veuillez choisir un serveur pour effectuer une action.',
                'Il semblerait que vous ayez oublié de choisir un serveur.',
                'Il me manque le serveur sur lequel effectuer l\'action.',
                'Je crois que vous avez oublié de choisir un serveur 🥸',
                'Mmmmh il manque le serveur pour effectuer l\'action 🥸',
                'Ouais mais en fait il faut choisir un serveur pour effectuer une action 🥸'
            ];
            // console.log('[INFO] ' + interaction.user.username + ' a oublié de choisir un serveur. Réponse aléatoire renvoyée.');
            await interaction.reply('' + responses[Math.floor(Math.random() * responses.length)]);
            return;
        }

        try {
            const serverInfos = getServerInfos(id_serv);
            let ApiLink;
            if (action === 'lancer') {
                ApiLink = 'https://api.antredesloutres.fr/serveurs/start';
            } else if (action === 'arrêter') {
                ApiLink = 'https://api.antredesloutres.fr/serveurs/stop';
            } else if (action === 'infos') {
                    try {
                    const serverInfos = await getServerInfos(id_serv);
                    if (serverInfos.nom_serv !== 'La Vanilla') { serverInfos.type_serv = 'Secondaire'; }
                    else { serverInfos.type_serv = 'Primaire'; }
                    sendEmbed(
                        serverInfos.type_serv,
                        serverInfos.embedColor,
                        serverInfos.jeu,
                        serverInfos.nom_serv,
                        serverInfos.modpack,
                        serverInfos.modpack_url,
                        serverInfos.version_serv,
                        serverInfos.administrateur,
                        serverInfos.online ? 'En ligne' : 'Hors ligne',
                        serverInfos.players.length > 0 ? serverInfos.players.join(', ') : 'Aucun joueurs connectés',
                        interaction
                    );
                    return
                } catch (error) {
                    console.error('[ERROR] Erreur lors de la récupération des informations du serveur pour l\'action : ',  action, '. Erreur :', error);
                    await interaction.reply({content : `Erreur lors de la récupération des informations du serveur.`, ephemeral: true});
                    return;
                }
            } else {
                // Une réponse aléatoire parmi celles proposées
                const responses = [
                    'Vous devez choisir une action parmi lancer ou arrêter.',
                    'Il faut choisir une action pour pouvoir effectuer une action.',
                    'Veuillez choisir une action pour effectuer une action. Genre uh, lancer ou arrêter. Tu vois?',
                    'Il faut choisir une action pour pouvoir effectuer une action 🥸',
                    "D'accord mais je ne sais pas quoi faire si vous ne choisissez pas une action 🥸",
                ];
                await interaction.reply('' + responses[Math.floor(Math.random() * responses.length)]);
                return;
            }

            const fetch = (await import('node-fetch')).default;
            const response = await fetch(ApiLink, {
                method: 'POST',
                body: JSON.stringify({ id_serv: id_serv, client_token: token_api }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();

            if (data.status === "0") {
                await interaction.reply(`Le serveur est déjà ${action === 'lancer' ? 'démarré' : 'arrêté'}.`);
            } else if (serverInfos.nb_joueurs > 0) {
                await interaction.reply(`Impossible d'arrêter le serveur, il y a ${serverInfos.nb_joueurs} joueur(s) connecté(s).`);
            } else {
                console.log(`[INFO] ${interaction.user.username} a ${action === 'lancer' ? 'démarré' : 'arrêté'} le serveur ${id_serv}.`);
                await interaction.reply(`Le serveur est en cours de ${action === 'lancer' ? 'démarrage' : 'arrêt'}.`);
            }
        } catch (error) {
            console.error('[ERROR] Erreur lors de la requête API:', error);
            if (action === 'infos') {
                await interaction.reply(`Erreur lors de la récupération des informations du serveur.`);
            } else {
                await interaction.reply(`Erreur lors ${action === 'lancer' ? 'du démarrage' : 'de l\'arrêt'} du serveur.`);
            }
        }
    },
};

function sendEmbed(serveur_type, embedColor, jeu, nom_serv, modpack, modpack_url, version_serv, administrateur, online_status, players, interaction) {
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

    console.log(`[INFO] Envoi de l'embed d'informations du serveur ${nom_serv} à ${interaction.user.username} : `, { serveur_type, embedColor, jeu, nom_serv, modpack, modpack_url, version_serv, administrateur, online_status, players });

    const embed = new EmbedBuilder()
        .setTitle(`Informations du serveur ${serveur_type} : ${nom_serv}`)
        .setURL("https://antredesloutres.fr")
        .setDescription(`**Jeu :** ${jeu} **(${version_serv})**\n**Modpack :** [${modpack}](${modpack_url})\n**Administrateur(s) :** ${administrateur}\n**IP : ** \`antredesloutres.fr${serveur_port}\`\n\n**Serveur :** ${online_status}\n**Joueurs :** ${players}` + extra_message)
        .setThumbnail(thumbnail_url)
        .setColor(parseInt(embedColor.replace('#', ''), 16))
        .setFooter({
            text: "Mineotter",
            iconURL: interaction.client.user.displayAvatarURL(),
        })
        .setTimestamp();
        
    interaction.reply({ embeds: [embed] });
}