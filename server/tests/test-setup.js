const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

let replSet;

module.exports = {
  mochaHooks: {
    async beforeAll() {
      this.timeout(20000);
      replSet = await MongoMemoryReplSet.create({
        replSet: { name: "rs0", count: 1, storageEngine: "wiredTiger" },
      });
      await mongoose.connect(replSet.getUri(), { dbName: "testdb" });
    },
    async afterAll() {
      await mongoose.disconnect();
      await replSet.stop();
    },
  },
};
