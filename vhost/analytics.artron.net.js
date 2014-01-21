var analyticsApp = connect(); //analytics 应用
analyticsApp.use(function (req, res, next) {
    console.log('vhost is analyticsApp'.error);
    next();
});
analyticsApp.use(rewriteModule.getMiddleware([
    {from: '^/rewriteTest-(.*)-(.*).html$', to: '/rewrite.php?id=$1&gid=$2'}
])
);
analyticsApp.use(connect.static('D:\\webroot\\',{index:'i.html'}));//analytics 静态目录

analyticsApp.use(connect.logger('dev'));//记录开发的log ，主要为访问什么 ，响应时间是什么
analyticsApp.use(function (req, res, next) {//处理非php的404  如 js css 等无法静态找到而重写到php的问题
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

analyticsApp.use(phpParse.ParseFun('D:\\webroot\\', null, 'index.php',{
    fastcgiPort: 9123,
    fastcgiHost: '127.0.0.1'
}));//

app.use(connect.vhost('analytics.artron.net', analyticsApp)); //vhost config