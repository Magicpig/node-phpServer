var auctionLive = connect(); //analytics 应用
auctionLive._listenPort = 8080;
auctionLive.use(function (req, res, next) {
    var hosts = req.headers.host.split(':')
    var port = 80;
    if (hosts[1]) {
        port = hosts[1];
    }
    if (parseInt(port) == auctionLive._listenPort) {
        next();
    } else {
        app.def_vhost(req, res, next);
    }
});

auctionLive.use(connect.static('/data/webroot/auctionLive.artron.net/htdocs/'));//analytics 静态目录

//analyticsApp.use(connect.logger('dev'));//记录开发的log ，主要为访问什么 ，响应时间是什么
auctionLive.use(function (req, res, next) {//处理非php的404  如 js css 等无法静态找到而重写到php的问题
    var extName = path.extname(url.parse(req.url).pathname);
    if (extName == '.php' || extName == '' || extName == '.shtml') {
        next();
        return;

    }
    var err = {
        status: 404,
        stack: 'file is not found'
    }
    next(err);
    return;
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
auctionLive.use(function (req, res, next) {

    phpParseFun = phpParse.ParseFun('/data/webroot/auctionLive.artron.net/htdocs/', 'index.php', 'index.php', {
        //fastcgiPort: 9123,
        //fastcgiHost: '127.0.0.1',
        fastcgiSock: '/dev/shm/php-fpm.sock',
        fastcgiTimeout: 100000
    })

    next();
});
auctionLive.use(function (req, res, next) {
    phpParseFun(req, res, next);
});
app.use(connect.vhost('auctionLive.artron.net', auctionLive)); //vhost config
