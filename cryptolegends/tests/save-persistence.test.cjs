const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const values = new Map();
global.localStorage = {
  getItem(key) {
    return values.has(key) ? values.get(key) : null;
  },
  setItem(key, value) {
    values.set(key, String(value));
  }
};

global.window = {
  CryptoApex: {
    nft: { state: { publicKeyString: null, publicKey: null } },
    missions: {
      state: {
        phaseIndex: 0,
        phaseTime: 0,
        totalTime: 0,
        lessonSeen: {}
      }
    },
    ui: {}
  }
};

const source = fs.readFileSync(path.join(__dirname, "..", "js", "economy.js"), "utf8");
vm.runInThisContext(source, { filename: "economy.js" });

const economy = window.CryptoApex.economy;
const wallet = "WalletPersistenceTest11111111111111111111111";

economy.state.cred = 900;
economy.state.lifetimeCred = 900;
economy.saveGame(null, wallet);

window.CryptoApex.nft.state.publicKeyString = wallet;
economy.state.cred = 25;
economy.state.lifetimeCred = 25;
economy.saveGame(null, "local-player");

const walletBeforeMigration = JSON.parse(values.get(`cryptoLegends.save.v3.${wallet}`));
assert.equal(walletBeforeMigration.economy.lifetimeCred, 900);
assert.equal(economy.migrateLocalSaveToWallet(wallet), false);

const walletAfterMigration = JSON.parse(values.get(`cryptoLegends.save.v3.${wallet}`));
assert.equal(walletAfterMigration.economy.lifetimeCred, 900);

economy.state.cred = 1200;
economy.state.lifetimeCred = 1200;
economy.saveGame(null, "local-player");
assert.equal(economy.migrateLocalSaveToWallet(wallet), true);

const upgradedWallet = JSON.parse(values.get(`cryptoLegends.save.v3.${wallet}`));
assert.equal(upgradedWallet.wallet, wallet);
assert.equal(upgradedWallet.economy.lifetimeCred, 1200);

console.log("save-persistence-ok");
