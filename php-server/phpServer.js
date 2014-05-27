var url = require('url');
var fs = require('fs');
var path = require("path");
var http = require("http");
var net = require("net");
var os = require('os');
var colors = require('colors');
var sys = require("sys");
var fastcgi = require("fastcgi-parser");
colors.setTheme({silly: 'rainbow', input: 'grey', verbose: 'cyan', prompt: 'grey', info: 'green',
    data: 'grey', help: 'cyan', warn: 'yellow', debug: 'blue', error: 'red'});

var FCGI_RESPONDER = fastcgi.constants.role.FCGI_RESPONDER;
var FCGI_BEGIN = fastcgi.constants.record.FCGI_BEGIN;
var FCGI_STDIN = fastcgi.constants.record.FCGI_STDIN;
var FCGI_STDOUT = fastcgi.constants.record.FCGI_STDOUT;
var FCGI_PARAMS = fastcgi.constants.record.FCGI_PARAMS;
var FCGI_STDERR = fastcgi.constants.record.FCGI_STDERR;
var FCGI_END = fastcgi.constants.record.FCGI_END;

function makeHeaders(headers, params) {
    if (headers.length <= 0) {
        return params;
    }

    for (var prop in headers) {
        var head = headers[prop];
        prop = prop.replace(/-/, '_').toUpperCase();
        if (prop.indexOf('CONTENT_') < 0) {
            prop = 'HTTP_' + prop;
        }

        params[params.length] = [prop, head];
    }
    return params;
}

