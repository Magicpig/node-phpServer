node-phpServer
==============

a web server to parse php-fpm

start server:

node phpServer.js 


You need to start fpm.js  in  Windows 


vhost config 

###  
	var versionapp = connect(); //vhost name
	versionapp.use(function (req, res, next) {
	    console.log('vhost is versionapp'.error);  //debug info 
	    next();
	});
	versionapp.use(connect.static('D:\\webroot\\')); //web static document root 
	versionapp.use(connect.logger('dev'));//debug info 
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
	 **[2] all rewrite to index.php
	 **[3] def document index 
	 **/
	versionapp.use(phpParse.ParseFun('D:\\webroot\\', null, 'index.php',{   //domain script document root 
	    fastcgiPort: 9123,
	    fastcgiHost: '127.0.0.1'
	}))

	versionapp.use(function(req,res,next){//如果 处理php 发生了404 ，则请求到这里继续进行处理
	    console.log('404 page');
	    next();
	})

	//vhost configure
	app.use(connect.vhost('version.artron.net', versionapp)); //vhost config