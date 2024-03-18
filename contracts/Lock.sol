// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Token} from "./Token.sol";

error CrowdFund__NotAOwner();
error CrowdFund__TimeLineNotInTheFuture();
error CrowdFund__FundingGoalCantBeZero();
error CrowdFund__ProjectDoesNotExist(uint256 id);
error CrowdFund__AmountCantBeZero();
error CrowdFund__InsufficientBalance();

/// @title CrowdFund
/// @author Favour Aniogor
/// @notice A crowdfunding campaign where users can pledge and claim funds to, and claim funds from, the contract.
contract CrowdFund {
    Token private immutable i_crowdFundToken; //An ERC20 Token for crowdfunding
    mapping(address => bool) private s_projectOwners; //A map of all the Owners
    mapping(uint256 => Project) private s_idToProject; //A map of a projectId to project
    mapping(uint256 => uint256) private s_projectIdToBalance; //A map of the projectId to the amount it has be funded(balance)
    mapping(address => mapping(uint256 => uint256))
        private s_addressToAmountFunded; //A 2D Map of the address of a user to the amount donated to a projectId.
    uint256 private s_id; //this serves as the projects count.

    //Oir custom datatype Project
    struct Project {
        uint256 fundingGOal;
        uint256 timeline;
    }

    ///@notice This checks and ensures the msg.sender is a owner
    modifier onlyOwners() {
        if (!s_projectOwners[msg.sender]) {
            revert CrowdFund__NotAOwner();
        }
        _;
    }

    ///@notice This checks and ensures if the project exists.
    modifier projectExist(uint256 _id) {
        if (_id >= s_id) {
            revert CrowdFund__ProjectDoesNotExist(_id);
        }
        _;
    }

    ///@param _token the token address this contract will use.
    constructor(address _token) {
        i_crowdFundToken = Token(_token);
        s_projectOwners[msg.sender] = true;
    }

    /// @notice This allows project owners to create a new project
    /// @param _fundingGoal the amount the project is looking to raise
    /// @param _timeLine the time the project funding ends
    function createProject(
        uint256 _fundingGoal,
        uint256 _timeLine
    ) external onlyOwners {
        if (_fundingGoal <= 0) {
            revert CrowdFund__FundingGoalCantBeZero();
        }
        if (_timeLine <= block.timestamp) {
            revert CrowdFund__TimeLineNotInTheFuture();
        }
        Project _newProject = Project(_fundingGoal, _timeLine);
        s_idToProject[s_id] = _newProject;
        s_id++;
    }

    ///@notice This allows users to fund project that have been created and timeline has not exceeded
    ///@param _id the id of the project you want to fund
    ///@param _amount the value to want to fund the project with.
    function fundProject(
        uint256 _id,
        uint256 _amount
    ) external projectExist(_id) {
        if (_amount <= 0) {
            revert CrowdFund__AmountCantBeZero();
        }
        if (i_crowdFundToken.balanceOf(msg.sender) < _amount) {
            revert CrowdFund__InsufficientBalance();
        }
        i_crowdFundToken.transferFrom(msg.sender, address(this), _amount);
        s_projectIdToBalance[_id] += _amount;
        s_addressToAmountFunded[msg.sender][_id] += _amount;
    }
}
