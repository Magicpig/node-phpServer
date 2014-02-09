var crcApp = connect(); //analytics 应用
crcApp._listenPort = 8080;
crcApp.use(function (req, res, next) {
    var hosts = req.headers.host.split(':')
    var port = 80;
    if (hosts[1]) {
        port = hosts[1];
    }
    if (parseInt(port) == crcApp._listenPort) {
        next();
    } else {
        app.def_vhost(req, res, next);
    }
});
crcApp.use(connect.static('/data/webroot/crc.artron.net/htdocs/', {index: 'index.html'}));//analytics 静态目录

//crcApp.use(connect.logger('dev'));//记录开发的log ，主要为访问什么 ，响应时间是什么
crcApp.use(function (req, res, next) {//处理非php的404  如 js css 等无法静态找到而重写到php的问题
    var extName = path.extname(url.parse(req.url).pathname);
    if (extName != '.php' && extName != '' && extName!='.html') {
        res.writeHeader(404);
        console.log('静态404');
        res.end();
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
crcApp.use(phpParse.ParseFun('/data/webroot/crc.artron.net/htdocs/', null, 'index.php', {
    fastcgiPort: 9001,
    fastcgiHost: '127.0.0.1',
    fastcgiSock: '/dev/shm/php-fpm.sock',
    fastcgiTimeout: 20000
}));
crcApp.use(function (req, res, next) {
    var re = /\/jds(\d){1,10}/i;

    console.log(re.test(req.url));
    if (re.test(req.url) ===true ) {
        phpParseFun = phpParse.ParseFun('/data/webroot/jiandingshi.artron.net/', 'index.php', 'index.php', {
            fastcgiPort: 9001,
            fastcgiHost: '127.0.0.1',
            fastcgiSock: '/dev/shm/php-fpm.sock',
            fastcgiTimeout: 20000
        })
    } else {
        phpParseFun = phpParse.ParseFun('/data/webroot/crc.artron.net/htdocs/', 'cicrc.php', 'cicrc.php', {
            fastcgiPort: 9001,
            fastcgiHost: '127.0.0.1',
            fastcgiSock: '/dev/shm/php-fpm.sock',
            fastcgiTimeout: 20000
        })
    }

    next();
});
crcApp.use(function (req, res, next) {
    phpParseFun(req, res, next);
});
app.use(connect.vhost('crc.artron.net', crcApp)); //vhost config