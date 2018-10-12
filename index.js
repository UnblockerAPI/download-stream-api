const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const fs = require('fs');
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

        let { isOk, headers } = await utils.checkAvailability(targetUrl.href);
        if (!isOk) {
            return res.status(400).json({ success: false, reason: "Non200StatusCode" });
        }

        let contentType = headers["content-type"] || 'application/octet-stream';
        let filename = 'download.' + ( mime.extension(contentType) || 'bin' );

        res.status(200);
        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`
        });

        return utils.streamFile({ writableStream: res, file: targetUrl.href });

    } catch (e) {
        return res.status(400).json({ success: false, reason: "InvalidURL" });
    }
});

app.listen(PORT, callbackFn);
