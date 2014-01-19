process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function(chunk) {
  console.log(chunk);
});

process.stdin.write('sudo cd /root');
// process.stdout.write('sudo cd /root');
