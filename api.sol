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
  // TODO: adjust this address in prod
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
