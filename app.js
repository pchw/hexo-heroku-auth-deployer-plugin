var connect = require('connect');
var app = connect.createServer();
var port = process.env.PORT;

app.use(connect.basicAuth('username','password'));
app.use(connect.static(__dirname + '/public'));
app.use(connect.compress());

app.listen(port, function(){
  console.log('Hexo is running on port %d', port);
});