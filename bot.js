const ethers = require('ethers')
const TelegramBot = require("node-telegram-bot-api");
const schedule = require('node-schedule');

require('dotenv').config()

// const network = process.env.BLOCKCHAIN_URL; //reading from env (using rinkeby testnet)
const network_wss = process.env.BLOCKCHAIN_WSS; //reading from env (using rinkeby testnet wss)
const address = process.env.WALLET_ADDRESS || ""; //reading wallet from env for which we want to listen for Tx)
const leastBalance = process.env.LEAST_AMOUNT;  // amount/balance at which we should send notification to wallet address owner
const token = process.env.TELEGRAM_BOT_TOKEN;   // Telegram bot token_id which sends balance updates
const bot = new TelegramBot(token, { polling: true }); //new bot instanse
const rule = new schedule.RecurrenceRule(); //scheduler for recurring balance updates on specified time
const customWsProvider = new ethers.providers.WebSocketProvider(network_wss);
rule.hour = parseInt(process.env.DAILY_UPDATES_IN_HOURS);
rule.minute =new schedule.Range(0, 59, parseInt(process.env.DAILY_UPDATES_IN_MINUTES));
rule.tz = process.env.DAILY_UPDATES_IN_TIMEZONE;
rule.dayOfWeek = [0, new schedule.Range(0, 6)];
let chat_id = "";

var init = function() {
    console.log("started wss connection!")
    
    //scheduler for receiving balance updates
    schedule.scheduleJob(rule, function() {
        fetchBalance(address);
    });
    
    //telegram bot chat_id intializer
    bot.on("message", async (msg) => {

        const { chat: { id }, text } = msg;

        chat_id = id;
        
        try {
            bot.sendMessage(chat_id, ` You'll recieve balance updates here`);
        } catch (error) {
            bot.sendMessage(chat_id, `something went wrong while sending message`);
        }
    
    });

    //incoming transaction handler
    customWsProvider.on("pending", (tx) => {
        customWsProvider.getTransaction(tx).then(function (transaction) {
            let filter = transaction ? transaction.from === address || transaction.to === address : false;
            if(filter){
                console.log(transaction);
                fetchBalance(address);
            }
        })
    })
    customWsProvider._websocket.on("error", async (ep) => {
        console.log(`Unable to connect to ${ep.subdomain} retrying in 3s...`);
        setTimeout(init, 3000);
    });
    customWsProvider._websocket.on("close", async (code) => {
        console.log(
          `Connection lost with code ${code}! Attempting reconnect in 3s...`
        );
        customWsProvider._websocket.terminate();
        setTimeout(init, 3000);
    });

}

function fetchBalance(address){
    customWsProvider.getBalance(address).then((balance) => {
        // convert a currency unit from wei to ether
        const balanceInEth = ethers.utils.formatEther(balance)
        console.log(`balance: ${balanceInEth} ETH`)
        if(balanceInEth < leastBalance && chat_id){
            //send notification to telegram
            try {
                bot.sendMessage(chat_id, ` your currecnt balance is ${balanceInEth}, please add more to avoid anykind of issue`);
            } catch (error) {
                bot.sendMessage(chat_id, `something went wrong while sending message`);
            }
        }
        if(!chat_id){
            console.log("please type /start to telegram bot to start recieving balance updates")
        }
    })
}

init();