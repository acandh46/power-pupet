global.rootDir = __dirname;
const Power = require("./module/Power");
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

global.rootDir = __dirname;
let work = [];
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/gulai", async (req, res) => {
    const { url, user, password, pin } = req.body;
    let response = {
        status: false,
        msg: null,
        data: null,
    };
    if (!url || !user || !password || !pin) {
        return res.json({
            status: true,
            message: "Please fill all fields",
        });
    }

    const check = work.find((item) => item.user === user);
    if (!check) {
        const powerku = new Power(url, user, password, pin);
        const newData = {
            user: user,
            powerku: powerku,
        };
        work.push(newData);
        const image = await powerku.run();
        response = image;
    } else {
        const powerku = check.powerku;
        console.log(powerku);
        if (powerku.isLogined) {
            response.status = true;
            response.msg = "Login Success";
            response.data = powerku.cook;
        } else {
            response.data = powerku.captcha;
        }
    }

    return res.json(response);
});

app.post("/otp", async (req, res) => {
    const { user, otp } = req.body;
    let response = {
        status: false,
        msg: null,
        data: null,
    };

    if (!user || !otp) {
        return res.json({
            status: true,
            message: "Please fill all fields",
        });
    }

    try {
        const check = work.find((item) => item.user === user);
        if (check) {
            const powerku = check.powerku;
            const sendOtp = await powerku.sendOtp(otp);
            response.status = true;
            response = sendOtp;
        } else {
            console.log(check);
        }
    } catch (error) {
        response.error = error.message;
    }
    res.json(response);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
