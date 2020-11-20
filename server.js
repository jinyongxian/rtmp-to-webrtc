const NodeMediaServer = require('node-media-server');
const express = require('express');
const bodyParser = require('body-parser');
const ffmpeg = require('fluent-ffmpeg');
const MediaServer = require('./mediaserver');
const fs = require ('fs');
const app = express();


const https = require('https');

// need change is ip address
const mediaserver = new MediaServer('192.168.23.213');


app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('./'));


const baseRtmpUrl = 'rtmp://192.168.23.213/live/';

app.get('/test', async (req, res) => {
    res.send('hello world')
})

app.post('/watch/:stream', async (req, res) => {

    console.log('request body', req.body);

    let stream = req.params.stream;
    let offer = req.body.offer;

    // // If we did handle the stream yet
    if (!mediaserver.getStream(stream)) {
        await mediaserver.createStream(stream, baseRtmpUrl + stream);
    }

    let answer = await mediaserver.offerStream(stream, offer);
    console.log('answer', answer);
    res.json({answer:answer});
})
/*
app.listen(4001, function () {
    console.log('Example app listening on port 4001!\n');
    console.log('Open http://localhost:4001/');
})*/


/*
var options = {
  ca: fs.readFileSync('key/ca_bundle.crt'),
  key: fs.readFileSync('key/private.key'),
  cert: fs.readFileSync('key/certificate.crt')
};*/
const options = {
	key: fs.readFileSync ('server.key'),
	cert: fs.readFileSync ('server.cert')
};


var httpsServer = https.createServer(options, app);
httpsServer.listen(8443, function() {
    console.log('HTTPS Server is running on: https://192.168.23.213:%s', 8443);
});


const config = {
    rtmp: {
        port: 1935,
        chunk_size: 1024,
        gop_cache: true,
        ping: 60,
        ping_timeout: 30
    }
};


const nms = new NodeMediaServer(config)

nms.on('postPublish', (id, StreamPath, args) => {
    console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);

});

nms.on('donePublish', (id, StreamPath, args) => {
    console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);

    let stream = StreamPath.split('/')[2]

    if(mediaserver.getStream(stream)) {
        mediaserver.removeStream(stream);
    }

});


nms.run();


// now we need simulate a rtmp stream 

/*

ffmpeg -f lavfi -re -i color=black:s=640x480:r=15 -filter:v "drawtext=text='%{localtime\:%T}':fontcolor=white:fontsize=80:x=20:y=20" -vcodec libx264 -tune zerolatency -preset ultrafast -g 15 -keyint_min 15 -profile:v baseline -level 3.0 -pix_fmt yuv420p -r 15 -f flv rtmp://localhost/live/live

*/




