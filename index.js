const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token_bot } = require('./config-bot.json');
const fs = require('fs');
const path = require('path');

// Créer un nouveau client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

client.commands = new Collection();
client.cooldowns = new Collection();

// Récupérer les commandes
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Ajouter les commandes à la collection
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
			console.log('[INFO] Commande', '\x1b[33m', `${file}`, '\x1b[0m', 'chargée avec succès.');
		} else {
			console.warn('[WARN] La commande', '\x1b[33m', `${file}`, '\x1b[0m', 'ne contient pas de données ou de fonction d\'exécution.');
		}
	}
}

// Récupérer les événements
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

// On charge les événements dans l'ordre de leur nom
for (const file of eventFiles) {
	const event = require(path.join(eventsPath, file));
	if ('name' in event && 'execute' in event) {
		client.on(event.name, event.execute.bind(null, client));
		
		// Si fichier commence par "0_", on l'éxecute une seule fois
		if (file.startsWith('0_')) {
			//event.execute(client);
			console.log('[INFO] Événement', '\x1b[33m', `${file}`, '\x1b[0m', 'chargé et éxécuté avec succès.');
		} else {
			console.log('[INFO] Événement', '\x1b[33m', `${file}`, '\x1b[0m', 'chargé avec succès.');
		}
	} else {
		console.warn('[WARN] L\'événement', '\x1b[33m', `${file}`, '\x1b[0m', 'ne contient pas de nom ou de fonction d\'exécution.');
	}
}

// Connexion du client
client.login(token_bot);