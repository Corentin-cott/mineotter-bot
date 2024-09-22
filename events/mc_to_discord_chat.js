const { Events, EmbedBuilder } = require('discord.js');
const { token_api } = require('../config-api.json');
const { ServIPPrimaire, ServIPSecondaire, ServPortPrimaire, ServPortSecondaire, ServRconPortPrimaire, ServRconPortSecondaire, RconPassword, channelMcMyAdminPrimaryID, channelMcMyAdminSecondaryID, channelMcDiscordID, rconPrimaireActif, rconSecondaireActif } = require('../config-rcon.json');
const { Rcon } = require('rcon-client');
const { Tail } = require('tail');
const fs = require('fs');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        // Options de connexion RCON
        const rconOptionsPrimaire = {
            host: ServIPPrimaire,
            port: ServRconPortPrimaire,
            password: RconPassword,
        };
        const rconOptionsSecondaire = {
            host: ServIPSecondaire,
            port: ServRconPortSecondaire,
            password: RconPassword,
        };

        // Function pour les regex des messages des logs ----------------------------------------------
        function getPlayerMessage(message) {
            // Regex pour capturer le texte du message
            const regex = /^<[^>]+> (.+)$/;
            const match = message.match(regex);
            
            if (match) {
              return match[1];
            } else {
              // Retourne null ou une valeur par défaut si le message ne correspond pas
              return null;
            }
        }

        function isPlayerMessage(message) {
            // Regex pour vérifier le format "<NomDuJoueur> texte"
            const regex = /^<[^>]+> .+$/;
            return regex.test(message);
        }

        function isPlayerJoining(message) {
            // Regex pour vérifier le format "NomDuJoueur joined the game"
            const regex = /^.+ joined the game$/;
            if (regex.test(message)) {
                // Renvoi le nom du joueur
                const regex = /^([^ ]+) joined the game$/;
                const match = message.match(regex);
                return match[1];
            } else {
                return null;
            }
        }

        function isPlayerLeaving(message) {
            // Regex pour vérifier le format "NomDuJoueur left the game"
            const regex = /^.+ left the game$/;
            if (regex.test(message)) {
                // Renvoi le nom du joueur
                const regex = /^([^ ]+) left the game$/;
                const match = message.match(regex);
                return match[1];
            } else {
                return null;
            }
        }

        function isServerStarting(message) {
            // Regex pour vérifier le format "Done (.*?)(!)"
            const regex = /^Done \(.*?\)!.*$/;
            return regex.test(message);
        }

        function isServerStopping(message) {
            // Regex pour vérifier le format "Stopping server"
            const regex = /^Stopping server$/;
            return regex.test(message);
        }

        function isRconThread(message) {
            // Regex pour vérifié tout se qui contient "Thread RCON Client /194.164.76.165 started" ou "Thread RCON Client /194.164.76.165 shutting down"
            const regex_rconstarted = /Thread RCON Client \/[\d.]+ started/;
            const regex_rconstopped = /Thread RCON Client \/[\d.]+ shutting down/;
            return regex_rconstarted.test(message) || regex_rconstopped.test(message);
        }
            
        function getPlayerName(message) {
            // Regex pour capturer le nom du joueur et le texte
            const regex = /^<([^>]+)> .+$/;
            const match = message.match(regex);
            
            if (match) {
              return match[1];
            } else {
              // Retourne null ou une valeur par défaut si le message ne correspond pas
              return null;
            }
        }

        // Function d'envoi des messages dans les salons discord ----------------------------------------------
        async function sendPlayerMessage(playername, message, serveur) {
            // Embed pour les messages des joueurs
            if (serveur === "primaire") {
                const embed = new EmbedBuilder()
                .setTitle(playername)
                .setURL("https://fr.namemc.com/profile/" + playername)
                .setDescription(message)
                .setThumbnail("https://mc-heads.net/avatar/" + playername + "/50")
                .setColor(servPrimaireConfigs.embedColor)
                .setFooter({
                    text: 'Message venant du serveur minecraft "' + servPrimaireConfigs.nom_serv + '" !',
                    iconURL: "https://cdn.discordapp.com/app-icons/1247285437425516647/d9859c21466ea0cc1a164d03926ea7bb.png?size=32",
                })
                .setTimestamp();
                channel.send({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                .setTitle(playername)
                .setURL("https://fr.namemc.com/profile/" + playername)
                .setDescription(message)
                .setThumbnail("https://mc-heads.net/avatar/" + playername + "/50")
                .setColor(servSecondaireConfigs.embedColor)
                .setFooter({
                    text: 'Message venant du serveur minecraft "' + servSecondaireConfigs.nom_serv + '" !',
                    iconURL: "https://cdn.discordapp.com/app-icons/1247285437425516647/d9859c21466ea0cc1a164d03926ea7bb.png?size=32",
                })
                .setTimestamp();
                channel.send({ embeds: [embed] });
            }

            // Envoi du message sur le serveur où le joueur n'est pas
            try {
                let rconOptions;
                let embedColor;
                if (serveur === "primaire") {
                    // Envoi du message sur le serveur secondaire
                    embedColor = servPrimaireConfigs.embedColor;
                    rconOptions = rconOptionsSecondaire;
                } else {
                    // Envoi du message sur le serveur primaire
                    embedColor = servSecondaireConfigs.embedColor
                    rconOptions = rconOptionsPrimaire;
                }

                try {
                    rcon = await Rcon.connect(rconOptions);
                } catch (error) {
                    console.error('[ERROR] Erreur lors de la connexion au RCON du serveur secondaire : ', error.message);
                    return;
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
                await rcon.send(`tellraw @a ["",{"text":"<${playername}>","color":"`+embedColor+`","hoverEvent":{"action":"show_text","contents":"Message envoyé depuis un autre serveur Minecraft."}},{"text":" ${message}"}]`);
            } catch (error) {
                console.error(`[ERROR] Erreur lors de l'envoi du message sur le serveur opposé : ${error.message}`);
            }
        }
        
        function sendPlayerAdvancement() {}

        function sendPlayerDeath() {}

        async function sendPlayerJoining(playername, serveur) {
            // Embed pour les messages de connexion des joueurs
            if (serveur === "primaire") {
                const embed = new EmbedBuilder()
                .setTitle("Connexion de " + playername + ' sur le serveur "' + servPrimaireConfigs.nom_serv + '"')
                .setColor(servPrimaireConfigs.embedColor)
                .setFooter({
                    text: 'Message venant du serveur minecraft "' + servPrimaireConfigs.nom_serv + '" !',
                    iconURL: "https://cdn.discordapp.com/app-icons/1247285437425516647/d9859c21466ea0cc1a164d03926ea7bb.png?size=32",
                })
                .setTimestamp();
                channel.send({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                .setTitle("Connexion de " + playername + ' sur le serveur "' + servSecondaireConfigs.nom_serv + '"')
                .setColor(servSecondaireConfigs.embedColor)
                .setFooter({
                    text: 'Message venant du serveur minecraft "' + servSecondaireConfigs.nom_serv + '" !',
                    iconURL: "https://cdn.discordapp.com/app-icons/1247285437425516647/d9859c21466ea0cc1a164d03926ea7bb.png?size=32",
                })
                .setTimestamp();
                channel.send({ embeds: [embed] });
            }
            
            // Envoi du message sur le serveur où le joueur n'est pas
            let rconOptions;
            let serveurname;
            try {
                if (serveur === "primaire") {
                    // Envoi du message sur le serveur secondaire
                    serveurname = servPrimaireConfigs.nom_serv;
                    rconOptions = rconOptionsSecondaire;
                } else {
                    // Envoi du message sur le serveur primaire
                    serveurname = servSecondaireConfigs.nom_serv
                    rconOptions = rconOptionsPrimaire;
                }

                try {
                    rcon = await Rcon.connect(rconOptions);
                } catch (error) {
                    console.error('[ERROR] Erreur lors de la connexion au RCON du serveur opposé : ', error.message);
                    return;
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
                await rcon.send(`tellraw @a {"text":"${playername} a rejoint le serveur ${serveurname} !","color":"yellow"}`);
                
            } catch (error) {
                console.error(`[ERROR] Erreur lors de l'envoi du message sur le serveur opposé : ${error.message}`);
            }
        }

        async function sendPlayerLeaving(playername, serveur) {
            // Embed pour les messages de déconnexion des joueurs
            if (serveur === "primaire") {
                const embed = new EmbedBuilder()
                .setTitle("Déconnexion de " + playername + ' du serveur "' + servPrimaireConfigs.nom_serv + '"')
                .setColor(servPrimaireConfigs.embedColor)
                .setFooter({
                    text: 'Message venant du serveur minecraft "' + servPrimaireConfigs.nom_serv + '" !',
                    iconURL: "https://cdn.discordapp.com/app-icons/1247285437425516647/d9859c21466ea0cc1a164d03926ea7bb.png?size=32",
                })
                .setTimestamp();
                channel.send({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                .setTitle("Déconnexion de " + playername + ' du serveur "' + servSecondaireConfigs.nom_serv + '"')
                .setColor(servSecondaireConfigs.embedColor)
                .setFooter({
                    text: 'Message venant du serveur minecraft "' + servSecondaireConfigs.nom_serv + '" !',
                    iconURL: "https://cdn.discordapp.com/app-icons/1247285437425516647/d9859c21466ea0cc1a164d03926ea7bb.png?size=32",
                })
                .setTimestamp();
                channel.send({ embeds: [embed] });
            }

            // Envoi du message sur le serveur où le joueur n'est pas
            let rconOptions;
            let serveurname;
            try {
                if (serveur === "primaire") {
                    // Envoi du message sur le serveur secondaire
                    serveurname = servPrimaireConfigs.nom_serv;
                    rconOptions = rconOptionsSecondaire;
                } else {
                    // Envoi du message sur le serveur primaire
                    serveurname = servSecondaireConfigs.nom_serv
                    rconOptions = rconOptionsPrimaire;
                }

                try {
                    rcon = await Rcon.connect(rconOptions);
                } catch (error) {
                    console.error('[ERROR] Erreur lors de la connexion au RCON du serveur opposé : ', error.message);
                    return;
                }

                await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
                await rcon.send(`tellraw @a {"text":"${playername} a quitté le serveur ${serveurname} !","color":"yellow"}`);
                
            } catch (error) {
                console.error(`[ERROR] Erreur lors de l'envoi du message sur le serveur opposé : ${error.message}`);
            }
        }

        function sendServerStarting(server) {
            // Embed pour les messages de démarrage du serveur
            if (server === "primaire") {
                const embed = new EmbedBuilder()
                .setTitle('Le serveur "' + servPrimaireConfigs.nom_serv + '" est démarré !')
                .setDescription("Le serveur est prêt à accueillir des joueurs 🎉")
                .setColor(servPrimaireConfigs.embedColor)
                .setFooter({
                    text: 'Message venant du serveur minecraft "' + servPrimaireConfigs.nom_serv + '" !',
                    iconURL: "https://cdn.discordapp.com/app-icons/1247285437425516647/d9859c21466ea0cc1a164d03926ea7bb.png?size=32",
                })
                .setTimestamp();
                channel.send({ embeds: [embed] });
            }
            else {
                const embed = new EmbedBuilder()
                .setTitle('Le serveur "' + servSecondaireConfigs.nom_serv + '" est démarré !')
                .setDescription("Le serveur est prêt à accueillir des joueurs 🎉")
                .setColor(servSecondaireConfigs.embedColor)
                .setFooter({
                    text: 'Message venant du serveur minecraft "' + servSecondaireConfigs.nom_serv + '" !',
                    iconURL: "https://cdn.discordapp.com/app-icons/1247285437425516647/d9859c21466ea0cc1a164d03926ea7bb.png?size=32",
                })
                .setTimestamp();
                channel.send({ embeds: [embed] });
            }
        }

        function sendServerStopping(server) {
            // Embed pour les messages d'arrêt du serveur
            if (server === "primaire") {
                const embed = new EmbedBuilder()
                .setTitle('Arrêt du serveur "' + servPrimaireConfigs.nom_serv + '"')
                .setDescription("Le serveur est en train de s'arrêter... Probablement pour pas longtemps !")
                .setColor(servPrimaireConfigs.embedColor)
                .setFooter({
                    text: 'Message venant du serveur minecraft "' + servPrimaireConfigs.nom_serv + '" !',
                    iconURL: "https://cdn.discordapp.com/app-icons/1247285437425516647/d9859c21466ea0cc1a164d03926ea7bb.png?size=32",
                })
                .setTimestamp();
                channel.send({ embeds: [embed] });
            }
            else {
                const embed = new EmbedBuilder()
                .setTitle('Arrêt du serveur "' + servSecondaireConfigs.nom_serv + '"')
                .setDescription("Le serveur est en train de s'arrêter... Probablement pour pas longtemps !")
                .setColor(servSecondaireConfigs.embedColor)
                .setFooter({
                    text: 'Message venant du serveur minecraft "' + servSecondaireConfigs.nom_serv + '" !',
                    iconURL: "https://cdn.discordapp.com/app-icons/1247285437425516647/d9859c21466ea0cc1a164d03926ea7bb.png?size=32",
                })
                .setTimestamp();
                channel.send({ embeds: [embed] });
            }
        }

        function sendServerCrash() {}

        // Récupération des configurations des serveurs via l'API avec la méthode POST
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_token: token_api }) // Envoi du token d'authentification
        };
        apiData = await fetch('https://api.antredesloutres.fr/serveurs/primaire', requestOptions);
        const servPrimaireConfigs = await apiData.json();
        
        apiData = await fetch('https://api.antredesloutres.fr/serveurs/secondaire', requestOptions);
        const servSecondaireConfigs = await apiData.json();
        
        let logFilePrimaire = servPrimaireConfigs.path_serv + 'logs/latest.log';
        let logFileSecondaire = servSecondaireConfigs.path_serv + 'logs/latest.log';

        // Récupération des ID des salons
        const channel = client.channels.cache.get(channelMcDiscordID);
        const channelLogsPrimaire = client.channels.cache.get(channelMcMyAdminPrimaryID);
        const channelLogsSecondaire = client.channels.cache.get(channelMcMyAdminSecondaryID);

        
        // Vérifiez si le fichier de log pour le serveur primaire existe
        if (!fs.existsSync(logFilePrimaire)) {
            console.error(`[ERROR] Le fichier de log n'existe pas : ${logFilePrimaire}`);
            return;
        } else {
            console.log('[INFO] Démarrage de la surveillance des logs du serveur primaire :', '\x1b[33m', `${logFilePrimaire}`, '\x1b[0m');
            
            // Tail du fichier primaire
            const tail = new Tail(logFilePrimaire);
            tail.on('line', async (line) => {
                if (line.trim() === '') return; // Ignorer les lignes vides
    
                if (channelLogsPrimaire) {
                    try {
                        if (isRconThread(line))
                            return; // Ignorer les messages des threads RCON
                        else {
                            await channelLogsPrimaire.send(line);
                        }
                    } catch (error) {
                        console.error('[ERROR] Erreur lors de l\'envoi du message au salon', '\x1b[34m', 'mcmyadmin-primaire', '\x1b[0m', `: ${error}`);
                    }
    
                    if (channel) {
                        try {
                            cut_line = line.replace(/\[\d{2}:\d{2}:\d{2}\] \[.*?\]: /, '');
                            if (isPlayerMessage(cut_line)) {
                                sendPlayerMessage(getPlayerName(cut_line), getPlayerMessage(cut_line), "primaire");
    
                            } else if (isPlayerJoining(cut_line) !== null) {
                                sendPlayerJoining(isPlayerJoining(cut_line), "primaire");
    
                            } else if (isPlayerLeaving(cut_line) !== null) {
                                sendPlayerLeaving(isPlayerLeaving(cut_line), "primaire");
    
                            } else if (isServerStarting(cut_line)) {
                                sendServerStarting("primaire");
    
                            } else if (isServerStopping(cut_line)) {
                                sendServerStopping("primaire");
    
                            }
                        } catch (error) {
                            console.error('[ERROR] Erreur lors de l\'envoi du message au salon', '\x1b[34m', 'discu-mc', '\x1b[0m', `(serveur : primaire) : ${error.message}`);
                        }
                    } else {
                        console.error('[ERROR] Salon', '\x1b[34m', 'discu-mc', '\x1b[0m', 'non trouvé (serveur : primaire)');
                    }
                } else {
                    console.error('[ERROR] Salon', '\x1b[34m', 'mcmyadmin-primaire', '\x1b[0m', 'non trouvé');
                }
            });
        }

        if (!fs.existsSync(logFileSecondaire)) {
            console.error(`[ERROR] Le fichier de log n'existe pas : ${logFileSecondaire}`);
            return;
        } else {
            console.log('[INFO] Démarrage de la surveillance des logs du serveur secondaire :', '\x1b[33m', `${logFileSecondaire}`, '\x1b[0m');
            // Tail du fichier secondaire
            const tailSecondaire = new Tail(logFileSecondaire);
            tailSecondaire.on('line', async (line) => {
                if (line.trim() === '') return; // Ignorer les lignes vides
    
                if (channelLogsSecondaire) {
                    try {
                        if (isRconThread(line)) {
                            // console.log("[INFO] Arrêt de la lecture de la ligne : ", line);
                            return; // Ignorer les messages des threads RCON
                        } else {
                            console.log("[INFO] Envoi de la ligne : ", line);
                            await channelLogsSecondaire.send(line);
                        }
                    } catch (error) {
                        console.error('[ERROR] Erreur lors de l\'envoi du message au salon', '\x1b[34m', 'mcmyadmin-secondaire', '\x1b[0m', `: ${error.message}`);
                    }
    
                    if (channel) {
                        try {
                            cut_line = line.replace(/\[\d{2}:\d{2}:\d{2}\] \[.*?\]: /, '');
                            if (isPlayerMessage(cut_line)) {
                                sendPlayerMessage(getPlayerName(cut_line), getPlayerMessage(cut_line), "secondaire");
    
                            } else if (isPlayerJoining(cut_line) !== null) {
                                sendPlayerJoining(isPlayerJoining(cut_line), "secondaire");
    
                            } else if (isPlayerLeaving(cut_line) !== null) {
                                sendPlayerLeaving(isPlayerLeaving(cut_line), "secondaire");
    
                            } else if (isServerStarting(cut_line)) {
                                sendServerStarting("secondaire");
    
                            } else if (isServerStopping(cut_line)) {
                                sendServerStopping("secondaire");
    
                            }
                        } catch (error) {
                            console.error('[ERROR] Erreur lors de l\'envoi du message au salon', '\x1b[34m', 'discu-mc', '\x1b[0m', `(serveur : secondaire) : ${error.message}`);
                        }
                    } else {
                        console.error('[ERROR] Salon', '\x1b[34m', 'discu-mc', '\x1b[0m', 'non trouvé (serveur : secondaire)');
                    }
                } else {
                    console.error('[ERROR] Salon', '\x1b[34m', 'mcmyadmin-secondaire', '\x1b[0m', 'non trouvé');
                }
            });
        }

        // tail.on('error', (err) => {
            // console.error(`[ERROR] Erreur de lecture du fichier de log : ${err.message}`);
        // });

        // Assurez-vous de fermer le tail proprement lorsque le bot se déconnecte ou redémarre
        client.on(Events.ClientDestroy, () => {
            console.log('[INFO] Fermeture du suivi du fichier de log');
            tail.unwatch();
        });
    }
};