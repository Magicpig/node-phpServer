var _WIKI_ = connect(); //analytics 应用
_WIKI_._listenPort = 8080;
_WIKI_.use(function (req, res, next) {
//    console.log(req)
    if(req.headers.referer=="http://test.artron.net/3.jpg"){
        console.log('dddd');
        res.end();
    }
    console.log(req.headers.referer);

//    headers:
//        [app-0 (out) 2014-06-16T17:01:28]    { host: 'test.artron.net',
//        [app-0 (out) 2014-06-16T17:01:28]      'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:30.0) Gecko/20100101 Firefox/30.0',
//        [app-0 (out) 2014-06-16T17:01:28]      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
//        [app-0 (out) 2014-06-16T17:01:28]      'accept-language': 'zh-cn,zh;q=0.8,en-us;q=0.5,en;q=0.3',
//        [app-0 (out) 2014-06-16T17:01:28]      'accept-encoding': 'gzip, deflate',
//        [app-0 (out) 2014-06-16T17:01:28]      referer: 'http://test.artron.net/3.jpg',
    var hosts = req.headers.host.split(':')
    var port = 80;
    if (hosts[1]) {
        port = hosts[1];
    }
    if (parseInt(port) == _WIKI_._listenPort) {
        next();
    } else {
        app.def_vhost(req, res, next);
    }
});
_WIKI_.use(connect.static('/var/webroot/wiki.artron.net/'));//analytics 静态目录
_WIKI_.use(function (req, res, next) {//处理非php的404  如 js css 等无法静态找到而重写到php的问题
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
_WIKI_.use(phpParse.ParseFun('/var/webroot/wiki.artron.net/', null, 'index.php', {
    //fastcgiPort: 9123,
    //fastcgiHost: '127.0.0.1',
    fastcgiSock: '/tmp/php-fpm.sock',
    fastcgiTimeout: 100000
}));
app.use(connect.vhost('test.artron.net', _WIKI_)); //vhost config