const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const fs = require('fs');
const request = require('request');
const mime = require('mime-types');


let isProduction = process.env.NODE_ENV === 'production';
let PORT = isProduction ? '/tmp/nginx.socket' : 8080;
let callbackFn = () => {
    if (isProduction) {
        fs.closeSync(fs.openSync('/tmp/app-initialized', 'w'));
    }

    console.log(`Listening on ${PORT}`);
};


const utils = require('./modules/utils');


const app = express();
app.enable("trust proxy", 1);
app.use(helmet());
app.use(compression());

app.get('/', async (req, res) => {
    try {
        let targetUrl = new URL(Buffer.from(req.query.url, 'base64').toString('ascii'));

        let { isOk, headers } = await utils.checkAvailability({ url: targetUrl.href });

        if (!isOk) {
            return res.status(400).json({ success: false, reason: "Non200StatusCode" });
        }

        let contentTypeHeaderExists = headers.hasOwnProperty('content-type');

        if (contentTypeHeaderExists) {
            let contentType = headers["content-type"];

            let filename = 'download.' + ( mime.extension(contentType) || 'unknown' );

            res.status(200);
            res.set({
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename=${filename}`
            });

            return request({ method: 'GET', uri: targetUrl.href }).pipe(res);

        } else {
            return res.status(400).json({ success: false, reason: "NoValidHeaders" });
        }

    } catch (e) {
        return res.status(400).json({ success: false, reason: "InvalidURL" });
    }
});

app.listen(PORT, callbackFn);
