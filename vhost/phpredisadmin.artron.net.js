var _REDISADMINAPP_ = connect(); //analytics 应用
_REDISADMINAPP_._listenPort = 80;
_REDISADMINAPP_.use(function (req, res, next) {
    var hosts = req.headers.host.split(':')
    var port = 80;
    if (hosts[1]) {
        port = hosts[1];
    }
    if (parseInt(port) == _REDISADMINAPP_._listenPort) {
        next();
    } else {
        app.def_vhost(req, res, next);
    }
});
_REDISADMINAPP_.use(connect.static('/private/var/webroot/phpredisadmin/'));//analytics 静态目录
_REDISADMINAPP_.use(function (req, res, next) {//处理非php的404  如 js css 等无法静态找到而重写到php的问题
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
_REDISADMINAPP_.use(phpParse.ParseFun('/private/var/webroot/phpredisadmin/', null, 'index.php', {
    //fastcgiPort: 9123,
    //fastcgiHost: '127.0.0.1',
    fastcgiSock: '/tmp/php-fpm.sock',
    fastcgiTimeout: 100000
}));
app.use(connect.vhost('phpredisadmin.artron.net', _REDISADMINAPP_)); //vhost config