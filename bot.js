const {Client, Intents, MessageEmbed} = require("discord.js");
const dotenv = require("dotenv");
const util = require("util");
const fs = require("fs");
const mysql = require('mysql2/promise');

//init dotenv
dotenv.config();

// Get database connection details from environment variables
const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;

// Create a connection pool
const pool = mysql.createPool({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
});

let discord_token = process.env.DISCORD_TOKEN; //Discord Bot Token (env: DISCORD_TOKEN)
let discord_guild = process.env.DISCORD_GUILD_ID; //Discord Guild ID (ID of you discord server) (env: DISCORD_GUILD)
let allowed_channel_id = process.env.DISCORD_CHANNEL_ID; // ID of the channel where the bot is allowed to work

//Data for all commands
const command_data = {
    'gen': {
        name: 'gen',
        description: 'Generate a random account',
        options: [{
            name: 'service',
            type: 'STRING',
            description: 'Name of account you want to generate',
            required: true
        }]
    },
    'stock': {
        name: 'stock',
        description: 'Check account stock'
    },
    'add': {
        name: 'add',
        description: 'Add accounts',
        options: [
            {
                name: 'service',
                type: 'STRING',
                description: 'Name of account service (Minecraft, Netflix)',
                required: true
            },
            {
                name: 'accounts',
                type: 'STRING',
                description: 'Accounts to add (email:password,email:password)',
                required: true
            }
        ]
    },
    'help': {
        name: 'help',
        description: 'View all commands for generator',
    }
    
}


//Set bot intents
const bot = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});


const create_embed = (content) => {

    const embed = new MessageEmbed()
        .setColor('#009ad6') //choose any color
        .setTitle('GOAT GEN') //can be changed
        .setDescription("**"+content+"**");

    return embed;
}

const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}
let commands = {}; // Store command IDs here

bot.once('ready', async () => {
    try {
        // Create all commands and store their IDs in the `commands` object
        const guild = await bot.guilds.cache.get(discord_guild);
        for (const commandName in command_data) {
            const command = command_data[commandName];
            const createdCommand = await guild.commands.create(command);
            commands[commandName] = createdCommand.id;
        }
        console.log('Commands created successfully');
    } catch (error) {
        console.error(error);
    }
});

console.log("The bot is online");
bot.on('interactionCreate', async interaction => {
    // Get the correct command ID from the `commands` object
    const commandId = commands[interaction.commandName];
    const guild = await bot.guilds.cache.get(discord_guild);
    const member = await guild.members.fetch(interaction.user.id);
    const hasGeneratorRole = member.roles.cache.find(role => role.name === 'GEN');

    if (!hasGeneratorRole) {
        // Send an error message to the user
        const embed = create_embed('⚠️ You do not have permission to use this bot!');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    
      
  if (interaction.isCommand && commandId) {
    // Check if interaction happened in the allowed channel
    if (interaction.channelId !== allowed_channel_id) {
      const embed = create_embed("⚠️ Sorry, I can only work in the GEN channel");
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }
        let command_name = (interaction.commandName).toLowerCase();
        if (command_name === "gen") {
            
            try {
                const generate_service = interaction.options.getString("service").toLowerCase();
        
                const [rows, fields] = await pool.execute(
                    'SELECT id, account FROM accounts WHERE service = ?',
                    [generate_service]
                );
                const accounts = rows.map(row => ({ id: row.id, account: row.account }));
        
                if (accounts.length) {
                    const account_rand = Math.floor(Math.random() * accounts.length);
                    const account_name = capitalize(generate_service);
                    const account_val = accounts[account_rand].account;
                    const account_id = accounts[account_rand].id;
        
                    const reply_embed = create_embed("✅ Check your messages for the account");
                    const dm_embed = create_embed(`Your ${account_name} account:\n\n${account_val}`);
                    interaction.user.send({ embeds: [dm_embed] }).catch(() => {
                        console.log(`Can't DM user: ${interaction.user.username}#${interaction.user.discriminator}`);
                    });
        
                    await pool.execute(
                        'DELETE FROM accounts WHERE id = ?',
                        [account_id]
                    );
        
                    await interaction.reply({ embeds: [reply_embed], ephemeral: true });
                } else {
                    const embed = create_embed("⚠️ No stock available");
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            } catch (err) {
                console.log(err);
            }
        }
        
        
        else if (command_name === "stock") {
            try {
              const [rows, _] = await pool.execute(
                "SELECT service, COUNT(*) AS count FROM accounts GROUP BY service"
              );
              const stock_msg = rows.map(
                ({ service, count }) => `${capitalize(service)}: ${count}`
              ).join("\n");
              const embed = create_embed(stock_msg);
              interaction.reply({ embeds: [embed], ephemeral: true });
            } catch (err) {
              console.log(err);
              const embed = create_embed("⚠️ Sorry, can't fetch stock right now");
              interaction.reply({ embeds: [embed], ephemeral: true })
            }
          }
          
          else if (command_name === "add") {
            if (interaction.member.permissions.has("ADMINISTRATOR")) {
              try {
                const generate_service = interaction.options.getString("service").toLowerCase();
                const generate_accounts = interaction.options.getString("accounts").split(",");
                const accounts = generate_accounts.map(account => {
                  const [email, password] = account.split(":");
                  return { email, password };
                });
                const values = accounts.map(() => "(?, ?)").join(",");
                const params = accounts.flatMap(account => [generate_service, `${account.email}:${account.password}`]);
                await pool.query(
                  `INSERT INTO accounts (service, account) VALUES ${values}`,
                  params
                );
                const embed = create_embed(`${accounts.length} account(s) added`);
                if (!interaction.replied) {
                  await interaction.reply({ embeds: [embed] });
                }
          
                // Calculate the total stock amount for the restock notification
                const [rows, _] = await pool.execute(
                  "SELECT COUNT(*) AS count FROM accounts WHERE service = ?",
                  [generate_service]
                );
                const total_amount = rows[0].count;
          
                // Send a restock notification to the selected channel
                const restock_embed = new MessageEmbed()
                .setColor("#009ad6")
                .setTitle("``🔔`` **New Restock** ``🔔``")
                .addFields(
                  { name: "``⚙️`` **Type**", value: "``" + capitalize(generate_service) + "``", inline: true },
                  { name: "``📈`` **Restock Amount**", value: "``" + accounts.length.toString() + "``", inline: true },
                  { name: "``📰`` **Stock Amount**", value: "``" + total_amount.toString() + "``", inline: true },
                  { name: "``🙋‍♂️`` **Restocked by**", value: interaction.user.toString(), inline: true }
                )
                .setTimestamp()
                .setFooter("Restocked by " + interaction.user.tag, interaction.user.avatarURL());
              const restock_channel_id = process.env.RESTOCK_CHANNEL_NOTI;
              const channel = await bot.channels.fetch(restock_channel_id);
              await channel.send({ embeds: [restock_embed] });
              
              } catch (err) {
                console.log(err);
                const embed = create_embed("⚠️ There was an error adding the account");
                if (!interaction.replied) {
                  await interaction.reply({ embeds: [embed], ephemeral: true });
                }
              }
            } else {
              const embed = create_embed("⚠️ Only admins can use this command");
              if (!interaction.replied) {
                await interaction.reply({ embeds: [embed], ephemeral: true });
              }
            }
          }
        
        else if(command_name === "help"){

            let help_txt = "\n/gen <service>\n/stock\n/add <service> <account>\n/help";

            const embed = create_embed(help_txt);
            interaction.reply({embeds: [embed], ephemeral: true});
        }
    }
});

//Log bot in with token
bot.login(discord_token);