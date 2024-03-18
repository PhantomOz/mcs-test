// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Token} from "./Token.sol";

/// @title CrowdFund
/// @author Favour Aniogor
/// @notice A crowdfunding campaign where users can pledge and claim funds to, and claim funds from, the contract.
contract CrowdFund {
    Token private immutable i_crowdFundToken; //An ERC20 Token for crowdfunding
    mapping(address => bool) private s_projectOwners; //A map of all the Owners

    struct Project {
        uint256 fundingGOal;
        uint256 timeline;
    }

    ///@param _token the token address this contract will use.
    constructor(address _token) {
        i_crowdFundToken = Token(_token);
    }
}
