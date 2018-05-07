pragma solidity ^0.4.18;

//
// An example client calling our oracle service
//

import "api.sol";

contract SampleClient is usingTinyOracle {
  bytes public response;
  uint256 public theid;

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
