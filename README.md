

### [Join Telegram!](https://t.me/goat_one)
### [Join Discord!](https://discord.gg/AC4q6MkaxX)

## Discord Account Generator
This is a Discord bot that generates random accounts for different services. It is built using the Discord.js library and Node.js.

## Setup
To use this bot, you'll need to do the following:

Run install
```npm install```

Clone this repository.
Install the necessary dependencies by running npm install.
Create a MySQL database and add its connection details to a .env file in the root directory of the project.
Replace the values with your own database connection details, Discord bot token, Discord guild ID, and the ID of the channel where the bot is allowed to work.

Create the necessary tables in your database by running
```npm run create-tables```.
Start the bot by running 
```npm start```.
Note: You can also use a process manager like PM2 to manage the bot's lifecycle

## Usage
Once the bot is running, you can use the following commands:

/gen <service>: Generates a random account for the specified service.
/stock: Checks the current stock of accounts for each service.
/add <service> <accounts>: Adds accounts to the database for the specified service. Only administrators can use this command.
/help: Displays a list of all available commands.
Note: The bot will only work in the channel specified by the DISCORD_CHANNEL_ID environment variable.

Contributing
If you'd like to contribute to this project, feel free to submit a pull request.
