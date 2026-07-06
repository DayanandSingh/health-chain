const request = require("supertest");
const app = require("../src/app");

describe("HealthChain API", () => {
  it("returns health status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.service).toBe("healthchain-api");
  });
});

