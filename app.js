var express = require("express");
var app= express();
var server = require("http").Server(app);

app.get("/",function (req, res) {
    res.sendFile(__dirname + "/client/index.html");
});
app.use("/client",express.static(__dirname + "/client"));
server.listen(6070);

console.log("Server stated");

var io = require("socket.io")(server,{});
io.sockets.on("connection",function (socket) {
    console.log("socket connection");
});