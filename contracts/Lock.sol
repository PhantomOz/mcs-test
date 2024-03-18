// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Token} from "./Token.sol";

/// @title CrowdFund
/// @author Favour Aniogor
/// @notice A crowdfunding campaign where users can pledge and claim funds to, and claim funds from, the contract.
contract CrowdFund {
    Token private immutable i_crowdFundToken; //An ERC20 Token for crowdfunding
    mapping(address => bool) private s_projectOwners; //A map of all the Owners
    mapping(uint256 => Project) private s_idToProject; //A map of a projectId to project
    uint256 private s_id; //this serves as the projects count.

    //Oir custom datatype Project
    struct Project {
        uint256 fundingGOal;
        uint256 timeline;
    }

    ///@param _token the token address this contract will use.
    constructor(address _token) {
        i_crowdFundToken = Token(_token);
        s_projectOwners[msg.sender] = true;
    }

    /// @notice This allows project owners to create a new project
    /// @param _fundingGoal the amount the project is looking to raise
    /// @param _timeLine the time the project funding ends
    function createProject(uint256 _fundingGoal, uint256 _timeLine) external {
        Project _newProject = Project(_fundingGoal, _timeLine);
        s_idToProject[s_id] = _newProject;
    }
}
