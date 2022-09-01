const ethers = require('ethers');
require('dotenv').config()
const network_wss = process.env.BLOCKCHAIN_WSS; //reading from env (using rinkeby testnet wss)
const address = process.env.WALLET_ADDRESS || ""; //reading wallet from env for which we want to listen for Tx)
const customWsProvider = new ethers.providers.WebSocketProvider(network_wss);
const contractAddress = process.env.CONTRACT_ADDRESS;
const ABI =[
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "signature",
				"type": "string"
			}
		],
		"name": "storeSignature",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_higherAuthority",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "sigMapping",
		"outputs": [
			{
				"internalType": "string",
				"name": "signature",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]
const contractInsatance = new ethers.Contract(contractAddress, ABI, customWsProvider)
/**
 * 1st scenario where an ERP systems docs need signature from external entity and when this external entity signs a docs
 * (assuming) our ERP system calls a POST endpoint of this sample app which takes Signature as parameter
 */
const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

// Where we will keep books
let books = [];

app.use(cors());

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/signature', (req, res) => {
    const signature = req.body;

    contractInsatance.storeSignature(signature).then( res => {
        console.log("printing res: ",res)
    })

    res.send("successfully submitted signature as proof on blockchain")

    // We will be coding here
});

app.listen(port, () => console.log(`app listening on port ${port}!`));



/**
 * 2nd scenario where a wallet address signs a transction and submits to network, this will listen for Tx and get a signature
 * from it and submits this signature on blockchain as proof
 */

var init = function() {
    console.log("started wss connection!")

    //incoming transaction handler
    customWsProvider.on("pending", (tx) => {
        customWsProvider.getTransaction(tx).then(function (transaction) {
            let filter = transaction ? transaction.from === address || transaction.to === address : false;
            if(filter){

                contractInsatance.storeSignature(transaction).then( res => {
                    console.log("printing res: ",res)
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