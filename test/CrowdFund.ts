import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("CrowdFund", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployCrowdFund() {
    const NAME = "CROWDFUND TOKEN";
    const SYMBOL = "CFT";
    const TOTAL_SUPPLY = 1_000_000_000;

    const [owner, otherAccount] = await hre.ethers.getSigners();

    const CFT = await hre.ethers.getContractFactory("Token");
    const cft = await CFT.deploy(NAME, SYMBOL, TOTAL_SUPPLY);

    const CrowdFund = await hre.ethers.getContractFactory("CrowdFund");
    const crowdFund = await CrowdFund.deploy(cft.target);

    return { crowdFund, cft, owner, otherAccount };
  }

  describe("CreateProject", function () {
    it("Should revert with the CrowdFund__NotAOwner error", async function () {
      const { crowdFund, otherAccount } = await loadFixture(deployCrowdFund);
      const timeLine = (await time.latest()) + 100000000;
      await expect(
        crowdFund.connect(otherAccount).createProject(1000, timeLine)
      ).to.be.revertedWithCustomError(crowdFund, "CrowdFund__NotAOwner");
    });
    it("Should revert with the CrowdFund__FundingGoalCantBeZero error", async function () {
      const { crowdFund } = await loadFixture(deployCrowdFund);
      const timeLine = (await time.latest()) + 100000000;
      await expect(
        crowdFund.createProject(0, timeLine)
      ).to.be.revertedWithCustomError(
        crowdFund,
        "CrowdFund__FundingGoalCantBeZero"
      );
    });
    it("Should revert with the CrowdFund__TimeLineNotInTheFuture error", async function () {
      const { crowdFund } = await loadFixture(deployCrowdFund);
      const timeLine = await time.latest();
      await expect(
        crowdFund.createProject(1000, timeLine)
      ).to.be.revertedWithCustomError(
        crowdFund,
        "CrowdFund__TimeLineNotInTheFuture"
      );
    });
    it("Should create new project", async function () {
      const { crowdFund, owner } = await loadFixture(deployCrowdFund);
      const timeLine = (await time.latest()) + 10000000;
      await expect(crowdFund.createProject(1000, timeLine))
        .to.emit(crowdFund, "CreateProject")
        .withArgs(owner.address, 0, 1000);
      await expect((await crowdFund.getProject(0))[0]).to.be.equal(1000n);
    });
  });

  describe("Fund Project", function () {
    it("Should revert with the CrowdFund__ProjectDoesNotExist error", async function () {
      const { crowdFund, otherAccount } = await loadFixture(deployCrowdFund);
      const timeLine = (await time.latest()) + 100000000;
      await crowdFund.createProject(1000, timeLine);
      await time.increase(100000000000000);
      await expect(crowdFund.connect(otherAccount).fundProject(1, 100))
        .to.be.revertedWithCustomError(
          crowdFund,
          "CrowdFund__ProjectDoesNotExist"
        )
        .withArgs(1);
    });
    it("Should revert with the CrowdFund__TimelineElapsed error", async function () {
      const { crowdFund, otherAccount } = await loadFixture(deployCrowdFund);
      const timeLine = (await time.latest()) + 100000000;
      await crowdFund.createProject(1000, timeLine);
      await time.increase(100000000000000);
      await expect(
        crowdFund.connect(otherAccount).fundProject(0, 100)
      ).to.be.revertedWithCustomError(crowdFund, "CrowdFund__TimelineElapsed");
    });
    it("Should revert with the CrowdFund__AmountCantBeZero error", async function () {
      const { crowdFund, otherAccount } = await loadFixture(deployCrowdFund);
      const timeLine = (await time.latest()) + 100000000;
      await crowdFund.createProject(1000, timeLine);
      await expect(
        crowdFund.connect(otherAccount).fundProject(0, 0)
      ).to.be.revertedWithCustomError(crowdFund, "CrowdFund__AmountCantBeZero");
    });
    it("Should revert with the CrowdFund__InsufficientBalance error", async function () {
      const { crowdFund, otherAccount } = await loadFixture(deployCrowdFund);
      const timeLine = (await time.latest()) + 100000000;
      await crowdFund.createProject(1000, timeLine);
      await expect(
        crowdFund.connect(otherAccount).fundProject(0, 100)
      ).to.be.revertedWithCustomError(
        crowdFund,
        "CrowdFund__InsufficientBalance"
      );
    });
    it("Should fund project succesfully", async function () {
      const { crowdFund, owner, cft } = await loadFixture(deployCrowdFund);
      const timeLine = (await time.latest()) + 100000000;
      await crowdFund.createProject(1000, timeLine);
      await cft.approve(crowdFund.target, 100);
      await expect(crowdFund.fundProject(0, 100))
        .to.emit(crowdFund, "FundProject")
        .withArgs(owner.address, 0, 100);
      await expect(
        await crowdFund.getFundsPledgeByOwner(0, owner.address)
      ).to.be.eql(100n);
      await expect(await crowdFund.getProjectBalance(0)).to.be.eql(100n);
    });
  });

  describe("Recover Funds", function () {
    it("Should revert with CrowdFund__ProjectDoesNotExist error", async function () {
      const { crowdFund, owner, cft } = await loadFixture(deployCrowdFund);
      const timeLine = (await time.latest()) + 100000000;
      await crowdFund.createProject(1000, timeLine);
      await cft.approve(crowdFund.target, 100);
      await crowdFund.fundProject(0, 100);
      await expect(crowdFund.recoverFunds(1))
        .to.be.revertedWithCustomError(
          crowdFund,
          "CrowdFund__ProjectDoesNotExist"
        )
        .withArgs(1);
    });
    it("Should revert with CrowdFund__TimelineNotElapsed error", async function () {
      const { crowdFund, owner, cft } = await loadFixture(deployCrowdFund);
      const timeLine = (await time.latest()) + 100000000;
      await crowdFund.createProject(1000, timeLine);
      await cft.approve(crowdFund.target, 100);
      await crowdFund.fundProject(0, 100);
      await expect(crowdFund.recoverFunds(0)).to.be.revertedWithCustomError(
        crowdFund,
        "CrowdFund__TimelineNotElapsed"
      );
    });
    it("Should revert with CrowdFund__FundingGoalMet error", async function () {
      const { crowdFund, owner, cft } = await loadFixture(deployCrowdFund);
      const timeLine = (await time.latest()) + 100000000;
      await crowdFund.createProject(1000, timeLine);
      await cft.approve(crowdFund.target, 1000);
      await crowdFund.fundProject(0, 1000);
      await time.increase(100000000);
      await expect(crowdFund.recoverFunds(0)).to.be.revertedWithCustomError(
        crowdFund,
        "CrowdFund__FundingGoalMet"
      );
    });

    it("Should recoverfunds successfully", async function () {
      const { crowdFund, owner, cft } = await loadFixture(deployCrowdFund);
      const timeLine = (await time.latest()) + 100000000;
      await crowdFund.createProject(1000, timeLine);
      await cft.approve(crowdFund.target, 100);
      await crowdFund.fundProject(0, 100);
      await time.increase(100000000);
      await expect(crowdFund.recoverFunds(0))
        .to.emit(crowdFund, "RecoveredFunds")
        .withArgs(owner.address, 0, 100);
    });
  });

  describe("Add Project Owner", function () {
    it("Should revert with CrowdFund__NotAOwner error", async function () {
      const { crowdFund, otherAccount } = await loadFixture(deployCrowdFund);
      await expect(
        crowdFund
          .connect(otherAccount)
          .addProjectOwner(await ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(crowdFund, "CrowdFund__NotAOwner");
    });

    it("Should revert with CrowdFund__OwnerCantBeZeroAddress error", async function () {
      const { crowdFund } = await loadFixture(deployCrowdFund);
      await expect(
        crowdFund.addProjectOwner(await ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(
        crowdFund,
        "CrowdFund__OwnerCantBeZeroAddress"
      );
    });

    it("Should revert with CrowdFund__OwnerCantBeZeroAddress error", async function () {
      const { crowdFund, otherAccount, owner } = await loadFixture(
        deployCrowdFund
      );
      await expect(crowdFund.addProjectOwner(otherAccount))
        .to.emit(crowdFund, "NewProjectOwner")
        .withArgs(otherAccount.address, owner.address);
    });
  });

  describe("View Function Errors", function () {
    it("Should revert with CrowdFund__ProjectDoesNotExist error", async function () {
      const { crowdFund } = await loadFixture(deployCrowdFund);
      await expect(crowdFund.getProject(1))
        .to.be.revertedWithCustomError(
          crowdFund,
          "CrowdFund__ProjectDoesNotExist"
        )
        .withArgs(1);
    });
    it("Should create new project", async function () {
      const { crowdFund } = await loadFixture(deployCrowdFund);
      const timeLine = (await time.latest()) + 10000000;
      await crowdFund.createProject(1000, timeLine);
      await expect((await crowdFund.getProject(0))[0]).to.be.equal(1000n);
      await expect((await crowdFund.getProject(0))[1]).to.be.equal(
        BigInt(timeLine)
      );
    });
    it("Should revert with CrowdFund__ProjectDoesNotExist error", async function () {
      const { crowdFund } = await loadFixture(deployCrowdFund);
      await expect(crowdFund.getProjectBalance(1))
        .to.be.revertedWithCustomError(
          crowdFund,
          "CrowdFund__ProjectDoesNotExist"
        )
        .withArgs(1);
    });
    it("Should revert with CrowdFund__ProjectDoesNotExist error", async function () {
      const { crowdFund, owner } = await loadFixture(deployCrowdFund);
      await expect(crowdFund.getFundsPledgeByOwner(1, owner))
        .to.be.revertedWithCustomError(
          crowdFund,
          "CrowdFund__ProjectDoesNotExist"
        )
        .withArgs(1);
    });
  });
});
