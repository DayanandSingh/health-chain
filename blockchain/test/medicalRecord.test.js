const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MedicalRecord", function () {
  it("stores and verifies a record hash", async function () {
    const MedicalRecord = await ethers.getContractFactory("MedicalRecord");
    const medicalRecord = await MedicalRecord.deploy();
    await medicalRecord.waitForDeployment();

    const recordId = ethers.id("record-1");
    const recordHash = ethers.id("patient diagnosis hash");

    await medicalRecord.storeRecordHash(recordId, recordHash);

    expect(await medicalRecord.verifyRecord(recordId, recordHash)).to.equal(true);
    expect(await medicalRecord.verifyRecord(recordId, ethers.id("changed"))).to.equal(false);
  });
});
