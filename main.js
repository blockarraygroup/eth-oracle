/* 
 * define ORACLE_SENDER_PRIVATE_KEY environment variable to be a private key for the sender address
 */
var tx = require('ethereumjs-tx');
var abi = require('ethereumjs-abi');
var Web3 = require('web3');
var request = require('request')

var path = require('path');
var pkg = require( path.join(__dirname, 'package.json') );
var program = require('commander');

program
    .version(pkg.version)
    .option('-u, --username', 'UPS username')
    .option('-p, --password', 'UPS password')
    .option('-l, --license', 'UPS license')
    .option('-t, --timeout <seconds>', 'Network connection timeout')
    .option('-d, --dispatch <address>', 'Address of the dispatch contract. Listening to events from here.')
    .option('-s, --sender <address>', 'Address of the sender account. Sending transactions from here.')
    .option('-w, --web3-provider <address>', 'Address of the web3 provider like https://mainnet.infura.io/API-KEY-HERE')
    .option('--web3-socket-provider <address>', 'Address of the web3 socket provider like wss://mainnet.infura.io/ws')
    .option('--gas-limit <number>', 'The GAS limit transaction setting, like 200000', parseInt)
    .option('--gas-price <number>', 'The GAS price transaction setting, like 20 in Gwei', parseInt)
    .option('--test-mode <number>', '1 for test, 0 for prod [1]', parseInt)
    .parse(process.argv);

if (program.username === undefined) {
  console.error('username is mandatory.');
  process.exit(1);
}

if (program.password === undefined) {
  console.error('password is mandatory.');
  process.exit(1);
}

if (program.license === undefined) {
  console.error('license is mandatory.');
  process.exit(1);
}

if (program.dispatch === undefined) {
  console.error('Dispatch address is mandatory.');
  process.exit(1);
}

if (program.sender === undefined) {
  console.error('Sender account is mandatory.');
  process.exit(1);
}

var opts = {
    ups_username: program.username,
    ups_password: program.password,
    ups_license_number: program.license,
    dispatch_address: program.dispatch || "0x89960f0D99a6d092633329EdD24E7680836C8547",
    sender_address: program.sender || "0x8D68583e625CAaE969fA9249502E105a21435EbF",
    sender_key: process.env["ORACLE_SENDER_PRIVATE_KEY"] || "1ce642301e680f60227b9d8ffecad474f15155b6d8f8a2cb6bde8e85c8a4809a",
    timeout: program.timeout * 1000,
    web3_provider: program["web3-provider"] || "https://ropsten.infura.io/f5UI3bjy8ssXLeKaVszM",
    web3_socket_provider: program["web3-socket-provider"] || "wss://ropsten.infura.io/ws",
    gas_limit: program["gas-limit"] || 200000,
    gas_price: (program["gas-price"] || 20) * 1000000000, // 20 Gwei
    test_mode: (program["test-mode"] || 1) === 1
};

function sendRawTx(web3, rawTx, key) {
    var privateKey = new Buffer(key, 'hex');
    var transaction = new tx(rawTx);
    transaction.sign(privateKey);
    var serializedTx = transaction.serialize().toString('hex');
    console.log(serializedTx);
    return web3.eth.sendSignedTransaction('0x' + serializedTx);
}

function process_query(query, opts, callback) {
    var url = "https://wwwcie.ups.com/rest/Track"; // test
    if (!opts.test_mode) {
        url = "https://onlinetools.ups.com/rest/Track"; // prod
    }
    var req = {
        "UPSSecurity": {
            "UsernameToken": {
                "Username": opts.ups_username,
                "Password": opts.ups_password
            },
            "ServiceAccessToken": {
                "AccessLicenseNumber": opts.ups_license_number
            }
        },
        "TrackRequest": {
            "Request": {
                "RequestOption": "1",
                "TransactionReference": {
                    "CustomerContext": "Your Test Case Summary Description"
                }
            },
            "InquiryNumber": query
        }
    };
    request({
        method: "POST",
        headers: {
            "Access-Control-Allow-Headers": "Origin, X-Requested-With,Content-Type, Accept",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
        },
        uri: url,
        json: req
    }, function (error, response, body) {
        if (error) {
            console.error(error);
            callback.call(null, error, null);
            return;
        }
        if(parseInt(response.statusCode) !== 200) {
            console.log('error code: '+ response.statusCode);
            console.log('error: '+ error);
            console.log(body);
            callback.call(null, error || body || response.statusCode, null);
            return;
        }
        callback.call(null, null, JSON.parse(body));
    });
}

var web3 = new Web3(new Web3.providers.HttpProvider(opts.web3_provider, opts.timeout));
var web3Socket = new Web3(new Web3.providers.WebsocketProvider(opts.web3_socket_provider, {timeout: opts.timeout}));

// https://ethereum.stackexchange.com/q/21048/34760
var dispatchABI = [{"anonymous":false,"inputs":[{"indexed":false,"name":"id","type":"uint256"},{"indexed":false,"name":"recipient","type":"address"},{"indexed":false,"name":"query","type":"bytes"}],"name":"Incoming","type":"event"},{"constant":false,"inputs":[],"name":"kill","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_query","type":"bytes"}],"name":"query","outputs":[{"name":"id","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"addr","type":"address"}],"name":"setResponseAddress","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"getResponseAddress","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}];
var contract = new web3Socket.eth.Contract(dispatchABI, opts.dispatch_address);
contract.events.Incoming({fromBlock: 0}, function(error, event){
    console.log("on watch"); 
    if (error) {
        console.error(error);
        return;
    }
    console.log(event);
    console.log(event.raw.data);
    
    // Just a safety check
    if (event.address !== opts.dispatch_address) {
        console.error('Event from invalid address: ' + event.address);
        return;
    }

    // Look for our event
    if (event.signature !== ('0x' + abi.eventID('Incoming', [ 'uint256', 'address', 'bytes' ]).toString('hex'))) {
        console.error('Event with invalid signature: ' + event.signature);
        return; // Not ours
    }

    // Parse non-indexed event arguments
    var data = abi.rawDecode([ 'uint256', 'address', 'bytes' ], new Buffer(event.raw.data.slice(2), 'hex'));

    var queryId = data[0];
    var sender = '0x' + data[1].toString('hex');
    var query = data[2];
    process_query(query.toString('ascii'), opts, function (error, resp) {
        if (error) {
            console.error(error);
            return;
        }
        var response = resp["TrackResponse"]["Response"]["ResponseStatus"]["Code"];
    
        console.log(data);
        console.log('Incoming request: ' + queryId.toString('hex'));
        console.log('  From: ' + sender);
        console.log('  Query: ' + query);
        console.log('  Response: ' + response);

        var tinyClientABI = [{"constant":false,"inputs":[{"name":"_id","type":"uint256"},{"name":"_response","type":"bytes"}],"name":"__tinyOracleCallback","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}];
        var contractTinyClient = new web3.eth.Contract(tinyClientABI, sender);

        web3.eth.getTransactionCount(opts.sender_address).then(function(txCount) {
            var data = contractTinyClient.methods.__tinyOracleCallback(queryId, web3.utils.asciiToHex(response)).encodeABI();
            var rawTx = {
                nonce: web3.utils.toHex(txCount),
                gasLimit: web3.utils.toHex(opts.gas_limit),
                gasPrice: web3.utils.toHex(opts.gas_price),
                to: sender,
                value: web3.utils.toHex(0),
                data: data
            };
            console.log(rawTx);
            sendRawTx(web3, rawTx, opts.sender_key).then(function(result) {
                console.log(result);
            }).catch(console.error);
        }).catch(console.error);
    });
});
