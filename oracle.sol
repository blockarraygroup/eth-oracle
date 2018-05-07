pragma solidity ^0.4.18;

/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
    
  address public owner;

  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  constructor() public {
    owner = msg.sender;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) onlyOwner public {
    require(newOwner != address(0));      
    owner = newOwner;
  }

}

contract TinyOracle is Ownable {
  // TODO: adjust this address in prod
  address responseAddress = 0x8D68583e625CAaE969fA9249502E105a21435EbF;
  event Incoming(uint256 id, address recipient, bytes query);

  function query(bytes _query) external returns (uint256 id) {
    id = uint256(keccak256(block.number, now, _query, msg.sender));
    emit Incoming(id, msg.sender, _query);
  }

  function setResponseAddress(address addr) public onlyOwner {
    responseAddress = addr;
  }

  function getResponseAddress() public constant returns (address) {
    return responseAddress;
  }

  function kill() public onlyOwner {
    selfdestruct(msg.sender);
  }
}
