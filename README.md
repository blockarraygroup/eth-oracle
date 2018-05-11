# ups-oracle

The Ethereum oracle for UPS.com

# Deploy

```
npm install
```

# Run

```
export ORACLE_SENDER_PRIVATE_KEY=1ce642301e680f60227b9d8ffecad474f15155b6d8f8a2cb6bde8e85c8a4809a
node main.js -u 'UPS-ACCOUNT' -p 'UPS-PASSWORD' -l 'UPS-LICENSE' --dispatch 0x89960f0D99a6d092633329EdD24E7680836C8547 --sender 0x8D68583e625CAaE969fA9249502E105a21435EbF
```

The `dispatch` address is an address of the `TinyOracle` contract deployed.
In the example the `0x89960f0D99a6d092633329EdD24E7680836C8547` address is a contract deployed in the Ropsten network.

The `sender` address is an address from which callback function would be called. In this example the publicly known address `0x8D68583e625CAaE969fA9249502E105a21435EbF` is used. It has some Ropsten Ether on a balance for tests.

# Test

1. Choose ropsten network in your MetaMask wallet.
2. Cop the code below to the https://remix.ethereum.org editor and compile:


```
pragma solidity ^0.4.18;

//
// This is the API file to be included by a user of this oracle
//

// This must match the signature in dispatch.sol
contract TinyOracle {
  function query(bytes _query) external returns (uint256 id);
  function getResponseAddress() public constant returns (address);
}

// The actual part to be included in a client contract
contract usingTinyOracle {
  address constant tinyOracle = 0x89960f0D99a6d092633329EdD24E7680836C8547;

  modifier onlyFromTinyOracle {
    TinyOracle tiny = TinyOracle(tinyOracle);
    require (msg.sender == tiny.getResponseAddress());
    _;
  }

  function queryTinyOracle(bytes _query) internal returns (uint256 id) {
    TinyOracle tiny = TinyOracle(tinyOracle);
    id = tiny.query(_query);
  }
}

contract SampleClient is usingTinyOracle {
  bytes public response;
  uint256 theid;

  function __tinyOracleCallback(uint256 _id, bytes _response) onlyFromTinyOracle external {
    response = _response;
    theid = _id;
  }

  function query() public {
    string memory tmp = "hello world";
    query(bytes(tmp));
  }

  function query(bytes _query) public {
    queryTinyOracle(_query);
  }
}
```

Go to the `Run` tab, choose SampleClient in a dropdown list, Enter the `0x42fb9ee41AE8c6Bd33Ac3C1B3058D0Eb2980f183` address into the `At Address` field and press the `At Address` button

Call the `query` method without parameters to test tracking not found behavior.

Call the `query` method with parameter `0x315a31323334354530323035323731363838` to test tracking found behavior.
