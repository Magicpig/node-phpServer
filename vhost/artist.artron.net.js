var artistApp = connect(); //analytics 应用
artistApp._listenPort = 80;
artistApp.use(function (req, res, next) {
    var hosts = req.headers.host.split(':')
    var port = 80;
    if (hosts[1]) {
        port = hosts[1];
    }
    if (parseInt(port) == artistApp._listenPort) {
        next();
    } else {
        app.def_vhost(req, res, next);
    }
});
artistApp.use(rewriteModule.getMiddleware([
    {from: '^/([0-9]+)/n([0-9]+)_*([0-9]*)\.html$', to: '/article.php?newid=$2&fdate=$1&p=$3'},
    {from: 'rewrite ^/([0-9]+)/n([0-9]+)_?([0-9]+)?\.html$', to: '/article.php?newid=$2&fdate=$1&p=$3'},
    {from: '^/morenews/list([0-9]+)/?p?([0-9]+)?/?$', to: '/morenews.php?column_id=$1&p=$2'},
    {from: '^/([0-9]+)/n([0-9]+)_*([0-9]*)\.html$', to: '/article.php?newid=$2&fdate=$1&p=$3'},
    {from: '"^/(.*)$"', to: '/shop/index.php'}



])
);
artistApp.use(connect.static('/var/webroot/artist.artron.net/', {index: 'index.html'}));//analytics 静态目录

//artistApp.use(connect.logger('dev'));//记录开发的log ，主要为访问什么 ，响应时间是什么
artistApp.use(function (req, res, next) {//处理非php的404  如 js css 等无法静态找到而重写到php的问题
    var extName = path.extname(url.parse(req.url).pathname);
    if (extName != '.php' && extName != '') {
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
var phpParseFun = function(req,res,next){
    res.write('def');
    res.end();
    next();
};
artistApp.use(function(req,res,next){
    phpParseFun = phpParse.ParseFun('/var/webroot/artist.artron.net/', null , 'index.php', {
        fastcgiPort: 9001,
        fastcgiHost: '127.0.0.1',
        fastcgiSock: '/tmp/php-fpm.sock',
        fastcgiTimeout:20000
    })
    next();
});
artistApp.use(function(req,res,next){
    phpParseFun(req,res,next);
});
app.use(connect.vhost('artist.artron.net', artistApp)); //vhost config