var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var pathConfig = {//错误页面的路径 
	'analytics.artron.net':{path:'analytics.artron.net',showMessage:true}
}
var defConfig ={
	showMessage : true
}
var _dir = __dirname;
var errorPage={
	showPage:function(statusCode,message,req,res){
		res.setHeader('Content-Type', 'text/html');
		var host = req.headers.host;
		hostConfig = pathConfig[host];
		if (hostConfig!= undefined){
			var statusTmp = _dir+path.sep+'pages'+path.sep+ hostConfig['path']+path.sep+statusCode+'.html';
			var defStatusTmp =  _dir+path.sep+'pages'+path.sep+statusCode+'.html';
			if (fs.existsSync(statusTmp)){
				res.write(errorPage.getContent(statusTmp,hostConfig['showMessage'],message));
			}else{
				res.write(errorPage.getContent(defStatusTmp,defConfig['showMessage'],message));
			}
		}else{
			var defStatusTmp =  _dir+path.sep+'pages'+path.sep+statusCode+'.html';
			res.write(errorPage.getContent(defStatusTmp,defConfig['showMessage'],message));
		}
		res.end();
	},
	getContent:function(tpl,showMessage,message){
		var fileContent = fs.readFileSync(tpl,{encoding:'utf8'});
		var compiled = _.template(fileContent);
		if (showMessage === true){
			return compiled({message: message});
		}else{
			return compiled({message: ''});
		}
		
	}
}
exports.errorPage = errorPage;