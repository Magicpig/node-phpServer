var connect = require('connect');
var url = require('url');
var phpParse = require('./php-server/phpServer.js').phpParse;
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var colors = require('colors');
var path = require('path');
var rewriteModule = require('http-rewrite-middleware');
var fs = require('fs');
colors.setTheme({silly: 'rainbow', input: 'grey', verbose: 'cyan', prompt: 'grey', info: 'green',
    data: 'grey', help: 'cyan', warn: 'yellow', debug: 'blue', error: 'red'});

if (cluster.isMaster) {
    // Fork workers.
    for (var i = 0; i < numCPUs * 1; i++) {
        cluster.fork();
    }
    cluster.on('exit', function (worker, code, signal) {
        var message = 'worker ' + worker.process.pid + ' died';
        console.log(message);
    });
    process.title = 'node_ArtronNodeWebMaster'
    process.stdin.resume();
} else {
    process.title = 'node_ArtronNodeWebWorker';
    var app = connect();
    app.use(function (req, res, next) {//调试，观察处理请求的pid变化
        var err = 'process by id ' + process.pid;
        console.log(err);
        next();
    })
    app.use(connect.logger(':remote-addr - - [:date] ":method :url HTTP/:http-version" :status:res[content-length] ":referrer" ":user-agent" ":response-time"'));
    app.use(connect.compress({level: 9}));   //启动传送压缩
    app.use(connect.responseTime());  //记录执行时间
    app.use(connect.favicon());
    app.use(function (req, res, next) {
        res.setHeader('X-Server', 'Artron Static Server');
        next();
    });


    var vhostFiles = fs.readdirSync('vhost/');
    if (vhostFiles && vhostFiles.length > 0) {
        for (var i = 0; i < vhostFiles.length; i++) {
            var fileName = vhostFiles[i];
            var extName = path.extname(fileName);
            if (extName != '.js') {
                // console.log('ignore '+ fileName+' vhost file ,   is not  js file');
                continue;
            }
            var appConfig = fs.readFileSync('vhost/' + vhostFiles[i], {encoding: 'utf8'});
            try {
                eval(appConfig);
            } catch (e) {
                console.log(+' in the file ' + vhostFiles[i]);
            }
        }
    }
    app.listen(80);
}

