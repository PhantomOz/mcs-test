import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

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
    });
  });

  describe("Fund Project", function () {
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
    });
  });
});
