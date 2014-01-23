var versionapp = connect();// http://version.artron.net/
versionapp._listenPort = 80;
versionapp.use(function (req, res, next) {//支持vhost 绑定不同端口
    var hosts = req.headers.host.split(':')
    var port = 80;
    if (hosts[1]) {
        port = hosts[1];
    }
    if (parseInt(port) == versionapp._listenPort) {
        next();
    } else {
        app.def_vhost(req, res, next);
        return;
    }
});
versionapp.use(function (req, res, next) {
    console.log('vhost is versionapp'.error);
    next();
});
versionapp.use(connect.static('/var/webroot/version.artron.net/htdocs/')); //静态目录
versionapp.use(connect.logger('dev'));//记录开发的log ，主要为访问什么 ，响应时间是什么
versionapp.use(function (req, res, next) {//处理非php的404  如 js css 等无法静态找到而重写到php的问题
    var extName = path.extname(url.parse(req.url).pathname);
    if (extName != '.php' && extName != '') {
        res.writeHeader(404);
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
versionapp.use(phpParse.ParseFun('/var/webroot/version.artron.net/htdocs/', 'index.php', 'index.php',{
    fastcgiPort: 9001,
    fastcgiHost: '127.0.0.1'
//    fastcgiSock: '/dev/shm/php-fpm-discuz.sock'
}))//php所在文件

versionapp.use(function(req,res,next){//如果 处理php 发生了404 ，则请求到这里继续进行处理
    console.log('404 page');
    next();
})//php所在文件

//vhost configure
app.use(connect.vhost('version.artron.net', versionapp)); //vhost config
