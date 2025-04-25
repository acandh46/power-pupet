"use strict";
const Browser = require("./Browser");
const fs = require("fs");

const isLinux = process.platform == "linux";

const sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

class PowerSelector {
    static get LOGIN() {
        return {
            username: "#inputUsername",
            password: "#inputPassword",
            captcha: "#captcha",
            inputCaptcha: "#inputCaptcha",
            pin: ".pins",
        };
    }

    static get HomePage() {
        return {
            sdebar: "#notificationBar",
        };
    }
}

class Power extends Browser {
    constructor(url, user, password, pin) {
        super(user, null, true, false);
        this.url = url;
        this.user = user;
        this.password = password;
        this.pin = pin;
        this.loadBrowser = false;
        this.captcha = null;
        this.isLogined = false;
        this.cook = null;
    }
    async initialize() {
        try {
            if (!this.loadBrowser) {
                console.log(`Launch browser for ${this.user}`);
                await this.launchBrowser();
                this.loadBrowser = true;
            }
        } catch (error) {
            console.error(error);
        }
    }

    async run() {
        let response = {
            status: false,
            msg: null,
            data: null,
        };
        await this.initialize();
        try {
            await this.page.goto(this.url, { waitUntil: "domcontentloaded" });

            const isLogined = await this.checkIsLogined();
            if (isLogined) {
                const cook = await this.getCookies();
                this.isLogined = true;
                response.msg = "Berhasil login";
                response.status = true;
                response.data = cook;
                await this.closeBrowser();
                return response;
            }

            const execLogin = await this.login();
            if (execLogin) {
                response.msg = "Success Get Captcha";
                response.data = this.captcha;
            }
        } catch (error) {
            response.error = error.message;
        }
        return response;
    }
    //_____________________________________________________________________________________________________________

    async login() {
        console.log(`[Power] Login ${this.user}...`);
        try {
            await this.page.waitForSelector(PowerSelector.LOGIN.captcha, { visible: true });
            const captchaElement = await this.page.$(PowerSelector.LOGIN.captcha);
            const captchaScreenshot = await captchaElement.screenshot({
                encoding: "base64",
            });
            this.captcha = `data:image/png;base64,${captchaScreenshot}`;
            await this.page.type(PowerSelector.LOGIN.username, this.user, { delay: 100 });
            await this.page.type(PowerSelector.LOGIN.password, this.password, { delay: 100 });

            return this.captcha;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    async checkIsLogined() {
        try {
            const isHasNotif = await this.page.$(PowerSelector.HomePage.sdebar, { visible: true });
            if (isHasNotif) return true;
            return false;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    //_____________________________________________________________________________________________________________
    async sendOtp(otp) {
        console.log(`[Power] Send Otp ${this.user}...`);
        try {
            if (otp.length !== 4) return { status: false, msg: "OTP must be 4 digits", data: null };

            await this.page.waitForSelector(PowerSelector.LOGIN.inputCaptcha, { visible: true });
            await this.page.type(PowerSelector.LOGIN.inputCaptcha, otp, { delay: 100 });
            await this.page.keyboard.press("Enter");

            await sleep(4000);

            await this.page.waitForSelector("iframe#pin", { visible: true, timeout: 5000 });

            const iframeEl = await this.page.$("iframe#pin");
            if (iframeEl) {
                const frame = await iframeEl.contentFrame();
                if (!frame) return { msg: "Captcha not found", data: null };

                const pin = this.pin.split("");
                let buttonFound = false;
                await frame.waitForSelector("#keypad button.num", { visible: true, timeout: 10000 });
                const allKeypad = await frame.$$("#keypad button.num");
                console.log(`[Power] Jumlah tombol angka yang ditemukan: ${allKeypad.length}`);

                for (const digit of pin) {
                    for (const keypad of allKeypad) {
                        const text = await frame.evaluate((button) => button.textContent, keypad);
                        if (text === digit) {
                            await keypad.click();
                            buttonFound = true;
                            break;
                        }
                    }
                    if (!buttonFound) return { status: false, msg: "Pin not found", data: null };
                    buttonFound = false;
                }

                await this.page.waitForNavigation({ waitUntil: "domcontentloaded" });
                const url = this.page.url();
                const cook = await this.getCookies();
                if (url.includes("adminarea")) {
                    this.isLogined = true;
                    this.loadBrowser = false;
                    await this.closeBrowser();
                    return { status: true, msg: "Berhasil login", data: this.cook };
                }
                return { status: false, msg: "Gagal login", data: null };
            } else {
                return { status: false, msg: "Captcha not found", data: null };
            }
        } catch (error) {
            return { status: false, msg: error.message, data: null };
        }
    }
    //_____________________________________________________________________________________________________________

    async getCookies() {
        try {
            let cook = "";
            const cookies = await this.page.cookies();
            for (const cookie of cookies) {
                cook += `${cookie.name}=${cookie.value};`;
            }
            this.cook = cook;
            return cook;
        } catch (error) {
            console.error(error);
            this.cook = null;
        }
    }
}

module.exports = Power;
