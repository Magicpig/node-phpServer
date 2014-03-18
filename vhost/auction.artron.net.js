var auctionApp = connect(); //analytics 应用
auctionApp._listenPort = 80;
auctionApp.use(function (req, res, next) {
    var hosts = req.headers.host.split(':')
    var port = 80;
    if (hosts[1]) {
        port = hosts[1];
    }
    if (parseInt(port) == auctionApp._listenPort) {
        next();
    } else {
        app.def_vhost(req, res, next);
    }
});
auctionApp.use(rewriteModule.getMiddleware([
    {from: '^/rewriteTest-(.*)-(.*).html$', to: '/rewrite.php?id=$1&gid=$2'}
])
);
auctionApp.use(connect.static('/var/webroot/auctioneer.artron.net/'));//analytics 静态目录

//auctionApp.use(connect.logger('dev'));//记录开发的log ，主要为访问什么 ，响应时间是什么
auctionApp.use(function (req, res, next) {//处理非php的404  如 js css 等无法静态找到而重写到php的问题
    console.log(url.parse(req.url).pathname);


    var extName = path.extname(url.parse(req.url).pathname);
    if (extName != '.php' && extName != '') {
        var err = {
            status: 404,
            stack: 'file is not found'
        }
        next(err);
        return;
    }
    next();
});
/**
 **[1] webroot
 **[2] 重写到的地址，比如所有的地址都重写到index.php
 **[3] 默认的php地址
 **/
var phpParseFun = function (req, res, next) {
    res.write('def');
    res.end();
    next();
};
auctionApp.use(function (req, res, next) {

    phpParseFun = phpParse.ParseFun('/var/webroot/auctioneer.artron.net/', 'auctioneer/index.php', 'auctioneer/index.php', {
        //fastcgiPort: 9123,
        //fastcgiHost: '127.0.0.1',
        fastcgiSock: '/tmp/php-fpm.sock',
        fastcgiTimeout: 20000
    })

    next();
});
auctionApp.use(function (req, res, next) {
    phpParseFun(req, res, next);
});


app.use(connect.vhost('paimaishi.artron.net', auctionApp)); //vhost config