const { Events, PermissionsBitField } = require('discord.js');
// const { loadOrCreateConfig, checkRequiredChannels } = require(this);
const fs = require('fs');
const path = require('path');

module.exports = {
    name: Events.ClientReady,
    once: false,

    // Vérifie si le fichier existe et si chaque clé a une valeur
    async loadOrCreateConfig(filePath, defaultConfigs) {
        let configs = {};

        // Vérifie si le fichier existe
        if (fs.existsSync(filePath)) {
            try {
                // Charge le fichier de configuration
                configs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (error) {
                console.error(`[ERROR] Impossible de lire ou de parser ${filePath}:`, error);
                configs = {};
            }
        } else {
            console.warn(`[WARNING] ${filePath} n'existe pas, un fichier sera créé avec les valeurs par défaut.`);
        }

        // Vérifie et complète les valeurs manquantes avec celles par défaut
        for (const key in defaultConfigs) {
            if (!configs.hasOwnProperty(key)) {
                console.warn(`[WARNING] La clé "` + '\x1b[33m' + key + '\x1b[0m' + `" est manquante dans la configuration, ajout avec la valeur par défaut.`);
                configs[key] = defaultConfigs[key];
            }
        }

        // Écrit les valeurs complétées dans le fichier
        fs.writeFileSync(filePath, JSON.stringify(configs, null, 4));

        return configs;
    },

    // Ici ont vérifie si les salons obligatoires sont bien présents, et si non, les crée
    async checkRequiredChannels(guild, categoryName, channelNames, roleName) {
        const RequiredChannelNames = channelNames;
        
        // Vérifie si la catégorie existe
        const category = guild.channels.cache.find(channel => channel.name === categoryName);
        if (!category) {
            try {
                await guild.channels.create(categoryName, {
                    type: 'GUILD_CATEGORY',
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel],
                        },
                    ],
                });
                console.log(`[INFO] Catégorie "` + '\x1b[33m' + categoryName + '\x1b[0m' + `" créée !`);
                category = guild.channels.cache.find(channel => channel.name === categoryName);
            } catch (error) {
                console.error(`[ERROR] Erreur lors de la création de la catégorie : ${error}`);
            }
        } else {
            // console.log(`[INFO] La catégorie "` + '\x1b[33m' + categoryName + '\x1b[0m' + `" existe déjà`);
        }

        // Crée des salons à l'intérieur de la catégorie avec les mêmes permissions
        const role = guild.roles.cache.find(role => role.name === roleName);
        for (const channelName of channelNames) {
            const channelsDiscord = guild.channels.cache.map(channel => channel.name);
            if (channelsDiscord.includes(channelName)) {
                // console.log(`[INFO] Le salon "` + '\x1b[33m' + channelName + '\x1b[0m' + `" existe déjà`);
            } else {
                await guild.channels.create({
                    name: channelName,
                    type: 0,
                    parent: category.id,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                            id: role.id,
                            allow: [PermissionsBitField.Flags.ViewChannel],
                        },
                    ],
                });
                console.log(`[INFO] Salon "` + '\x1b[33m' + channelName + '\x1b[0m' + `" créé !`);
            }
        }

        // Ici ont récupère les ID des salons
        if (!fs.existsSync('./config.json')) {
            console.error('[ERROR] Le fichier config.json n\'existe pas ou n\'est pas accessible.');
        } else {
            for (const channelName of RequiredChannelNames) {
                if (channelName) {
                    let channelId = "";
                    if (guild == 'none' || !guild) {
                        console.error(`[ERROR] Impossible de récupérer l'ID du salon "${channelName}" : la guilde n'est pas définie.`);
                    } else {
                        channelId = guild.channels.cache.find(channel => channel.name === channelName).id;
                    }
                    try {
                        // Lecture du fichier de configuration
                        const config = JSON.parse(fs.readFileSync(__dirname + '/../config-bot.json', 'utf8'));

                        // Ajout ou mise à jour des ID des salons
                        let channelNameJSON = "";
                        if (channelName === '❌・logs-erreur-mineotter') {
                            channelNameJSON = "channelLogsErrorID";
                        } else if (channelName === '📃・logs-mineotter') {
                            channelNameJSON = "channelLogsID";
                        } else if (channelName === '🌌・discu-mc') {
                            channelNameJSON = "channelMcDiscordID";
                        } else if (channelName === '🍔・mcmyadmin-primaire') {
                            channelNameJSON = "channelMcMyAdminPrimaryID";
                        } else if (channelName === '🍟・mcmyadmin-secondaire') {
                            channelNameJSON = "channelMcMyAdminSecondaryID";
                        }
                        config[channelNameJSON] = channelId;

                        // Écriture du fichier de configuration
                        fs.writeFileSync(__dirname + '/../config-bot.json', JSON.stringify(config, null, 4));
                    } catch (error) {
                        console.error(`[ERROR] Erreur lors de la récupération de l'ID du salon "${channelName}" : ${error}`);
                    }
                }
            }
        }

        return;
    },

    // Vérifie les fichiers de configuration
    async execute(client) {
        const guild = client.guilds.cache.first(); // Identifiant du serveur
        console.log(`[INFO] Connecté en tant que ${client.user.tag} !`);

        const defaultConfigs = {
            maxServeurParUtilisateur: 1,
        };

        const defaultBotConfigs = {
            token_bot: 'none',
            clientId: 'none',
            guildId: guild.id,
            categoryName: 'Mineotter',
            roleName: 'Mineotter-logs',
            channelLogsErrorID: 'none',
            channelLogsID: 'none',
            channelMcDiscordID: 'none',
            channelMcMyAdminPrimaireID: 'none',
            channelMcMyAdminSecondaireID: 'none',
            mineotterColor: '#9adeba',
        };

        const defaultAPIConfigs = {
            token_api: 'none'
        };

        const defaultRconConfigs = {
            ServIPPrimaire: "194.164.76.165",
            ServIPSecondaire: "194.164.76.165",
            ServPortPrimaire: "25565",
            ServPortSecondaire: "25564",
            ServRconPortPrimaire: "25575",
            ServRconPortSecondaire: "25574",
            RconPassword: "j4SPyLD0J6or9dbSLJqfT70X9sPt0MOGV5RmSkGK",
            channelMcMyAdminPrimaryID: "1279825930289811611",
            channelMcMyAdminSecondaryID: "1279825931581788211",
            rconPrimaireActif: true,
            rconSecondaireActif: true
        };

        let config, configBot, configApi, configRcon;
        const loadOrCreateConfig = module.exports.loadOrCreateConfig;
        const checkRequiredChannels = module.exports.checkRequiredChannels;

        // Charger ou créer config.json
        try {
            config = await loadOrCreateConfig(path.join(__dirname, '/../config.json'), defaultConfigs);
            // console.log('[INFO] Fichier de configuration "config.json" chargé avec succès.');
        } catch (error) {
            console.error(`[ERROR] Impossible de charger, modifier ou créer config.json:`, error);
        }

        // Charger ou créer config-bot.json
        try {
            configBot = await loadOrCreateConfig(path.join(__dirname, '/../config-bot.json'), defaultBotConfigs);
            // console.log('[INFO] Fichier de configuration "config-bot.json" chargé avec succès.');
        } catch (error) {
            console.error(`[ERROR] Impossible de charger, modifier ou créer config-bot.json:`, error);
        }

        // Charger ou créer config-api.json
        try {
            configApi = await loadOrCreateConfig(path.join(__dirname, '/../config-api.json'), defaultAPIConfigs);
            // console.log('[INFO] Fichier de configuration "config-api.json" chargé avec succès.');
        } catch (error) {
            console.error(`[ERROR] Impossible de charger, modifier ou créer config-api.json:`, error);
        }

        // Charger ou créer config-rcon.json
        try {
            configRcon = await loadOrCreateConfig(path.join(__dirname, '/../config-rcon.json'), defaultRconConfigs);
            // console.log('[INFO] Fichier de configuration "config-rcon.json" chargé avec succès.');
        } catch (error) {
            console.error(`[ERROR] Impossible de charger, modifier ou créer config-rcon.json:`, error);
        }

        // Une fois les fichiers de configuration chargés, on vérifie si les salons obligatoires sont bien présents
        const RequiredChannelNames = ['❌・logs-erreur-mineotter', '📃・logs-mineotter', "🍔・mcmyadmin-primaire", "🍟・mcmyadmin-secondaire", "🌌・discu-mc"];
        
        await checkRequiredChannels(guild, configBot.categoryName, RequiredChannelNames, configBot.roleName);
    }
};
