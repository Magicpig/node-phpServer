/**
*
*用于在windows系统下面守护 fast-cgi进程，保证web服务正常运行
**/
var spawn = require('child_process').spawn;
var fastCgiCmd = "C:\\Program Files (x86)\\php-5.5.8\\php-cgi.exe";
var fastCgiListen = '127.0.0.1:9123';
var fastCgiIniPath = 'c:\\Program Files (x86)\\PHP\\php.ini';
var fastCgiArg = ['-b',fastCgiListen,'-c',fastCgiIniPath];
var _ = require('underscore');

var fpm = {
	fastCgiPool:new Array(),
	fastCgiNum : 10,//默认启动多少个fastCgi
	init:function(){
		for (var i=0;i<fpm.fastCgiNum;i++){
			fpm.makeOneFastCgi();
		}
	},

	removeFastCgiFromPool:function(fastCgiPid){
		var beforeRemove = fpm.fastCgiPool.length;
		fpm.fastCgiPool = _.filter(fpm.fastCgiPool, function(fastCgiPoolItem){ return fastCgiPoolItem.pid != fastCgiPid; });
		var afterRemove = fpm.fastCgiPool.length;
		if (afterRemove< beforeRemove){
			fpm.makeOneFastCgi(); //创建一个fastcgi进程
		}
		
	},
	makeOneFastCgi:function(){
		console.log('start cgi');
		var fastCgi = spawn(fastCgiCmd, fastCgiArg);
		fpm.fastCgiPool.push(fastCgi);
		(function(fastCgi){
			fastCgi.stderr.on('data', function (data) { //cgi 出错
			  fpm.removeFastCgiFromPool(fastCgi.pid);	 
			});
			fastCgi.on('close', function (code) {			  
			  fpm.removeFastCgiFromPool(fastCgi.pid);	 
			});
		})(fastCgi);
	}
}
fpm.init();