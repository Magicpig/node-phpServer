var testapp = connect();// http://version.artron.net/
testapp.use(function (req, res, next) {
    console.log('vhost is versionapp'.error);
    next();
});
testapp.use(connect.static('D:\\webroot\\')); //静态目录
testapp.use(connect.logger('dev'));//记录开发的log ，主要为访问什么 ，响应时间是什么
testapp.use(function (req, res, next) {//处理非php的404  如 js css 等无法静态找到而重写到php的问题
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
testapp.use(phpParse.ParseFun('D:\\webroot\\', null, 'index.php',{
    fastcgiPort: 9123,
    fastcgiHost: '127.0.0.1'
}))//php所在文件

testapp.use(function(req,res,next){//如果 处理php 发生了404 ，则请求到这里继续进行处理
    console.log('404 page');
    next();
})//php所在文件

//vhost configure
app.use(connect.vhost('test.com', testapp)); //vhost config