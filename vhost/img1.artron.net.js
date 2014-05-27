var _IMG1ARTRONAPP_ = connect(); //analytics 应用
_IMG1ARTRONAPP_._listenPort = 80;
_IMG1ARTRONAPP_.use(function (req, res, next) {
    var hosts = req.headers.host.split(':')
    var port = 80;
    if (hosts[1]) {
        port = hosts[1];
    }
    if (parseInt(port) == _IMG1ARTRONAPP_._listenPort) {
        next();
    } else {
        app.def_vhost(req, res, next);
    }
});
_IMG1ARTRONAPP_.use(connect.static('/var/webroot/img1.artron.net/'));//analytics 静态目录
//_IMG1ARTRONAPP_.use(function (req, res, next) {//处理非php的404  如 js css 等无法静态找到而重写到php的问题
//    var extName = path.extname(url.parse(req.url).pathname);
//    if (extName == '.php' || extName == '' || extName == '.shtml') {
//        next();
//        return;
//
//    }
//    var err = {
//        status: 404,
//        stack: 'file is not found'
//    }
//    next(err);
//    return;
//});
///**
// **[1] webroot
// **[2] 重写到的地址，比如所有的地址都重写到index.php
// **[3] 默认的php地址
// **/
//_IMG1ARTRONAPP_.use(phpParse.ParseFun('/private/var/webroot/phpredisadmin/', null, 'index.php', {
//    //fastcgiPort: 9123,
//    //fastcgiHost: '127.0.0.1',
//    fastcgiSock: '/tmp/php-fpm.sock',
//    fastcgiTimeout: 100000
//}));
app.use(connect.vhost('192.168.63.11', _IMG1ARTRONAPP_));
app.use(connect.vhost('img1.artron.net', _IMG1ARTRONAPP_)); //vhost config
