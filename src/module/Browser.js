"use strict";
const puppeteer = require("puppeteer");
const fs = require("fs");
const { FingerprintGenerator } = require("fingerprint-generator");
const { newInjectedPage, newInjectedContext } = require("fingerprint-injector");
let useFingerprint = false;

const exexPathLinux = "/usr/bin/google-chrome";
const execPathWind = "C:\\Users\\ASUS\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe";
const isLinux = process.platform == "linux";

class Webdriver {
    constructor(user, args, useInjectFingerPrint = false, headless = false) {
        this.user = user;
        this.profilePath = null;
        this.config = args ?? {
            executablePath: isLinux ? exexPathLinux : execPathWind,
            headless: headless ? "new" : false,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--start-maximized"],
        };

        if (useInjectFingerPrint) {
            useFingerprint = true;
        }
    }

    async launchBrowser() {
        try {
            console.log(`Launching browser for ${this.user}`);
            this.profilePath = `${rootDir}/profile/${this.user}`;
            this.config.userDataDir = this.profilePath;
            this.config.product = "chrome";

            this.config.defaultViewPort = {
                width: 1600,
                height: 1080,
            };
            const fingerprintGenerator = new FingerprintGenerator({
                devices: ["desktop"],
                mockWebRTC: true,
                slim: true,
                browsers: ["firefox", "chrome"],
                operatingSystems: ["linux"],
            });
            const { fingerprint, headers } = fingerprintGenerator.getFingerprint();
            this.browsers = await puppeteer.launch(this.config);
            if (useFingerprint) {
                this.page = await newInjectedPage(this.browsers, {
                    fingerprint: {
                        fingerprint: fingerprint,
                        headers: headers,
                    },
                });
            } else {
                const [page] = await this.browsers.pages();
                this.page = page;
            }

            await this.page.setViewport({ width: 1600, height: 1080 });
            return this.page;
        } catch (error) {
            console.log(`[INFO] Gagal membuka browser:`, error);
            throw error;
        }
    }

    async closeBrowser() {
        try {
            console.log(`Closing browser for ${this.user}`);
            // const client = await this.page.target().createCDPSession();
            // await client.send("Network.clearBrowserCookies");
            // await client.send("Network.clearBrowserCache");

            await this.browsers.close();
        } catch (error) {
            console.error("[INFO] Gagal menutup browser atau membersihkan data:", error);
        }
    }
}

module.exports = Webdriver;
