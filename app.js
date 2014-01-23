var connect = require('connect');
var url = require('url');
var phpParse = require('./php-server/phpServer.js').phpParse;
var cluster = require('cluster');
var path = require('path');
var rewriteModule = require('http-rewrite-middleware');
var fs = require('fs');
var config = require('./conf/serverConfig.js').config;

if (cluster.isMaster) {
    for (var i = 0; i < config.workers; i++) {
        cluster.fork();
    }
    cluster.on('exit', function(worker, code, signal) {
        var message = 'worker ' + worker.process.pid + ' died';
        console.log(message);
    });
    process.title = config.masterTitle;
} else {
    process.title = config.workTitle;
    var app = connect();
    app.use(function(req, res, next) { //调试，观察处理请求的pid变化
        // var err = 'process by id ' + process.pid;
        // console.log(err);
        next();
    })
    app.use(connect.logger(':remote-addr - - [:date] ":method :url HTTP/:http-version" :status:res[content-length] ":referrer" ":user-agent" ":response-time"'));
    app.use(connect.compress({
        level: 9
    })); //启动传送压缩
    app.use(connect.responseTime()); //记录执行时间
    app.use(connect.favicon());
    app.use(function(req, res, next) {
        res.setHeader('X-Server', 'Artron Static Server');
        next();
    });

    app.def_vhost=function(req,res,next){
       res.write(fs.readFileSync('./www/index.html'));
       res.end();
    }
    var vhostFiles = fs.readdirSync('vhost/');
    if (vhostFiles && vhostFiles.length > 0) {
        for (var i = 0; i < vhostFiles.length; i++) {
            var fileName = vhostFiles[i];
            var extName = path.extname(fileName);
            if (extName != '.js') {
                continue;
            }
            var appConfig = fs.readFileSync('vhost/' + vhostFiles[i], {
                encoding: 'utf8'
            });
            try {
                eval(appConfig);
            } catch (e) {
                console.log(+' in the file ' + vhostFiles[i]);
            }
        }
    }else{
        console.log('vhost is empty');
    }

    for (var i =0 ;i< config.listenPort.length;i++){
        app.listen(config.listenPort[i]);
    }
}