function server(request, response, params, options, next) {
    var connection = new net.Stream();
    connection.setNoDelay(true);
    var writer = null;
    var parser = null;
    var header = {
        "version": fastcgi.constants.version,
        "type": FCGI_BEGIN,
        "recordId": parseInt(Math.random() * 100),
        "contentLength": 0,
        "paddingLength": 0
    };
    var fastCgirecordId = header.recordId;
    var begin = {
        "role": FCGI_RESPONDER, //cgi 角色
        "flags": 0 //不保持fpm连接，委托给fastcgi 进程进行连接管理,fastcgi会在接受完请求，比如最后一个stdin 包后，断开连接，并发送end状态
    };
    var cgiStdEnd = false; //标记cgi是否返回end
    var cgiConnectionClose = false;//标记cgi连接是否被web服务器主动关闭;
    var responseEnd = false;
    var timestamp = Date.parse(new Date());
    var postCacheName = 'tmp/' + timestamp + '_' + header.recordId + '_allData.txt';

    function sendRequest(connection) {

        header.type = FCGI_BEGIN;
        header.contentLength = 8;
        writer.writeHeader(header);
        writer.writeBegin(begin);
        connection.write(writer.tobuffer()); //发送bigin

        header.type = FCGI_PARAMS;
        header.contentLength = fastcgi.getParamLength(params);
        writer.writeHeader(header);
        writer.writeParams(params);
        connection.write(writer.tobuffer());

        header.type = FCGI_PARAMS;
        header.contentLength = 0;
        writer.writeHeader(header);
        connection.write(writer.tobuffer());

        if ((request.method != 'PUT' && request.method != 'POST')) { //非post 结束request
            // console.log('! post  endRequest');
            header.type = FCGI_STDIN;
            header.contentLength = 0;
            header.paddingLength = 0;
            writer.writeHeader(header);
            connection.write(writer.tobuffer(), '', function () {
            });
            cacheChunk = null;
            connection.end(); //提前结束 fastcgi 传输线路
            return; //结束对cgi的请求
        }

        var okLength = 0;

        var tmpBufferLength = 65536 - 8;

        var position = 0;
        try {
            var fd = fs.openSync(postCacheName, 'r');
            var postCacheFileLength = fs.lstatSync(postCacheName).size;
        } catch (e) {
            var postCacheFileLength = 0;
        }

        var testSize = 0;
        var bufferIndex = 0;

        function writeSidinFastCgi(tmpBuffer) { //向cgi写入buffer数据
            testSize = testSize + tmpBuffer.length;
            header.type = FCGI_STDIN;
            header.contentLength = tmpBuffer.length;
            header.paddingLength = 0;
            writer.writeHeader(header);
            writer.writeBody(tmpBuffer);
            var recordBufferFileName = 'tmp/data_recode_' + bufferIndex + '_' + timestamp + '_' + header.recordId + '.txt';
            fs.appendFileSync(recordBufferFileName, writer.tobuffer());
            var tBuffer = fs.readFileSync(recordBufferFileName);
            connection.write(tBuffer); //write sidin
            fs.unlinkSync(recordBufferFileName);
            bufferIndex = bufferIndex + 1;
        }

        //@todo test empty post
        if (postCacheFileLength > 0) { //===0时候需要测试
            var canMod = postCacheFileLength % tmpBufferLength; //余数 ，算出最后一个buffer的大小
            while (true) {
                if (position + tmpBufferLength > postCacheFileLength) {
                    break;
                }
                var tmpBuffer = new Buffer(tmpBufferLength);
                fs.readSync(fd, tmpBuffer, 0, tmpBufferLength, position);
                position = position + tmpBufferLength;
                writeSidinFastCgi(tmpBuffer);
            }
            if (canMod > 0) {
                var tmpBuffer = new Buffer(canMod);
                fs.readSync(fd, tmpBuffer, 0, canMod, position);
                writeSidinFastCgi(tmpBuffer);
            }
        }
        try {
            fs.close(fd);
        } catch (e) {

        }
        try {
            fs.unlinkSync(postCacheName)
        } catch (e) {
//            console.log(e)
        }
        ; //删除post 的缓存数据
        //发送一个cgi stdin结束的包  结束请求
        header.type = FCGI_STDIN;
        header.contentLength = 0;
        header.paddingLength = 0;
        writer.writeHeader(header);
        connection.write(writer.tobuffer());
        // console.log('------' + testSize); //经过处理后 post 内容体的长度
    }

    /**
     *最好的办法是，循环 chunk 一个字节一个字节的添加，cachechunk满足大小后直接 缓存为文件
     *目前还没有重写这个部分，是把整体缓存为一个文件，这样，在fastcgi连接后，还需要再次裁剪buffer的文件，然后分割为
     *大小满足cgi要求的大小，再逐个缓存，读取，write
     **/

    request.on('data', function (chunk) { //缓存post的内容，连接到fpm之后使用
        fs.appendFileSync(postCacheName, chunk);
    });
    var cgiTimeOutCheker = null;
    request.on('end', function () {
        var cgiTimeout = 20000;
        if (options.fastcgiTimeout && options.fastcgiTimeout != '') {
            cgiTimeout = options.fastcgiTimeout;
        }
        //连接fpm处理数据
        if (options.fastcgiSock && options.fastcgiSock != '') {
            connection.connect(options.fastcgiSock);
        } else {
            connection.connect(options.fastcgiPort, options.fastcgiHost); //客户端发送数据结束后，连接fpm
        }

        cgiTimeOutCheker = setTimeout(function () {
            if (cgiStdEnd == false) //如果cgi还没有结束 ，则断开与cgi的连接
            {
                connection.end();
            }
            if (cgiStdEnd == true) {//cgi 执行已经完成，比如404 这个时候php已经处理完成，cgi结束，但是response 不应该结束，因为调用了NEXT  交给之后的req 做动作
                return;
            }
            if (responseEnd == false) {
                cgiConnectionClose = true;
                try {
                    response.setHeader("502");
                }
                catch (e) {
                    console.log(e);
                }

                responseEnd = true;
                next({status: 502, stack: 'php execute time out'});
            }
        }, cgiTimeout)//20秒后，如果facgcgi没有 发回响应包，则断开连接
    });

    connection.ondata = function (buffer, start, end) { //解析cgi的返回
        parser.execute(buffer, start, end);
    };

    connection.on("connect", function () {
        console.time('cgi process time');
        writer = new fastcgi.writer();
        parser = new fastcgi.parser();
        parser.encoding = 'binary';
        writer.encoding = 'binary';

        var body = new Buffer(Math.pow(2, 16)),//缓存来自cgi的响应数据，不会超过 65536 
            hadheaders = false;
        var responseStatus = 200;
        parser.onRecord = function (record) {
            if (cgiConnectionClose == true) { //如果连接已经被web服务器中断，则不处理结果
                parser.onRecord = function () {
                };
                return;
            }
            // var sidOut = 0;
            if (record.header.type == FCGI_STDOUT && !hadheaders) {
                // sidOut = sidOut +1;
                body = new Buffer(record.body.length);
                record.body.copy(body, 0, 0, record.body.length);
                //var parts = record.body.toString('ascii').split("\r\n\r\n");
                var fristResponse = record.body.toString('ascii');//用定长的编码转为 string ，获取内容体中的header
                var indexOf = fristResponse.indexOf("\r\n\r\n") + 4;

                var headers = fristResponse.substr(0, indexOf - 4);
                var headerParts = headers.split("\r\n");

                body = body.slice(indexOf, body.length);

                headers = [];
                try {
                    for (var i in headerParts) {
                        header = headerParts[i].split(': ');
                        var indexOf = headerParts[i].indexOf(': ') + 2;
                        if (!header[1]) {
                            header = headerParts[i].split(':');
                            indexOf = headerParts[i].indexOf(':') + 1;
                        }
                        if (header[0].indexOf('Status') >= 0) {
                            responseStatus = header[1].substr(0, 3);
                            continue;
                        }

                        headers.push([header[0], headerParts[i].substr(indexOf, headerParts[i].length)]);
                    }
                } catch (err) {
                    console.log(err);
                }
                if (responseStatus == "404") { //php返回404后交给next
                    // console.log('cgi is end');
                    cgiStdEnd = true;
                    next({status: 404, stack: 'can\'t find php file'});
                    parser.onRecord = function () {
                    };
                    connection.end();
                    return;
                }
                headers.push(['X-Cgi-Server-By', 'artron  PHP Web Server']);
                response.writeHead(responseStatus, headers);
                response.write(body);
                hadheaders = true;

            } else if (record.header.type == FCGI_STDOUT && hadheaders) {

                var buffer = new Buffer(record.body);
                // sidOut = sidOut +1;
                // console.log(TmpBuffer);
                // var recordStdoutFileName = 'tmp/data_Stdout_' + sidOut + '_' + timestamp  + '_' + fastCgirecordId +'.txt';
                fs.statSync('tmp/sidin.lock'); //同步传输，保证buffer安全
                // var bufferBody = fs.readFileSync(recordStdoutFileName,{'encoding':'binary'});
                bufferBody = null;
                response.write(buffer);
                // fs.unlink(recordStdoutFileName);

            } else if (record.header.type == FCGI_STDERR) {
            } else if (record.header.type == FCGI_END) {
                console.timeEnd('cgi process time');
                cgiStdEnd = true;
                if (responseEnd == false) {
                    // console.log('cgi is end ++++++');
                    responseEnd = true;
                    response.end();

                }

            }
        };
        parser.onError = function (err) {
            console.log(err);
        };
        sendRequest(connection); //发送请求给fpm
    });

    connection.on("close", function () {
        connection.end();
    });

    connection.on("error", function (err) {
        // console.log('cgi die');
        // 如果超时检查器正在执行，则清空
        if (cgiTimeOutCheker != null) {
            clearTimeout(cgiTimeOutCheker);
        }
        if (responseEnd == false) {//连接cgi 出错的时候抛出502
            try {
                response.setHeader('502');
            } catch (e) {

            }
            responseEnd = true;
            next({status: 502, stack: 'can\'t connection fpm'});
        }
        connection.end();
    });
}
/**
 * documentRoot 网站根目录
 * php_self  !=null  则表示所有没有扩展名的请求，或者有php扩展名为404 的则重写到 此self
 * defScript 默认文档
 **/
