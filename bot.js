const ethers = require('ethers')
const TelegramBot = require("node-telegram-bot-api");
require('dotenv').config()
const network = process.env.BLOCKCHAIN_URL; // using rinkeby testnet
const network_wss = process.env.BLOCKCHAIN_WSS;
const address = process.env.WALLET_ADDRESS || "";
const leastBalance = process.env.LEAST_AMOUNT;
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
let chat_id = ""


var init = function() {

    bot.on("message", async (msg) => {

        const { chat: { id }, text } = msg;
        chat_id = id;
        // console.log("printing tel: ",msg, id, text)
        try {
            bot.sendMessage(chat_id, ` You'll recieve balance updates here`);
        } catch (error) {
            bot.sendMessage(chat_id, `something went wrong while sending message`);
        }
    
    });

    const provider = ethers.getDefaultProvider(network);
    const customWsProvider = new ethers.providers.WebSocketProvider(network_wss);
    console.log("started wss connection!")

    customWsProvider.on("pending", (tx) => {
        customWsProvider.getTransaction(tx).then(function (transaction) {
            let filter = transaction ? transaction.from === address || transaction.to === address : false;
            if(filter){
                console.log(transaction);
                customWsProvider.getBalance(address).then((balance) => {
                    // convert a currency unit from wei to ether
                    const balanceInEth = ethers.utils.formatEther(balance)
                    console.log(`balance: ${balanceInEth} ETH`)
                    if(balanceInEth < leastBalance){
                        //send notification to telegram
                        try {
                            bot.sendMessage(chat_id, ` your currecnt balance is ${balanceInEth}, please add more to avoid anykind of issue`);
                        } catch (error) {
                            bot.sendMessage(chat_id, `something went wrong while sending message`);
                        }
                    }
                })
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

init();