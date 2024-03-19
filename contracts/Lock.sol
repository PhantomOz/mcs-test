// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Token} from "./Token.sol";

error CrowdFund__NotAOwner();
error CrowdFund__TimeLineNotInTheFuture();
error CrowdFund__FundingGoalCantBeZero();
error CrowdFund__ProjectDoesNotExist(uint256 id);
error CrowdFund__AmountCantBeZero();
error CrowdFund__InsufficientBalance();
error CrowdFund__TimelineNotElapsed();
error CrowdFund__TimelineElapsed();
error CrowdFund__FundingGoalMet();
error CrowdFund__OwnerCantBeZeroAddress();

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

    /// @notice Emits this event when a project Owner creates a new project.
    /// @param _owner the project owner that created the project.
    /// @param _id the id of the project that is created.
    /// @param _fundingGoal the funding goal of the project that is created.
    event CreateProject(
        address indexed _owner,
        uint256 indexed _id,
        uint256 indexed _fundingGoal
    );

    /// @notice Emits this event when a project is funded by a user
    /// @param _donor the user funding the project.
    /// @param _id the id of the project that is being funded
    /// @param _amount the amount user is funding the project with
    event FundProject(
        address indexed _donor,
        uint256 indexed _id,
        uint256 indexed _amount
    );

    /// @notice Emits this when a user recover the funds he has pledged to a project.
    /// @param _donor the user recovering the fund.
    /// @param _id the id of the project the funds is being recovered from.
    /// @param _amount the amount being recovered by the user.
    event RecoveredFunds(
        address indexed _donor,
        uint256 indexed _id,
        uint256 indexed _amount
    );

    /// @notice Emits this when a project owner adds a new owner
    /// @param _newOwner the user being adde3d as a owner
    /// @param _projectOwner the project owner that added the user
    event NewProjectOwner(
        address indexed _newOwner,
        address indexed _projectOwner
    );

    ///@notice custom datatype Project
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
        emit CreateProject(msg.sender, s_id, _fundingGoal);
        s_id++;
    }

    ///@notice This allows users to fund project that have been created and timeline has not exceeded
    ///@param _id the id of the project you want to fund
    ///@param _amount the value to want to fund the project with.
    function fundProject(
        uint256 _id,
        uint256 _amount
    ) external projectExist(_id) {
        if (s_idToProject[_id].timeline >= block.timestamp) {
            revert CrowdFund__TimelineElapsed();
        }
        if (_amount <= 0) {
            revert CrowdFund__AmountCantBeZero();
        }
        if (i_crowdFundToken.balanceOf(msg.sender) < _amount) {
            revert CrowdFund__InsufficientBalance();
        }
        i_crowdFundToken.transferFrom(msg.sender, address(this), _amount);
        s_projectIdToBalance[_id] += _amount;
        s_addressToAmountFunded[msg.sender][_id] += _amount;
        emit FundProject(msg.sender, _id, _amount);
    }

    ///@notice This allows users to be able to withdraw their funds if the timeline of a project elapses and the goal is not met
    ///@param _id the project you want to recover your funds from.
    function recoverFunds(uint256 _id) external projectExist(_id) {
        if (s_idToProject[_id].timeline < block.timestamp) {
            revert CrowdFund__TimelineNotElapsed();
        }
        if (s_projectIdToBalance[_id] >= s_idToProject[_id].fundingGoal) {
            revert CrowdFund__FundingGoalMet();
        }
        uint256 _balance = s_addressToAmountFunded[msg.sender][_id];
        s_addressToAmountFunded[msg.sender][_id] = 0;
        s_projectIdToBalance[_id] -= _balance;
        i_crowdFundToken.transfer(msg.sender, _balance);
        emit RecoveredFunds(msg.sender, _id, _amount);
    }

    ///@notice This allows a project owner add more project owners
    ///@param _newOwner the user address that is to be added to owners map
    function addProjectOwner(address _newOwner) external onlyOwners {
        if (_newOwner == address(0)) {
            revert CrowdFund__OwnerCantBeZeroAddress();
        }
        s_projectOwners[_newOwner] = true;
        emit NewProjectOwner(_newOwner, msg.sender);
    }

    ///@notice This is a view function to get project by Id
    ///@param _id this is the id of the project you want to get
    function getProject(
        address _id
    )
        external
        view
        projectExist(_id)
        returns (uint256 fundingGOal, uint256 timeline)
    {
        (fundingGOal, timeline) = s_idToProject[_id];
    }
}