function getRequestIp(req) {
    if (req.ip) return req.ip;
    if (req._remoteAddress) return req._remoteAddress;
    var sock = req.socket;
    if (sock.socket) return sock.socket.remoteAddress;
    return sock.remoteAddress;
    return "";
}
function phpParser(documentRoot, php_self, defIndexScript, cgiConfig) {
    var documentRoot = documentRoot;
    var php_self = php_self;
    var defScript = defIndexScript;
    var cgiOption = cgiConfig;
    var connectParseFun = function (request, response, next) {

        var script_dir = documentRoot;
        var script_file = php_self;
        var defScript = defIndexScript;


        script_file = url.parse(request.url).pathname;

        if (script_file == '/' || !script_file) {
            script_file = "/" + defScript;
        }
        // console.log(script_file);
        if (path.extname(script_file) != '.php') {
            script_file = script_file + '/' + defScript;
        }

        if (php_self != '' && php_self != null) { //如果定义了url重写 ，则覆盖自动解析的scriptfile
            script_file = "/" + php_self;
        }

        var qs = url.parse(request.url).query ? url.parse(request.url).query : '';
        if (!fs.existsSync(script_dir.substr(0, script_dir.length - 1) + script_file)) {
            next();//文件不存在时，交给之后的处理
            return;
        }
        var params = makeHeaders(request.headers, [
            ["SCRIPT_FILENAME", script_dir.substr(0, script_dir.length - 1) + script_file],
            ["REMOTE_ADDR", request.connection.remoteAddress],
            ["QUERY_STRING", qs],
            ["REQUEST_METHOD", request.method],
            // ["SCRIPT_NAME", script_file], //暂时屏蔽，有他得花 php_self 在php中打印出来不正常
            ['SERVER_NAME', os.hostname()],
            ["PATH_INFO", script_file],
            ['SCRIPT_NAME', script_file],
            ["DOCUMENT_URI", script_file],
//            [""],
            ["REQUEST_URI", request.url],
            ["DOCUMENT_ROOT", script_dir.substr(0, script_dir.length - 1)],
            ["PHP_SELF", script_file],
            ["GATEWAY_PROTOCOL", "CGI/1.1"],
            ["REMOTE_ADDR", getRequestIp(request)],
            ["SERVER_SOFTWARE", "artron web Server power by node /" + process.version]
        ]);
        server(request, response, params, cgiOption, next);
    }
    return connectParseFun;
}
var phpParse = {
    ParseFun: function (documentRoot, php_self, defScript, cgiConfig) {
        return new phpParser(documentRoot, php_self, defScript, cgiConfig)
    }
}

exports.phpParse = phpParse;