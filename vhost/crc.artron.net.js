var crcApp = connect();
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
crcApp.use(connect.static('/data/webroot/crc.artron.net/htdocs/'));//analytics 静态目录


crcApp.use(rewriteModule.getMiddleware([
    {from: '^/([0-9]+)/n([0-9]+)_?([0-9]+)?\.html', to: '/show_news.php?newid=$2&fdate=$1&p=$3'},
    {from: '^/([0-9]+)/w([0-9]+)_?([0-9]+)?\.html', to: '/show_works.php?newid=$2&fdate=$1&p=$3'},
    {from: '^/morenews/list([0-9]+)/?p?([0-9]+)?/?$', to: '/morenews.php?column_id=$1&p=$2'},
    {from: '^/moreworks/list([0-9]+)/?p?([0-9]+)?/?$', to: '/list.php?column_id=$1&p=$2'},
    {from: '^/storeworks/list([0-9])?/([^/:]+)/?p?([0-9]+)?/?$', to: '/storeworks.php?column_id=$1&keywords=$2&p=$3'}
])
);


//crcApp.use(connect.logger('dev'));//记录开发的log ，主要为访问什么 ，响应时间是什么
crcApp.use(function (req, res, next) {//处理非php的404  如 js css 等无法静态找到而重写到php的问题
    var extName = path.extname(url.parse(req.url).pathname);
    if (extName == '.php' || extName == '' || extName == '.shtml'||extName == '.html') {
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
    res.end('aaaa');
    next();
};
crcApp.use(phpParse.ParseFun('/data/webroot/crc.artron.net/htdocs/', null, 'index.php', {
    fastcgiPort: 9001,
    fastcgiHost: '127.0.0.1',
    fastcgiSock: '/dev/shm/php-fpm.sock',
    fastcgiTimeout: 20000
}));
crcApp.use(function (req, res, next) {
    phpParseFun = phpParse.ParseFun('/data/webroot/crc.artron.net/htdocs/', 'cicrc.php', 'cicrc.php', {
        fastcgiPort: 9001,
        fastcgiHost: '127.0.0.1',
        fastcgiSock: '/dev/shm/php-fpm.sock',
        fastcgiTimeout: 20000
    })

    next();
});
crcApp.use(function (req, res, next) {
    phpParseFun(req, res, next);
});
app.use(connect.vhost('crc.artron.net', crcApp)); //vhost config
