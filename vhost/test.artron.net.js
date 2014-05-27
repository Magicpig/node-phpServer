var _TEST_ = connect(); //analytics 应用
_TEST_._listenPort = 80;
_TEST_.use(function (req, res, next) {
    var hosts = req.headers.host.split(':')
    var port = 80;
    if (hosts[1]) {
        port = hosts[1];
    }
    if (parseInt(port) == _TEST_._listenPort) {
        next();
    } else {
        app.def_vhost(req, res, next);
    }
});
_TEST_.use(connect.static('/var/webroot/test.artron.net/'));//analytics 静态目录
_TEST_.use(function (req, res, next) {//处理非php的404  如 js css 等无法静态找到而重写到php的问题
    var extName = path.extname(url.parse(req.url).pathname);
    if (extName == '.php' || extName == '' || extName == '.shtml') {//以下扩展名发生404 ，交给后续处理
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
_TEST_.use(phpParse.ParseFun('/var/webroot/test.artron.net/', null, 'index.php', {
    //fastcgiPort: 9123,
    //fastcgiHost: '127.0.0.1',
    fastcgiSock: '/tmp/php-fpm.sock',
    fastcgiTimeout: 100000
}));
app.use(connect.vhost('test.artron.net', _TEST_)); //vhost config