pragma solidity>=0.7.0 <0.9.0;

contract StoreSignature {
    address private higherAuthority;
    uint private counter = 1;

    constructor(address _higherAuthority){
        higherAuthority = _higherAuthority;
    }
    struct SigMetaData{
        string signature;
        uint256 timestamp;
    }
    mapping(address => mapping(uint => SigMetaData)) public sigMapping;
        
    function storeSignature(string memory signature) external {
        require(higherAuthority == msg.sender, "Only Owner can call this function");
        uint localCounter = counter;
        SigMetaData storage temp = sigMapping[msg.sender][localCounter];
        temp.signature = signature;
        temp.timestamp = block.timestamp;
        counter++;
    }
}